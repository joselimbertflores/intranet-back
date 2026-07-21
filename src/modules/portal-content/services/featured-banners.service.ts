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

  async saveBatch({ items, deletedIds = [] }: SaveFeaturedBannersBatchDto) {
    const ids = items.flatMap((item) => (item.id ? [item.id] : []));

    const deletedIdSet = new Set(deletedIds);

    const conflictingIds = ids.filter((id) => deletedIdSet.has(id));

    if (conflictingIds.length) {
      throw new BadRequestException(
        `Featured banners cannot be updated and deleted simultaneously: ${conflictingIds.join(', ')}`,
      );
    }

    const affectedIds = [...ids, ...deletedIds];

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(FeaturedBanner);
      const existingBanners = ids.length ? await repository.find({ where: { id: In(affectedIds) } }) : [];
      const bannersById = new Map(existingBanners.map((banner) => [banner.id, banner]));
      const missingIds = ids.filter((id) => !bannersById.has(id));

      if (missingIds.length) {
        throw new NotFoundException(`Featured banners not found: ${missingIds.join(', ')}`);
      }

      const bannersToDelete = deletedIds.map((id) => bannersById.get(id)).filter((item) => item !== undefined);

      if (bannersToDelete.length) {
        for (const banner of bannersToDelete) {
          await this.filesService.markActiveFileAsOrphaned(banner.imageId, manager, FileContext.FEATURED_BANNERS);
        }
        await repository.remove(bannersToDelete);
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

      const saved = await repository.find({ order: { sortOrder: 'ASC' } });
      return saved.map((banner) => this.mapFeaturedBanner(banner));
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
