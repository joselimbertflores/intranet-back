import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentRecord, OrganizationalUnit, DocumentType, DocumentSubtype } from './entities';
import { DocumentTypeService, DocumentService, OrganizationalUnitService } from './services';
import { DocumentController, DocumentTypeController, OrganizationalUnitController } from './controllers';
import { FilesModule } from '../files/files.module';
import { DocumentSearchService } from './services/document-search.service';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationalUnit, DocumentType, DocumentRecord, DocumentSubtype]), FilesModule],
  providers: [DocumentTypeService, DocumentService, OrganizationalUnitService, DocumentSearchService],
  controllers: [DocumentController, DocumentTypeController, OrganizationalUnitController],
  exports: [DocumentSearchService, DocumentService, OrganizationalUnitService, DocumentTypeService],
})
export class DocumentModule {}
