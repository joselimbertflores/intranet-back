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

const COVER_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
    try {
      const savedTutorial = await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(Tutorial);
        const category = await this.resolveCategory(dto.categoryId, manager.getRepository(TutorialCategory));
        const tutorial = repository.create({
          title: dto.title,
          slug,
          summary: dto.summary ?? null,
          coverImageFileId: dto.coverImageFileId ?? null,
          category,
          isPublished: false,
          blocks: [],
        });

        const saved = await repository.save(tutorial);
        if (dto.coverImageFileId) {
          const coverImage = await this.filesService.claimPendingFile(
            dto.coverImageFileId,
            FileContext.TUTORIALS,
            manager,
          );
          this.assertCoverImageMimeType(coverImage.mimeType);
        }
        return saved;
      });
      return this.mapToAdminDetail(savedTutorial);
    } catch (error) {
      this.throwSlugConflictIfNeeded(error, slug);
      throw error;
    }
  }

  async update(id: string, dto: UpdateTutorialDto) {
    const tutorial = await this.dataSource.transaction(async (manager) => {
      const lockedTutorial = await manager.findOne(Tutorial, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedTutorial) throw new NotFoundException('Tutorial not found');

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

      const previousCoverImageFileId = current.coverImageFileId;
      const coverImageWasChanged =
        dto.coverImageFileId !== undefined && dto.coverImageFileId !== previousCoverImageFileId;

      if (coverImageWasChanged && dto.coverImageFileId) {
        const coverImage = previousCoverImageFileId
          ? await this.filesService.replaceActiveFileWithPendingFile(
              previousCoverImageFileId,
              dto.coverImageFileId,
              FileContext.TUTORIALS,
              manager,
            )
          : await this.filesService.claimPendingFile(dto.coverImageFileId, FileContext.TUTORIALS, manager);
        this.assertCoverImageMimeType(coverImage.mimeType);
        current.coverImageFileId = dto.coverImageFileId;
      } else if (coverImageWasChanged) {
        current.coverImageFileId = null;
      }

      if (current.isPublished && current.blocks.length === 0) {
        throw new BadRequestException('A tutorial cannot be published without blocks');
      }

      const saved = await manager.save(current);

      if (coverImageWasChanged && dto.coverImageFileId === null && previousCoverImageFileId) {
        await this.filesService.markActiveFileAsOrphaned(previousCoverImageFileId, manager, FileContext.TUTORIALS);
      }

      return saved;
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

      if (tutorial.coverImageFileId) {
        await this.filesService.markActiveFileAsOrphaned(tutorial.coverImageFileId, manager, FileContext.TUTORIALS);
      }

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
      coverImageFileId: tutorial.coverImageFileId,
      coverImageUrl: tutorial.coverImageFileId ? this.filesService.buildPublicFileUrl(tutorial.coverImageFileId) : null,
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

  private assertCoverImageMimeType(mimeType: string): void {
    if (!COVER_IMAGE_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException('Tutorial cover must be a PNG, JPEG or WebP image');
    }
  }
}
