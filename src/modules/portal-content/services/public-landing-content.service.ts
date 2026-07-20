import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FilesService } from '../../files/files.service';
import { FeaturedBanner, HeroSlide, LandingNotice, QuickAccess } from '../entities';

@Injectable()
export class PublicLandingContentService {
  constructor(
    @InjectRepository(HeroSlide) private readonly heroSlidesRepository: Repository<HeroSlide>,
    @InjectRepository(QuickAccess) private readonly quickAccessesRepository: Repository<QuickAccess>,
    @InjectRepository(FeaturedBanner) private readonly featuredBannersRepository: Repository<FeaturedBanner>,
    @InjectRepository(LandingNotice) private readonly landingNoticesRepository: Repository<LandingNotice>,
    private readonly filesService: FilesService,
  ) {}

  async getLandingContent() {
    const [heroSlides, quickAccesses, featuredBanners, landingNotices] = await Promise.all([
      this.findHeroSlides(),
      this.findQuickAccesses(),
      this.findFeaturedBanners(),
      this.findLandingNotices(),
    ]);

    return { heroSlides, quickAccesses, featuredBanners, landingNotices };
  }

  private async findHeroSlides() {
    const slides = await this.heroSlidesRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return slides.map((slide) => {
      const linkUrl = slide.linkUrl?.trim() || null;
      return {
        id: slide.id,
        title: slide.title,
        description: slide.description ?? null,
        linkLabel: linkUrl ? slide.linkLabel?.trim() || null : null,
        linkUrl,
        imageFileId: slide.imageFileId,
        imageUrl: this.filesService.buildPublicFileUrl(slide.imageFileId),
        sortOrder: slide.sortOrder,
      };
    });
  }

  private async findQuickAccesses() {
    const quickAccesses = await this.quickAccessesRepository.find({
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

  private async findFeaturedBanners() {
    const banners = await this.featuredBannersRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return banners.map((banner) => {
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
      };
    });
  }

  private async findLandingNotices() {
    const notices = await this.landingNoticesRepository
      .createQueryBuilder('notice')
      .where('notice.isActive = :isActive', { isActive: true })
      .andWhere('(notice.visibleFrom IS NULL OR notice.visibleFrom <= NOW())')
      .andWhere('(notice.visibleUntil IS NULL OR notice.visibleUntil >= NOW())')
      .orderBy('notice.isPinned', 'DESC')
      .addOrderBy('notice.createdAt', 'DESC')
      .limit(5)
      .getMany();

    return notices.map((notice) => ({
      id: notice.id,
      title: notice.title,
      contentHtml: notice.contentHtml,
      imageUrl: notice.imageId ? this.filesService.buildPublicFileUrl(notice.imageId) : null,
      imageAlt: notice.imageAlt,
      imageLinkUrl: notice.imageLinkUrl,
      updatedAt: notice.updatedAt,
    }));
  }
}
