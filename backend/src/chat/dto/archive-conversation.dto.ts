import { IsBoolean } from 'class-validator';

export class ArchiveConversationDto {
  @IsBoolean()
  archived!: boolean;
}
