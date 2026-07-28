import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { Repository } from 'typeorm';

import { DocumentRecord, DocumentStatus, DocumentSubtype, DocumentType, OrganizationalUnit } from '../entities';
import { FileStatus } from 'src/modules/files/entities/stored-file.entity';
import { SearchPublicDocumentsDto } from '../dtos';
import { EnvironmentVariables } from 'src/config';
import { OrganizationalUnitService } from './organizational-unit.service';

export interface PortalOrganizationalUnit {
  id: string;
  name: string;
  slug: string;
  children: PortalOrganizationalUnit[];
  parentId: string | null;
}

@Injectable()
export class PublicDocumentsService {
  constructor(
    @InjectRepository(DocumentType) private readonly documentTypeRepository: Repository<DocumentType>,
    @InjectRepository(DocumentRecord) private readonly documentRepository: Repository<DocumentRecord>,
    @InjectRepository(DocumentSubtype) private readonly documentSubtypeRepository: Repository<DocumentSubtype>,
    @InjectRepository(OrganizationalUnit)
    private readonly organizationalUnitRepository: Repository<OrganizationalUnit>,
    private readonly organizationalUnitService: OrganizationalUnitService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  async getActiveOrganizationalUnitTree() {
    const organizationalUnits = await this.organizationalUnitRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    return this.buildOrganizationalUnitTree(organizationalUnits);
  }

  async getActiveDocumentTypes() {
    const types = await this.documentTypeRepository.find({
      where: { isActive: true },
      relations: { subtypes: true },
    });
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

  async searchDocuments(searchParamsDto: SearchPublicDocumentsDto) {
    const { limit, offset, term, ...props } = searchParamsDto;
    const filters = await this.resolveFilters(props);

    if (!filters) {
      return { documents: [], total: 0 };
    }

    const { organizationalUnitId, documentTypeId, documentSubtypeId, year } = filters;
    const organizationalUnitIds = organizationalUnitId
      ? await this.organizationalUnitService.getOrganizationalUnitAndDescendantIds(organizationalUnitId)
      : [];

    const query = this.createVisibleDocumentsQuery();

    if (term) query.andWhere('document.title ILIKE :term', { term: `%${term}%` });
    if (organizationalUnitIds.length > 0) {
      query.andWhere('organizational_unit.id IN (:...organizationalUnitIds)', { organizationalUnitIds });
    }
    if (documentTypeId) query.andWhere('type.id = :documentTypeId', { documentTypeId });
    if (documentSubtypeId) query.andWhere('subtype.id = :documentSubtypeId', { documentSubtypeId });
    if (year) query.andWhere('document.year = :year', { year });

    const [documents, total] = await query
      .orderBy('document.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { documents: this.mapToPublicDocuments(documents), total };
  }

  async findMostDownloaded() {
    const documents = await this.createVisibleDocumentsQuery()
      .andWhere('document.downloadCount >= :minimumDownloadCount', { minimumDownloadCount: 1 })
      .orderBy('document.downloadCount', 'DESC')
      .addOrderBy('document.createdAt', 'DESC')
      .take(8)
      .getMany();

    return this.mapToPublicDocuments(documents);
  }

  private buildOrganizationalUnitTree(organizationalUnits: OrganizationalUnit[]): PortalOrganizationalUnit[] {
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

  private async resolveFilters(dto: SearchPublicDocumentsDto) {
    const filters: {
      organizationalUnitId?: string;
      documentTypeId?: number;
      documentSubtypeId?: number;
      year?: number;
    } = {};

    if (dto.organizationalUnit) {
      const matchingOrganizationalUnits = await this.organizationalUnitRepository.find({
        where: { slug: dto.organizationalUnit, isActive: true },
        select: { id: true },
        take: 2,
      });
      if (matchingOrganizationalUnits.length !== 1) return null;
      filters.organizationalUnitId = matchingOrganizationalUnits[0].id;
    }

    if (dto.type) {
      const type = await this.documentTypeRepository.findOne({
        where: { slug: dto.type, isActive: true },
        select: { id: true },
      });
      if (!type) return null;
      filters.documentTypeId = type.id;
    }

    if (dto.subtype) {
      const matchingSubtypes = await this.documentSubtypeRepository.find({
        where: {
          slug: dto.subtype,
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
      if (matchingSubtypes.length !== 1) return null;
      filters.documentSubtypeId = matchingSubtypes[0].id;
    }

    if (dto.year) filters.year = dto.year;

    return filters;
  }

  private createVisibleDocumentsQuery() {
    return this.documentRepository
      .createQueryBuilder('document')
      .innerJoinAndSelect('document.file', 'file', 'file.status = :fileStatus', { fileStatus: FileStatus.ACTIVE })
      .innerJoinAndSelect('document.type', 'type', 'type.isActive = true')
      .leftJoinAndSelect('document.subtype', 'subtype')
      .leftJoinAndSelect('document.organizationalUnit', 'organizational_unit')
      .where('document.status = :documentStatus', { documentStatus: DocumentStatus.ACTIVE })
      .andWhere('(document.documentSubtypeId IS NULL OR subtype.isActive = true)');
  }

  private mapToPublicDocuments(documents: DocumentRecord[]) {
    return documents.map((document) => ({
      id: document.id,
      title: document.title,
      year: document.year,
      organizationalUnit: document.organizationalUnit?.name ?? null,
      type: document.type.name,
      subtype: document.subtype?.name,
      downloadCount: document.downloadCount ?? 0,
      file: {
        name: document.file.originalName,
        mimeType: document.file.mimeType,
        size: Number(document.file.sizeBytes),
        downloadUrl: this.buildDocumentDownloadUrl(document.id),
      },
    }));
  }

  private buildDocumentDownloadUrl(documentId: string) {
    const baseUrl = this.configService.getOrThrow<string>('APP_PUBLIC_URL');
    const url = new URL(`/api/portal-documents/${documentId}/file`, baseUrl);
    return `${url.toString()}?download=true`;
  }
}
