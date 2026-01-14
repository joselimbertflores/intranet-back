import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { FilesService } from 'src/modules/files/files.service';
import { FileGroup } from 'src/modules/files/file-group.enum';
import { ReplaceQuickAccessDto, QuickAccessDto } from '../dtos';
import { QuickAccess } from '../entities';

@Injectable()
export class QuickAccessService {
  constructor(
    @InjectRepository(QuickAccess) private quickAccessRepository: Repository<QuickAccess>,
    private fileService: FilesService,
    private dataSource: DataSource,
  ) {}

  async findAll() {
    const items = await this.quickAccessRepository.find({ order: { order: 'ASC' } });
    return items.map((item) => this.plainQuickAccess(item));
  }

  async replaceItems({ items }: ReplaceQuickAccessDto) {
    const existingSlides = await this.quickAccessRepository.find({ select: ['icon'] });

    const newItems = await this.dataSource.transaction(async (manager) => {
      await manager.clear(QuickAccess);
      const entities = items.map((s, i) => manager.create(QuickAccess, { ...s, order: i }));
      return manager.save(entities);
    });

    await this.removeOrphanSlideImages(existingSlides, items);

    return newItems.map((item) => this.plainQuickAccess(item));
  }

  private async removeOrphanSlideImages(existingSlides: Pick<QuickAccess, 'icon'>[], newItems: QuickAccessDto[]) {
    const usedImages = new Set(newItems.map(({ icon }) => icon));
    const orphanImages = existingSlides.map((item) => item.icon).filter((img) => !usedImages.has(img));
    if (orphanImages.length > 0) {
      await this.fileService.deleteMany(orphanImages, FileGroup.QUICK_ACCESS);
    }
  }

  private plainQuickAccess(item: QuickAccess) {
    const { icon, ...props } = item;
    return { ...props, iconUrl: this.fileService.buildFileUrl(icon, FileGroup.QUICK_ACCESS) };
  }
}
