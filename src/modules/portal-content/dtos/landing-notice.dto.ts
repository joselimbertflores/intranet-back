import { Transform } from 'class-transformer';
import {
  IsUUID,
  IsDate,
  IsString,
  MaxLength,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  ValidateIf,
  Matches,
} from 'class-validator';
import { sanitizeBasicRichTextHtml } from '../../../helpers/sanitize-basic-rich-text-html.helper';

const trimOrNull = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  return value.trim() || null;
};

const absoluteOrInternalPathRegex = /^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/i;

const toNullableDate = ({ value }: { value: unknown }): unknown => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return value instanceof Date ? value : new Date(value as string | number);
};

const normalizeEditorSpaces = (html: string): string =>
  html
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();

const sanitizeContentHtml = ({ value }: { value: unknown }): unknown => {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') return value;

  const sanitized = sanitizeBasicRichTextHtml(value);
  const normalized = normalizeEditorSpaces(sanitized);

  const plainText = normalized.replace(/<[^>]*>/g, '').trim();

  return plainText ? normalized : null;
};

class LandingNoticeFieldsDto {
  @Transform(sanitizeContentHtml)
  @IsOptional()
  @IsString()
  contentHtml?: string | null;

  @Transform(trimOrNull)
  @IsOptional()
  @IsUUID()
  imageId?: string | null;

  @Transform(trimOrNull)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  imageAlt?: string | null;

  @Transform(trimOrNull)
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(absoluteOrInternalPathRegex, {
    message: 'imageLinkUrl must be an absolute http(s) URL or an internal path like /communications',
  })
  imageLinkUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Transform(toNullableDate)
  @IsOptional()
  @IsDate()
  visibleFrom?: Date | null;

  @Transform(toNullableDate)
  @IsOptional()
  @IsDate()
  visibleUntil?: Date | null;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

export class CreateLandingNoticeDto extends LandingNoticeFieldsDto {
  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string;
}

export class UpdateLandingNoticeDto extends LandingNoticeFieldsDto {
  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;
}
