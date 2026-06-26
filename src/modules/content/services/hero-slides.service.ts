import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { FilesService } from 'src/modules/files/files.service';

import { SaveHeroSlidesBatchDto } from '../dtos';
import { HeroSlide } from '../entities';

@Injectable()
export class HeroSlidesService {
  constructor(
    @InjectRepository(HeroSlide) private readonly heroSlidesRepository: Repository<HeroSlide>,
    private readonly dataSource: DataSource,
    private readonly filesService: FilesService,
  ) {}

  async findAll() {
    const slides = await this.heroSlidesRepository.find({ relations: { file: true }, order: { sortOrder: 'ASC' } });
    return this.mapHeroSlides(slides);
  }

  async findLanding() {
    const slides = await this.heroSlidesRepository.find({
      where: { isActive: true },
      relations: { file: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return this.mapHeroSlides(slides);
  }

  async saveBatch({ items }: SaveHeroSlidesBatchDto) {
    const ids = items.filter((item) => item.id).map((item) => item.id as number);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate hero slide IDs are not allowed in the payload');
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

          if (current.fileId !== item.fileId) {
            const replacementFile = await this.filesService.replaceActiveFileWithPendingFile(
              current.fileId,
              item.fileId,
              manager,
            );
            current.file = replacementFile;
          }

          slidesToSave.push(Object.assign(current, { ...item, sortOrder }));
        } else {
          const file = await this.filesService.claimPendingFile(item.fileId, manager);
          const newSlide = manager.create(HeroSlide, { ...item, file, sortOrder });
          slidesToSave.push(newSlide);
        }
      }

      if (slidesToSave.length) await slideRepository.save(slidesToSave);

      const result = await slideRepository.find({ relations: { file: true }, order: { sortOrder: 'ASC' } });

      return this.mapHeroSlides(result);
    });
  }

  async remove(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const slideRepository = manager.getRepository(HeroSlide);
      const slide = await slideRepository.findOne({ where: { id } });

      if (!slide) throw new NotFoundException('Hero slide not found');

      await this.filesService.markActiveFileAsOrphaned(slide.fileId, manager);
      await slideRepository.delete(id);

      return { ok: true, message: 'Hero slide removed successfully' };
    });
  }

  private mapHeroSlides(slides: HeroSlide[]) {
    return slides.map((slide) => ({
      id: slide.id,
      title: slide.title,
      description: slide.description,
      linkLabel: slide.linkLabel,
      linkUrl: slide.linkUrl,
      fileId: slide.fileId,
      fileUrl: this.filesService.buildPublicFileUrl(slide.fileId),
      sortOrder: slide.sortOrder,
      isActive: slide.isActive,
    }));
  }
}
