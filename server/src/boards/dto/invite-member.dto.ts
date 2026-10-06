// src/boards/dto/invite-member.dto.ts
import { IsEmail, IsEnum } from 'class-validator';
import { CollaboratorRole } from '../schemas/board.schema.js';

export class InviteMemberDto {
  @IsEmail() email: string;
  @IsEnum(CollaboratorRole) role: CollaboratorRole;
}
