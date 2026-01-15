import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InstitutionalDocument, DocumentSection, DocumentSubType, InstitutionalDocumentType, SectionDocumentType } from './entities';
import { DocumentTypeService, DocumentSectionService, DocumentService } from './services';
import { DocumentCategoryController, DocumentController, DocumentSectionController } from './controllers';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentSection, InstitutionalDocumentType, DocumentSubType, InstitutionalDocument, SectionDocumentType]),
    FilesModule,
  ],
  providers: [DocumentTypeService, DocumentSectionService, DocumentService],
  controllers: [DocumentController, DocumentSectionController, DocumentCategoryController],
  exports: [DocumentService, DocumentTypeService],
})
export class DocumentModule {}
