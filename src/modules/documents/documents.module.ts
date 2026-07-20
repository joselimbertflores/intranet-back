import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentRecord, OrganizationalUnit, DocumentType, DocumentSubtype } from './entities';
import {
  DocumentDownloadService,
  DocumentsService,
  DocumentTypeService,
  OrganizationalUnitService,
  PublicDocumentsService,
} from './services';
import { DocumentController, DocumentTypeController, OrganizationalUnitController } from './controllers';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationalUnit, DocumentType, DocumentRecord, DocumentSubtype]), FilesModule],
  providers: [
    DocumentTypeService,
    DocumentsService,
    OrganizationalUnitService,
    PublicDocumentsService,
    DocumentDownloadService,
  ],
  controllers: [DocumentController, DocumentTypeController, OrganizationalUnitController],
  exports: [PublicDocumentsService, DocumentDownloadService],
})
export class DocumentsModule {}
