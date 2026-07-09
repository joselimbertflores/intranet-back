import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { Repository } from 'typeorm';

import { DocumentRecord, DocumentStatus, DocumentSubtype, DocumentType, OrganizationalUnit } from '../entities';
import { FileStatus } from 'src/modules/files/entities/stored-file.entity';
import { FilesService } from 'src/modules/files/files.service';
import { SearchPortalDocumentsDto } from '../dtos';
import { EnvironmentVariables } from 'src/config';

export interface PortalOrganizationalUnit {
  id: string;
  name: string;
  slug: string;
  children: PortalOrganizationalUnit[];
  parentId: string | null;
}

@Injectable()
export class PublicDocumentService {
  constructor(
    @InjectRepository(DocumentType) private docTypeRepository: Repository<DocumentType>,
    @InjectRepository(DocumentRecord) private documentRepository: Repository<DocumentRecord>,
    @InjectRepository(DocumentSubtype) private docSubtypeRepository: Repository<DocumentSubtype>,
    @InjectRepository(OrganizationalUnit) private organizationalUnitRepository: Repository<OrganizationalUnit>,
    private filesService: FilesService,
    private configService: ConfigService<EnvironmentVariables>,
  ) {}

  async getOrganizationalUnits() {
    const organizationalUnits = await this.organizationalUnitRepository.find({
      where: { isActive: true },
      relations: { parent: true },
      order: { name: 'ASC' },
    });
    return this.buildTreeOrganizationalUnits(organizationalUnits);
  }

  async getTypes() {
    const types = await this.docTypeRepository.find({ where: { isActive: true }, relations: { subtypes: true } });
    return types.map((type) => ({
      id: type.id,
      name: type.name,
      slug: type.slug,
      subtypes: type.subtypes
        .filter((subtype) => subtype.isActive)
        .map((subtype) => ({
          id: subtype.id,
          name: subtype.name,
          slug: subtype.slug,
        })),
    }));
  }

