import { Transform } from 'class-transformer';
import {
  IsUUID,
  IsDate,
  Matches,
  IsString,
  MaxLength,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { sanitizeLandingModalNoticeHtml } from 'src/helpers';

export const absoluteOrInternalPathRegex = /^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/i;

const trimOrNull = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  return value.trim() || null;
};

const toNullableDate = ({ value }: { value: unknown }): unknown => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return value instanceof Date ? value : new Date(value as string | number);
};

const sanitizeContentHtml = ({ value }: { value: unknown }): unknown => {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') return value;

  const sanitized = sanitizeLandingModalNoticeHtml(value).trim();
  const plainText = sanitized
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return plainText ? sanitized : null;
};

function IsNotBefore(property: string, validationOptions?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isNotBefore',
      target: target.constructor,
      propertyName: propertyName.toString(),
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [relatedProperty] = args.constraints as string[];
          const relatedValue = (args.object as Record<string, unknown>)[relatedProperty];
          if (!(value instanceof Date) || !(relatedValue instanceof Date)) return true;
          return value.getTime() >= relatedValue.getTime();
        },
      },
    });
  };
}

class LandingModalNoticeFieldsDto {
  @Transform(sanitizeContentHtml)
  @IsOptional()
  @IsString()
  contentHtml?: string | null;

  @Transform(trimOrNull)
  @IsOptional()
  @IsUUID()
  imageId?: string | null;

  @Transform(trimOrNull)
  @ValidateIf(
    (dto: LandingModalNoticeFieldsDto, value: unknown) =>
      (value !== undefined && value !== null) || (dto.imageId !== undefined && dto.imageId !== null),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  imageAlt?: string | null;

  @Transform(trimOrNull)
  @IsOptional()
  @IsString()
  @Matches(absoluteOrInternalPathRegex, {
    message: 'imageLinkUrl debe ser una URL http(s) completa o una ruta interna que empiece con /',
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
  @IsNotBefore('visibleFrom', {
    message: 'visibleUntil debe ser posterior o igual a visibleFrom',
  })
  visibleUntil?: Date | null;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

export class CreateLandingModalNoticeDto extends LandingModalNoticeFieldsDto {
  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string;
}

export class UpdateLandingModalNoticeDto extends LandingModalNoticeFieldsDto {
  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;
}
