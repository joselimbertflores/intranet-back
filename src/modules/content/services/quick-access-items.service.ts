import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, In, Repository } from 'typeorm';

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
    const normalized = items.map((i, index) => ({
      id: i.id,
      name: i.name.trim(),
      icon: i.icon.trim(),
      url: i.url,
      color: i.color,
      order: index,
    }));

    const urls = normalized.map((x) => x.url);
    if (new Set(urls).size !== urls.length) {
      throw new BadRequestException('Duplicate URLs are not allowed in quick-access items.');
    }

    const ids = normalized.flatMap((x) => (x.id ? [x.id] : []));
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate IDs are not allowed in quick-access items.');
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(QuickAccessItem);

      if (ids.length) {
        const found = await repo.find({ where: { id: In(ids) }, select: { id: true } });
        const foundSet = new Set(found.map((e) => e.id));
        const missing = ids.filter((id) => !foundSet.has(id));
        if (missing.length) {
          throw new NotFoundException(
            `Some ids do not exist: ${missing.join(', ')}. Items with an id must reference existing items.`,
          );
        }
      }

      if (ids.length) {
        await repo.createQueryBuilder().delete().from(QuickAccessItem).where('id NOT IN (:...ids)', { ids }).execute();
      } else {
        await repo.createQueryBuilder().delete().from(QuickAccessItem).execute();
      }

      // 5) Upsert claro (update vs create)
      const toUpdate = normalized.filter((x) => x.id) as Array<Required<(typeof normalized)[number]>>;
      const toCreate = normalized.filter((x) => !x.id);

      const updated = toUpdate.length ? await repo.save(toUpdate) : [];
      const created = toCreate.length ? await repo.save(toCreate) : [];
      return [...updated, ...created].sort((a, b) => a.order - b.order);
    });
  }

}
