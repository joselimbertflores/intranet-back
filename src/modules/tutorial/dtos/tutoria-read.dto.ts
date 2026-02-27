import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { PaginationParamsDto } from 'src/modules/common';

export class GetPortalTutorialsDto extends PaginationParamsDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  category?: number;
}
