import { BadGatewayException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, ILike, Repository } from 'typeorm';

import { CreateCommunicationDto, GetPublicCommunicationsDto, UpdateCommunicationDto } from './dtos';
import { CalendarService } from '../calendar/calendar.service';
import { Communication, TypeCommunication } from './entities';
import { FilesService } from '../files/files.service';
import { CalendarEvent } from '../calendar/entities';
import { FileGroup } from '../files/file-group.enum';
import { PaginationParamsDto } from '../common';

@Injectable()
export class CommunicationService {
  constructor(
    @InjectRepository(Communication) private commRepository: Repository<Communication>,
    @InjectRepository(TypeCommunication) private typeCommRespository: Repository<TypeCommunication>,
    private calendarService: CalendarService,
    private fileService: FilesService,
    private dataSource: DataSource,
  ) {}

  async findAll({ limit, offset, term }: PaginationParamsDto) {
    const [communications, total] = await this.commRepository.findAndCount({
      ...(term && { where: [{ reference: ILike(`%${term}%`) }, { code: ILike(`%${term}%`) }] }),
      relations: { type: true, calendarEvent: true },
      take: limit,
      skip: offset,
      order: { createdAt: 'desc' },
    });
    return { communications, total };
  }

  async create(dto: CreateCommunicationDto) {
    const { typeId, calendarEvent, ...props } = dto;

    const typeCommunication = await this.typeCommRespository.findOneBy({ id: typeId });

    if (!typeCommunication) throw new BadGatewayException('Type communication not found');

    await this.checkDuplicateCode(props.code);

    const filesToConfirm = [props.fileName, props.previewFileName];

    try {
      await this.fileService.finalizeFiles(filesToConfirm, FileGroup.COMMUNICATIONS);

      return await this.dataSource.transaction(async (manager) => {
        let createdEvent: CalendarEvent | null = null;

        if (calendarEvent) {
          if (typeof props.isActive === 'boolean') {
            calendarEvent.isActive = props.isActive;
          }
          createdEvent = await this.calendarService.create(calendarEvent, manager);
        }

        const communication = manager.create(Communication, {
          ...props,
          type: typeCommunication,
          ...(createdEvent && { calendarEvent: createdEvent }),
        });

        return await manager.save(communication);
      });
    } catch (error: unknown) {
      await this.fileService.deleteFiles(filesToConfirm, FileGroup.COMMUNICATIONS);
      throw new InternalServerErrorException('Error creating communication');
    }
  }

  async update(id: string, dto: UpdateCommunicationDto) {
    const communicationDB = await this.commRepository.findOne({
      where: { id },
      relations: { type: true, calendarEvent: true },
    });

    if (!communicationDB) throw new NotFoundException(`Communication ${id} not found`);

    const { typeId, ...toUpdate } = dto;

    if (typeId) {
      const type = await this.typeCommRespository.findOneBy({ id: typeId });
      if (!type) throw new BadGatewayException('Type communication not found');
      communicationDB.type = type;
    }
    let currentFileName: string | null = null;
    // if (dto.fileName && dto.fileName !== communicationDB.fileName) {
    //   await this.fileService.finalizeFile(dto.fileName, FileGroup.COMMUNICATIONS);
    //   currentFileName = communicationDB.fileName;
    // }
    const filesToConfirm: string[] = [];
    if (toUpdate.fileName && toUpdate.fileName !== communicationDB.fileName) {
      currentFileName = communicationDB.fileName;
      filesToConfirm.push(toUpdate.fileName);
    }

    if (toUpdate.previewFileName && toUpdate.previewFileName !== communicationDB.previewFileName) {
      filesToConfirm.push(toUpdate.previewFileName);
    }

    await this.fileService.finalizeFiles(filesToConfirm, FileGroup.COMMUNICATIONS);

    const updatedCommunication = await this.dataSource.transaction(async (manager) => {
      await this.sincronizeWithEvent(dto, communicationDB, manager);
      manager.merge(Communication, communicationDB, toUpdate);
      return manager.save(communicationDB);
    });

    if (currentFileName) {
      await this.fileService.deleteFile(currentFileName, FileGroup.COMMUNICATIONS);
    }

    return updatedCommunication;
  }

  async getLatest(limit = 5) {
    const communications = await this.commRepository.find({ order: { createdAt: 'DESC' }, take: limit });
    return communications.map((item) => this.plainCommunication(item));
  }

  async findPublicPaginated({ limit, offset, term, typeId }: GetPublicCommunicationsDto) {
    const queryBuilder = this.commRepository.createQueryBuilder('c').leftJoinAndSelect('c.type', 'type');

    if (term) {
      queryBuilder.andWhere('(c.reference ILIKE :term OR c.code ILIKE :term)', { term: `%${term}%` });
    }

    if (typeId) {
      queryBuilder.andWhere('c.typeId = :typeId', { typeId });
    }

    queryBuilder.orderBy('c.createdAt', 'DESC').skip(offset).take(limit);

    const [communications, total] = await queryBuilder.getManyAndCount();
    return { communications: communications.map((item) => this.plainCommunication(item)), total };
  }

  async getOne(id: string) {
    const communication = await this.commRepository.findOne({ where: { id } });
    if (!communication) throw new NotFoundException(`Communication ${id} not found`);
    return this.plainCommunication(communication);
  }

  async getTypes() {
    return await this.typeCommRespository.find();
  }

  private async checkDuplicateCode(code: string) {
    const duplicate = await this.commRepository.findOneBy({ code });
    if (duplicate) throw new BadGatewayException(`Code: ${code} already exists`);
  }

  private plainCommunication(communication: Communication) {
    const { fileName, previewFileName, ...rest } = communication;
    return {
      fileUrl: this.fileService.buildFileUrl(fileName, FileGroup.COMMUNICATIONS),
      previewUrl: previewFileName ? this.fileService.buildFileUrl(previewFileName, FileGroup.COMMUNICATIONS) : null,
      ...rest,
    };
  }

  private async sincronizeWithEvent(
    dto: UpdateCommunicationDto,
    currentCommunication: Communication,
    manager: EntityManager,
  ) {
    if (dto.calendarEvent) {
      if (typeof dto.isActive === 'boolean') dto.calendarEvent.isActive = dto.isActive;
      if (currentCommunication.calendarEvent) {
        currentCommunication.calendarEvent = await this.calendarService.update(
          currentCommunication.calendarEvent.id,
          dto.calendarEvent,
          manager,
        );
      } else {
        const newEvent = await this.calendarService.create(dto.calendarEvent, manager);
        currentCommunication.calendarEvent = newEvent;
      }
    } else if ('calendarEvent' in dto && dto.calendarEvent === null && currentCommunication.calendarEvent) {
      await this.calendarService.removeEventFromCommunication(currentCommunication.calendarEvent.id, manager);
      currentCommunication.calendarEvent = null;
    }
  }
}
