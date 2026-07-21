import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { PaginationParamsDto } from 'src/common/dtos';

export class SearchPublicTutorialsDto extends PaginationParamsDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  categoryId?: number;
}
