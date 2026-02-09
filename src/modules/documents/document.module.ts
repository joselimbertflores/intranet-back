import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentRecord, Section, DocumentType, DocumentSubtype } from './entities';
import { DocumentTypeService, DocumentSectionService, DocumentService, SectionService } from './services';
import { DocumentCategoryController, DocumentController, DocumentSectionController, SectionController } from './controllers';
import { FilesModule } from '../files/files.module';
import { StoredFile } from '../files/entities/stored-file.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Section, DocumentType, DocumentRecord, DocumentSubtype, StoredFile]), FilesModule],
  providers: [DocumentTypeService, DocumentSectionService, DocumentService, SectionService],
  controllers: [DocumentController, DocumentSectionController, DocumentCategoryController, SectionController],
  exports: [DocumentService, DocumentTypeService, SectionService],
})
export class DocumentModule {}
