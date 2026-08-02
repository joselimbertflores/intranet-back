import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, QueryFailedError, Repository } from 'typeorm';

import { PaginationParamsDto } from 'src/common/dtos';
import { generateSlug } from 'src/helpers';
import { FileContext } from 'src/modules/files/enums/file-context.enum';
import { FilesService } from 'src/modules/files/files.service';

import { CreateTutorialDto, UpdateTutorialDto } from '../dtos';
import { Tutorial, TutorialCategory } from '../entities';
import { TutorialBlockService } from './tutorial-block.service';

@Injectable()
export class TutorialService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly filesService: FilesService,
    private readonly tutorialBlockService: TutorialBlockService,
    @InjectRepository(Tutorial) private readonly tutorialRepository: Repository<Tutorial>,
    @InjectRepository(TutorialCategory) private readonly tutorialCategoryRepository: Repository<TutorialCategory>,
  ) {}

  async findAll({ limit, offset, term }: PaginationParamsDto) {
    const [tutorials, total] = await this.tutorialRepository.findAndCount({
      ...(term && { where: { title: ILike(`%${term}%`) } }),
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
      relations: { category: true },
    });

    return { tutorials: tutorials.map((tutorial) => this.mapToAdminSummary(tutorial)), total };
  }

  async create(dto: CreateTutorialDto) {
    if (dto.isPublished === true) {
      throw new BadRequestException('A tutorial cannot be published without blocks');
    }

    const slug = generateSlug(dto.title);
    if (!slug) throw new BadRequestException('Tutorial title must produce a valid slug');
    await this.ensureSlugIsAvailable(slug);
    const category = await this.resolveCategory(dto.categoryId);
    const tutorial = this.tutorialRepository.create({
      title: dto.title,
      slug,
      summary: dto.summary ?? null,
      category,
      isPublished: false,
      blocks: [],
    });

    try {
      const savedTutorial = await this.tutorialRepository.save(tutorial);
      return this.mapToAdminDetail(savedTutorial);
    } catch (error) {
      this.throwSlugConflictIfNeeded(error, slug);
      throw error;
    }
  }

  async update(id: string, dto: UpdateTutorialDto) {
    const tutorial = await this.dataSource.transaction(async (manager) => {
      const current = await manager.findOne(Tutorial, {
        where: { id },
        relations: { category: true, blocks: { file: true } },
        order: { blocks: { order: 'ASC' } },
      });

      if (!current) throw new NotFoundException('Tutorial not found');

      if (dto.categoryId !== undefined) {
        current.category = await this.resolveCategory(dto.categoryId, manager.getRepository(TutorialCategory));
      }
      if (dto.title !== undefined) current.title = dto.title;
      if (dto.summary !== undefined) current.summary = dto.summary;
      if (dto.isPublished !== undefined) current.isPublished = dto.isPublished;

      if (current.isPublished && current.blocks.length === 0) {
        throw new BadRequestException('A tutorial cannot be published without blocks');
      }

      return manager.save(current);
    });

    return this.mapToAdminDetail(tutorial);
  }

  async remove(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const tutorial = await manager.findOne(Tutorial, {
        where: { id },
        relations: { blocks: { file: true } },
      });

      if (!tutorial) throw new NotFoundException('Tutorial not found');

      for (const block of tutorial.blocks) {
        if (block.file) {
          await this.filesService.markActiveFileAsOrphaned(block.file.id, manager, FileContext.TUTORIALS);
        }
      }

      await manager.delete(Tutorial, { id });
    });
  }

  async findOne(id: string) {
    const tutorial = await this.tutorialRepository.findOne({
      where: { id },
      relations: { blocks: { file: true }, category: true },
      order: { blocks: { order: 'ASC' } },
    });

    if (!tutorial) throw new NotFoundException('Tutorial not found');
    return this.mapToAdminDetail(tutorial);
  }

  private async resolveCategory(
    categoryId: number | null | undefined,
    repository: Repository<TutorialCategory> = this.tutorialCategoryRepository,
  ): Promise<TutorialCategory | null> {
    if (categoryId == null) return null;

    const category = await repository.findOneBy({ id: categoryId });
    if (!category) throw new BadRequestException('Tutorial category not found');
    return category;
  }

  private async ensureSlugIsAvailable(slug: string): Promise<void> {
    const duplicate = await this.tutorialRepository.exists({ where: { slug } });
    if (duplicate) throw new ConflictException('Tutorial slug already exists');
  }

  private throwSlugConflictIfNeeded(error: unknown, slug: string): void {
    if (!(error instanceof QueryFailedError)) return;
    if ((error.driverError as { code?: string }).code === '23505') {
      throw new ConflictException(`Tutorial slug "${slug}" already exists`);
    }
  }

  private mapCategory(category?: TutorialCategory | null) {
    return category ? { id: category.id, name: category.name, slug: category.slug } : null;
  }

  private mapToAdminSummary(tutorial: Tutorial) {
    return {
      id: tutorial.id,
      title: tutorial.title,
      slug: tutorial.slug,
      summary: tutorial.summary ?? null,
      isPublished: tutorial.isPublished,
      category: this.mapCategory(tutorial.category),
      createdAt: tutorial.createdAt,
      updatedAt: tutorial.updatedAt,
    };
  }

  private mapToAdminDetail(tutorial: Tutorial) {
    return {
      ...this.mapToAdminSummary(tutorial),
      blocks: [...(tutorial.blocks ?? [])]
        .sort((left, right) => left.order - right.order)
        .map((block) => this.tutorialBlockService.mapToAdminBlock(block)),
    };
  }
}
