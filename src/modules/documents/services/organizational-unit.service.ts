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
    private readonly orgUnitRepository: Repository<OrganizationalUnit>,
  ) {}

  async create(dto: CreateOrganizationalUnitDto) {
    const { parentId, ...props } = dto;
    let parent: OrganizationalUnit | null = null;

    if (parentId) {
      parent = await this.orgUnitRepository.findOne({ where: { id: parentId, isActive: true } });
      if (!parent) throw new NotFoundException('Parent organizational unit not found or inactive');
    }

    const organizationalUnit = this.orgUnitRepository.create({
      ...props,
      parent,
    });

    return this.orgUnitRepository.save(organizationalUnit);
  }

  async update(id: string, dto: UpdateOrganizationalUnitDto) {
    const organizationalUnit = await this.orgUnitRepository.findOneBy({ id });

    if (!organizationalUnit) {
      throw new NotFoundException('Organizational unit not found');
    }

    Object.assign(organizationalUnit, dto);

    return this.orgUnitRepository.save(organizationalUnit);
  }

  async getTree(params?: { onlyActive?: boolean }) {
    const organizationalUnits = await this.orgUnitRepository.find({
      ...(params?.onlyActive && { where: { isActive: true } }),
      order: {
        name: 'ASC',
      },
    });
    return this.buildTree(organizationalUnits);
  }

  async getOrganizationalUnitAndDescendantIds(id: string): Promise<string[]> {
    const organizationalUnit = await this.orgUnitRepository.findOne({ where: { id } });
    if (!organizationalUnit) return [];

    const ids: string[] = [];

    const collect = async (parentId: string) => {
      ids.push(parentId);

      const children = await this.orgUnitRepository.find({
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
