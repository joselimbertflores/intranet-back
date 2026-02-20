import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { TutorialBlockType } from '../entities';

export class CreateTutorialBlockDto {
  @IsEnum(TutorialBlockType)
  type: TutorialBlockType;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsUUID()
  fileId?: string;
}

export class UpdateTutorialBlockDto extends PartialType(OmitType(CreateTutorialBlockDto, ['type'] as const)) {}

export class TutorialBlockActionsDto {
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateTutorialBlockDto)
  create?: CreateTutorialBlockDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateTutorialBlockDto)
  update?: UpdateTutorialBlockDto[];

  @IsOptional()
  @IsUUID('4', { each: true })
  remove?: string[];

  @IsOptional()
  @IsUUID('4', { each: true })
  reorder?: string[];
}

export class TutorialBlockDto {}
export class CreateTutorialDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateTutorialDto extends PartialType(CreateTutorialDto) {}

export class BlockOrderDto {
  @IsUUID()
  id: string;

  @IsInt()
  @Min(1)
  order: number;
}

export class ReorderTutorialBlocksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockOrderDto)
  @ArrayMinSize(1)
  items: BlockOrderDto[];
}
