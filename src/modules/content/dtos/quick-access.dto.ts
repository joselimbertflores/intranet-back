import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';

export class QuickAccessDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsUrl({ require_tld: false })
  redirectUrl: string;

  @IsString()
  @IsNotEmpty()
  icon: string;
}
export class ReplaceQuickAccessDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuickAccessDto)
  items: QuickAccessDto[];
}
