import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { CreateDocumentTypeDto, DocumentSubTypeDto, UpdateDocumentTypeDto } from '../dtos';
import { DocumentType, DocumentRecord, DocumentSubtype } from '../entities';

@Injectable()
export class DocumentTypeService {
  constructor(
    @InjectRepository(DocumentType) private documentTypeRepository: Repository<DocumentType>,
    @InjectRepository(DocumentRecord) private documentRepository: Repository<DocumentRecord>,
    @InjectRepository(DocumentSubtype) private documentSubTypeRepository: Repository<DocumentSubtype>,
  ) {}

  async findAll() {
    return this.documentTypeRepository.find({
      relations: { subtypes: true },
      order: { createdAt: 'desc', subtypes: { createdAt: 'desc' } },
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
    try {
      const { subtypes, ...toUpdate } = dto;
      const type = await this.documentTypeRepository.findOne({
        where: { id },
        relations: { subtypes: true },
        order: { subtypes: { createdAt: 'desc' } },
      });
      if (!type) throw new NotFoundException(`Document type ${id} not found.`);
      if (subtypes && subtypes.length > 0) {
        type.subtypes = this.mergeSubtypes(type.subtypes, subtypes);
      }
      return await this.documentTypeRepository.save({ ...type, ...toUpdate });
    } catch (error: unknown) {
      this.handleModifyException(error);
    }
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

  private mergeSubtypes(existingSubtypes: DocumentSubtype[], subtypes: DocumentSubTypeDto[]) {
    for (const subtype of subtypes) {
      if (subtype.id) {
        const index = existingSubtypes.findIndex((e) => e.id === subtype.id);
        if (index === -1) {
          throw new NotFoundException(`Document subtype ${subtype.id} not found.`);
        }
        existingSubtypes[index] = Object.assign(existingSubtypes[index], subtype);
      } else {
        existingSubtypes.push(this.documentSubTypeRepository.create(subtype));
      }
    }
    return existingSubtypes;
  }

  private handleModifyException(error: unknown): void {
    if (error instanceof QueryFailedError && error['code'] === '23505') {
      throw new ConflictException('Duplicate slug detected');
    }
    throw new InternalServerErrorException(`Failed create cagory`);
  }

  async getActiveTypesWithSubtypes() {
    return this.documentTypeRepository.find({ where: { isActive: true }, relations: { subtypes: true } });
  }
}
