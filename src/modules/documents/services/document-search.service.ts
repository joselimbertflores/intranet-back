import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { extname } from 'path';

import { DocumentRecord, DocumentStatus, DocumentSubtype, DocumentType, OrganizationalUnit } from '../entities';
import { SearchPortalDocumentsDto } from '../dtos';
import { EnvironmentVariables } from 'src/config';
import { FileStatus } from 'src/modules/files/entities/stored-file.entity';

export interface PortalOrganizationalUnit {
  id: string;
  name: string;
  slug: string;
  children: PortalOrganizationalUnit[];
  parentId: string | null;
}

@Injectable()
export class DocumentSearchService {
  constructor(
    @InjectRepository(DocumentType) private docTypeRepository: Repository<DocumentType>,
    @InjectRepository(DocumentRecord) private documentRepository: Repository<DocumentRecord>,
    @InjectRepository(DocumentSubtype) private docSubtypeRepository: Repository<DocumentSubtype>,
    @InjectRepository(OrganizationalUnit) private organizationalUnitRepository: Repository<OrganizationalUnit>,
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
    const { organizationalUnitId, documentTypeId, documentSubtypeId, fiscalYear } = await this.resolveFilters(props);
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
    if (fiscalYear) query.andWhere('document.fiscal_year = :fiscalYear', { fiscalYear });

    const [documents, total] = await query
      .orderBy('file.downloadCount', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { documents: this.plainDocuments(documents), total };
  }

  async getMostDownloaded() {
    const documents = await this.createVisibleDocumentsQuery().orderBy('file.downloadCount', 'DESC').take(8).getMany();

    return this.plainDocuments(documents);
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
      fiscalYear?: number;
    } = {};

    if (dto.organizationalUnit) {
      const organizationalUnit = await this.organizationalUnitRepository.findOne({
        where: { slug: dto.organizationalUnit },
        select: { id: true },
      });
      if (organizationalUnit) filters.organizationalUnitId = organizationalUnit.id;
    }

    if (dto.documentType) {
      const type = await this.docTypeRepository.findOne({
        where: { slug: dto.documentType },
        select: { id: true },
      });
      if (type) filters.documentTypeId = type.id;
    }

    if (dto.documentSubtype) {
      const subtype = await this.docSubtypeRepository.findOne({
        where: { slug: dto.documentSubtype },
        select: { id: true },
      });
      if (subtype) filters.documentSubtypeId = subtype.id;
    }

    if (dto.year) filters.fiscalYear = dto.year;

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
      .innerJoinAndSelect('document.documentType', 'document_type', 'document_type."isActive" = true')
      .leftJoinAndSelect('document.documentSubtype', 'document_subtype')
      .innerJoinAndSelect('document.organizationalUnit', 'organizational_unit')
      .where('document.status = :documentStatus', { documentStatus: DocumentStatus.ACTIVE })
      .andWhere('(document.document_subtype_id IS NULL OR document_subtype."isActive" = true)');
  }

  private plainDocuments(documents: DocumentRecord[]) {
    const host = this.configService.getOrThrow<string>('HOST');
    return documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      fiscalYear: doc.fiscalYear,
      createdAt: doc.createdAt,
      organizationalUnit: doc.organizationalUnit.name,
      documentType: doc.documentType.name,
      documentSubtype: doc.documentSubtype?.name,
      file: {
        id: doc.file.id,
        url: `${host}/files/${doc.file.id}?download=true`,
        name: doc.file.originalName,
        size: Number(doc.file.sizeBytes),
        extension: extname(doc.file.storedName).slice(1).toLowerCase() || 'file',
        downloadCount: doc.file.downloadCount,
      },
    }));
  }
}
