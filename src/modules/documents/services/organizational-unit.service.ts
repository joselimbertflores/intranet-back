import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateOrganizationalUnitDto, UpdateOrganizationalUnitDto } from '../dtos';
import { OrganizationalUnit } from '../entities/organizational-unit.entity';
import { OrganizationalUnitTreeNode } from '../interfaces';

@Injectable()
export class OrganizationalUnitService {
  constructor(
    @InjectRepository(OrganizationalUnit)
    private readonly organizationalUnitRepository: Repository<OrganizationalUnit>,
  ) {}

  async findAll(): Promise<OrganizationalUnit[]> {
    return this.organizationalUnitRepository.find({
      relations: { parent: true },
      order: {
        name: 'ASC',
      },
    });
  }

  async create(dto: CreateOrganizationalUnitDto) {
    const { parentId, ...props } = dto;
    let parent: OrganizationalUnit | null = null;

    if (parentId) {
      parent = await this.organizationalUnitRepository.findOne({ where: { id: parentId } });
      if (!parent) throw new NotFoundException('Parent organizational unit not found');
    }

    const organizationalUnit = this.organizationalUnitRepository.create({
      ...props,
      parent,
      parentId: parent?.id ?? null,
    });

    return this.organizationalUnitRepository.save(organizationalUnit);
  }

  async update(id: string, dto: UpdateOrganizationalUnitDto) {
    const organizationalUnit = await this.organizationalUnitRepository.findOne({
      where: { id },
      relations: { parent: true },
    });

    if (!organizationalUnit) {
      throw new NotFoundException('Organizational unit not found');
    }

    return this.organizationalUnitRepository.save({ ...organizationalUnit, ...dto });
  }

  async getTree(params?: { onlyActive?: boolean }) {
    const organizationalUnits = await this.organizationalUnitRepository.find({
      ...(params?.onlyActive && { where: { isActive: true } }),
      relations: { parent: true },
      order: {
        name: 'ASC',
      },
    });
    return this.buildTree(organizationalUnits);
  }

  async getOrganizationalUnitAndDescendantIds(id: string): Promise<string[]> {
    const organizationalUnit = await this.organizationalUnitRepository.findOne({ where: { id } });
    if (!organizationalUnit) return [];

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

    await collect(organizationalUnit.id);
    return ids;
  }

  private buildTree(organizationalUnits: OrganizationalUnit[]): OrganizationalUnitTreeNode[] {
    const map = new Map<string, OrganizationalUnitTreeNode>();
    const roots: OrganizationalUnitTreeNode[] = [];

    for (const organizationalUnit of organizationalUnits) {
      map.set(organizationalUnit.id, {
        id: organizationalUnit.id,
        name: organizationalUnit.name,
        slug: organizationalUnit.slug,
        isActive: organizationalUnit.isActive,
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
}
