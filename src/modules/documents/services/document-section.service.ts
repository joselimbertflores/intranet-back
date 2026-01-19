import {
  Injectable,
  HttpException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { DocumentSection, InstitutionalDocument, InstitutionalDocumentType, SectionDocumentType } from '../entities';
import { CreateSectionDto, UpdateSectionDto } from '../dtos';

@Injectable()
export class DocumentSectionService {
  constructor(
    @InjectRepository(DocumentSection) private sectionRepository: Repository<DocumentSection>,
    @InjectRepository(InstitutionalDocumentType) private documentTypeRepository: Repository<InstitutionalDocumentType>,
    private dataSource: DataSource,
  ) {}

  async findAll() {
    return await this.sectionRepository.find({
      relations: {
        sectionDocumentTypes: {
          type: true,
        },
      },
      order: { id: 'DESC' },
    });
  }

  async create(dto: CreateSectionDto) {
    const { documentTypesIds, ...props } = dto;

    const documentTypes = await this.getValidDocumentTypes(documentTypesIds);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sectionModel = queryRunner.manager.create(DocumentSection, { ...props });
      const createdSection = await queryRunner.manager.save(sectionModel);

      const relations = documentTypes.map((docType) =>
        queryRunner.manager.create(SectionDocumentType, {
          section: createdSection,
          type: docType,
        }),
      );

      await queryRunner.manager.insert(SectionDocumentType, relations);
      await queryRunner.commitTransaction();
      return this.getOne(createdSection.id);
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(`Failed create documents`);
    } finally {
      await queryRunner.release();
    }
  }

  async update(sectionId: number, dto: UpdateSectionDto) {
    const { documentTypesIds, ...props } = dto;

    const section = await this.sectionRepository.preload({ id: sectionId, ...props });

    if (!section) throw new NotFoundException(`Section ${sectionId} not found`);

    const validDocumentTypes = documentTypesIds ? await this.getValidDocumentTypes(documentTypesIds) : [];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(section);

      const currentRelations = await queryRunner.manager.find(SectionDocumentType, {
        where: { section: { id: sectionId } },
        relations: { type: true },
      });
      const currentTypeIds = currentRelations.map(({ type }) => type.id);

      if (validDocumentTypes.length > 0) {
        const incomingTypeIds = validDocumentTypes.map(({ id }) => id);
        const toRemove = currentTypeIds.filter((id) => !incomingTypeIds.includes(id));
        if (toRemove.length > 0) {
          const used = await queryRunner.manager.count(InstitutionalDocument, {
            where: {
              section: { id: sectionId },
              type: { id: In(toRemove) },
            },
          });
          if (used > 0) {
            throw new BadRequestException('Cannot remove some document types because they are in use.');
          }
          await queryRunner.manager.delete(SectionDocumentType, {
            section: { id: sectionId },
            type: { id: In(toRemove) },
          });
        }
      }

      const toAdd = validDocumentTypes.filter(({ id }) => !currentTypeIds.includes(id));
      if (toAdd.length > 0) {
        await queryRunner.manager.insert(
          SectionDocumentType,
          toAdd.map((type) =>
            queryRunner.manager.create(SectionDocumentType, {
              section: { id: sectionId },
              type: { id: type.id },
            }),
          ),
        );
      }

      await queryRunner.commitTransaction();
      return this.getOne(sectionId);
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(`Failed update documents`);
    } finally {
      await queryRunner.release();
    }
  }

  private async getOne(id: number) {
    return await this.sectionRepository.findOne({
      where: { id },
      relations: { sectionDocumentTypes: { type: true } },
    });
  }

  private async getValidDocumentTypes(documentTypesIds: number[]) {
    const documentTypes = await this.documentTypeRepository.find({
      where: { id: In(documentTypesIds) },
    });
    if (documentTypes.length !== documentTypesIds.length) {
      throw new BadRequestException("Some document types don't exist");
    }
    return documentTypes;
  }
}
