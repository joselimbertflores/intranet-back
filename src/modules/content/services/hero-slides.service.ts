import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { FilesService } from 'src/modules/files/files.service';
import { FileContext } from 'src/modules/files/enums/file-context.enum';

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

  async saveBatch({ items, deletedIds = [] }: SaveHeroSlidesBatchDto) {
    const itemIds = items.map((item) => item.id).filter((id) => id !== null && id !== undefined);

    const deletedIdSet = new Set(deletedIds);

    const conflictingIds = itemIds.filter((id) => deletedIdSet.has(id));

    if (conflictingIds.length) {
      throw new BadRequestException(
        `Hero slides cannot be updated and deleted simultaneously: ${conflictingIds.join(', ')}`,
      );
    }

    const affectedIds = [...itemIds, ...deletedIds];

    return this.dataSource.transaction(async (manager) => {
      const slideRepository = manager.getRepository(HeroSlide);

      const existingSlides = affectedIds.length ? await slideRepository.find({ where: { id: In(affectedIds) } }) : [];
      const slidesById = new Map(existingSlides.map((slide) => [slide.id, slide]));
      const missingIds = affectedIds.filter((id) => !slidesById.has(id));

      if (missingIds.length) {
        throw new NotFoundException(`Hero slides not found: ${missingIds.join(', ')}`);
      }

      const slidesToDelete = deletedIds.map((id) => slidesById.get(id)).filter((item) => item !== undefined);

      if (slidesToDelete.length) {
        for (const slide of slidesToDelete) {
          await this.filesService.markActiveFileAsOrphaned(slide.imageFileId, manager);
        }
        await slideRepository.remove(slidesToDelete);
      }

      const slidesToSave: HeroSlide[] = [];

      for (const [index, item] of items.entries()) {
        const sortOrder = index + 1;

        if (item.id) {
          const current = slidesById.get(item.id);
          if (!current) throw new NotFoundException(`Hero slide with id ${item.id} not found`);

          if (current.imageFileId !== item.imageFileId) {
            const replacementFile = await this.filesService.replaceActiveFileWithPendingFile(
              current.imageFileId,
              item.imageFileId,
              FileContext.HERO_SLIDES,
              manager,
            );
            current.imageFile = replacementFile;
          }

          Object.assign(current, {
            title: item.title,
            description: item.description ?? null,
            linkUrl: item.linkUrl ?? null,
            linkLabel: item.linkUrl ? (item.linkLabel ?? null) : null,
            isActive: item.isActive ?? current.isActive,
            sortOrder,
          });
          slidesToSave.push(current);
        } else {
          const imageFile = await this.filesService.claimPendingFile(
            item.imageFileId,
            FileContext.HERO_SLIDES,
            manager,
          );
          const newSlide = manager.create(HeroSlide, {
            title: item.title,
            description: item.description ?? null,
            linkUrl: item.linkUrl ?? null,
            linkLabel: item.linkUrl ? (item.linkLabel ?? null) : null,
            isActive: item.isActive,
            imageFile,
            sortOrder,
          });
          slidesToSave.push(newSlide);
        }
      }

      if (slidesToSave.length) await slideRepository.save(slidesToSave);

      const result = await slideRepository.find({ order: { sortOrder: 'ASC' } });

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
