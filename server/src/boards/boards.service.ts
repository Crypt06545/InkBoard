// src/boards/boards.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Board,
  BoardDocument,
  BoardBackground,
  CollaboratorRole,
} from './schemas/board.schema.js';
import { UsersService } from '../users/users.service.js';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service.js';

import { CreateBoardDto } from './dto/create-board.dto.js';
import { UpdateBoardDto } from './dto/update-board.dto.js';
import { BoardRealtimeService } from './board-realtime.service.js';
import { publicIdFromUrl } from './utils/cloudinary-url.js';

export type BoardRole = 'owner' | CollaboratorRole;

export interface BoardMember {
  id: Types.ObjectId;
  name?: string;
  email?: string;
  avatar?: string;
  role: BoardRole;
}

@Injectable()
export class BoardsService {
  constructor(
    @InjectModel(Board.name) private readonly boardModel: Model<BoardDocument>,
    private readonly usersService: UsersService,
    private readonly realtime: BoardRealtimeService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(dto: CreateBoardDto, ownerId: string) {
    return this.boardModel.create({
      title: dto.title?.trim() || 'Untitled whiteboard',
      description: dto.description?.trim() || null,
      background: dto.background ?? BoardBackground.DOTS,
      bgColor: dto.bgColor ?? '#ffffff',
      ownerId: new Types.ObjectId(ownerId),
    });
  }

  // Elements বাদ দিয়ে list করছি (ভারী), elementCount aggregation দিয়ে
  async findAllForUser(userId: string) {
    const objectId = new Types.ObjectId(userId);

    return this.boardModel.aggregate([
      {
        $match: {
          $or: [{ ownerId: objectId }, { 'collaborators.userId': objectId }],
        },
      },
      {
        $project: {
          title: 1,
          description: 1,
          background: 1,
          bgColor: 1,
          ownerId: 1,
          createdAt: 1,
          updatedAt: 1,
          isOwner: { $eq: ['$ownerId', objectId] },
          elementCount: { $size: '$elements' },
        },
      },
      { $sort: { updatedAt: -1 } },
    ]);
  }

  // হালকা: elements load হয় না। Guard আর write operation গুলো এটাই ব্যবহার করবে
  async getWithRole(boardId: string, userId: string) {
    this.validateObjectId(boardId);

    const board = await this.boardModel
      .findById(boardId)
      .select('-elements')
      .lean();
    if (!board) throw new NotFoundException('Whiteboard not found');

    const role = this.resolveRole(board, userId);
    if (!role)
      throw new ForbiddenException('You do not have access to this whiteboard');

    return { board, role };
  }

  // AI Summary এর জন্য — elements সহ পুরো board (controller এ guard আগেই আছে)
  async getRawBoard(boardId: string) {
    this.validateObjectId(boardId);
    const board = await this.boardModel.findById(boardId).lean();
    if (!board) throw new NotFoundException('Whiteboard not found');
    return board;
  }

  async getFullBoard(boardId: string, userId: string) {
    this.validateObjectId(boardId);

    const full = await this.boardModel.findById(boardId).lean();
    if (!full) throw new NotFoundException('Whiteboard not found');

    const role = this.resolveRole(full, userId);
    if (!role)
      throw new ForbiddenException('You do not have access to this whiteboard');

    // elements/collaborators board object এর ভেতরে আবার পাঠাচ্ছি না (payload দ্বিগুণ হতো)
    const { elements, collaborators, ...boardMeta } = full;

    const [ownerUser, ...collaboratorUsers] = await Promise.all([
      this.usersService.getUserById(full.ownerId.toString()),
      ...collaborators.map((c) =>
        this.usersService.getUserById(c.userId.toString()),
      ),
    ]);

    const members: BoardMember[] = [
      {
        id: full.ownerId,
        name: ownerUser?.name,
        email: ownerUser?.email,
        avatar: ownerUser?.avatar,
        role: 'owner',
      },
    ];

    collaborators.forEach((c, i) => {
      const u = collaboratorUsers[i];
      members.push({
        id: c.userId,
        name: u?.name,
        email: u?.email,
        avatar: u?.avatar,
        role: c.role,
      });
    });

    return {
      board: { ...boardMeta, role },
      elements: [...elements].sort((a, b) => a.z - b.z),
      members,
    };
  }

  async update(
    boardId: string,
    dto: UpdateBoardDto,
    userId: string,
    exceptSocketId?: string,
  ) {
    const { role } = await this.getWithRole(boardId, userId);

    if (role === CollaboratorRole.VIEWER) {
      throw new ForbiddenException(
        'You do not have permission to edit this whiteboard',
      );
    }

    const update: Record<string, any> = {};
    if (dto.title !== undefined)
      update.title = dto.title.trim() || 'Untitled whiteboard';
    if (dto.description !== undefined)
      update.description = dto.description.trim() || null;
    if (dto.background !== undefined) update.background = dto.background;
    if (dto.bgColor !== undefined) update.bgColor = dto.bgColor;

    if (!Object.keys(update).length) {
      throw new BadRequestException('No valid fields to update');
    }

    // elements/collaborators ছাড়া — নইলে পুরো board broadcast হবে
    const board = await this.boardModel
      .findByIdAndUpdate(
        boardId,
        { $set: update },
        { new: true, projection: { elements: 0, collaborators: 0 } },
      )
      .lean();

    if (!board) throw new NotFoundException('Whiteboard not found');

    this.realtime.emitToBoard(boardId, 'board:updated', board, exceptSocketId);
    return board;
  }

  async remove(boardId: string, userId: string) {
    const { board } = await this.getWithRole(boardId, userId);

    if (board.ownerId.toString() !== userId) {
      throw new ForbiddenException('Only the owner can delete a whiteboard');
    }

    // delete এর আগে image গুলোর URL নিয়ে রাখছি (শুধু type আর src)
    const withImages = await this.boardModel
      .findById(boardId)
      .select('elements.type elements.data.src')
      .lean();

    await this.boardModel.deleteOne({ _id: boardId });

    const prefix = `whiteboards/${boardId}/`;
    const publicIds = (withImages?.elements ?? [])
      .filter((el) => el.type === 'image')
      .map((el) => publicIdFromUrl(el.data?.src, prefix))
      .filter((id): id is string => !!id);

    // best-effort, response আটকাবে না
    void Promise.all(publicIds.map((id) => this.cloudinary.deleteImage(id)));

    return { success: true };
  }

  async addMember(
    boardId: string,
    email: string,
    role: CollaboratorRole,
    requesterId: string,
  ) {
    const { board } = await this.getWithRole(boardId, requesterId);

    if (board.ownerId.toString() !== requesterId) {
      throw new ForbiddenException('Only the owner can share this whiteboard');
    }

    const invitee = await this.usersService.getUserByEmail(
      email.toLowerCase().trim(),
    );
    if (!invitee) throw new NotFoundException('No user found with that email');

    if (invitee._id.toString() === board.ownerId.toString()) {
      throw new BadRequestException('The owner already has full access');
    }

    // Already collaborator থাকলে role update, না থাকলে নতুন যোগ
    await this.boardModel.updateOne(
      { _id: boardId, 'collaborators.userId': invitee._id },
      { $set: { 'collaborators.$.role': role } },
    );

    await this.boardModel.updateOne(
      { _id: boardId, 'collaborators.userId': { $ne: invitee._id } },
      {
        $push: {
          collaborators: { userId: invitee._id, role, invitedAt: new Date() },
        },
      },
    );

    const member = {
      id: invitee._id,
      name: invitee.name,
      email: invitee.email,
      avatar: invitee.avatar,
      role,
    };

    this.realtime.emitToBoard(boardId, 'member:added', member);
    return member;
  }

  async removeMember(
    boardId: string,
    memberUserId: string,
    requesterId: string,
  ) {
    this.validateObjectId(memberUserId);

    const { board } = await this.getWithRole(boardId, requesterId);

    if (board.ownerId.toString() !== requesterId) {
      throw new ForbiddenException('Only the owner can manage members');
    }

    await this.boardModel.updateOne(
      { _id: boardId },
      {
        $pull: { collaborators: { userId: new Types.ObjectId(memberUserId) } },
      },
    );

    this.realtime.emitToBoard(boardId, 'member:removed', {
      userId: memberUserId,
    });

    // সরানো user এর socket room এ থাকলে আর live update পাবে না
    await this.realtime.removeUserFromBoard(boardId, memberUserId);

    return { success: true };
  }

  // Socket Gateway এ ব্যবহার হয়
  async getUserRole(
    boardId: string,
    userId: string,
  ): Promise<BoardRole | null> {
    if (!Types.ObjectId.isValid(boardId)) return null;

    const board = await this.boardModel
      .findById(boardId)
      .select('ownerId collaborators')
      .lean();

    if (!board) return null;
    return this.resolveRole(board, userId);
  }

  private resolveRole(
    board: {
      ownerId: Types.ObjectId;
      collaborators: { userId: Types.ObjectId; role: CollaboratorRole }[];
    },
    userId: string,
  ): BoardRole | null {
    if (board.ownerId.toString() === userId) return 'owner';
    const collaborator = board.collaborators.find(
      (c) => c.userId.toString() === userId,
    );
    return collaborator?.role ?? null;
  }

  private validateObjectId(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid ID');
  }
}
