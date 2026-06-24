import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, FindOptionsWhere, ILike, In, Repository } from 'typeorm';

import { DocumentRecord, OrganizationalUnit, DocumentType, DocumentSubtype } from '../entities';
import { CreateDocumentBatchDto, FilterDocumentsDto, UpdateDocumentDto } from '../dtos';
import { OrganizationalUnitService } from './organizational-unit.service';
import { FilesService } from 'src/modules/files/files.service';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentType) private docTypeRepository: Repository<DocumentType>,
    @InjectRepository(DocumentRecord) private docRepository: Repository<DocumentRecord>,
    @InjectRepository(OrganizationalUnit) private orgUnitRepository: Repository<OrganizationalUnit>,
    @InjectRepository(DocumentSubtype) private docSubtypeRepository: Repository<DocumentSubtype>,
    private organizationalUnitService: OrganizationalUnitService,
    private filesService: FilesService,
    private dataSource: DataSource,
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
    const [documents, total] = await this.docRepository.findAndCount({
      where,
      relations: { organizationalUnit: true, documentType: true, documentSubtype: true, file: true },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { documents: documents.map((document) => this.toAdminResponse(document)), total };
  }

  async findOne(id: string) {
    const document = await this.docRepository.findOne({
      where: { id },
      relations: { organizationalUnit: true, documentType: true, documentSubtype: true, file: { derivedFiles: true } },
    });

    if (!document) throw new NotFoundException(`Document ${id} not found`);

    return this.toAdminResponse(document);
  }

  async createBatch(dto: CreateDocumentBatchDto) {
    const { organizationalUnitId, documentTypeId, documentSubtypeId, documents, year } = dto;

    const fileIds = documents.map(({ fileId }) => fileId);
    const uniqueFileIds = new Set(fileIds);

    if (uniqueFileIds.size !== fileIds.length) {
      throw new BadRequestException('Duplicate files are not allowed in the same batch');
    }

    const [organizationalUnit, { documentType, documentSubtype }] = await Promise.all([
      this.getActiveOrganizationalUnitOrFail(organizationalUnitId),
      this.getActiveDocumentTypeWithSubtypeOrFail(documentTypeId, documentSubtypeId),
    ]);

    return this.dataSource.transaction(async (manager) => {
      const records: DocumentRecord[] = [];
      for (const item of documents) {
        const file = await this.filesService.claimPendingFile(item.fileId, manager);
        const record = manager.create(DocumentRecord, {
          organizationalUnit,
          documentType,
          documentSubtype,
          title: item.title,
          year: year ?? null,
          file,
        });
        records.push(record);
      }

      const savedDocuments = await manager.save(records);
      return savedDocuments.map((document) => this.toAdminResponse(document));
    });
  }

  async update(id: string, dto: UpdateDocumentDto) {
    const { fileId, organizationalUnitId, documentTypeId, documentSubtypeId, ...toUpdate } = dto;

    const document = await this.docRepository.findOne({
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

    if (organizationalUnitId) {
      document.organizationalUnit = await this.getActiveOrganizationalUnitOrFail(organizationalUnitId);
    }

    if (documentTypeId !== undefined || documentSubtypeId !== undefined) {
      const { documentType, documentSubtype } = await this.getActiveDocumentTypeWithSubtypeOrFail(
        documentTypeId ?? document.documentType.id,
        documentSubtypeId,
      );
      document.documentType = documentType;
      document.documentSubtype = documentSubtype;
    }

    return this.dataSource.transaction(async (manager) => {
      if (fileId && fileId !== document.fileId) {
        const newFile = await this.filesService.replaceActiveFileWithPendingFile(document.fileId, fileId, manager);
        document.file = newFile;
      }
      const savedDocument = await manager.save(document);
      return this.toAdminResponse(savedDocument);
    });
  }

  private async getActiveOrganizationalUnitOrFail(id: string) {
    const organizationalUnit = await this.orgUnitRepository.findOneBy({ id, isActive: true });
    if (!organizationalUnit) throw new BadRequestException(`Organizational unit ${id} not found or inactive`);
    return organizationalUnit;
  }

  private async getActiveDocumentTypeWithSubtypeOrFail(typeId: number, subtypeId?: number | null) {
    const documentType = await this.docTypeRepository.findOneBy({ id: typeId, isActive: true });
    if (!documentType) throw new BadRequestException(`Document type ${typeId} not found or inactive`);

    let documentSubtype: DocumentSubtype | null = null;

    if (subtypeId !== undefined && subtypeId !== null) {
      documentSubtype = await this.docSubtypeRepository.findOne({
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

  private toAdminResponse(document: DocumentRecord) {
    const { file, ...props } = document;
    const fileUrl = file ? this.filesService.buildPublicFileUrl(file.id) : null;
    const downloadUrl = file ? this.filesService.buildPublicFileUrl(file.id, { download: true }) : null;

    return {
      ...props,
      file: file
        ? {
            id: file.id,
            originalName: file.originalName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            url: fileUrl,
            fileUrl,
            downloadUrl,
          }
        : null,
    };
  }
}
