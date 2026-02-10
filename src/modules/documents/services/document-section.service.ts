import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateSectionDto, UpdateSectionDto } from '../dtos';
import { DocumentSection } from '../entities/document-section.entity';
import { SectionTreeNode } from '../interfaces';
import { generateSlug } from 'src/helpers';

@Injectable()
export class DocumentSectionService {
  constructor(
    @InjectRepository(DocumentSection)
    private readonly sectionRepository: Repository<DocumentSection>,
  ) {}

  async findAll(): Promise<DocumentSection[]> {
    return this.sectionRepository.find({
      relations: ['parent'],
      order: {
        level: 'ASC',
        name: 'ASC',
      },
    });
  }

  async create(dto: CreateSectionDto) {
    const { parentId, ...props } = dto;
    let parent: DocumentSection | null = null;

    if (parentId) {
      parent = await this.sectionRepository.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent section not found');
    }

    const level = parent ? parent.level + 1 : 0;

    const slug = generateSlug(dto.name);

    const section = this.sectionRepository.create({
      ...props,
      parent: parent,
      slug,
      level,
    });

    return this.sectionRepository.save(section);
  }

  async update(id: string, dto: UpdateSectionDto) {
    const section = await this.sectionRepository.findOne({
      where: { id },
      relations: { parent: true },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }
    if (dto.name && dto.name.toLowerCase().trim() !== section.name.toLowerCase().trim()) {
      section.slug = generateSlug(dto.name);
    }
    return await this.sectionRepository.save({ ...section, ...dto });
  }

  async getTree(params?: { onlyActive: boolean }) {
    const sections = await this.sectionRepository.find({
      ...(params && { where: { isActive: params.onlyActive } }),
      relations: { parent: true },
      order: {
        createdAt: 'desc',
        level: 'ASC',
      },
    });
    return this.buildTree(sections);
  }

  async getSectionAndDescendantIds(id: string): Promise<string[]> {
    const section = await this.sectionRepository.findOne({
      where: { id: id },
      relations: { children: true },
    });
    if (!section) return [];

    const ids: string[] = [];

    const collect = (node: DocumentSection) => {
      ids.push(node.id);
      node.children?.forEach(collect);
    };

    collect(section);
    return ids;
  }

  private buildTree(sections: DocumentSection[]): SectionTreeNode[] {
    const map = new Map<string, SectionTreeNode>();
    const roots: SectionTreeNode[] = [];

    for (const section of sections) {
      map.set(section.id, {
        id: section.id,
        name: section.name,
        slug: section.slug,
        level: section.level,
        isActive: section.isActive,
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
