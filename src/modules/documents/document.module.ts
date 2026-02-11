import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentRecord, DocumentSection, DocumentType, DocumentSubtype } from './entities';
import { DocumentTypeService, DocumentService, DocumentSectionService } from './services';
import { DocumentCategoryController, DocumentController, SectionController } from './controllers';
import { FilesModule } from '../files/files.module';
import { StoredFile } from '../files/entities/stored-file.entity';
import { DocumentSearchService } from './services/document-search.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentSection, DocumentType, DocumentRecord, DocumentSubtype, StoredFile]),
    FilesModule,
  ],
  providers: [DocumentTypeService, DocumentService, DocumentSectionService, DocumentSearchService],
  controllers: [DocumentController, DocumentCategoryController, SectionController],
  exports: [DocumentSearchService, DocumentService, DocumentSectionService, DocumentTypeService],
})
export class DocumentModule {}
