import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { CreateDocumentTypeDto, DocumentSubTypeDto, UpdateDocumentTypeDto } from '../dtos';
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

  async create(dto: CreateDocumentTypeDto) {
    try {
      const { subtypes: subTypes, name } = dto;
      const model = this.documentTypeRepository.create({
        name,
        ...(subTypes.length > 0 && { subtypes: subTypes.map((st) => this.documentSubTypeRepository.create(st)) }),
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
    });
    if (!type) throw new NotFoundException(`Sub type ${id} not found.`);
    this.assignDefined(type, toUpdate);
    if (subtypes && subtypes.length > 0) {
      type.subtypes = this.updateSubTypes(type.subtypes, subtypes);
    }
    const resuñt = await this.documentTypeRepository.save({ ...type, ...toUpdate });
    return resuñt;
  }

  private updateSubTypes(existingSubtypes: DocumentSubType[], subtypes: DocumentSubTypeDto[]) {
    for (const subtype of subtypes) {
      if (subtype.id) {
        const index = existingSubtypes.findIndex((e) => e.id === subtype.id);
        if (index === -1) {
          throw new NotFoundException(`Subtype ${subtype.id} not found.`);
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

  async findAll() {
    return this.documentTypeRepository.find({ order: { id: 'DESC' }, relations: { subtypes: true } });
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
