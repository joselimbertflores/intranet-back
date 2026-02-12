import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import { extname } from 'path';

import { DocumentType, DocumentSection, DocumentSubtype, DocumentRecord } from '../entities';
import { SearchPortalDocumentsDto } from '../dtos';
import { EnvironmentVariables } from 'src/config';

export interface PortalDocumentSections {
  id: string;
  name: string;
  slug: string;
  children: PortalDocumentSections[];
  parentId: string | null;
}

@Injectable()
export class DocumentSearchService {
  constructor(
    @InjectRepository(DocumentType) private docTypeRepository: Repository<DocumentType>,
    @InjectRepository(DocumentRecord) private documentRepository: Repository<DocumentRecord>,
    @InjectRepository(DocumentSubtype) private docSubtypeRepository: Repository<DocumentSubtype>,
    @InjectRepository(DocumentSection) private docSectionRepository: Repository<DocumentSection>,
    private configService: ConfigService<EnvironmentVariables>,
  ) {}

  async getSections() {
    const sections = await this.docSectionRepository.find({
      where: { isActive: true },
      relations: { parent: true },
      order: { level: 'ASC' },
    });
    return this.buildTreeSections(sections);
  }

  async getTypes() {
    const types = await this.docTypeRepository.find({ where: { isActive: true }, relations: { subtypes: true } });
    return types.map((type) => ({
      id: type.id,
      name: type.name,
      slug: type.slug,
      subtypes: type.subtypes.map((subtype) => ({
        id: subtype.id,
        name: subtype.name,
        slug: subtype.slug,
      })),
    }));
  }

  async searchDocuments(searchParamsDto: SearchPortalDocumentsDto) {
    const { limit, offset, term, ...props } = searchParamsDto;
    const { sectionId, typeId, subtypeId, fiscalYear } = await this.resolveFilters(props);
    const sectionsIds = sectionId ? await this.getSectionAndDescendantIds(sectionId) : [];

    const where: FindOptionsWhere<DocumentRecord> = {
      ...(term && { title: ILike(`%${term}%`) }),
      ...(sectionsIds.length > 0 && { section: { id: In(sectionsIds) } }),
      ...(typeId && { type: { id: typeId } }),
      ...(subtypeId && { subtype: { id: subtypeId } }),
      ...(fiscalYear && { fiscalYear }),
    };
    const [documents, total] = await this.documentRepository.findAndCount({
      where,
      relations: { section: true, type: true, subtype: true, file: true },
      order: { file: { downloadCount: 'desc' } },
      take: limit,
      skip: offset,
    });
    return { documents: this.plainDocuments(documents), total };
  }

  private buildTreeSections(sections: DocumentSection[]): PortalDocumentSections[] {
    const map = new Map<string, PortalDocumentSections>();
    const roots: PortalDocumentSections[] = [];

    for (const section of sections) {
      map.set(section.id, {
        id: section.id,
        name: section.name,
        slug: section.slug,
        parentId: section.parent?.id ?? null,
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
      sectionId?: string;
      typeId?: number;
      subtypeId?: number;
      fiscalYear?: number;
    } = {};

    if (dto.section) {
      const section = await this.docSectionRepository.findOne({
        where: { slug: dto.section },
        select: ['id'],
      });
      if (section) filters.sectionId = section.id;
    }

    if (dto.type) {
      const type = await this.docTypeRepository.findOne({
        where: { slug: dto.type },
        select: ['id'],
      });
      if (type) filters.typeId = type.id;
    }

    if (dto.subtype) {
      const subtype = await this.docSubtypeRepository.findOne({
        where: { slug: dto.subtype },
        select: ['id'],
      });
      if (subtype) filters.subtypeId = subtype.id;
    }

    if (dto.year) filters.fiscalYear = dto.year;

    return filters;
  }

  private async getSectionAndDescendantIds(id: string): Promise<string[]> {
    const ids: string[] = [];

    const collect = async (parentId: string) => {
      ids.push(parentId);

      const children = await this.docSectionRepository.find({
        where: { parent: { id: parentId } },
        select: ['id'],
      });

      for (const child of children) {
        await collect(child.id);
      }
    };

    await collect(id);
    return ids;
  }

  private plainDocuments(documents: DocumentRecord[]) {
    const host = this.configService.getOrThrow<string>('HOST');
    return documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      fiscalYear: doc.fiscalYear,
      createdAt: doc.createdAt,
      section: doc.section.name,
      type: doc.type.name,
      subtype: doc.subtype?.name,
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
