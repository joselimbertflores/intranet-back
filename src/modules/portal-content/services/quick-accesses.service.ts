import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';

import { FileContext } from 'src/modules/files/enums/file-context.enum';
import { FilesService } from 'src/modules/files/files.service';

import { CreateQuickAccessDto, ReorderQuickAccessesDto, UpdateQuickAccessDto } from '../dtos';
import { QuickAccess } from '../entities';

@Injectable()
export class QuickAccessesService {
  constructor(
    @InjectRepository(QuickAccess) private readonly quickAccessRepository: Repository<QuickAccess>,
    private readonly dataSource: DataSource,
    private readonly filesService: FilesService,
  ) {}

  async findAll() {
    const quickAccesses = await this.quickAccessRepository.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
    return quickAccesses.map((quickAccess) => this.mapQuickAccess(quickAccess));
  }

  async create(dto: CreateQuickAccessDto) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(QuickAccess);
      const lastQuickAccess = await repository.findOne({ where: {}, order: { sortOrder: 'DESC', id: 'DESC' } });
      const quickAccess = repository.create({
        ...dto,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: (lastQuickAccess?.sortOrder ?? -1) + 1,
      });

      const savedQuickAccess = await repository.save(quickAccess);
      await this.filesService.claimPendingFile(dto.imageFileId, FileContext.QUICK_ACCESSES, manager);

      return this.mapQuickAccess(savedQuickAccess);
    });
  }

  async update(id: number, dto: UpdateQuickAccessDto) {
    if ('imageFileId' in dto && !dto.imageFileId) {
      throw new BadRequestException('imageFileId cannot be empty');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(QuickAccess);
      const quickAccess = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!quickAccess) throw new NotFoundException(`Quick access with id=${id} not found`);

      const previousImageFileId = quickAccess.imageFileId;
      const imageWasReplaced = dto.imageFileId !== undefined && dto.imageFileId !== previousImageFileId;

      Object.assign(quickAccess, dto);
      const updatedQuickAccess = await repository.save(quickAccess);

      if (imageWasReplaced && dto.imageFileId) {
        await this.filesService.claimPendingFile(dto.imageFileId, FileContext.QUICK_ACCESSES, manager);
        if (previousImageFileId) {
          await this.filesService.markActiveFileAsOrphaned(previousImageFileId, manager, FileContext.QUICK_ACCESSES);
        }
      }

      return this.mapQuickAccess(updatedQuickAccess);
    });
  }

  async remove(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(QuickAccess);
      const quickAccess = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!quickAccess) throw new NotFoundException(`Quick access with id=${id} not found`);

      await repository.delete(id);
      if (quickAccess.imageFileId) {
        await this.filesService.markActiveFileAsOrphaned(quickAccess.imageFileId, manager, FileContext.QUICK_ACCESSES);
      }
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
      imageFileId: quickAccess.imageFileId,
      imageUrl: quickAccess.imageFileId ? this.filesService.buildPublicFileUrl(quickAccess.imageFileId) : null,
      url: quickAccess.url.trim(),
      backgroundColor: quickAccess.backgroundColor,
      sortOrder: quickAccess.sortOrder,
      isActive: quickAccess.isActive,
    };
  }
}
