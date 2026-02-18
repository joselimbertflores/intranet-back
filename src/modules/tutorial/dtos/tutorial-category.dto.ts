import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTutorialCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}

export class UpdateTutorialCategoryDto extends PartialType(CreateTutorialCategoryDto) {}
