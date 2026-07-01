import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { FilesService } from 'src/modules/files/files.service';

import { SaveHeroSlidesBatchDto } from '../dtos';
import { HeroSlide } from '../entities';

export interface HeroSlideResponse {
  id: number;
  title: string;
  description: string | null;
  linkLabel: string | null;
  linkUrl: string | null;
  imageFileId: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export type PublicHeroSlideResponse = Omit<HeroSlideResponse, 'isActive'>;

@Injectable()
export class HeroSlidesService {
  constructor(
    @InjectRepository(HeroSlide) private readonly heroSlidesRepository: Repository<HeroSlide>,
    private readonly dataSource: DataSource,
    private readonly filesService: FilesService,
  ) {}

  async findAll(): Promise<HeroSlideResponse[]> {
    const slides = await this.heroSlidesRepository.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
    return slides.map((slide) => this.mapHeroSlide(slide));
  }

  async findActive(): Promise<PublicHeroSlideResponse[]> {
    const slides = await this.heroSlidesRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return slides.map((slide) => {
      const { isActive: _, ...publicSlide } = this.mapHeroSlide(slide);
      return publicSlide;
    });
  }

  async saveBatch({ items }: SaveHeroSlidesBatchDto) {
    const ids = items.filter((item) => item.id).map((item) => item.id as number);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate hero slide IDs are not allowed in the payload');
    }

    const fileIds = items.map((item) => item.imageFileId);

    if (new Set(fileIds).size !== fileIds.length) {
      throw new BadRequestException('Duplicate hero slide image file IDs are not allowed in the payload');
    }

    return this.dataSource.transaction(async (manager) => {
      const slideRepository = manager.getRepository(HeroSlide);

      const existingSlides = ids.length ? await slideRepository.find({ where: { id: In(ids) } }) : [];
      const slidesMap = new Map(existingSlides.map((slide) => [slide.id, slide]));
      const missingIds = ids.filter((id) => !slidesMap.has(id));

      if (missingIds.length) {
        throw new NotFoundException(`Hero slides not found: ${missingIds.join(', ')}`);
      }

      const slidesToSave: HeroSlide[] = [];

      for (const [index, item] of items.entries()) {
        const sortOrder = index + 1;

        if (item.id) {
          const current = slidesMap.get(item.id);

          if (!current) throw new NotFoundException(`Hero slide with id ${item.id} not found`);

          if (current.imageFileId !== item.imageFileId) {
            const replacementFile = await this.filesService.replaceActiveFileWithPendingFile(
              current.imageFileId,
              item.imageFileId,
              manager,
            );
            current.imageFile = replacementFile;
          }

          slidesToSave.push(
            Object.assign(current, {
              title: item.title,
              description: item.description ?? null,
              linkUrl: item.linkUrl ?? null,
              linkLabel: item.linkUrl ? (item.linkLabel ?? null) : null,
              imageFileId: item.imageFileId,
              sortOrder,
              ...(item.isActive !== undefined && { isActive: item.isActive }),
            }),
          );
        } else {
          const imageFile = await this.filesService.claimPendingFile(item.imageFileId, manager);
          const newSlide = manager.create(HeroSlide, {
            title: item.title,
            description: item.description ?? null,
            linkUrl: item.linkUrl ?? null,
            linkLabel: item.linkUrl ? (item.linkLabel ?? null) : null,
            imageFileId: item.imageFileId,
            imageFile,
            sortOrder,
            isActive: item.isActive ?? true,
          });
          slidesToSave.push(newSlide);
        }
      }

      if (slidesToSave.length) await slideRepository.save(slidesToSave);

      const result = await slideRepository.find({ order: { sortOrder: 'ASC', id: 'ASC' } });

      return result.map((slide) => this.mapHeroSlide(slide));
    });
  }

  async remove(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const slideRepository = manager.getRepository(HeroSlide);
      const slide = await slideRepository.findOne({ where: { id } });

      if (!slide) throw new NotFoundException('Hero slide not found');

      await this.filesService.markActiveFileAsOrphaned(slide.imageFileId, manager);
      await slideRepository.delete(id);

      return { ok: true, message: 'Hero slide removed successfully' };
    });
  }

  private mapHeroSlide(slide: HeroSlide): HeroSlideResponse {
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
      isActive: slide.isActive,
    };
  }
}
