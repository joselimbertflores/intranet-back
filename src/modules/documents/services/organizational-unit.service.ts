import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { CreateOrganizationalUnitDto, UpdateOrganizationalUnitDto } from '../dtos';
import { DocumentRecord, OrganizationalUnit } from '../entities';
import { OrganizationalUnitTreeNode } from '../interfaces';

@Injectable()
export class OrganizationalUnitService {
  constructor(
    @InjectRepository(OrganizationalUnit)
    private readonly organizationalUnitRepository: Repository<OrganizationalUnit>,
    @InjectRepository(DocumentRecord)
    private readonly documentRepository: Repository<DocumentRecord>,
  ) {}

  async create(dto: CreateOrganizationalUnitDto) {
    const { parentId, ...props } = dto;
    let parent: OrganizationalUnit | null = null;

    if (parentId) {
      parent = await this.organizationalUnitRepository.findOne({ where: { id: parentId, isActive: true } });
      if (!parent) throw new NotFoundException('Parent organizational unit not found or inactive.');
    }

    const organizationalUnit = this.organizationalUnitRepository.create({
      ...props,
      parent,
    });

    return this.organizationalUnitRepository.save(organizationalUnit);
  }

  async update(id: number, dto: UpdateOrganizationalUnitDto) {
    const organizationalUnit = await this.organizationalUnitRepository.findOneBy({ id });

    if (!organizationalUnit) {
      throw new NotFoundException('Organizational unit not found.');
    }

    Object.assign(organizationalUnit, dto);

    return this.organizationalUnitRepository.save(organizationalUnit);
  }

  async remove(id: number) {
    const unit = await this.organizationalUnitRepository.findOneBy({ id });

    if (!unit) throw new NotFoundException('Organizational unit not found.');

    const [isAssignedToDocuments, hasChildren] = await Promise.all([
      this.documentRepository.exists({ where: { organizationalUnit: { id } } }),
      this.organizationalUnitRepository.exists({ where: { parent: { id } } }),
    ]);

    if (isAssignedToDocuments) {
      throw new ConflictException('The organizational unit cannot be deleted because it is assigned to documents.');
    }

    if (hasChildren) {
      throw new ConflictException('The organizational unit cannot be deleted because it has child units.');
    }

    await this.organizationalUnitRepository.remove(unit);
  }
  
  async getTree(params?: { onlyActive?: boolean }) {
    const organizationalUnits = await this.organizationalUnitRepository.find({
      ...(params?.onlyActive && { where: { isActive: true } }),
      order: {
        name: 'ASC',
      },
    });
    return this.buildTree(organizationalUnits);
  }

  async getOrganizationalUnitAndDescendantIds(id: number): Promise<number[]> {
    const organizationalUnits = await this.organizationalUnitRepository.find({
      select: {
        id: true,
        parentId: true,
      },
    });

    if (!organizationalUnits.some((organizationalUnit) => organizationalUnit.id === id)) {
      throw new NotFoundException('Organizational unit not found.');
    }

    const childIdsByParentId = new Map<number, number[]>();
    for (const organizationalUnit of organizationalUnits) {
      if (organizationalUnit.parentId) {
        const childIds = childIdsByParentId.get(organizationalUnit.parentId) ?? [];
        childIds.push(organizationalUnit.id);
        childIdsByParentId.set(organizationalUnit.parentId, childIds);
      }
    }

    const descendantIds: number[] = [];
    const pendingIds = [id];

    while (pendingIds.length > 0) {
      const currentId = pendingIds.pop()!;
      descendantIds.push(currentId);
      pendingIds.push(...(childIdsByParentId.get(currentId) ?? []));
    }

    return descendantIds;
  }

  private buildTree(organizationalUnits: OrganizationalUnit[]): OrganizationalUnitTreeNode[] {
    const map = new Map<number, OrganizationalUnitTreeNode>();
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
