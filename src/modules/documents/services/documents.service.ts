import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, FindOptionsWhere, ILike, In, Repository } from 'typeorm';

import { DocumentRecord, OrganizationalUnit, DocumentType, DocumentSubtype } from '../entities';
import { CreateDocumentBatchDto, FilterDocumentsDto, UpdateDocumentDto } from '../dtos';
import { OrganizationalUnitService } from './organizational-unit.service';
import { FilesService } from 'src/modules/files/files.service';
import { FileContext } from 'src/modules/files/enums/file-context.enum';
import { User } from 'src/modules/users/entities';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentType) private readonly documentTypeRepository: Repository<DocumentType>,
    @InjectRepository(DocumentRecord) private readonly documentRepository: Repository<DocumentRecord>,
    @InjectRepository(OrganizationalUnit)
    private readonly organizationalUnitRepository: Repository<OrganizationalUnit>,
    @InjectRepository(DocumentSubtype) private readonly documentSubtypeRepository: Repository<DocumentSubtype>,
    private readonly organizationalUnitService: OrganizationalUnitService,
    private readonly filesService: FilesService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filterParamsDto: FilterDocumentsDto) {
    const { limit, offset, term, ...docFilters } = filterParamsDto;
    const organizationalUnitIds = docFilters.organizationalUnitId
      ? await this.organizationalUnitService.getOrganizationalUnitAndDescendantIds(docFilters.organizationalUnitId)
      : undefined;

    const where: FindOptionsWhere<DocumentRecord> = {
      ...(term && { title: ILike(`%${term}%`) }),
      ...(organizationalUnitIds?.length && { organizationalUnit: { id: In(organizationalUnitIds) } }),
      ...(docFilters.documentTypeId && { documentType: { id: docFilters.documentTypeId } }),
      ...(docFilters.documentSubtypeId && { documentSubtype: { id: docFilters.documentSubtypeId } }),
      ...(docFilters.year && { year: docFilters.year }),
      ...(docFilters.status && { status: docFilters.status }),
    };
    const [documents, total] = await this.documentRepository.findAndCount({
      where,
      relations: { organizationalUnit: true, documentType: true, documentSubtype: true, file: true },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { documents: documents.map((document) => this.mapToAdminResponse(document)), total };
  }

  async findOne(id: string) {
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: { organizationalUnit: true, documentType: true, documentSubtype: true, file: { derivedFiles: true } },
    });

    if (!document) throw new NotFoundException(`Document ${id} not found`);

    return this.mapToAdminResponse(document);
  }

  async createBatch(dto: CreateDocumentBatchDto, currentUser: User) {
    const { organizationalUnitId, documentTypeId, documentSubtypeId, documents, year } = dto;

    const fileIds = documents.map(({ fileId }) => fileId);
    const uniqueFileIds = new Set(fileIds);

    if (uniqueFileIds.size !== fileIds.length) {
      throw new BadRequestException('Duplicate files are not allowed in the same batch');
    }

    const [organizationalUnit, { documentType, documentSubtype }] = await Promise.all([
      organizationalUnitId == null ? null : this.getActiveOrganizationalUnitOrFail(organizationalUnitId),
      this.resolveActiveDocumentClassificationOrFail(documentTypeId, documentSubtypeId),
    ]);

    return this.dataSource.transaction(async (manager) => {
      const records: DocumentRecord[] = [];
      for (const item of documents) {
        const file = await this.filesService.claimPendingFile(item.fileId, FileContext.DOCUMENT_RECORDS, manager);
        const record = manager.create(DocumentRecord, {
          organizationalUnit,
          documentType,
          documentSubtype,
          file,
          title: item.title,
          year: year ?? null,
          createdBy: currentUser,
        });
        records.push(record);
      }

      const savedDocuments = await manager.save(records);
      return savedDocuments.map((document) => this.mapToAdminResponse(document));
    });
  }

  async update(id: string, dto: UpdateDocumentDto) {
    const { fileId, organizationalUnitId, documentTypeId, documentSubtypeId, ...toUpdate } = dto;

    const document = await this.documentRepository.findOne({
      where: { id },
      relations: {
        organizationalUnit: true,
        documentSubtype: true,
        documentType: true,
        file: true,
      },
    });

    if (!document) throw new NotFoundException(`Document ${id} not found`);

    Object.assign(document, toUpdate);

    const organizationalUnitChanged =
      organizationalUnitId !== undefined && organizationalUnitId !== document.organizationalUnitId;

    if (organizationalUnitChanged) {
      document.organizationalUnit =
        organizationalUnitId === null ? null : await this.getActiveOrganizationalUnitOrFail(organizationalUnitId);
    }

    const documentTypeChanged = documentTypeId !== undefined && documentTypeId !== document.documentTypeId;

    const documentSubtypeChanged = documentSubtypeId !== undefined && documentSubtypeId !== document.documentSubtypeId;

    if (documentTypeChanged || documentSubtypeChanged) {
      const nextTypeId = documentTypeId ?? document.documentType.id;

      const nextSubtypeId =
        documentSubtypeId !== undefined ? documentSubtypeId : documentTypeChanged ? null : document.documentSubtypeId;

      const { documentType, documentSubtype } = await this.resolveActiveDocumentClassificationOrFail(
        nextTypeId,
        nextSubtypeId,
      );
      document.documentType = documentType;
      document.documentSubtype = documentSubtype;
    }

    return this.dataSource.transaction(async (manager) => {
      if (fileId && fileId !== document.fileId) {
        const newFile = await this.filesService.replaceActiveFileWithPendingFile(
          document.fileId,
          fileId,
          FileContext.DOCUMENT_RECORDS,
          manager,
        );
        document.file = newFile;
      }
      const savedDocument = await manager.save(document);
      return this.mapToAdminResponse(savedDocument);
    });
  }

  private async getActiveOrganizationalUnitOrFail(id: string) {
    const organizationalUnit = await this.organizationalUnitRepository.findOneBy({ id, isActive: true });
    if (!organizationalUnit) throw new BadRequestException(`Organizational unit ${id} not found or inactive`);
    return organizationalUnit;
  }

  private async resolveActiveDocumentClassificationOrFail(typeId: number, subtypeId?: number | null) {
    const documentType = await this.documentTypeRepository.findOneBy({ id: typeId, isActive: true });
    if (!documentType) throw new BadRequestException(`Document type ${typeId} not found or inactive`);

    let documentSubtype: DocumentSubtype | null = null;

    if (subtypeId !== undefined && subtypeId !== null) {
      documentSubtype = await this.documentSubtypeRepository.findOne({
        where: {
          id: subtypeId,
          isActive: true,
          documentTypeId: typeId,
        },
      });

      if (!documentSubtype) {
        throw new BadRequestException(`subtype ${subtypeId} not found, inactive or does not belong to type ${typeId}`);
      }
    }
    return { documentType, documentSubtype };
  }

  private mapToAdminResponse(document: DocumentRecord) {
    const { file, ...props } = document;
    const url = this.filesService.buildPublicFileUrl(file.id);

    return {
      ...props,
      organizationalUnitId: document.organizationalUnitId ?? null,
      organizationalUnit: document.organizationalUnit ?? null,
      file: {
        id: file.id,
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        url,
      },
    };
  }
}
