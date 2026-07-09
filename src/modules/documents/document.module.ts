import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentRecord, OrganizationalUnit, DocumentType, DocumentSubtype } from './entities';
import { DocumentTypeService, DocumentService, OrganizationalUnitService } from './services';
import { DocumentController, DocumentTypeController, OrganizationalUnitController } from './controllers';
import { FilesModule } from '../files/files.module';
import { PublicDocumentService } from './services/public-document.service';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationalUnit, DocumentType, DocumentRecord, DocumentSubtype]), FilesModule],
  providers: [DocumentTypeService, DocumentService, OrganizationalUnitService, PublicDocumentService],
  controllers: [DocumentController, DocumentTypeController, OrganizationalUnitController],
  exports: [PublicDocumentService, DocumentService, OrganizationalUnitService, DocumentTypeService],
})
export class DocumentModule {}
