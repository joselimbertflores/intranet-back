import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FilesService } from '../../files/files.service';
import { FeaturedBanner, HeroSlide, LandingNotice, QuickAccess } from '../entities';

export interface PublicHeroSlideResponse {
  id: number;
  title: string;
  description: string | null;
  linkLabel: string | null;
  linkUrl: string | null;
  imageUrl: string;
}

export interface PublicFeaturedBannerResponse {
  id: number;
  title: string;
  description: string | null;
  linkLabel: string | null;
  linkUrl: string | null;
  imageUrl: string;
}

export interface PublicLandingNoticeResponse {
  id: string;
  title: string;
  contentHtml: string | null;
  imageUrl: string | null;
  imageLinkUrl: string | null;
  updatedAt: Date;
}

@Injectable()
export class PublicLandingContentService {
  constructor(
    @InjectRepository(HeroSlide) private readonly heroSlidesRepository: Repository<HeroSlide>,
    @InjectRepository(QuickAccess) private readonly quickAccessesRepository: Repository<QuickAccess>,
    @InjectRepository(FeaturedBanner) private readonly featuredBannersRepository: Repository<FeaturedBanner>,
    @InjectRepository(LandingNotice) private readonly landingNoticesRepository: Repository<LandingNotice>,
    private readonly filesService: FilesService,
  ) {}

  async findHeroSlides(): Promise<PublicHeroSlideResponse[]> {
    const slides = await this.heroSlidesRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return slides.map((slide) => {
      const linkUrl = slide.linkUrl?.trim() || null;
      return {
        id: slide.id,
        title: slide.title,
        description: slide.description?.trim() || null,
        linkLabel: linkUrl ? slide.linkLabel?.trim() || null : null,
        linkUrl,
        imageUrl: this.filesService.buildPublicFileUrl(slide.imageId),
      };
    });
  }

  async findQuickAccesses(limit?: number) {
    const quickAccesses = await this.quickAccessesRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
      ...(limit !== undefined && { take: limit }),
    });

    return quickAccesses.map(({ id, title, description, iconKey, backgroundColor, url }) => ({
      id,
      title,
      description: description?.trim() || null,
      iconKey,
      backgroundColor,
      url: url.trim(),
    }));
  }

  async findFeaturedBanners(): Promise<PublicFeaturedBannerResponse[]> {
    const banners = await this.featuredBannersRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return banners.map((banner) => {
      const linkUrl = banner.linkUrl?.trim() || null;
      return {
        id: banner.id,
        title: banner.title,
        description: banner.description?.trim() || null,
        linkLabel: linkUrl ? banner.linkLabel?.trim() || null : null,
        linkUrl,
        imageUrl: this.filesService.buildPublicFileUrl(banner.imageId),
      };
    });
  }

  async findLandingNotices(): Promise<PublicLandingNoticeResponse[]> {
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
      contentHtml: notice.contentHtml ?? null,
      imageUrl: notice.imageId ? this.filesService.buildPublicFileUrl(notice.imageId) : null,
      imageLinkUrl: notice.imageLinkUrl ?? null,
      updatedAt: notice.updatedAt,
    }));
  }
}
