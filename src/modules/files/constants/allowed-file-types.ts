import { FileContext } from '../enums/file-context.enum';

export const ALLOWED_FILE_TYPES: Record<FileContext, string[]> = {
  [FileContext.BANNERS]: ['jpg', 'jpeg', 'png'],
  [FileContext.DOCUMENT_RECORDS]: [
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
  [FileContext.QUICK_ACCESS]: ['jpg', 'jpeg', 'png'],
  [FileContext.COMMUNICATIONS]: ['pdf'],
  [FileContext.TUTORIALS]: ['mp4', 'pdf', 'jpg', 'jpeg', 'png', 'webp', 'pptx'],
};
