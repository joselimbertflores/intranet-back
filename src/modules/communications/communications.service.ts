import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, QueryFailedError, Repository } from 'typeorm';

import { PaginationParamsDto } from '../../common/dtos';
import { FileContext } from '../files/enums/file-context.enum';
import { FilesService } from '../files/files.service';
import { CreateCommunicationDto, UpdateCommunicationDto } from './dtos';
import { Communication, CommunicationType } from './entities';

@Injectable()
export class CommunicationsService {
  constructor(
    @InjectRepository(Communication) private readonly communicationsRepository: Repository<Communication>,
    @InjectRepository(CommunicationType)
    private readonly communicationTypesRepository: Repository<CommunicationType>,
    private readonly filesService: FilesService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll({ limit, offset, term }: PaginationParamsDto) {
    const [communications, total] = await this.communicationsRepository.findAndCount({
      ...(term && {
        where: [{ reference: ILike(`%${term}%`) }, { code: ILike(`%${term}%`) }],
      }),
      relations: { type: true, file: true, calendarEvent: true },
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

    const type = await this.communicationTypesRepository.findOneBy({ id: typeId });
    if (!type) throw new NotFoundException('Communication type not found');

    try {
      const createdCommunication = await this.dataSource.transaction(async (manager) => {
        const file = await this.filesService.claimPendingFile(fileId, FileContext.COMMUNICATIONS, manager);
        const communication = manager.create(Communication, { ...props, code: normalizedCode, type, file });
        return manager.save(communication);
      });
      return this.toAdminDto(createdCommunication);
    } catch (error) {
      this.rethrowUniqueCodeViolation(error, normalizedCode);
    }
  }

  async update(id: string, dto: UpdateCommunicationDto) {
    const communication = await this.communicationsRepository.findOne({ where: { id }, relations: { file: true } });
    if (!communication) throw new NotFoundException(`Communication ${id} not found`);

    const { typeId, fileId, code, ...toUpdate } = dto;
    const normalizedCode = code ? this.normalizeCode(code) : null;
    if (normalizedCode && normalizedCode !== communication.code) {
      await this.checkDuplicateCode(normalizedCode);
      communication.code = normalizedCode;
    }

    if (typeId) {
      const type = await this.communicationTypesRepository.findOneBy({ id: typeId });
      if (!type) throw new NotFoundException('Communication type not found');
      communication.type = type;
    }

    try {
      const updatedCommunication = await this.dataSource.transaction(async (manager) => {
        manager.merge(Communication, communication, toUpdate);
        if (fileId && fileId !== communication.file.id) {
          communication.file = await this.filesService.replaceActiveFileWithPendingFile(
            communication.file.id,
            fileId,
            FileContext.COMMUNICATIONS,
            manager,
          );
        }
        return manager.save(communication);
      });
      return this.toAdminDto(updatedCommunication);
    } catch (error) {
      this.rethrowUniqueCodeViolation(error, normalizedCode ?? communication.code);
    }
  }

  async getTypes() {
    const types = await this.communicationTypesRepository.find({ order: { name: 'ASC' } });
    return types.map(({ id, name }) => ({ id, name }));
  }

  async findByIdOrFail(id: string) {
    const communication = await this.communicationsRepository.findOneBy({ id });
    if (!communication) throw new NotFoundException(`Communication ${id} not found`);
    return communication;
  }

  private async checkDuplicateCode(code: string) {
    const duplicate = await this.communicationsRepository.findOneBy({ code });
    if (duplicate) throw new ConflictException(`Code: ${code} already exists`);
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
        url: this.filesService.buildPublicFileUrl(file.id),
      },
    };
  }

  private rethrowUniqueCodeViolation(error: unknown, code: string): never {
    if (error instanceof QueryFailedError && (error.driverError as { code?: string }).code === '23505') {
      throw new ConflictException(`Code: ${code} already exists`);
    }
    throw error;
  }
}
