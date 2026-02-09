import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateSectionDto, UpdateSectionDto } from '../dtos';
import { Section } from '../entities/section.entity';
import { SectionTreeNode } from '../interfaces';
import { generateSlug } from 'src/helpers';

@Injectable()
export class SectionService {
  constructor(
    @InjectRepository(Section)
    private readonly sectionRepository: Repository<Section>,
  ) {}

  async create(dto: CreateSectionDto) {
    const { parentId, ...props } = dto;
    let parent: Section | null = null;

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

  async findAll(): Promise<Section[]> {
    return this.sectionRepository.find({
      relations: ['parent'],
      order: {
        level: 'ASC',
        name: 'ASC',
      },
    });
  }

  private buildTree(sections: Section[]): SectionTreeNode[] {
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
