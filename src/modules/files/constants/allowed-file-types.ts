import { FileContext } from '../enums/file-context.enum';

interface FileUploadConfig {
  validTypes: string[];
  maxSizeBytes: number;
}

export const FILE_UPLOAD_CONFIG: Record<FileContext, FileUploadConfig> = {
  [FileContext.HERO_SLIDES]: {
    validTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maxSizeBytes: 5 * 1024 * 1024,
  },
  [FileContext.FEATURED_BANNERS]: {
    validTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maxSizeBytes: 5 * 1024 * 1024,
  },
  [FileContext.LANDING_NOTICES]: {
    validTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maxSizeBytes: 5 * 1024 * 1024,
  },
  [FileContext.DOCUMENT_RECORDS]: {
    validTypes: [
      'pdf',
      'odt',
      'ods',
      'odp',
      'docx',
      'xlsx',
      'pptx',
      'jpg',
      'jpeg',
      'png',
      'webp',
      'mp4',
      'webm',
      'mp3',
      'ogg',
    ],
    maxSizeBytes: 20 * 1024 * 1024,
  },
  [FileContext.COMMUNICATIONS]: {
    validTypes: ['pdf'],
    maxSizeBytes: 10 * 1024 * 1024,
  },
  [FileContext.TUTORIALS]: {
    validTypes: ['mp4', 'pdf', 'jpg', 'jpeg', 'png', 'webp', 'pptx'],
    maxSizeBytes: 50 * 1024 * 1024,
  },
};
