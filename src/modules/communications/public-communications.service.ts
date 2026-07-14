import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { FileStatus, StoredFileKind } from '../files/entities/stored-file.entity';
import { FilesService } from '../files/files.service';
import { GetPortalCommunicationsDto } from './dtos';
import { Communication, CommunicationType } from './entities';

@Injectable()
export class PublicCommunicationsService {
  constructor(
    @InjectRepository(Communication) private readonly communicationsRepository: Repository<Communication>,
    @InjectRepository(CommunicationType)
    private readonly communicationTypesRepository: Repository<CommunicationType>,
    private readonly filesService: FilesService,
  ) {}

  async findLatest(limit: number = 8) {
    const communications = await this.communicationsRepository.find({
      where: { isActive: true },
      take: limit,
      relations: { type: true, file: { derivedFiles: true } },
      order: { createdAt: 'desc' },
    });
    return communications.map((item) => this.toPublicDtoWithPreview(item));
  }

  async findAll({ limit, offset, term, typeId }: GetPortalCommunicationsDto) {
    console.log(typeId);
    const [communications, total] = await this.communicationsRepository.findAndCount({
      where: {
        ...(term && { reference: ILike(`%${term}%`) }),
        ...(typeId && { type: { id: typeId } }),
        isActive: true,
      },
      relations: { type: true, file: { derivedFiles: true } },
      take: limit,
      skip: offset,
      order: { createdAt: 'desc' },
    });
    return {
      communications: communications.map((item) => this.toPublicDto(item)),
      total,
    };
  }

  async getTypes() {
    const types = await this.communicationTypesRepository.find({ order: { name: 'ASC' } });
    return types.map(({ id, name }) => ({ id, name }));
  }

  private toPublicDto(communication: Communication) {
    return {
      id: communication.id,
      reference: communication.reference,
      code: communication.code,
      typeName: communication.type.name,
      createdAt: communication.createdAt,
      url: this.filesService.buildPublicFileUrl(communication.file.id),
    };
  }

  private toPublicDtoWithPreview(communication: Communication) {
    const dto = this.toPublicDto(communication);
    const preview = communication.file.derivedFiles?.find(
      ({ kind, status }) => kind === StoredFileKind.PREVIEW && status === FileStatus.ACTIVE,
    );
    return {
      ...dto,
      previewUrl: preview ? this.filesService.buildPublicFileUrl(preview.id) : null,
    };
  }
}
