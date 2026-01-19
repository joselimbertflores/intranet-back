import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { CreateDocumentTypeDto, DocumentSubTypeDto, UpdateDocumentTypeDto } from '../dtos';
import { InstitutionalDocumentType, DocumentSubType, InstitutionalDocument } from '../entities';

@Injectable()
export class DocumentTypeService {
  constructor(
    @InjectRepository(InstitutionalDocumentType) private documentTypeRepository: Repository<InstitutionalDocumentType>,
    @InjectRepository(DocumentSubType) private documentSubTypeRepository: Repository<DocumentSubType>,
    @InjectRepository(InstitutionalDocument) private documentRepository: Repository<InstitutionalDocument>,
  ) {}

  async getCategoriesWithSections() {
    // return await this.documentTypeRepository.find({
    //   relations: { sectionCategories: { section: true } },
    // });
  }

  async findAll() {
    return this.documentTypeRepository.find({
      order: { id: 'DESC', subtypes: { id: 'ASC' } },
      relations: { subtypes: true },
    });
  }

  async create(dto: CreateDocumentTypeDto) {
    try {
      const { subtypes, ...props } = dto;
      const model = this.documentTypeRepository.create({
        ...props,
        subtypes: subtypes.length > 0 ? subtypes.map((st) => this.documentSubTypeRepository.create(st)) : [],
      });
      return await this.documentTypeRepository.save(model);
    } catch (error: unknown) {
      this.handleModifyException(error);
    }
  }

  async update(id: number, dto: UpdateDocumentTypeDto) {
    const { subtypes, ...toUpdate } = dto;
    const type = await this.documentTypeRepository.findOne({
      where: { id },
      relations: { subtypes: true },
      order: { subtypes: { id: 'ASC' } },
    });
    if (!type) throw new NotFoundException(`Document type ${id} not found.`);
    if (subtypes && subtypes.length > 0) {
      type.subtypes = this.updateSubtypes(type.subtypes, subtypes);
    }
    return await this.documentTypeRepository.save({ ...type, ...toUpdate });
  }

  async removeSubtype(id: number) {
    const documentsCountUsingSubtype = await this.documentRepository.count({ where: { subtype: { id } } });
    if (documentsCountUsingSubtype > 0) {
      throw new BadRequestException(`Cannot delete document subtype ${id} because it is in use.`);
    }
    const result = await this.documentSubTypeRepository.delete({ id });
    return (result.affected ?? 0) > 0
      ? { ok: true, message: `Document subtype ${id} deleted successfully.` }
      : { ok: false, message: `Document subtype ${id} not found.` };
  }

  async getActiveTypes() {
    return this.documentTypeRepository.find({ where: { isActive: true } });
  }

  private updateSubtypes(existingSubtypes: DocumentSubType[], subtypes: DocumentSubTypeDto[]) {
    for (const subtype of subtypes) {
      if (subtype.id) {
        const index = existingSubtypes.findIndex((e) => e.id === subtype.id);
        if (index === -1) {
          throw new NotFoundException(`Document subtype ${subtype.id} not found.`);
        }

        existingSubtypes[index] = {
          ...existingSubtypes[index],
          ...subtype,
        };
      } else {
        existingSubtypes.push(this.documentSubTypeRepository.create(subtype));
      }
    }
    return existingSubtypes;
  }

  private handleModifyException(error: unknown): void {
    if (error instanceof QueryFailedError && error['code'] === '23505') {
      throw new BadRequestException(`Duplicate document type name`);
    }
    throw new InternalServerErrorException(`Failed create cagory`);
  }

  private assignDefined<T>(entity: T, dto: Partial<T>) {
    // * Update propertirs of entity with dto.
    // * Replace =>  this.documentTypeRepository.save({ ...type, ...toUpdate });
    Object.entries(dto).forEach(([key, value]) => {
      if (value !== undefined) {
        entity[key] = value;
      }
    });
  }
}
