import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { SaveQuickAccessesBatchDto } from '../dtos';
import { QuickAccess } from '../entities';

export interface PublicQuickAccessResponse {
  id: number;
  title: string;
  description: string | null;
  iconKey: string;
  url: string;
  sortOrder: number;
}

@Injectable()
export class QuickAccessesService {
  constructor(
    @InjectRepository(QuickAccess) private readonly quickAccessRepository: Repository<QuickAccess>,
    private readonly dataSource: DataSource,
  ) {}

  findAll() {
    return this.quickAccessRepository.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  async findLanding(): Promise<PublicQuickAccessResponse[]> {
    const quickAccesses = await this.quickAccessRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return quickAccesses.map(({ id, title, description, iconKey, url, sortOrder }) => ({
      id,
      title,
      description: description ?? null,
      iconKey,
      url,
      sortOrder,
    }));
  }

  async saveBatch({ items }: SaveQuickAccessesBatchDto) {
    const ids = items.flatMap((item) => (item.id ? [item.id] : []));
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate quick access IDs are not allowed in the payload');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(QuickAccess);

      const existingQuickAccesses = await repository.find({ where: { id: In(ids) } });
      const quickAccessesMap = new Map(existingQuickAccesses.map((item) => [item.id, item]));
      const missingIds = ids.filter((id) => !quickAccessesMap.has(id));

      if (missingIds.length) {
        throw new NotFoundException(`Quick accesses not found: ${missingIds.join(', ')}`);
      }

      const quickAccesses = items.map((item, index) => {
        const patch: Partial<QuickAccess> = {
          title: item.title,
          description: item.description || null,
          iconKey: item.iconKey,
          url: item.url,
          sortOrder: index,
          isActive: item.isActive ?? true,
        };

        if (!item.id) return repository.create(patch);

        const current = quickAccessesMap.get(item.id);
        if (!current) throw new NotFoundException(`Quick access with id=${item.id} not found`);
        return Object.assign(current, patch);
      });

      if (quickAccesses.length) await repository.save(quickAccesses);

      return repository.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
    });
  }

  async remove(id: number) {
    const result = await this.quickAccessRepository.delete(id);
    if (!result.affected) throw new NotFoundException('Quick access not found');

    return { ok: true, message: 'Quick access removed successfully' };
  }
}
