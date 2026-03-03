import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { FilesService } from 'src/modules/files/files.service';
import { Tutorial, TutorialBlockType, TutorialCategory } from '../entities';
import { GetPortalTutorialsDto } from '../dtos';
import { TutorialVideoHelper } from '../helpers';

@Injectable()
export class TutorialReadService {
  constructor(
    @InjectRepository(Tutorial) private tutorialRepository: Repository<Tutorial>,
    @InjectRepository(TutorialCategory) private tutorialCategoryRepository: Repository<TutorialCategory>,
    private fileServicce: FilesService,
  ) {}

  async findPublicList({ limit, offset, term, categoryId }: GetPortalTutorialsDto) {
    const [tutorials, total] = await this.tutorialRepository.findAndCount({
      where: {
        isPublished: true,
        ...(categoryId && { category: { id: categoryId } }),
        ...(term && { title: ILike(`%${term}%`) }),
      },
      relations: { category: true },
      take: limit,
      skip: offset,
      order: { createdAt: 'desc' },
    });

    return {
      tutorials: tutorials.map((item) => ({
        id: item.id,
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

  async getCategories() {
    const result = await this.tutorialCategoryRepository.find({});
    return result.map(({ id, name }) => ({ id, name }));
  }

  private toPublicDetail(tutorial: Tutorial) {
    return {
      id: tutorial.id,
      slug: tutorial.slug,
      title: tutorial.title,
      summary: tutorial.summary,
      createdAt: tutorial.createdAt,
      category: tutorial.category?.name ?? null,
      blocks: [...tutorial.blocks]
        .sort((a, b) => a.order - b.order)
        .map((block) => ({
          id: block.id,
          type: block.type,
          order: block.order,
          content: this.handleContent(block.type, block.content ?? null),
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

  private handleContent(type: TutorialBlockType, content: string | null) {
    if (!content) return null;
    if (type !== TutorialBlockType.VIDEO_URL) return content;
    return TutorialVideoHelper.toEmbedUrl(content);
  }
}
