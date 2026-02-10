import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentRecord, DocumentSection, DocumentType, DocumentSubtype } from './entities';
import { DocumentTypeService, DocumentService, DocumentSectionService } from './services';
import { DocumentCategoryController, DocumentController, SectionController } from './controllers';
import { FilesModule } from '../files/files.module';
import { StoredFile } from '../files/entities/stored-file.entity';
import { DocumentFilterReadService } from './services/document-filter-read.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentSection, DocumentType, DocumentRecord, DocumentSubtype, StoredFile]),
    FilesModule,
  ],
  providers: [DocumentTypeService, DocumentService, DocumentSectionService, DocumentFilterReadService],
  controllers: [DocumentController, DocumentCategoryController, SectionController],
  exports: [DocumentFilterReadService, DocumentService, DocumentSectionService, DocumentTypeService],
})
export class DocumentModule {}
