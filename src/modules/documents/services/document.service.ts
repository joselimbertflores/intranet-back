import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, FindOptionsWhere, ILike, In, Repository } from 'typeorm';

import { DocumentRecord, DocumentStatus, OrganizationalUnit, DocumentType, DocumentSubtype } from '../entities';
import { CreateDocumentsDto, NewFilterDocumentsDto, UpdateDocumentDto } from '../dtos';
import { User } from 'src/modules/users/entities';
import { OrganizationalUnitService } from './organizational-unit.service';
import { FilesService } from 'src/modules/files/files.service';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentType) private docTypeRepository: Repository<DocumentType>,
    @InjectRepository(DocumentRecord) private docRepository: Repository<DocumentRecord>,
    @InjectRepository(OrganizationalUnit) private organizationalUnitRepository: Repository<OrganizationalUnit>,
    @InjectRepository(DocumentSubtype) private docSubtypeRepository: Repository<DocumentSubtype>,
    private organizationalUnitService: OrganizationalUnitService,
    private filesService: FilesService,
    private dataSource: DataSource,
  ) {}

  async findAll(filterParamsDto: NewFilterDocumentsDto, _authUser: User) {
    const { limit, offset, term, fiscalYear, organizationalUnitId, documentTypeId, documentSubtypeId, status } =
      filterParamsDto;
    const organizationalUnitIds = organizationalUnitId
      ? await this.organizationalUnitService.getOrganizationalUnitAndDescendantIds(organizationalUnitId)
      : undefined;
    const where: FindOptionsWhere<DocumentRecord> = {
      ...(term && { title: ILike(`%${term}%`) }),
      ...(organizationalUnitIds && { organizationalUnit: { id: In(organizationalUnitIds) } }),
      ...(documentTypeId && { documentType: { id: documentTypeId } }),
      ...(documentSubtypeId && { documentSubtype: { id: documentSubtypeId } }),
      ...(fiscalYear && { fiscalYear }),
      ...(status && { status }),
    };
    const [documents, total] = await this.docRepository.findAndCount({
      where,
      relations: { organizationalUnit: true, documentType: true, documentSubtype: true, file: true },
      order: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return { documents, total };
  }

  async create(dto: CreateDocumentsDto, _authUser: User) {
    const { documents, organizationalUnitId, documentTypeId, documentSubtypeId, fiscalYear } = dto;
    const { organizationalUnit, documentType, documentSubtype } = await this.getValidDocumentProps(
      organizationalUnitId,
      documentTypeId,
      documentSubtypeId,
    );
    return this.dataSource.transaction(async (manager) => {
      const models: DocumentRecord[] = [];

      for (const doc of documents) {
        const file = await this.filesService.claimPendingFileWithDerivedFiles(doc.fileId, manager);

        models.push(
          manager.create(DocumentRecord, {
            fiscalYear: fiscalYear ?? null,
            organizationalUnit,
            documentType,
            documentSubtype,
            file,
            title: doc.title ?? file.originalName,
          }),
        );
      }

      return manager.save(models);
    });
  }

  async update(id: string, dto: UpdateDocumentDto) {
    const document = await this.docRepository.findOne({
      where: { id },
      relations: { organizationalUnit: true, documentType: true, documentSubtype: true, file: true },
    });
    if (!document) throw new NotFoundException(`Document ${id} not found`);

    if (this.hasClassificationChanges(dto)) {
      const { organizationalUnit, documentType, documentSubtype } = await this.getValidDocumentProps(
        dto.organizationalUnitId ?? document.organizationalUnitId,
        dto.documentTypeId ?? document.documentTypeId,
        dto.documentSubtypeId === undefined
          ? (document.documentSubtypeId ?? undefined)
          : (dto.documentSubtypeId ?? undefined),
      );
      document.organizationalUnit = organizationalUnit;
      document.documentType = documentType;
      document.documentSubtype = documentSubtype ?? null;
    }

    if (dto.title !== undefined) document.title = dto.title;
    if (Object.prototype.hasOwnProperty.call(dto, 'fiscalYear')) document.fiscalYear = dto.fiscalYear ?? null;
    if (dto.status !== undefined) document.status = dto.status;

    const newFileId = dto.fileId;
    if (newFileId && newFileId !== document.fileId) {
      return this.dataSource.transaction(async (manager) => {
        const newFile = await this.filesService.replaceActiveFile(document.fileId, newFileId, manager);
        document.file = newFile;
        document.fileId = newFile.id;

        return manager.save(DocumentRecord, document);
      });
    }

    return this.docRepository.save(document);
  }

  private async getValidDocumentProps(
    organizationalUnitId: string,
    documentTypeId: number,
    documentSubtypeId: number | undefined,
  ) {
    const organizationalUnit = await this.organizationalUnitRepository.findOneBy({
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
    if (documentSubtypeId) {
      documentSubtype = await this.docSubtypeRepository.findOne({
        where: {
          id: documentSubtypeId,
          documentType: { id: documentType.id },
          isActive: true,
        },
      });
      if (!documentSubtype) {
        throw new BadRequestException(
          `Document subtype ${documentSubtypeId} not found, inactive, or does not belong to type ${documentTypeId}`,
        );
      }
    }
    return { organizationalUnit, documentType, documentSubtype };
  }

  private hasClassificationChanges(dto: UpdateDocumentDto) {
    return (
      dto.organizationalUnitId !== undefined ||
      dto.documentTypeId !== undefined ||
      Object.prototype.hasOwnProperty.call(dto, 'documentSubtypeId')
    );
  }
}
