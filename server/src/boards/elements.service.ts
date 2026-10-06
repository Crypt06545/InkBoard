// src/boards/elements.service.ts
import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Board,
  BoardDocument,
  BoardElement,
  VALID_ELEMENT_TYPES,
  ElementType,
} from './schemas/board.schema.js';
import { BoardRealtimeService } from './board-realtime.service.js';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service.js';
import { publicIdFromUrl } from './utils/cloudinary-url.js';

export interface ElementSpec {
  type: ElementType;
  data: Record<string, any>;
  z?: number;
}

@Injectable()
export class ElementsService {
  constructor(
    @InjectModel(Board.name) private readonly boardModel: Model<BoardDocument>,
    private readonly realtime: BoardRealtimeService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // AI controller এবং bulkCreate — দুই জায়গা থেকেই এই একটাই function
  async persist(
    boardId: string,
    userId: string,
    specs: ElementSpec[],
    exceptSocketId?: string,
  ): Promise<BoardElement[]> {
    const createdBy = new Types.ObjectId(userId);
    let z = Date.now();

    const elements = specs.map((s) => ({
      id: randomUUID(),
      type: s.type,
      data: s.data ?? {},
      z: Number.isFinite(s.z) ? (s.z as number) : z++,
      createdBy,
    })) as BoardElement[];

    await this.boardModel.updateOne(
      { _id: boardId },
      { $push: { elements: { $each: elements } } },
    );

    for (const element of elements) {
      this.realtime.emitToBoard(
        boardId,
        'element:created',
        element,
        exceptSocketId,
      );
    }

    return elements;
  }

  async create(
    boardId: string,
    userId: string,
    type: string,
    data: Record<string, any>,
    z: number | undefined,
    exceptSocketId?: string,
  ) {
    if (!VALID_ELEMENT_TYPES.includes(type as ElementType)) {
      throw new BadRequestException('Invalid element type');
    }

    const [element] = await this.persist(
      boardId,
      userId,
      [{ type: type as ElementType, data: data ?? {}, z }],
      exceptSocketId,
    );

    return element;
  }

  async update(
    boardId: string,
    elementId: string,
    changes: { data?: Record<string, any>; z?: number },
    exceptSocketId?: string,
  ) {
    const setFields: Record<string, any> = {};
    if (changes.data !== undefined) setFields['elements.$.data'] = changes.data;
    if (changes.z !== undefined) setFields['elements.$.z'] = changes.z;

    if (!Object.keys(setFields).length) {
      throw new BadRequestException('No valid fields to update');
    }

    setFields['elements.$.updatedAt'] = new Date();

    const board = await this.boardModel
      .findOneAndUpdate(
        { _id: boardId, 'elements.id': elementId },
        { $set: setFields },
        { new: true, projection: { 'elements.$': 1 } },
      )
      .lean();

    if (!board) throw new NotFoundException('Element not found');

    const element = board.elements[0];
    this.realtime.emitToBoard(
      boardId,
      'element:updated',
      element,
      exceptSocketId,
    );
    return element;
  }

  async remove(boardId: string, elementId: string, exceptSocketId?: string) {
    // একই query তে pull + আগের element ফেরত (new:false), তাই image হলে URL পাওয়া যায়
    const before = await this.boardModel
      .findOneAndUpdate(
        { _id: boardId, 'elements.id': elementId },
        { $pull: { elements: { id: elementId } } },
        { projection: { elements: { $elemMatch: { id: elementId } } } },
      )
      .lean();

    if (!before) throw new NotFoundException('Element not found');

    const removed = before.elements?.[0];
    if (removed?.type === 'image') {
      const publicId = publicIdFromUrl(
        removed.data?.src,
        `whiteboards/${boardId}/`,
      );
      if (publicId) void this.cloudinary.deleteImage(publicId);
    }

    this.realtime.emitToBoard(
      boardId,
      'element:deleted',
      { id: elementId },
      exceptSocketId,
    );
    return { success: true };
  }

  async bulkCreate(
    boardId: string,
    userId: string,
    incoming: { type: string; data?: Record<string, any>; z?: number }[],
    exceptSocketId?: string,
  ) {
    const valid = incoming.filter((e) =>
      VALID_ELEMENT_TYPES.includes(e.type as ElementType),
    );
    if (!valid.length)
      throw new BadRequestException('No valid elements to create');

    return this.persist(
      boardId,
      userId,
      valid.map((e) => ({
        type: e.type as ElementType,
        data: e.data ?? {},
        z: e.z,
      })),
      exceptSocketId,
    );
  }

  // AI এর editSelection এ নির্দিষ্ট element গুলো খুঁজে বের করতে
  async findByIds(boardId: string, ids: string[]) {
    const board = await this.boardModel.findById(boardId).lean();
    if (!board) throw new NotFoundException('Board not found');
    return board.elements.filter((el) => ids.includes(el.id));
  }
}
