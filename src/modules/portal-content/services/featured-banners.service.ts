import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { FilesService } from 'src/modules/files/files.service';
import { FileContext } from 'src/modules/files/enums/file-context.enum';

import { SaveFeaturedBannersBatchDto } from '../dtos';
import { FeaturedBanner } from '../entities';

@Injectable()
export class FeaturedBannersService {
  constructor(
    @InjectRepository(FeaturedBanner)
    private readonly featuredBannersRepository: Repository<FeaturedBanner>,
    private readonly dataSource: DataSource,
    private readonly filesService: FilesService,
  ) {}

  async findAll() {
    const banners = await this.featuredBannersRepository.find({ order: { sortOrder: 'ASC' } });
    return banners.map((banner) => this.mapFeaturedBanner(banner));
  }

  async saveBatch({ items }: SaveFeaturedBannersBatchDto) {
    const ids = items.flatMap((item) => (item.id ? [item.id] : []));
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate featured banner IDs are not allowed in the payload');
    }

    const imageIds = items.map((item) => item.imageId);
    if (new Set(imageIds).size !== imageIds.length) {
      throw new BadRequestException('Duplicate featured banner image IDs are not allowed in the payload');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(FeaturedBanner);
      const existingBanners = ids.length ? await repository.find({ where: { id: In(ids) } }) : [];
      const bannersById = new Map(existingBanners.map((banner) => [banner.id, banner]));
      const missingIds = ids.filter((id) => !bannersById.has(id));

      if (missingIds.length) {
        throw new NotFoundException(`Featured banners not found: ${missingIds.join(', ')}`);
      }

      const bannersToSave: FeaturedBanner[] = [];

      for (const [index, item] of items.entries()) {
        const linkUrl = item.linkUrl ?? null;
        const patch = {
          title: item.title,
          description: item.description ?? null,
          linkLabel: item.linkLabel ?? null,
          linkUrl,
          imageId: item.imageId,
          sortOrder: index,
        };

        if (item.id) {
          const current = bannersById.get(item.id);
          if (!current) throw new NotFoundException(`Featured banner with id ${item.id} not found`);

          if (current.imageId !== item.imageId) {
            current.image = await this.filesService.replaceActiveFileWithPendingFile(
              current.imageId,
              item.imageId,
              FileContext.FEATURED_BANNERS,
              manager,
            );
          }

          bannersToSave.push(Object.assign(current, patch, { isActive: item.isActive ?? current.isActive }));
          continue;
        }

        const image = await this.filesService.claimPendingFile(item.imageId, FileContext.FEATURED_BANNERS, manager);
        bannersToSave.push(repository.create({ ...patch, image, isActive: item.isActive ?? true }));
      }

      if (bannersToSave.length) await repository.save(bannersToSave);

      const saved = await repository.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
      return saved.map((banner) => this.mapFeaturedBanner(banner));
    });
  }

  async remove(id: number): Promise<{ ok: true; message: string }> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(FeaturedBanner);
      const banner = await repository.findOne({ where: { id } });

      if (!banner) throw new NotFoundException('Featured banner not found');

      await this.filesService.markActiveFileAsOrphaned(banner.imageId, manager, FileContext.FEATURED_BANNERS);
      await repository.delete(id);

      return { ok: true, message: 'Featured banner removed successfully' };
    });
  }

  private mapFeaturedBanner(banner: FeaturedBanner) {
    const linkUrl = banner.linkUrl?.trim() || null;

    return {
      id: banner.id,
      title: banner.title,
      description: banner.description?.trim() || null,
      linkLabel: linkUrl ? banner.linkLabel?.trim() || null : null,
      linkUrl,
      imageId: banner.imageId,
      imageUrl: this.filesService.buildPublicFileUrl(banner.imageId),
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
    };
  }
}
