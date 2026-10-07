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

/**
 * Element data can contain different values depending on
 * the element type.
 *
 * We intentionally avoid `any`.
 */
export type ElementData = Record<string, unknown>;

export interface ElementSpec {
  type: ElementType;
  data: ElementData;
  z?: number;
}

interface ElementUpdateChanges {
  data?: ElementData;
  z?: number;
}

@Injectable()
export class ElementsService {
  constructor(
    @InjectModel(Board.name)
    private readonly boardModel: Model<BoardDocument>,

    private readonly realtime: BoardRealtimeService,

    private readonly cloudinary: CloudinaryService,
  ) {}

  /**
   * Create and persist multiple elements.
   *
   * Used by:
   * - normal create
   * - bulkCreate
   * - AI generated elements
   */
  async persist(
    boardId: string,
    userId: string,
    specs: ElementSpec[],
    exceptSocketId?: string,
  ): Promise<BoardElement[]> {
    const createdBy = new Types.ObjectId(userId);

    let z = Date.now();

    const elements = specs.map((spec) => ({
      id: randomUUID(),
      type: spec.type,
      data: spec.data ?? {},
      z: Number.isFinite(spec.z) ? (spec.z as number) : z++,
      createdBy,
    })) as BoardElement[];

    await this.boardModel.updateOne(
      { _id: boardId },
      {
        $push: {
          elements: {
            $each: elements,
          },
        },
      },
    );

    /**
     * Notify other users in the same board.
     */
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

  /**
   * Create a single element.
   */
  async create(
    boardId: string,
    userId: string,
    type: string,
    data: ElementData,
    z: number | undefined,
    exceptSocketId?: string,
  ): Promise<BoardElement> {
    if (!VALID_ELEMENT_TYPES.includes(type as ElementType)) {
      throw new BadRequestException('Invalid element type');
    }

    const [element] = await this.persist(
      boardId,
      userId,
      [
        {
          type: type as ElementType,
          data: data ?? {},
          z,
        },
      ],
      exceptSocketId,
    );

    return element;
  }

  /**
   * Update an existing element.
   *
   * IMPORTANT:
   * We do NOT use:
   *
   * projection: { "elements.$": 1 }
   *
   * together with returnDocument: "after".
   *
   * MongoDB does not allow that combination.
   */
  async update(
    boardId: string,
    elementId: string,
    changes: ElementUpdateChanges,
    exceptSocketId?: string,
  ): Promise<BoardElement> {
    const setFields: Record<string, unknown> = {};

    if (changes.data !== undefined) {
      setFields['elements.$.data'] = changes.data;
    }

    if (changes.z !== undefined) {
      setFields['elements.$.z'] = changes.z;
    }

    if (!Object.keys(setFields).length) {
      throw new BadRequestException('No valid fields to update');
    }

    setFields['elements.$.updatedAt'] = new Date();

    /**
     * Return the document AFTER the update.
     *
     * `returnDocument: "after"` is the modern
     * MongoDB/Mongoose option.
     */
    const board = await this.boardModel
      .findOneAndUpdate(
        {
          _id: boardId,
          'elements.id': elementId,
        },
        {
          $set: setFields,
        },
        {
          returnDocument: 'after',
        },
      )
      .lean();

    if (!board) {
      throw new NotFoundException('Element not found');
    }

    /**
     * Find the updated element from the returned board.
     */
    const element = board.elements.find((item) => item.id === elementId);

    if (!element) {
      throw new NotFoundException('Element not found');
    }

    /**
     * Broadcast the updated element to other
     * connected users.
     */
    this.realtime.emitToBoard(
      boardId,
      'element:updated',
      element,
      exceptSocketId,
    );

    return element;
  }

  /**
   * Delete an element.
   */
  async remove(
    boardId: string,
    elementId: string,
    exceptSocketId?: string,
  ): Promise<{ success: true }> {
    /**
     * We keep the old document because we need
     * the removed image URL before deleting it.
     */
    const before = await this.boardModel
      .findOneAndUpdate(
        {
          _id: boardId,
          'elements.id': elementId,
        },
        {
          $pull: {
            elements: {
              id: elementId,
            },
          },
        },
        {
          projection: {
            elements: {
              $elemMatch: {
                id: elementId,
              },
            },
          },
        },
      )
      .lean();

    if (!before) {
      throw new NotFoundException('Element not found');
    }

    const removed = before.elements?.[0];

    /**
     * If the deleted element is an image,
     * remove its Cloudinary asset as well.
     */
    if (removed?.type === 'image') {
      const src = removed.data?.src;

      if (typeof src === 'string') {
        const publicId = publicIdFromUrl(src, `whiteboards/${boardId}/`);

        if (publicId) {
          void this.cloudinary.deleteImage(publicId);
        }
      }
    }

    /**
     * Notify other connected users.
     */
    this.realtime.emitToBoard(
      boardId,
      'element:deleted',
      {
        id: elementId,
      },
      exceptSocketId,
    );

    return {
      success: true,
    };
  }

  /**
   * Create multiple elements at once.
   */
  async bulkCreate(
    boardId: string,
    userId: string,
    incoming: {
      type: string;
      data?: ElementData;
      z?: number;
    }[],
    exceptSocketId?: string,
  ): Promise<BoardElement[]> {
    const valid = incoming.filter((element) =>
      VALID_ELEMENT_TYPES.includes(element.type as ElementType),
    );

    if (!valid.length) {
      throw new BadRequestException('No valid elements to create');
    }

    return this.persist(
      boardId,
      userId,
      valid.map((element) => ({
        type: element.type as ElementType,
        data: element.data ?? {},
        z: element.z,
      })),
      exceptSocketId,
    );
  }

  /**
   * Find specific elements by their IDs.
   *
   * Used by AI editSelection.
   */
  async findByIds(boardId: string, ids: string[]): Promise<BoardElement[]> {
    const board = await this.boardModel.findById(boardId).lean();

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    return board.elements.filter((element) => ids.includes(element.id));
  }
}
