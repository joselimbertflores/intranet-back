import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { FilesService } from 'src/modules/files/files.service';
import { GetPortalTutorialsDto } from '../dtos';
import { Tutorial } from '../entities';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class TutorialReadService {
  constructor(
    @InjectRepository(Tutorial) private tutorialRepository: Repository<Tutorial>,
    private fileServicce: FilesService,
  ) {}

  async findPublicList({ limit, offset, category }: GetPortalTutorialsDto) {
    const [tutorials, total] = await this.tutorialRepository.findAndCount({
      where: { isPublished: true, ...(category && { category: { id: category } }) },
      relations: { category: true },
      take: limit,
      skip: offset,
      order: { createdAt: 'desc' },
    });

    return {
      tutorials: tutorials.map((item) => ({
        slug: item.slug,
        title: item.title,
        summary: item.summary,
        category: item.category?.name,
        createdAt: item.createdAt,
      })),
      total,
    };
  }

  async findPublicBySlug(slug: string) {
    const tutorial = await this.tutorialRepository.findOne({
      where: { slug, isPublished: true },
      relations: {
        category: true,
        blocks: {
          file: true,
        },
      },
      order: {
        blocks: {
          order: 'ASC',
        },
      },
    });

    if (!tutorial) throw new NotFoundException();
    return this.toPublicDetail(tutorial);
  }

  private toPublicDetail(tutorial: Tutorial) {
    return {
      id: tutorial.id,
      slug: tutorial.slug,
      title: tutorial.title,
      summary: tutorial.summary,
      createdAt: tutorial.createdAt.toISOString(),
      category: tutorial.category?.name ?? null,
      blocks: [...tutorial.blocks]
        .sort((a, b) => a.order - b.order)
        .map((block) => ({
          id: block.id,
          type: block.type,
          order: block.order,
          content: block.content ?? null,
          file: block.file
            ? {
                id: block.file.id,
                url: this.fileServicce.buildPublicFileUrl(block.file.id),
                name: block.file.originalName,
                mimeType: block.file.mimeType,
                size: block.file.sizeBytes,
              }
            : null,
        })),
    };
  }
}
