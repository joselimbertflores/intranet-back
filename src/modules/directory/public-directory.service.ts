import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DirectoryEntryTreeDto } from './dtos/directory-entry-tree.dto';
import { DirectoryEntry } from './entities';

@Injectable()
export class PublicDirectoryService {
  constructor(
    @InjectRepository(DirectoryEntry) private readonly directoryEntriesRepository: Repository<DirectoryEntry>,
  ) {}

  async findAll(): Promise<DirectoryEntryTreeDto[]> {
    const entries = await this.directoryEntriesRepository.find({
      select: {
        id: true,
        name: true,
        internalPhone: true,
        landlinePhone: true,
        order: true,
        parent: { id: true },
      },
      relations: { parent: true },
      order: { order: 'asc' },
    });

    const entriesById = new Map<number, DirectoryEntryTreeDto>();
    const roots: DirectoryEntryTreeDto[] = [];

    for (const entry of entries) {
      entriesById.set(entry.id, {
        id: entry.id,
        name: entry.name,
        internalPhone: entry.internalPhone,
        landlinePhone: entry.landlinePhone,
        order: entry.order,
        children: [],
      });
    }

    for (const entry of entries) {
      const node = entriesById.get(entry.id);
      if (!node) continue;

      const parentId = entry.parent?.id;
      if (parentId) {
        entriesById.get(parentId)?.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
