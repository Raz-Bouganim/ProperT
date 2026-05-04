import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

const MAX_MSG_LIMIT = 50;

export class MessagesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_MSG_LIMIT)
  limit?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  cursor?: string;
}
