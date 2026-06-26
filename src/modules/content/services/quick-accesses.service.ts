import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { QuickAccessBatchItemDto, SaveQuickAccessesBatchDto } from '../dtos';
import { QuickAccess } from '../entities';

@Injectable()
export class QuickAccessesService {
  constructor(
    @InjectRepository(QuickAccess) private readonly quickAccessRepository: Repository<QuickAccess>,
    private readonly dataSource: DataSource,
  ) {}

  findAdmin() {
    return this.quickAccessRepository.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  findLanding() {
    return this.quickAccessRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async saveBatch(dto: SaveQuickAccessesBatchDto) {
    const items = dto.items ?? [];
    this.assertNoDuplicateIds(items);

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(QuickAccess);
      const existing = await this.loadExistingQuickAccesses(repository, items);

      const quickAccesses = items.map((item, index) => {
        const patch: Partial<QuickAccess> = {
          title: item.title,
          description: item.description || null,
          icon: item.icon || null,
          linkUrl: item.linkUrl,
          sortOrder: index,
          isActive: item.isActive ?? true,
        };

        if (!item.id) return repository.create(patch);

        const current = existing.get(item.id);
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

  private assertNoDuplicateIds(items: QuickAccessBatchItemDto[]) {
    const ids = items.flatMap((item) => (item.id ? [item.id] : []));
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate quick access IDs are not allowed in the payload');
    }
  }

  private async loadExistingQuickAccesses(repository: Repository<QuickAccess>, items: QuickAccessBatchItemDto[]) {
    const ids = items.flatMap((item) => (item.id ? [item.id] : []));
    if (!ids.length) return new Map<number, QuickAccess>();

    const quickAccesses = await repository.find({ where: { id: In(ids) } });
    const quickAccessesMap = new Map(quickAccesses.map((item) => [item.id, item]));
    const missingIds = ids.filter((id) => !quickAccessesMap.has(id));

    if (missingIds.length) {
      throw new NotFoundException(`Quick accesses not found: ${missingIds.join(', ')}`);
    }

    return quickAccessesMap;
  }
}
