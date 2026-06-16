import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, FindOptionsWhere, ILike, In, Repository } from 'typeorm';

import { DocumentRecord, DocumentStatus, OrganizationalUnit, DocumentType, DocumentSubtype } from '../entities';
import {
  CreateDocumentBatchDto,
  DocumentAdminResponseDto,
  DocumentFileResponseDto,
  FilterDocumentsDto,
  UpdateDocumentDto,
} from '../dtos';
import { OrganizationalUnitService } from './organizational-unit.service';
import { FilesService } from 'src/modules/files/files.service';
import { FileStatus, StoredFile, StoredFileKind } from 'src/modules/files/entities/stored-file.entity';

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
    const { term, limit, offset, status, fiscalYear, documentTypeId, documentSubtypeId, organizationalUnitId } =
      filterParamsDto;

    const organizationalUnitIds = organizationalUnitId
      ? await this.organizationalUnitService.getOrganizationalUnitAndDescendantIds(organizationalUnitId)
      : undefined;

    const where: FindOptionsWhere<DocumentRecord> = {
      ...(term && { title: ILike(`%${term}%`) }),
      ...(organizationalUnitIds && { organizationalUnit: { id: In(organizationalUnitIds) } }),
      ...(documentTypeId && { documentType: { id: documentTypeId } }),
      ...(documentSubtypeId && { documentSubtype: { id: documentSubtypeId } }),
      ...(fiscalYear && { year: fiscalYear }),
      ...(status && { status }),
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

    if (organizationalUnitId) {
      document.organizationalUnit = await this.getActiveOrganizationalUnitOrFail(organizationalUnitId);
    }

    if (documentTypeId || documentSubtypeId) {
      const { documentType, documentSubtype } = await this.getActiveDocumentTypeWithSubtypeOrFail(
        documentTypeId ?? document.documentType.id,
        documentSubtypeId,
      );
      document.documentType = documentType;
      document.documentSubtype = documentSubtype;
    }

    return this.dataSource.transaction(async (manager) => {
      if (fileId && fileId !== document.fileId) {
        await this.filesService.markActiveFileAsOrphaned(document.fileId, manager);
        document.file = await this.filesService.claimPendingFile(fileId, manager);
      }
      const savedDocument = await manager.save(document);

      return this.toAdminResponse(savedDocument);
    });
  }

  private async getValidDocumentRelations({
    organizationalUnitId,
    documentTypeId,
    documentSubtypeId,
  }: CreateDocumentBatchDto) {
    const organizationalUnit = await this.orgUnitRepository.findOneBy({
      id: organizationalUnitId,
      isActive: true,
    });
    if (!organizationalUnit) {
      throw new BadRequestException(`Organizational unit ${organizationalUnitId} not found or inactive`);
    }

    const documentType = await this.docTypeRepository.findOneBy({ id: documentTypeId, isActive: true });
    if (!documentType) {
      throw new BadRequestException(`Document type ${documentTypeId} not found or inactive`);
    }

    let documentSubtype: DocumentSubtype | null = null;

    if (documentSubtypeId != null) {
      documentSubtype = await this.docSubtypeRepository.findOne({
        where: {
          id: documentSubtypeId,
          isActive: true,
          documentTypeId,
        },
      });
      if (!documentSubtype) {
        throw new BadRequestException(
          `Document subtype ${documentSubtypeId} not found, inactive or does not belong to type ${documentTypeId}`,
        );
      }
    }

    return { organizationalUnit, documentType, documentSubtype };
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

  private toAdminResponse(document: DocumentRecord): DocumentAdminResponseDto {
    return {
      id: document.id,
      title: document.title,
      fiscalYear: document.year,
      status: document.status,
      documentType: {
        id: document.documentType.id,
        name: document.documentType.name,
        slug: document.documentType.slug,
        isActive: document.documentType.isActive,
      },
      documentSubtype: document.documentSubtype
        ? {
            id: document.documentSubtype.id,
            name: document.documentSubtype.name,
            slug: document.documentSubtype.slug,
            isActive: document.documentSubtype.isActive,
          }
        : null,
      organizationalUnit: {
        id: document.organizationalUnit.id,
        name: document.organizationalUnit.name,
        slug: document.organizationalUnit.slug,
        isActive: document.organizationalUnit.isActive,
      },
      file: {
        id: document.file.id,
        originalName: document.file.originalName,
        mimeType: document.file.mimeType,
        sizeBytes: document.file.sizeBytes,
        url: this.filesService.buildPublicFileUrl(document.file.id),
      },
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
