import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { CreateDocumentCategoryDto, UpdateDocumentCategoryDto } from '../dtos';
import { InstitutionalDocumentType, DocumentSubType } from '../entities';

@Injectable()
export class DocumentTypeService {
  constructor(
    @InjectRepository(InstitutionalDocumentType) private documentTypeRepository: Repository<InstitutionalDocumentType>,
    @InjectRepository(DocumentSubType) private documentSubTypeRepository: Repository<DocumentSubType>,
  ) {}

  async getCategoriesWithSections() {
    // return await this.documentTypeRepository.find({
    //   relations: { sectionCategories: { section: true } },
    // });
  }

  async create(dto: CreateDocumentCategoryDto) {
    try {
      const { subTypes, name } = dto;
      const model = this.documentTypeRepository.create({
        name,
        ...(subTypes.length > 0 && { subtypes: subTypes.map((st) => this.documentSubTypeRepository.create(st)) }),
      });
      return await this.documentTypeRepository.save(model);
    } catch (error: unknown) {
      this.handleModifyException(error);
    }
  }

  async update(id: number, data: UpdateDocumentCategoryDto) {
    try {
      const { name } = data;

      const category = await this.documentTypeRepository.preload({ id, ...(name && { name }) });

      if (!category) throw new NotFoundException(`Category ${id} not found`);

      return await this.documentTypeRepository.save(category);
    } catch (error: unknown) {
      this.handleModifyException(error);
    }
  }

  async findAll() {
    return this.documentTypeRepository.find({ order: { id: 'DESC' } });
  }

  private handleModifyException(error: unknown): void {
    if (error instanceof QueryFailedError && error['code'] === '23505') {
      throw new BadRequestException(`Duplicate category name`);
    }
    throw new InternalServerErrorException(`Failed create cagory`);
  }
}
