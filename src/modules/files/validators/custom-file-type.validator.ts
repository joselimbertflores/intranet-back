import { FileValidator } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { getMimeType } from '../../../helpers';

const AMBIGUOUS_CONTAINER_MIMES = new Set(['application/zip', 'application/x-zip-compressed']);

interface ValidatorConfig {
  validTypes: string[];
  requireDetectedType?: boolean;
}
export class CustomFileTypeValidator extends FileValidator {
  private readonly allowedMimes: string[];
  private readonly requireDetectedType: boolean;

  constructor(config: ValidatorConfig) {
    super(config);
    this.allowedMimes = config.validTypes.map((type) => (type.includes('/') ? type : getMimeType(type) || type));
    this.requireDetectedType = config.requireDetectedType ?? false;
  }

  async isValid(file?: Express.Multer.File): Promise<boolean> {
    if (!file) return false;

    const detected = await fileTypeFromBuffer(file.buffer.subarray(0, 4100));

    if (detected) {
      if (AMBIGUOUS_CONTAINER_MIMES.has(detected.mime)) {
        return this.allowedMimes.includes(file.mimetype);
      }

      return this.allowedMimes.includes(detected.mime) && detected.mime === file.mimetype;
    }

    if (this.requireDetectedType) return false;

    return this.allowedMimes.includes(file.mimetype);
  }

  buildErrorMessage(file: Express.Multer.File): string {
    return `File "${file.originalname}" has an invalid type. Allowed types: ${this.allowedMimes.join(', ')}`;
  }
}
