import { FileValidator } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { getMimeType } from 'src/helpers';

interface ValidatorConfig {
  validTypes: string[];
}
export class CustomFileTypeValidator extends FileValidator {
  private readonly allowedMimes: string[];

  constructor(config: ValidatorConfig) {
    super(config);
    this.allowedMimes = config.validTypes.map((type) => (type.includes('/') ? type : getMimeType(type) || type));
  }

  async isValid(file?: Express.Multer.File): Promise<boolean> {
    if (!file) return false;

    const detected = await fileTypeFromBuffer(file.buffer.subarray(0, 4100));

    if (detected && this.allowedMimes.includes(detected.mime)) {
      return true;
    }
    return this.allowedMimes.includes(file.mimetype);
  }

  buildErrorMessage(file: Express.Multer.File): string {
    return `File "${file.originalname}" has an invalid type. Allowed types: ${this.allowedMimes.join(', ')}`;
  }
}
