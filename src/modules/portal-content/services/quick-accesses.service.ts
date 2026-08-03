import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';

import { CreateQuickAccessDto, ReorderQuickAccessesDto, UpdateQuickAccessDto } from '../dtos';
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

  async create(dto: CreateQuickAccessDto) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(QuickAccess);
      const lastQuickAccess = await repository.findOne({where: {}, order: { sortOrder: 'DESC', id: 'DESC' } });
      const quickAccess = repository.create({
        ...dto,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: (lastQuickAccess?.sortOrder ?? -1) + 1,
      });

      return this.mapQuickAccess(await repository.save(quickAccess));
    });
  }

  async update(id: number, dto: UpdateQuickAccessDto) {
    const quickAccess = await this.quickAccessRepository.findOne({ where: { id } });
    if (!quickAccess) throw new NotFoundException(`Quick access with id=${id} not found`);

    Object.assign(quickAccess, dto);
    const updatedQuickAccess = await this.quickAccessRepository.save(quickAccess);
    return this.mapQuickAccess(updatedQuickAccess);
  }

  async remove(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(QuickAccess);
      const quickAccess = await repository.findOne({ where: { id } });
      if (!quickAccess) throw new NotFoundException(`Quick access with id=${id} not found`);

      await repository.delete(id);
      await repository.decrement({ sortOrder: MoreThan(quickAccess.sortOrder) }, 'sortOrder', 1);

      return { ok: true, message: 'Quick access removed successfully' };
    });
  }

  async reorder({ ids }: ReorderQuickAccessesDto) {
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length) {
      throw new BadRequestException(
        `Duplicate quick access IDs are not allowed: ${[...new Set(duplicateIds)].join(', ')}`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(QuickAccess);
      const quickAccesses = await repository
        .createQueryBuilder('quickAccess')
        .orderBy('quickAccess.sortOrder', 'ASC')
        .addOrderBy('quickAccess.id', 'ASC')
        .setLock('pessimistic_write')
        .getMany();
      const quickAccessesById = new Map(quickAccesses.map((quickAccess) => [quickAccess.id, quickAccess]));
      const missingIds = ids.filter((id) => !quickAccessesById.has(id));

      if (missingIds.length) {
        throw new NotFoundException(`Quick accesses not found: ${missingIds.join(', ')}`);
      }

      const receivedIds = new Set(ids);
      const omittedIds = quickAccesses.filter(({ id }) => !receivedIds.has(id)).map(({ id }) => id);
      if (omittedIds.length) {
        throw new BadRequestException(`All quick access IDs are required. Omitted IDs: ${omittedIds.join(', ')}`);
      }

      const reordered = ids.map((id, sortOrder) => {
        const quickAccess = quickAccessesById.get(id);
        if (!quickAccess) throw new NotFoundException(`Quick access with id=${id} not found`);
        quickAccess.sortOrder = sortOrder;
        return quickAccess;
      });

      const saved = reordered.length ? await repository.save(reordered) : [];
      return saved.map((quickAccess) => this.mapQuickAccess(quickAccess));
    });
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
