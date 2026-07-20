import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { SaveQuickAccessesBatchDto } from '../dtos';
import { QuickAccess } from '../entities';

@Injectable()
export class QuickAccessesService {
  constructor(
    @InjectRepository(QuickAccess) private readonly quickAccessRepository: Repository<QuickAccess>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll() {
    const quickAccesses = await this.quickAccessRepository.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
    return quickAccesses.map((quickAccess) => this.mapQuickAccess(quickAccess));
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
        const patch = {
          title: item.title,
          description: item.description ?? null,
          iconKey: item.iconKey,
          url: item.url,
          sortOrder: index,
          backgroundColor: item.backgroundColor,
        };

        if (!item.id) return repository.create({ ...patch, isActive: item.isActive ?? true });

        const current = quickAccessesMap.get(item.id);
        if (!current) throw new NotFoundException(`Quick access with id=${item.id} not found`);
        return Object.assign(current, patch, { isActive: item.isActive ?? current.isActive });
      });

      if (quickAccesses.length) await repository.save(quickAccesses);

      const saved = await repository.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
      return saved.map((quickAccess) => this.mapQuickAccess(quickAccess));
    });
  }

  async remove(id: number): Promise<{ ok: true; message: string }> {
    const result = await this.quickAccessRepository.delete(id);
    if (!result.affected) throw new NotFoundException('Quick access not found');

    return { ok: true, message: 'Quick access removed successfully' };
  }

  private mapQuickAccess(quickAccess: QuickAccess) {
    return {
      id: quickAccess.id,
      title: quickAccess.title,
      description: quickAccess.description?.trim() || null,
      iconKey: quickAccess.iconKey,
      url: quickAccess.url.trim(),
      backgroundColor: quickAccess.backgroundColor,
      sortOrder: quickAccess.sortOrder,
      isActive: quickAccess.isActive,
    };
  }
}
