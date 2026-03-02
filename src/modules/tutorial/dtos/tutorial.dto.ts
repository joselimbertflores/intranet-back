import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TutorialBlockType } from '../entities';

export class CreateTutorialBlockDto {
  @IsEnum(TutorialBlockType)
  type: TutorialBlockType;

  @ValidateIf(
    (o: CreateTutorialBlockDto) => o.type === TutorialBlockType.TEXT || o.type === TutorialBlockType.VIDEO_URL,
  )
  @IsNotEmpty({ message: 'El contenido es requerido para textos o URLs de video' })
  @IsString()
  content?: string;

  @ValidateIf(
    (o: CreateTutorialBlockDto) =>
      o.type === TutorialBlockType.IMAGE ||
      o.type === TutorialBlockType.VIDEO_FILE ||
      o.type === TutorialBlockType.FILE,
  )
  @IsNotEmpty({ message: 'El archivo es requerido para este tipo de bloque' })
  @IsUUID()
  fileId?: string;
}

export class UpdateTutorialBlockDto extends PartialType(OmitType(CreateTutorialBlockDto, ['type'] as const)) {}

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
