import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, EntityManager, In, Repository } from 'typeorm';

import { Tutorial, TutorialBlock, TutorialBlockType, TutorialCategory } from '../entities';
import {
  CreateTutorialBlockDto,
  CreateTutorialDto,
  TutorialBlockActionsDto,
  UpdateTutorialBlockDto,
  UpdateTutorialDto,
} from '../dtos';
import { FileStatus, StoredFile } from 'src/modules/files/entities/stored-file.entity';
import { generateSlug } from 'src/helpers';
import { PaginationParamsDto } from 'src/modules/common';
import { FilesService } from 'src/modules/files/files.service';

@Injectable()
export class TutorialService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Tutorial) private tutorialRepository: Repository<Tutorial>,
    @InjectRepository(TutorialBlock) private tutorialBlockRepository: Repository<TutorialBlock>,
    @InjectRepository(TutorialCategory) private tutorialCategoryRepository: Repository<TutorialCategory>,
    private fileService: FilesService,
  ) {}

  async findAll({ limit, offset, term }: PaginationParamsDto) {
    const [tutorials, total] = await this.tutorialRepository.findAndCount({
      ...(term && { where: { title: In([`%${term}%`]) } }),
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
      relations: { category: true },
    });

    return { tutorials, total };
  }

  async create(dto: CreateTutorialDto): Promise<Tutorial> {
    const { categoryId, ...props } = dto;
    const slug = await this.generateSlugFromTitle(dto.title);
    let category: TutorialCategory | null = null;
    if (dto.categoryId) {
      category = await this.tutorialCategoryRepository.findOneBy({ id: dto.categoryId });
    }
    const tutorial = this.tutorialRepository.create({
      ...props,
      slug,
      ...(category && { category }),
    });
    return await this.tutorialRepository.save(tutorial);
  }

  async update(id: string, dto: UpdateTutorialDto) {
    const { categoryId, ...proops } = dto;
    const tutorial = await this.tutorialRepository.findOne({ where: { id } });
    if (!tutorial) throw new NotFoundException('Tutorial not found');
    if (dto.title && dto.title !== tutorial.title) {
      tutorial.slug = generateSlug(dto.title);
    }
    if (categoryId) {
      const category = await this.tutorialCategoryRepository.findOneBy({ id: categoryId });
      if (!category) throw new BadRequestException('Category not found');
      tutorial.category = category;
    }
    Object.assign(tutorial, proops);
    await this.tutorialRepository.save(tutorial);
  }

  async findOne(id: string) {
    const tutorial = await this.tutorialRepository.findOne({
      where: { id },
      relations: { blocks: { file: true }, category: true },
      order: { blocks: { order: 'ASC' } },
    });
    if (!tutorial) throw new NotFoundException('Tutorial not found');
    const { blocks, ...props } = tutorial;
    return {
      ...props,
      blocks: blocks.map((block) => this.mapBlock(block)),
    };
  }

  async remove(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const tutorial = await manager.findOne(Tutorial, {
        where: { id },
        relations: { blocks: { file: true } },
      });

      if (!tutorial) throw new NotFoundException();

      for (const block of tutorial.blocks) {
        if (block.file) {
          await manager.update(StoredFile, { id: block.file.id }, { status: FileStatus.REMOVED });
        }
      }

      await manager.delete(TutorialBlock, { tutorial: { id } });
      await manager.delete(Tutorial, { id });

      return { ok: true };
    });
  }

  private async generateSlugFromTitle(title: string): Promise<string> {
    const slug = generateSlug(title);
    const duplicate = await this.tutorialRepository.findOne({ where: { slug } });
    if (duplicate) throw new BadRequestException('Slug already exists, rename the tutorial');
    return slug;
  }

  private mapBlock(block: TutorialBlock) {
    return {
      id: block.id,
      type: block.type,
      content: block.content,
      order: block.order,
      ...(block.file && {
        file: {
          id: block.file.id,
          url: this.fileService.buildPublicFileUrl(block.file.id),
          originalName: block.file.originalName,
          mimeType: block.file.mimeType,
        },
      }),
    };
  }
}
