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
    @InjectRepository(DocumentType) private readonly documentTypeRepository: Repository<DocumentType>,
    @InjectRepository(DocumentRecord) private readonly documentRepository: Repository<DocumentRecord>,
    @InjectRepository(DocumentSubtype) private readonly documentSubtypeRepository: Repository<DocumentSubtype>,
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
        subtypes: subtypes?.length ? subtypes.map((subtype) => this.documentSubtypeRepository.create(subtype)) : [],
      });
      return await this.documentTypeRepository.save(model);
    } catch (error: unknown) {
      this.handleModifyException(error);
    }
  }

  async update(id: number, dto: UpdateDocumentTypeDto) {
    try {
      return await this.documentTypeRepository.manager.transaction(async (manager) => {
        const typeRepository = manager.getRepository(DocumentType);
        const subtypeRepository = manager.getRepository(DocumentSubtype);
        const documentRepository = manager.getRepository(DocumentRecord);

        const { subtypes = [], subtypeIdsToDelete = [], ...toUpdate } = dto;

        const type = await typeRepository.findOne({ where: { id }, relations: { subtypes: true } });

        if (!type) throw new NotFoundException(`Document type ${id} not found.`);

        const existingSubtypes = new Map(type.subtypes.map((subtype) => [subtype.id, subtype]));

        const subtypeIdsToUpdate = new Set(
          subtypes.map((subtype) => subtype.id).filter((subtypeId): subtypeId is number => subtypeId != null),
        );

        const conflictingSubtypeId = subtypeIdsToDelete.find((subtypeId) => subtypeIdsToUpdate.has(subtypeId));

        if (conflictingSubtypeId) {
          throw new BadRequestException(
            `Document subtype ${conflictingSubtypeId} cannot be updated and deleted at the same time.`,
          );
        }

        for (const subtypeId of subtypeIdsToDelete) {
          if (!existingSubtypes.has(subtypeId)) {
            throw new NotFoundException(`Document subtype ${subtypeId} not found.`);
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
            throw new ConflictException('Subtypes cannot be deleted because they are assigned to documents.');
          }

          await subtypeRepository.delete(subtypeIdsToDelete);

          type.subtypes = type.subtypes.filter((subtype) => !subtypeIdsToDelete.includes(subtype.id));
        }

        for (const subtypeDto of subtypes) {
          if (subtypeDto.id) {
            const existingSubtype = existingSubtypes.get(subtypeDto.id);
            if (!existingSubtype) throw new NotFoundException(`Document subtype ${subtypeDto.id} not found.`);
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

  async remove(id: number) {
    const documentTypeExists = await this.documentTypeRepository.exists({ where: { id } });
    if (!documentTypeExists) {
      throw new NotFoundException('El tipo de documento no existe.');
    }

    const isAssignedToDocuments = await this.documentRepository.exists({ where: { documentTypeId: id } });
    if (isAssignedToDocuments) {
      throw new ConflictException('No se puede eliminar el tipo de documento porque está asignado a documentos.');
    }

    const hasSubtypes = await this.documentSubtypeRepository.exists({ where: { documentTypeId: id } });
    if (hasSubtypes) {
      throw new ConflictException('No se puede eliminar el tipo de documento porque tiene subtipos asociados.');
    }

    await this.documentTypeRepository.delete({ id });

    return {
      ok: true,
      message: 'Document type deleted',
    };
  }

  async getActiveDocumentTypesWithSubtypes() {
    const types = await this.documentTypeRepository.find({
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
