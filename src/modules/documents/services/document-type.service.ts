import {
  Injectable,
  HttpException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, QueryFailedError, Repository } from 'typeorm';

import { CreateDocumentTypeDto, UpdateDocumentTypeDto } from '../dtos';
import { DocumentType, DocumentRecord, DocumentSubtype } from '../entities';
import { PaginationParamsDto } from 'src/common/dtos';

type PostgresDriverError = {
  code?: string;
  constraint?: string;
};

@Injectable()
export class DocumentTypeService {
  constructor(
    @InjectRepository(DocumentType) private readonly typeRepository: Repository<DocumentType>,
    @InjectRepository(DocumentRecord) private readonly documentRepository: Repository<DocumentRecord>,
    @InjectRepository(DocumentSubtype) private readonly subtypeRepository: Repository<DocumentSubtype>,
  ) {}

  async findAll(params: PaginationParamsDto) {
    const { limit, offset, term } = params;

    const [data, total] = await this.typeRepository.findAndCount({
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
      const model = this.typeRepository.create({
        ...props,
        subtypes: subtypes?.length ? subtypes.map((subtype) => this.subtypeRepository.create(subtype)) : [],
      });
      return await this.typeRepository.save(model);
    } catch (error: unknown) {
      this.handleModifyException(error);
    }
  }

  async update(id: number, dto: UpdateDocumentTypeDto) {
    try {
      return await this.typeRepository.manager.transaction(async (manager) => {
        const typeRepository = manager.getRepository(DocumentType);
        const subtypeRepository = manager.getRepository(DocumentSubtype);
        const documentRepository = manager.getRepository(DocumentRecord);

        const { subtypes = [], subtypeIdsToDelete = [], ...toUpdate } = dto;

        const type = await typeRepository.findOne({ where: { id }, relations: { subtypes: true } });

        if (!type) throw new NotFoundException('Document type not found.');

        const existingSubtypes = new Map(type.subtypes.map((subtype) => [subtype.id, subtype]));

        const subtypeIdsToUpdate = new Set(
          subtypes.map((subtype) => subtype.id).filter((subtypeId): subtypeId is number => subtypeId != null),
        );

        const conflictingSubtypeId = subtypeIdsToDelete.find((subtypeId) => subtypeIdsToUpdate.has(subtypeId));

        if (conflictingSubtypeId) {
          throw new BadRequestException('A document subtype cannot be updated and deleted at the same time.');
        }

        for (const subtypeId of subtypeIdsToDelete) {
          if (!existingSubtypes.has(subtypeId)) {
            throw new NotFoundException('Document subtype not found.');
          }
        }

        if (subtypeIdsToDelete.length > 0) {
          const hasAssignedDocuments = await documentRepository.exists({
            where: {
              subtype: {
                id: In(subtypeIdsToDelete),
              },
            },
          });

          if (hasAssignedDocuments) {
            throw new ConflictException('Document subtypes cannot be deleted because they have associated documents.');
          }

          await subtypeRepository.delete(subtypeIdsToDelete);

          type.subtypes = type.subtypes.filter((subtype) => !subtypeIdsToDelete.includes(subtype.id));
        }

        for (const subtypeDto of subtypes) {
          if (subtypeDto.id) {
            const existingSubtype = existingSubtypes.get(subtypeDto.id);
            if (!existingSubtype) throw new NotFoundException('Document subtype not found.');
            Object.assign(existingSubtype, subtypeDto);
            continue;
          }
          type.subtypes.push(subtypeRepository.create(subtypeDto));
        }

        Object.assign(type, toUpdate);
        return typeRepository.save(type);
      });
    } catch (error: unknown) {
      this.handleModifyException(error);
    }
  }

  async remove(id: number): Promise<void> {
    const typeExists = await this.typeRepository.exists({ where: { id } });

    if (!typeExists) {
      throw new NotFoundException('Document type not found.');
    }

    const isAssignedToDocuments = await this.documentRepository.exists({
      where: { typeId: id },
    });

    if (isAssignedToDocuments) {
      throw new ConflictException('This document type cannot be deleted because it has associated documents.');
    }

    const hasSubtypes = await this.subtypeRepository.exists({
      where: { typeId: id },
    });

    if (hasSubtypes) {
      throw new ConflictException('This document type cannot be deleted because it has associated subtypes.');
    }

    await this.typeRepository.delete({ id });
  }

  async getActiveTypesWithSubtypes() {
    const types = await this.typeRepository.find({
      where: { isActive: true },
      relations: { subtypes: true },
    });
    return types.map((type) => ({
      ...type,
      subtypes: type.subtypes.filter((subtype) => subtype.isActive),
    }));
  }

  private handleModifyException(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }

    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as PostgresDriverError;

      if (driverError.code === '23505') {
        switch (driverError.constraint) {
          case 'uq_document_types_slug':
            throw new ConflictException('A document type with that name already exists.');

          case 'uq_document_subtypes_type_slug':
            throw new ConflictException('A document subtype with that name already exists within this type.');

          default:
            throw new ConflictException('A record with the same data already exists.');
        }
      }
    }

    throw new InternalServerErrorException('Failed to modify the document type.');
  }
}
