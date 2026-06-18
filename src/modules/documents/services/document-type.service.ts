import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, QueryFailedError, Repository } from 'typeorm';

import { CreateDocumentTypeDto, DocumentSubtypeDto, UpdateDocumentTypeDto } from '../dtos';
import { DocumentType, DocumentRecord, DocumentSubtype } from '../entities';
import { PaginationParamsDto } from 'src/modules/common';

@Injectable()
export class DocumentTypeService {
  constructor(
    @InjectRepository(DocumentType) private documentTypeRepository: Repository<DocumentType>,
    @InjectRepository(DocumentRecord) private documentRepository: Repository<DocumentRecord>,
    @InjectRepository(DocumentSubtype) private documentSubTypeRepository: Repository<DocumentSubtype>,
  ) {}

  async findAll(params: PaginationParamsDto) {
    const { limit, offset, term } = params;

    const [data, total] = await this.documentTypeRepository.findAndCount({
      where: {
        ...(term && { name: ILike(`%${term}%`) }),
      },
      relations: {
        subtypes: true,
      },
      order: { createdAt: 'desc', subtypes: { createdAt: 'desc' } },
      take: limit,
      skip: offset,
    });
    return { data, total };
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
      Object.assign(type, toUpdate);
      return await this.documentTypeRepository.save(type);
    } catch (error: unknown) {
      this.handleModifyException(error);
    }
  }

  async removeSubtype(id: number) {
    const documentsCountUsingSubtype = await this.documentRepository.count({ where: { documentSubtype: { id } } });
    if (documentsCountUsingSubtype > 0) {
      throw new BadRequestException(`Cannot delete document subtype ${id} because it is in use.`);
    }
    const result = await this.documentSubTypeRepository.delete({ id });
    return (result.affected ?? 0) > 0
      ? { ok: true, message: `Document subtype ${id} deleted successfully.` }
      : { ok: false, message: `Document subtype ${id} not found.` };
  }

  private mergeSubtypes(existingSubtypes: DocumentSubtype[], subtypes: DocumentSubtypeDto[]) {
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
    if (error instanceof HttpException) {
      throw error;
    }
    if (error instanceof QueryFailedError && error['code'] === '23505') {
      throw new ConflictException('Duplicate slug detected');
    }
    throw new InternalServerErrorException('Failed to modify document type');
  }

  async getActiveTypesWithSubtypes() {
    const types = await this.documentTypeRepository.find({ where: { isActive: true }, relations: { subtypes: true } });
    return types.map((type) => ({
      ...type,
      subtypes: type.subtypes.filter((subtype) => subtype.isActive),
    }));
  }
}
