import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { CreateTutorialCategoryDto, UpdateTutorialCategoryDto } from '../dtos/tutorial-category.dto';
import { Tutorial, TutorialCategory } from '../entities';
import { generateSlug } from 'src/helpers';
import { ok } from 'assert';

@Injectable()
export class TutorialCategoryService {
  constructor(
    @InjectRepository(TutorialCategory) private tutorialCategoryRepository: Repository<TutorialCategory>,
    @InjectRepository(Tutorial) private tutorialReposutory: Repository<Tutorial>,
  ) {}

  async findAll() {
    console.log('search');
    return await this.tutorialCategoryRepository.find({
      order: {
        createdAt: 'desc',
      },
    });
  }

  async create(dto: CreateTutorialCategoryDto) {
    try {
      const category = this.tutorialCategoryRepository.create({ ...dto, slug: generateSlug(dto.name) });
      return await this.tutorialCategoryRepository.save(category);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async update(id: number, dto: UpdateTutorialCategoryDto) {
    const category = await this.findOne(id);
    Object.assign(category, dto);
    try {
      if (dto.name && dto.name.trim() !== category.name.trim()) {
        category.slug = generateSlug(dto.name);
      }
      return await this.tutorialCategoryRepository.save(category);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async findOne(id: number) {
    const category = await this.tutorialCategoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Tutorial category with id ${id} not found`);
    }

    return category;
  }

  async remove(id: number) {
    const count = await this.tutorialReposutory.count({ where: { category: { id } } });

    if (count > 0) {
      throw new BadRequestException('Category is in use by one or more tutorials');
    }
    const result = await this.tutorialCategoryRepository.delete({ id });
    return (result.affected ?? 0 > 0)
      ? { ok: true, message: 'Category deleted successfully' }
      : { ok: false, message: 'Category not found' };
  }

  private handleDatabaseError(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const dbCode = (error as QueryFailedError & { driverError?: { code?: string } }).driverError?.code;
      if (dbCode === '23505') {
        throw new BadRequestException('Category slug already exists');
      }
    }

    throw new BadRequestException('Could not process tutorial category request');
  }
}
