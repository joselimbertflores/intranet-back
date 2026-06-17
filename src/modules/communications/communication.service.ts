import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, ILike, Repository } from 'typeorm';

import { CreateCommunicationDto, GetPortalCommunicationsDto, UpdateCommunicationDto } from './dtos';
import { Communication, TypeCommunication } from './entities';
import { FilesService } from '../files/files.service';
import { PaginationParamsDto } from '../common';
import { FileStatus, StoredFileKind } from '../files/entities/stored-file.entity';

export interface PortalCommunication {
  id: string;
  reference: string;
  code: string;
  type: string;
  createdAt: Date;
  previewImageUrl?: string | null;
  attachment?: Attachment;
}

export interface Attachment {
  fileName: string;
  mimeType: string;
  url: string;
  size?: number;
}
@Injectable()
export class CommunicationService {
  constructor(
    @InjectRepository(Communication) private commRepository: Repository<Communication>,
    @InjectRepository(TypeCommunication) private typeCommRespository: Repository<TypeCommunication>,
    private fileService: FilesService,
    private dataSource: DataSource,
  ) {}

  async findAll({ limit, offset, term }: PaginationParamsDto) {
    const [communications, total] = await this.commRepository.findAndCount({
      ...(term && {
        where: [{ reference: ILike(`%${term}%`) }, { code: ILike(`%${term}%`) }],
      }),
      relations: {
        type: true,
        file: true,
        calendarEvent: true,
      },
      take: limit,
      skip: offset,
      order: { createdAt: 'desc' },
    });

    return {
      communications: communications.map((item) => this.toAdminDto(item)),
      total,
    };
  }

  async create(dto: CreateCommunicationDto) {
    const { typeId, fileId, code, ...props } = dto;

    const normalizedCode = this.normalizeCode(code);
    await this.checkDuplicateCode(normalizedCode);

    const type = await this.typeCommRespository.findOneBy({ id: typeId });
    if (!type) throw new BadGatewayException('Type communication not found');

    const createdCommunication = await this.dataSource.transaction(async (manager) => {
      const file = await this.fileService.claimPendingFile(fileId, manager);
      const communication = manager.create(Communication, { ...props, code: normalizedCode, type, file });
      return await manager.save(communication);
    });
    return this.toAdminDto(createdCommunication);
  }

  async update(id: string, dto: UpdateCommunicationDto) {
    const communicationDB = await this.commRepository.findOne({ where: { id }, relations: { file: true } });

    if (!communicationDB) throw new NotFoundException(`Communication ${id} not found`);

    const { typeId, fileId, code, ...toUpdate } = dto;

    const normalizedCode = code ? this.normalizeCode(code) : null;
    if (normalizedCode && normalizedCode !== communicationDB.code) {
      await this.checkDuplicateCode(normalizedCode);
      communicationDB.code = normalizedCode;
    }

    if (typeId) {
      const type = await this.typeCommRespository.findOneBy({ id: typeId });
      if (!type) throw new BadGatewayException('Type communication not found');
      communicationDB.type = type;
    }

    const updatedCommunication = await this.dataSource.transaction(async (manager) => {
      manager.merge(Communication, communicationDB, toUpdate);
      if (fileId && fileId !== communicationDB.file.id) {
        // const newFile = await this.fileService.replaceActiveFile(communicationDB.file.id, fileId, manager);
        // communicationDB.file = newFile;
      }
      return await manager.save(communicationDB);
    });
    return this.toAdminDto(updatedCommunication);
  }

  async setActiveState(id: string, isActive: boolean) {
    await this.commRepository.update({ id }, { isActive });
  }

  async getLatestCommunications(limit: number = 8): Promise<PortalCommunication[]> {
    const communications = await this.commRepository.find({
      where: { isActive: true },
      take: limit,
      relations: {
        type: true,
        file: { derivedFiles: true },
      },
      order: { createdAt: 'desc' },
    });
    return communications.map((item) => this.toPublicDto(item));
  }

  async getPortalCommunications({
    limit,
    offset,
    term,
    typeId,
  }: GetPortalCommunicationsDto): Promise<{ communications: PortalCommunication[]; total: number }> {
    const [communications, total] = await this.commRepository.findAndCount({
      where: {
        ...(term && { reference: ILike(`%${term}%`) }),
        ...(typeId && { type: { id: typeId } }),
        isActive: true,
      },
      relations: {
        type: true,
        file: { derivedFiles: true },
      },
      take: limit,
      skip: offset,
      order: { createdAt: 'desc' },
    });
    return {
      communications: communications.map((item) => this.toPublicDto(item)),
      total,
    };
  }

  async getPortalCommunicationById(id: string): Promise<PortalCommunication> {
    const communication = await this.commRepository.findOne({
      where: { id, isActive: true },
      relations: {
        type: true,
        file: { derivedFiles: true },
      },
    });

    if (!communication) {
      throw new NotFoundException();
    }

    const image = this.findActivePreview(communication.file);
    return {
      id: communication.id,
      type: communication.type.name,
      code: communication.code,
      reference: communication.reference,
      createdAt: communication.createdAt,
      previewImageUrl: image ? this.fileService.buildPublicFileUrl(image.id) : null,
      ...(communication.file && {
        attachment: {
          fileName: communication.file.originalName,
          size: communication.file.sizeBytes,
          mimeType: communication.file.mimeType,
          url: this.fileService.buildPublicFileUrl(communication.file.id),
        },
      }),
    };
  }

  async getTypes() {
    return await this.typeCommRespository.find();
  }

  async findByIdOrFail(id: string) {
    const communication = await this.commRepository.findOneBy({ id });
    if (!communication) throw new NotFoundException(`Communication ${id} not found`);
    return communication;
  }

  private async checkDuplicateCode(code: string) {
    const duplicate = await this.commRepository.findOneBy({ code });
    if (duplicate) throw new BadGatewayException(`Code: ${code} already exists`);
  }

  private normalizeCode(code: string): string {
    return code.replace(/\s+/g, ' ').trim().toUpperCase();
  }

  private toAdminDto(communication: Communication) {
    const { file, calendarEvent, ...rest } = communication;
    return {
      ...rest,
      ...(calendarEvent && { eventId: calendarEvent.id }),
      file: {
        id: file.id,
        originalName: file.originalName,
        url: this.fileService.buildPublicFileUrl(file.id),
      },
    };
  }

  toPublicDto({ file, type, ...rest }: Communication): PortalCommunication {
    const image = this.findActivePreview(file);
    return {
      ...rest,
      type: type.name,
      previewImageUrl: image ? this.fileService.buildPublicFileUrl(image.id) : null,
    };
  }

  private findActivePreview(file: Communication['file']) {
    return (
      file.derivedFiles?.find(
        (derivedFile) => derivedFile.kind === StoredFileKind.PREVIEW && derivedFile.status === FileStatus.ACTIVE,
      ) ?? null
    );
  }
}
