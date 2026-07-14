import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateDirectoryEntryDto, UpdateDirectoryEntryDto } from './dtos';
import { DirectoryEntryTreeDto } from './dtos/directory-entry-tree.dto';
import { DirectoryEntry } from './entities';

@Injectable()
export class DirectoryService {
  constructor(@InjectRepository(DirectoryEntry) private readonly repo: Repository<DirectoryEntry>) {}

  async create(dto: CreateDirectoryEntryDto) {
    const entry = this.repo.create({
      name: dto.name,
      internalPhone: dto.internalPhone,
      landlinePhone: dto.landlinePhone,
      order: dto.order ?? 0,
      parent: dto.parentId ? { id: dto.parentId } : null,
    });
    return this.repo.save(entry);
  }

  async update(id: number, dto: UpdateDirectoryEntryDto) {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Directory entry not found');

    Object.assign(entry, {
      ...dto,
      parent: dto.parentId ? ({ id: dto.parentId } as DirectoryEntry) : entry.parent,
    });

    return this.repo.save(entry);
  }

  async remove(id: string) {
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException('Directory entry not found');

    return { deleted: true };
  }

  findAll() {
    return this.findDirectoryTree();
  }

  private async findDirectoryTree(): Promise<DirectoryEntryTreeDto[]> {
    const entries = await this.repo.find({
      select: {
        id: true,
        name: true,
        internalPhone: true,
        landlinePhone: true,
        order: true,
        parent: {
          id: true,
        },
      },
      relations: { parent: true },
      order: { order: 'asc' },
    });
    return this.buildTree(entries);
  }

  private buildTree(entries: DirectoryEntry[]): DirectoryEntryTreeDto[] {
    const map = new Map<number, DirectoryEntryTreeDto>();
    const roots: DirectoryEntryTreeDto[] = [];

    entries.forEach((entry) =>
      map.set(entry.id, {
        id: entry.id,
        name: entry.name,
        internalPhone: entry.internalPhone,
        landlinePhone: entry.landlinePhone,
        order: entry.order,
        children: [],
      }),
    );

    entries.forEach((entry) => {
      const node = map.get(entry.id);
      if (!node) return;

      const parentId = entry.parent?.id;
      if (parentId) {
        map.get(parentId)?.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}
