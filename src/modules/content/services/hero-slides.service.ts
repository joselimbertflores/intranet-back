import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { FilesService } from 'src/modules/files/files.service';
import { FileGroup } from 'src/modules/files/file-group.enum';
import { ReplaceHeroSlideDto, HeroSlideDto } from '../dtos';
import { HeroSlides } from '../entities';

@Injectable()
export class HeroSlidesService {
  constructor(
    @InjectRepository(HeroSlides) private heroSlidesRepository: Repository<HeroSlides>,
    private dataSource: DataSource,
    private fileService: FilesService,
  ) {}

  async findAll() {
    const slides = await this.heroSlidesRepository.find({ order: { order: 'ASC' } });
    return slides.map(({ image, ...props }) => ({
      ...props,
      imageUrl: this.fileService.buildFileUrl(image, FileGroup.HERO_SLIDES),
    }));
  }

  async replaceSlides({ slides }: ReplaceHeroSlideDto) {
    const existingSlides = await this.heroSlidesRepository.find({ select: ['image'] });

    const newSlides = await this.dataSource.transaction(async (manager) => {
      await manager.clear(HeroSlides);
      const newSlideEntities = slides.map((s, i) => manager.create(HeroSlides, { ...s, order: i }));
      return manager.save(newSlideEntities);
    });

    await this.removeOrphanSlideImages(existingSlides, slides);

    return newSlides;
  }

  private async removeOrphanSlideImages(existingSlides: Pick<HeroSlides, 'image'>[], newSlides: HeroSlideDto[]) {
    const usedImages = new Set(newSlides.map((s) => s.image));

    const orphanImages = existingSlides.map((s) => s.image).filter((img) => !usedImages.has(img));

    if (orphanImages.length > 0) {
      await this.fileService.deleteMany(orphanImages, FileGroup.HERO_SLIDES);
    }
  }
}
