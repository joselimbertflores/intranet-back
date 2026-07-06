import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { FilesService } from 'src/modules/files/files.service';
import { FileContext } from 'src/modules/files/enums/file-context.enum';

import { SaveFeaturedBannersBatchDto } from '../dtos';
import { FeaturedBanner } from '../entities';

export interface FeaturedBannerResponse {
  id: number;
  title: string;
  description: string | null;
  linkLabel: string | null;
  url: string | null;
  imageFileId: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export type LandingFeaturedBannerResponse = Omit<FeaturedBannerResponse, 'isActive'>;

@Injectable()
export class FeaturedBannersService {
  constructor(
    @InjectRepository(FeaturedBanner)
    private readonly featuredBannersRepository: Repository<FeaturedBanner>,
    private readonly dataSource: DataSource,
    private readonly filesService: FilesService,
  ) {}

  async findAdminFeaturedBanners(): Promise<FeaturedBannerResponse[]> {
    const banners = await this.featuredBannersRepository.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
    return banners.map((banner) => this.mapFeaturedBanner(banner));
  }

  async findLandingFeaturedBanners(): Promise<LandingFeaturedBannerResponse[]> {
    const banners = await this.featuredBannersRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return banners.map((banner) => {
      const { isActive: _, ...landingBanner } = this.mapFeaturedBanner(banner);
      return landingBanner;
    });
  }

  async saveFeaturedBannersBatch({ items }: SaveFeaturedBannersBatchDto): Promise<FeaturedBannerResponse[]> {
    const ids = items.flatMap((item) => (item.id ? [item.id] : []));
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate featured banner IDs are not allowed in the payload');
    }

    const imageFileIds = items.map((item) => item.imageFileId);
    if (new Set(imageFileIds).size !== imageFileIds.length) {
      throw new BadRequestException('Duplicate featured banner image file IDs are not allowed in the payload');
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
        const normalizedUrl = item.url?.trim() || null;
        const patch = {
          title: item.title,
          description: item.description?.trim() || null,
          linkLabel: normalizedUrl ? item.linkLabel?.trim() || null : null,
          url: normalizedUrl,
          imageFileId: item.imageFileId,
          sortOrder: index,
          isActive: item.isActive ?? true,
        };

        if (item.id) {
          const current = bannersById.get(item.id);
          if (!current) throw new NotFoundException(`Featured banner with id ${item.id} not found`);

          if (current.imageFileId !== item.imageFileId) {
            current.imageFile = await this.filesService.replaceActiveFileWithPendingFile(
              current.imageFileId,
              item.imageFileId,
              FileContext.FEATURED_BANNERS,
              manager,
            );
          }

          bannersToSave.push(Object.assign(current, patch));
          continue;
        }

        const imageFile = await this.filesService.claimPendingFile(
          item.imageFileId,
          FileContext.FEATURED_BANNERS,
          manager,
        );
        bannersToSave.push(repository.create({ ...patch, imageFile }));
      }

      if (bannersToSave.length) await repository.save(bannersToSave);

      const saved = await repository.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
      return saved.map((banner) => this.mapFeaturedBanner(banner));
    });
  }

  async removeFeaturedBanner(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(FeaturedBanner);
      const banner = await repository.findOne({ where: { id } });

      if (!banner) throw new NotFoundException('Featured banner not found');

      await this.filesService.markActiveFileAsOrphaned(banner.imageFileId, manager);
      await repository.delete(id);

      return { ok: true, message: 'Featured banner removed successfully' };
    });
  }

  private mapFeaturedBanner(banner: FeaturedBanner): FeaturedBannerResponse {
    const url = banner.url?.trim() || null;

    return {
      id: banner.id,
      title: banner.title,
      description: banner.description?.trim() || null,
      linkLabel: url ? banner.linkLabel?.trim() || null : null,
      url,
      imageFileId: banner.imageFileId,
      imageUrl: this.filesService.buildPublicFileUrl(banner.imageFileId),
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
    };
  }
}
