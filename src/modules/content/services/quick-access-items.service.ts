import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, Repository } from 'typeorm';

import { ReplaceQuickAccessDto } from '../dtos';
import { QuickAccessItem } from '../entities';

@Injectable()
export class QuickAccessItemService {
  constructor(
    @InjectRepository(QuickAccessItem) private quickAccessRepository: Repository<QuickAccessItem>,
    private dataSource: DataSource,
  ) {}

  async findAll() {
    return await this.quickAccessRepository.find({ order: { order: 'ASC' } });
  }

  async replaceAll({ items = [] }: ReplaceQuickAccessDto): Promise<QuickAccessItem[]> {
    const normalizedUrls = items.map((i) => i.url.trim());
    if (new Set(normalizedUrls).size !== normalizedUrls.length) {
      throw new BadRequestException('Duplicate URLs are not allowed in quick-access items.');
    }

    const ids = items.filter((i) => i.id).map((i) => i.id!);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate IDs are not allowed in quick-access items.');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(QuickAccessItem);

      const existing = await repository.find({ select: { id: true } });
      const existingIds = new Set(existing.map((e) => e.id));
      const incomingIds = new Set(ids);

      for (const id of incomingIds) {
        if (!existingIds.has(id)) {
          throw new NotFoundException(`Id ${id} does not exist. Items with an id must reference existing items.`);
        }
      }

      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
      if (toDelete.length) {
        await repository.delete(toDelete);
      }

      const saved: QuickAccessItem[] = [];
      for (let index = 0; index < items.length; index++) {
        if (items[index].id) {
          const entity = await repository.preload({
            ...items[index],
            order: index,
          });
          const updated = await repository.save({ ...entity, id: items[index].id });
          saved.push(updated);
        } else {
          const entity = repository.create({
            ...items[index],
            order: index,
          });
          saved.push(await repository.save(entity));
        }
      }
      saved.sort((a, b) => a.order - b.order);
      return saved;
    });
  }
}
