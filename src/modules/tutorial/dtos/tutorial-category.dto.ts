import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTutorialCategoryDto {
  @Transform(({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}

export class UpdateTutorialCategoryDto extends PartialType(CreateTutorialCategoryDto) {}
