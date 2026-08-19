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
  id: number;
  name: string;
  slug: string;
  children: PortalOrganizationalUnit[];
  parentId: number | null;
}

@Injectable()
export class PublicDocumentsService {
  constructor(
    @InjectRepository(DocumentType) private readonly typeRepository: Repository<DocumentType>,
    @InjectRepository(DocumentRecord) private readonly documentRepository: Repository<DocumentRecord>,
    @InjectRepository(DocumentSubtype) private readonly subtypeRepository: Repository<DocumentSubtype>,
    @InjectRepository(OrganizationalUnit)
    private readonly organizationalUnitRepository: Repository<OrganizationalUnit>,
    private readonly organizationalUnitService: OrganizationalUnitService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async getActiveOrganizationalUnitTree() {
    const organizationalUnits = await this.organizationalUnitRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    return this.buildOrganizationalUnitTree(organizationalUnits);
  }

  async getActiveTypes() {
    const types = await this.typeRepository.find({
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

    const { organizationalUnitId, typeId, subtypeId, year } = filters;
    const organizationalUnitIds = organizationalUnitId
      ? await this.organizationalUnitService.getOrganizationalUnitAndDescendantIds(organizationalUnitId)
      : [];

    const query = this.createVisibleDocumentsQuery();

    if (term) query.andWhere('document.title ILIKE :term', { term: `%${term}%` });
    if (organizationalUnitIds.length > 0) {
      query.andWhere('organizational_unit.id IN (:...organizationalUnitIds)', { organizationalUnitIds });
    }
    if (typeId) query.andWhere('type.id = :typeId', { typeId });
    if (subtypeId) query.andWhere('subtype.id = :subtypeId', { subtypeId });
    if (year) query.andWhere('document.year = :year', { year });

    const [documents, total] = await query
      .orderBy('document.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { documents: this.mapToPublicDocuments(documents), total };
  }

  async findMostDownloaded(limit: number = 8) {
    const documents = await this.createVisibleDocumentsQuery()
      .orderBy('document.downloadCount', 'DESC')
      .addOrderBy('document.validityStatus', 'ASC')
      .addOrderBy('document.createdAt', 'DESC')
      .addOrderBy('document.id', 'ASC')
      .take(limit)
      .getMany();

    return this.mapToPublicDocuments(documents);
  }

  private buildOrganizationalUnitTree(organizationalUnits: OrganizationalUnit[]): PortalOrganizationalUnit[] {
    const map = new Map<number, PortalOrganizationalUnit>();
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
      organizationalUnitId?: number;
      typeId?: number;
      subtypeId?: number;
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
      const type = await this.typeRepository.findOne({
        where: { slug: dto.type, isActive: true },
        select: { id: true },
      });
      if (!type) return null;
      filters.typeId = type.id;
    }

    if (dto.subtype) {
      const matchingSubtypes = await this.subtypeRepository.find({
        where: {
          slug: dto.subtype,
          isActive: true,
          type: {
            isActive: true,
            ...(filters.typeId && { id: filters.typeId }),
          },
        },
        relations: { type: true },
        select: { id: true },
        take: filters.typeId ? 1 : 2,
      });
      if (matchingSubtypes.length !== 1) return null;
      filters.subtypeId = matchingSubtypes[0].id;
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
      .andWhere('(document.subtypeId IS NULL OR subtype.isActive = true)');
  }

  private mapToPublicDocuments(documents: DocumentRecord[]) {
    return documents.map((document) => ({
      id: document.id,
      title: document.title,
      year: document.year,
      organizationalUnit: document.organizationalUnit?.name ?? null,
      type: document.type.name,
      subtype: document.subtype?.name,
      downloadCount: document.downloadCount,
      validityStatus: document.validityStatus,
      createdAt: document.createdAt,
      file: {
        name: document.file.originalName,
        mimeType: document.file.mimeType,
        size: Number(document.file.sizeBytes),
        downloadUrl: this.buildDocumentDownloadUrl(document.id),
      },
    }));
  }

  private buildDocumentDownloadUrl(documentId: string) {
    const baseUrl = this.configService.getOrThrow('INTRANET_PUBLIC_URL', { infer: true });
    const url = new URL(`/api/portal-documents/${documentId}/file`, baseUrl);
    return `${url.toString()}?download=true`;
  }
}
