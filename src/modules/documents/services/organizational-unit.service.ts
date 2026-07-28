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
      if (!parent) throw new NotFoundException('Parent organizational unit not found or inactive');
    }

    const organizationalUnit = this.organizationalUnitRepository.create({
      ...props,
      parent,
    });

    return this.organizationalUnitRepository.save(organizationalUnit);
  }

  async update(id: string, dto: UpdateOrganizationalUnitDto) {
    const organizationalUnit = await this.organizationalUnitRepository.findOneBy({ id });

    if (!organizationalUnit) {
      throw new NotFoundException('Organizational unit not found');
    }

    Object.assign(organizationalUnit, dto);

    return this.organizationalUnitRepository.save(organizationalUnit);
  }

  async remove(id: string) {
    const organizationalUnitExists = await this.organizationalUnitRepository.exists({ where: { id } });
    if (!organizationalUnitExists) {
      throw new NotFoundException('La unidad organizacional no existe.');
    }

    await this.assertOrganizationalUnitHasNoDependencies(id);

    try {
      const result = await this.organizationalUnitRepository.delete({ id });
      if ((result.affected ?? 0) === 0) {
        throw new NotFoundException('La unidad organizacional no existe.');
      }
      return { ok: true, message: 'Unidad organizacional eliminada correctamente.' };
    } catch (error: unknown) {
      if (this.isForeignKeyViolation(error)) {
        await this.assertOrganizationalUnitHasNoDependencies(id);
        throw new ConflictException(
          'No se puede eliminar la unidad organizacional porque está asignada a documentos o tiene unidades hijas.',
        );
      }
      throw error;
    }
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

  async getOrganizationalUnitAndDescendantIds(id: string): Promise<string[]> {
    const organizationalUnits = await this.organizationalUnitRepository.find({
      select: {
        id: true,
        parentId: true,
      },
    });

    if (!organizationalUnits.some((organizationalUnit) => organizationalUnit.id === id)) {
      throw new NotFoundException('La unidad organizacional no existe.');
    }

    const childIdsByParentId = new Map<string, string[]>();
    for (const organizationalUnit of organizationalUnits) {
      if (organizationalUnit.parentId) {
        const childIds = childIdsByParentId.get(organizationalUnit.parentId) ?? [];
        childIds.push(organizationalUnit.id);
        childIdsByParentId.set(organizationalUnit.parentId, childIds);
      }
    }

    const descendantIds: string[] = [];
    const pendingIds = [id];

    while (pendingIds.length > 0) {
      const currentId = pendingIds.pop()!;
      descendantIds.push(currentId);
      pendingIds.push(...(childIdsByParentId.get(currentId) ?? []));
    }

    return descendantIds;
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

  private async assertOrganizationalUnitHasNoDependencies(id: string): Promise<void> {
    const isAssignedToDocuments = await this.documentRepository.exists({ where: { organizationalUnitId: id } });
    if (isAssignedToDocuments) {
      throw new ConflictException('No se puede eliminar la unidad organizacional porque está asignada a documentos.');
    }

    const hasChildren = await this.organizationalUnitRepository.exists({ where: { parentId: id } });
    if (hasChildren) {
      throw new ConflictException('No se puede eliminar la unidad organizacional porque tiene unidades hijas.');
    }
  }

  private isForeignKeyViolation(error: unknown): boolean {
    return error instanceof QueryFailedError && (error.driverError as { code?: string }).code === '23503';
  }
}
