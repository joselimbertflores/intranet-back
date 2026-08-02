import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { FilesService } from 'src/modules/files/files.service';

import { SearchPublicTutorialsDto } from '../dtos';
import { Tutorial, TutorialBlockType, TutorialCategory } from '../entities';
import { TutorialVideoHelper } from '../helpers';

@Injectable()
export class PublicTutorialsService {
  constructor(
    @InjectRepository(Tutorial) private readonly tutorialRepository: Repository<Tutorial>,
    @InjectRepository(TutorialCategory)
    private readonly tutorialCategoryRepository: Repository<TutorialCategory>,
    private readonly filesService: FilesService,
  ) {}

  async findAll({ limit, offset, term, category }: SearchPublicTutorialsDto) {
    const [tutorials, total] = await this.tutorialRepository.findAndCount({
      where: {
        isPublished: true,
        ...(category && { category: { slug: category } }),
        ...(term && { title: ILike(`%${term}%`) }),
      },
      relations: { category: true },
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });

    return {
      tutorials: tutorials.map((tutorial) => ({
        id: tutorial.id,
        slug: tutorial.slug,
        title: tutorial.title,
        summary: tutorial.summary ?? null,
        category: this.mapCategory(tutorial.category),
        createdAt: tutorial.createdAt,
      })),
      total,
    };
  }

  async findBySlug(slug: string) {
    const tutorial = await this.tutorialRepository.findOne({
      where: { slug, isPublished: true },
      relations: {
        category: true,
        blocks: { file: true },
      },
      order: { blocks: { order: 'ASC' } },
    });

    if (!tutorial) throw new NotFoundException('Tutorial not found');
    return this.toPublicDetail(tutorial);
  }

  async getCategories() {
    const categories = await this.tutorialCategoryRepository
      .createQueryBuilder('category')
      .innerJoin('category.tutorials', 'tutorial', 'tutorial.isPublished = :isPublished', { isPublished: true })
      .distinct(true)
      .orderBy('category.name', 'ASC')
      .getMany();

    return categories.map(({ id, name, slug }) => ({ id, name, slug }));
  }

  private toPublicDetail(tutorial: Tutorial) {
    return {
      id: tutorial.id,
      slug: tutorial.slug,
      title: tutorial.title,
      summary: tutorial.summary ?? null,
      createdAt: tutorial.createdAt,
      category: this.mapCategory(tutorial.category),
      blocks: [...tutorial.blocks]
        .sort((left, right) => left.order - right.order)
        .map((block) => {
          const isFileBlock = this.isFileBlock(block.type);
          return {
            id: block.id,
            type: block.type,
            order: block.order,
            content: isFileBlock ? null : this.mapContent(block.type, block.content),
            file:
              isFileBlock && block.file
                ? {
                    id: block.file.id,
                    url: this.filesService.buildPublicFileUrl(block.file.id),
                    name: block.file.originalName,
                    mimeType: block.file.mimeType,
                    size: Number(block.file.sizeBytes),
                  }
                : null,
          };
        }),
    };
  }

  private mapCategory(category?: TutorialCategory | null) {
    return category ? { id: category.id, name: category.name, slug: category.slug } : null;
  }

  private mapContent(type: TutorialBlockType, content: string | null): string | null {
    if (!content) return null;
    return type === TutorialBlockType.YOUTUBE ? TutorialVideoHelper.toEmbedUrl(content) : content;
  }

  private isFileBlock(type: TutorialBlockType): boolean {
    return type === TutorialBlockType.IMAGE || type === TutorialBlockType.VIDEO_FILE || type === TutorialBlockType.FILE;
  }
}
