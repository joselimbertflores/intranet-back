import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { DocumentSection, InstitutionalDocument, InstitutionalDocumentType } from '../entities';
import { CreateSectionDto, UpdateSectionDto } from '../dtos';

@Injectable()
export class DocumentSectionService {
  constructor(
    @InjectRepository(DocumentSection) private sectionRepository: Repository<DocumentSection>,
    @InjectRepository(InstitutionalDocument) private documentRepository: Repository<InstitutionalDocument>,
    @InjectRepository(InstitutionalDocumentType) private documentTypeRepository: Repository<InstitutionalDocumentType>,
  ) {}

  async findAll() {
    return await this.sectionRepository.find({
      relations: { documentTypes: true },
      order: { id: 'DESC' },
    });
  }

  async create(dto: CreateSectionDto) {
    const { documentTypesIds, ...props } = dto;
    const documentTypes = await this.getValidDocumentTypes(documentTypesIds);
    const sectionModel = this.sectionRepository.create({ ...props, documentTypes });
    return await this.sectionRepository.save(sectionModel);
  }

  async update(sectionId: number, dto: UpdateSectionDto) {
    const { documentTypesIds, ...props } = dto;

    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: { documentTypes: true },
    });

    if (!section) throw new NotFoundException(`Section ${sectionId} not found`);

    if (documentTypesIds) {
      const validDocumentTypes = await this.getValidDocumentTypes(documentTypesIds);

      const currentTypeIds = section.documentTypes.map((t) => t.id);
      const incomingTypeIds = validDocumentTypes.map((t) => t.id);

      const toRemove = currentTypeIds.filter((id) => !incomingTypeIds.includes(id));
      if (toRemove.length > 0) {
        const used = await this.documentRepository.count({
          where: {
            section: { id: sectionId },
            type: { id: In(toRemove) },
          },
        });

        if (used > 0) {
          throw new BadRequestException('Cannot remove some document types because they are in use.');
        }
      }
      section.documentTypes = validDocumentTypes;
    }
    return await this.sectionRepository.save({ ...section, ...props });
  }

  async getActiveSections() {
    return await this.sectionRepository.find({ where: { isActive: true } });
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
