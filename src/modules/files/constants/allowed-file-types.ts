import { FileContext } from '../enums/file-context.enum';

interface FileUploadConfig {
  validTypes: string[];
  maxSizeBytes: number;
}

export const FILE_UPLOAD_CONFIG: Record<FileContext, FileUploadConfig> = {
  [FileContext.HERO_SLIDES]: {
    validTypes: ['jpg', 'jpeg', 'png'],
    maxSizeBytes: 5 * 1024 * 1024,
  },
  [FileContext.FEATURED_BANNERS]: {
    validTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maxSizeBytes: 5 * 1024 * 1024,
  },
  [FileContext.LANDING_MODAL_NOTICES]: {
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
  [FileContext.QUICK_ACCESS]: {
    validTypes: [],
    maxSizeBytes: 0,
  },
  [FileContext.COMMUNICATIONS]: {
    validTypes: ['pdf'],
    maxSizeBytes: 10 * 1024 * 1024,
  },
  [FileContext.TUTORIALS]: {
    validTypes: ['mp4', 'pdf', 'jpg', 'jpeg', 'png', 'webp', 'pptx'],
    maxSizeBytes: 300 * 1024 * 1024,
  },
};

export const ALLOWED_FILE_TYPES: Record<FileContext, string[]> = {
  [FileContext.HERO_SLIDES]: FILE_UPLOAD_CONFIG[FileContext.HERO_SLIDES].validTypes,
  [FileContext.FEATURED_BANNERS]: FILE_UPLOAD_CONFIG[FileContext.FEATURED_BANNERS].validTypes,
  [FileContext.LANDING_MODAL_NOTICES]: FILE_UPLOAD_CONFIG[FileContext.LANDING_MODAL_NOTICES].validTypes,
  [FileContext.DOCUMENT_RECORDS]: FILE_UPLOAD_CONFIG[FileContext.DOCUMENT_RECORDS].validTypes,
  [FileContext.QUICK_ACCESS]: FILE_UPLOAD_CONFIG[FileContext.QUICK_ACCESS].validTypes,
  [FileContext.COMMUNICATIONS]: FILE_UPLOAD_CONFIG[FileContext.COMMUNICATIONS].validTypes,
  [FileContext.TUTORIALS]: FILE_UPLOAD_CONFIG[FileContext.TUTORIALS].validTypes,
};
