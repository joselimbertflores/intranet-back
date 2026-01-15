import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, In, QueryRunner, Repository } from 'typeorm';

import {  DocumentSection,  } from '../entities';
import { CreateSectionWithCategoriesDto, UpdateSectionWithCategoriesDto } from '../dtos';
import { PaginationDto } from 'src/modules/common';

@Injectable()
export class DocumentSectionService {
  constructor(
    @InjectRepository(DocumentSection) private sectionRepository: Repository<DocumentSection>,
    // @InjectRepository(DocumentCategory) private categoryRepository: Repository<DocumentCategory>,
    // @InjectRepository(SectionCategory) private sectionCategoryRepository: Repository<SectionCategory>,
    private dataSource: DataSource,
  ) {}

  async findSectionsWithCategories(paginationParas: PaginationDto) {
    const { term, limit, offset } = paginationParas;
    const [sections, total] = await this.sectionRepository.findAndCount({
      ...(term && {
        where: { name: ILike(`%${term}%`) },
      }),
      skip: offset,
      take: limit,
      // relations: {
      //   sectionCategories: {
      //     category: true,
      //   },
      // },
    });
    return { sections: sections.map((section) => this.plainSection(section)), total };
  }

  async create(data: CreateSectionWithCategoriesDto) {
    const { categoriesIds, name } = data;

    // const categories = await this.getValidCategories(categoriesIds);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sectionModel = queryRunner.manager.create(DocumentSection, { name });

      const createdSection = await queryRunner.manager.save(sectionModel);

      // await this.syncCategories(createdSection, categories, queryRunner);

      await queryRunner.commitTransaction();
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(`Failed create documents`);
    } finally {
      await queryRunner.release();
    }
  }

  async update(sectionId: number, data: UpdateSectionWithCategoriesDto) {
    const { categoriesIds, name } = data;

    const section = await this.sectionRepository.preload({ id: sectionId, name });

    if (!section) throw new NotFoundException(`Section ${sectionId} not found`);

    // const categories = await this.getValidCategories(categoriesIds ?? []);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(section);

      if (categoriesIds) {
        // await this.syncCategories(section, categories, queryRunner);
      }

      await queryRunner.commitTransaction();
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(`Failed update documents`);
    } finally {
      await queryRunner.release();
    }
  }

  // private async syncCategories(section: DocumentSection, categories: DocumentCategory[], queryRunner: QueryRunner) {
  //   const categoriesIds = categories.map((c) => c.id);

  //   const existingRelations = await queryRunner.manager.find(SectionCategory, {
  //     where: { section: { id: section.id } },
  //     relations: ['documents', 'category'],
  //   });

  //   for (const { category, documents = [] } of existingRelations) {
  //     const shouldRemove = !categoriesIds.includes(category.id);
  //     if (shouldRemove && documents.length > 0) {
  //       throw new BadRequestException(
  //         `Cannot remove category "${category.name}" because it has ${documents.length} document(s).`,
  //       );
  //     }
  //   }

  //   const removableIds = existingRelations
  //     .filter((rel) => !categoriesIds.includes(rel.category.id))
  //     .map((rel) => rel.id);

  //   if (removableIds.length > 0) {
  //     await queryRunner.manager.delete(SectionCategory, removableIds);
  //   }

  //   const newCategories = categories.filter((cat) => !existingRelations.some((rel) => rel.category.id === cat.id));

  //   if (newCategories.length === 0) return [];

  //   const models = newCategories.map((category) => queryRunner.manager.create(SectionCategory, { section, category }));

  //   return await queryRunner.manager.save(models);
  // }

  private plainSection(section: DocumentSection) {
    return {
      id: section.id,
      name: section.name,
      // categories: section.sectionCategories.map((sc) => ({
      //   id: sc.category.id,
      //   name: sc.category.name,
      // })),
    };
  }

  // private async getValidCategories(categoriesIds: number[]) {
  //   const categories = await this.categoryRepository.find({ where: { id: In(categoriesIds) } });

  //   if (categories.length !== categoriesIds.length) {
  //     const foundIds = categories.map((c) => c.id);

  //     const missing = categoriesIds.filter((id) => !foundIds.includes(id));

  //     throw new NotFoundException(`Categories not found: ${missing.join(', ')}`);
  //   }
  //   return categories;
  // }
}
