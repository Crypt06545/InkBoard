// src/boards/schemas/board.schema.ts
import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum CollaboratorRole {
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export enum BoardBackground {
  DOTS = 'dots',
  GRID = 'grid',
  PLAIN = 'plain',
}

export const VALID_ELEMENT_TYPES = [
  'text',
  'sticky',
  'rect',
  'ellipse',
  'diamond',
  'line',
  'arrow',
  'draw',
  'bullet',
  'image',
  'chart',
  'emoji',
] as const;

export type ElementType = (typeof VALID_ELEMENT_TYPES)[number];

@Schema({ _id: false })
export class Collaborator {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ enum: CollaboratorRole, required: true })
  role: CollaboratorRole;

  @Prop({ default: Date.now })
  invitedAt: Date;
}
export const CollaboratorSchema = SchemaFactory.createForClass(Collaborator);

// মূল Postgres এ position/size/style/text সব আলাদা column ছিল না,
// সবকিছু একটা jsonb "data" column এ ছিল। আমরাও সেই একই নমনীয় কাঠামো রাখছি —
// element type ভেদে shape আলাদা হবে (sticky এ fill/text, chart এ chartType/data ইত্যাদি)
// minimize: false না দিলে Mongoose খালি {} data মুছে ফেলে
@Schema({
  _id: false,
  minimize: false,
  timestamps: { createdAt: false, updatedAt: true },
})
export class BoardElement {
  @Prop({ required: true, default: () => randomUUID() })
  id: string;

  @Prop({ required: true, enum: VALID_ELEMENT_TYPES })
  type: ElementType;

  @Prop({ type: Object, required: true, default: () => ({}) })
  data: Record<string, any>;

  @Prop({ required: true, default: 1000 })
  z: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  updatedAt?: Date;
}
export const BoardElementSchema = SchemaFactory.createForClass(BoardElement);

@Schema({ timestamps: true, minimize: false })
export class Board {
  @Prop({ required: true, trim: true, default: 'Untitled whiteboard' })
  title: string;

  @Prop({ type: String, default: null, trim: true })
  description: string | null;

  @Prop({ enum: BoardBackground, default: BoardBackground.DOTS })
  background: BoardBackground;

  @Prop({ default: '#ffffff', match: /^#[0-9a-fA-F]{6}$/ })
  bgColor: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ type: [CollaboratorSchema], default: [] })
  collaborators: Collaborator[];

  @Prop({ type: [BoardElementSchema], default: [] })
  elements: BoardElement[];

  createdAt?: Date;
  updatedAt?: Date;
}

export type BoardDocument = HydratedDocument<Board>;
export const BoardSchema = SchemaFactory.createForClass(Board);

BoardSchema.index({ ownerId: 1, updatedAt: -1 });
BoardSchema.index({ 'collaborators.userId': 1 });