  async searchDocuments(searchParamsDto: SearchPortalDocumentsDto) {
    const { limit, offset, term, ...props } = searchParamsDto;
    const { organizationalUnitId, documentTypeId, documentSubtypeId, year } = await this.resolveFilters(props);
    const organizationalUnitIds = organizationalUnitId
      ? await this.getOrganizationalUnitAndDescendantIds(organizationalUnitId)
      : [];

    const query = this.createVisibleDocumentsQuery();

    if (term) query.andWhere('document.title ILIKE :term', { term: `%${term}%` });
    if (organizationalUnitIds.length > 0) {
      query.andWhere('organizational_unit.id IN (:...organizationalUnitIds)', { organizationalUnitIds });
    }
    if (documentTypeId) query.andWhere('document_type.id = :documentTypeId', { documentTypeId });
    if (documentSubtypeId) query.andWhere('document_subtype.id = :documentSubtypeId', { documentSubtypeId });
    if (year) query.andWhere('document.year = :year', { year });

    const [documents, total] = await query
      .orderBy('document.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { documents: this.plainDocuments(documents), total };
  }

  async getDocumentFileStream(documentId: string, options?: { countDownload?: boolean }) {
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
        status: DocumentStatus.ACTIVE,
      },
      relations: {
        file: true,
      },
    });

    if (!document) throw new NotFoundException('Document not found');

    const result = await this.filesService.getActiveFileStream(document.file.id);

    
    if (options?.countDownload) {
      await this.documentRepository.increment({ id: document.id }, 'downloadCount', 1);
    }

    return result;
  }

  async getMostDownloaded() {
    const documents = await this.createVisibleDocumentsQuery()
      .orderBy('document.downloadCount', 'DESC')
      .addOrderBy('document.createdAt', 'DESC')
      .take(8)
      .getMany();

    return this.plainDocuments(documents);
  }

  async incrementDownloadCount(id: string) {
    const document = await this.createVisibleDocumentsQuery().andWhere('document.id = :id', { id }).getOne();

    if (!document) throw new NotFoundException(`Document ${id} not found`);

    await this.documentRepository.increment({ id: document.id }, 'downloadCount', 1);

    return {
      id: document.id,
      downloadCount: document.downloadCount + 1,
    };
  }

  private buildTreeOrganizationalUnits(organizationalUnits: OrganizationalUnit[]): PortalOrganizationalUnit[] {
    const map = new Map<string, PortalOrganizationalUnit>();
    const roots: PortalOrganizationalUnit[] = [];

    for (const organizationalUnit of organizationalUnits) {
      map.set(organizationalUnit.id, {
        id: organizationalUnit.id,
        name: organizationalUnit.name,
        slug: organizationalUnit.slug,
        parentId: organizationalUnit.parentId,
        children: [],
      });
    }

    for (const node of map.values()) {
      if (node.parentId) {
        const parent = map.get(node.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private async resolveFilters(dto: SearchPortalDocumentsDto) {
    const filters: {
      organizationalUnitId?: string;
      documentTypeId?: number;
      documentSubtypeId?: number;
      year?: number;
    } = {};

    if (dto.organizationalUnit) {
      const organizationalUnit = await this.organizationalUnitRepository.findOne({
        where: { slug: dto.organizationalUnit, isActive: true },
        select: { id: true },
      });
      if (organizationalUnit) filters.organizationalUnitId = organizationalUnit.id;
    }

    if (dto.documentType) {
      const type = await this.docTypeRepository.findOne({
        where: { slug: dto.documentType, isActive: true },
        select: { id: true },
      });
      if (type) filters.documentTypeId = type.id;
    }

    if (dto.documentSubtype) {
      const matchingSubtypes = await this.docSubtypeRepository.find({
        where: {
          slug: dto.documentSubtype,
          isActive: true,
          documentType: {
            isActive: true,
            ...(filters.documentTypeId && { id: filters.documentTypeId }),
          },
        },
        relations: { documentType: true },
        select: { id: true },
        take: filters.documentTypeId ? 1 : 2,
      });
      if (matchingSubtypes.length === 1) filters.documentSubtypeId = matchingSubtypes[0].id;
    }

    if (dto.year) filters.year = dto.year;

    return filters;
  }

  private async getOrganizationalUnitAndDescendantIds(id: string): Promise<string[]> {
    const ids: string[] = [];

    const collect = async (parentId: string) => {
      ids.push(parentId);

      const children = await this.organizationalUnitRepository.find({
        where: { parentId },
        select: { id: true },
      });

      for (const child of children) {
        await collect(child.id);
      }
    };

    await collect(id);
    return ids;
  }

  private createVisibleDocumentsQuery() {
    return this.documentRepository
      .createQueryBuilder('document')
      .innerJoinAndSelect('document.file', 'file', 'file.status = :fileStatus', { fileStatus: FileStatus.ACTIVE })
      .innerJoinAndSelect('document.documentType', 'document_type', 'document_type.isActive = true')
      .leftJoinAndSelect('document.documentSubtype', 'document_subtype')
      .innerJoinAndSelect('document.organizationalUnit', 'organizational_unit')
      .where('document.status = :documentStatus', { documentStatus: DocumentStatus.ACTIVE })
      .andWhere('(document.documentSubtypeId IS NULL OR document_subtype.isActive = true)');
  }

  private plainDocuments(documents: DocumentRecord[]) {
    return documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      year: doc.year,
      organizationalUnit: doc.organizationalUnit.name,
      documentType: doc.documentType.name,
      documentSubtype: doc.documentSubtype?.name,
      downloadCount: doc.downloadCount ?? 0,
      file: {
        name: doc.file.originalName,
        mimeType: doc.file.mimeType,
        size: Number(doc.file.sizeBytes),
        downloadUrl: this.buildDocumentDownloadUrl(doc.id),
      },
    }));
  }

  private buildDocumentDownloadUrl(documentId: string) {
    const baseUrl = this.configService.getOrThrow<string>('APP_PUBLIC_URL');
    const url = new URL(`/api/portal-documents/${documentId}/file`, baseUrl);
    return `${url.toString()}?download=true`;
  }
}
