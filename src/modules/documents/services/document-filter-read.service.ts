import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DocumentType, DocumentSection } from '../entities';

export interface PortalDocumentSections {
  id: string;
  name: string;
  slug: string;
  children: PortalDocumentSections[];
  parentId: string | null;
}

@Injectable()
export class DocumentFilterReadService {
  constructor(
    @InjectRepository(DocumentType) private docTypeRepository: Repository<DocumentType>,
    @InjectRepository(DocumentSection) private docSectionRepository: Repository<DocumentSection>,
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
}
