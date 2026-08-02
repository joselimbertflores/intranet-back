import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { generateSlug } from 'src/helpers';

import { CreateTutorialCategoryDto, UpdateTutorialCategoryDto } from '../dtos';
import { Tutorial, TutorialCategory } from '../entities';

@Injectable()
export class TutorialCategoryService {
  constructor(
    @InjectRepository(TutorialCategory)
    private readonly tutorialCategoryRepository: Repository<TutorialCategory>,
    @InjectRepository(Tutorial) private readonly tutorialRepository: Repository<Tutorial>,
  ) {}

  async findAll() {
    const categories = await this.tutorialCategoryRepository.find({ order: { createdAt: 'DESC' } });
    return categories.map((category) => this.mapToAdminResponse(category));
  }

  async create(dto: CreateTutorialCategoryDto) {
    const slug = generateSlug(dto.name);
    if (!slug) throw new BadRequestException('Tutorial category name must produce a valid slug');
    await this.ensureSlugIsAvailable(slug);
    const category = this.tutorialCategoryRepository.create({ name: dto.name, slug });

    try {
      return this.mapToAdminResponse(await this.tutorialCategoryRepository.save(category));
    } catch (error) {
      this.throwSlugConflictIfNeeded(error, slug);
      throw error;
    }
  }

  async update(id: number, dto: UpdateTutorialCategoryDto) {
    const category = await this.findEntityOrFail(id);

    if (dto.name !== undefined && dto.name !== category.name) {
      const slug = generateSlug(dto.name);
      if (!slug) throw new BadRequestException('Tutorial category name must produce a valid slug');
      await this.ensureSlugIsAvailable(slug, id);
      category.name = dto.name;
      category.slug = slug;
    }

    try {
      return this.mapToAdminResponse(await this.tutorialCategoryRepository.save(category));
    } catch (error) {
      this.throwSlugConflictIfNeeded(error, category.slug);
      throw error;
    }
  }

  async remove(id: number) {
    const category = await this.findEntityOrFail(id);
    const inUse = await this.tutorialRepository.exists({ where: { category: { id } } });

    if (inUse) {
      throw new ConflictException('Tutorial category is in use');
    }

    await this.tutorialCategoryRepository.remove(category);
    return { ok: true, message: 'Category deleted successfully' };
  }

  private async findEntityOrFail(id: number): Promise<TutorialCategory> {
    const category = await this.tutorialCategoryRepository.findOneBy({ id });
    if (!category) throw new NotFoundException('Tutorial category not found');
    return category;
  }

  private async ensureSlugIsAvailable(slug: string, currentCategoryId?: number): Promise<void> {
    const duplicate = await this.tutorialCategoryRepository.findOneBy({ slug });
    if (duplicate && duplicate.id !== currentCategoryId) {
      throw new ConflictException('Tutorial category slug already exists');
    }
  }

  private throwSlugConflictIfNeeded(error: unknown, slug: string): void {
    if (!(error instanceof QueryFailedError)) return;
    if ((error.driverError as { code?: string }).code === '23505') {
      throw new ConflictException(`Tutorial category slug "${slug}" already exists`);
    }
  }

  private mapToAdminResponse(category: TutorialCategory) {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      createdAt: category.createdAt,
    };
  }
}
