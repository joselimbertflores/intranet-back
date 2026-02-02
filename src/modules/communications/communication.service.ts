import { BadGatewayException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, ILike, Repository } from 'typeorm';

import { CreateCommunicationDto, GetPublicCommunicationsDto, UpdateCommunicationDto } from './dtos/communication.dto';
import { Communication, TypeCommunication } from './entities';
import { FilesService } from '../files/files.service';
import { FileGroup } from '../files/file-group.enum';
import { PaginationParamsDto } from '../common';
import { CalendarEvent } from '../calendar/entities';

@Injectable()
export class CommunicationService {
  constructor(
    @InjectRepository(Communication) private communicationRepository: Repository<Communication>,
    @InjectRepository(TypeCommunication) private typeCommunicationRespository: Repository<TypeCommunication>,
    private fileService: FilesService,
    private dataSource: DataSource,
  ) {}

  async getTypes() {
    return await this.typeCommunicationRespository.find();
  }

  async findAll({ limit, offset, term }: PaginationParamsDto) {
    const [communications, total] = await this.communicationRepository.findAndCount({
      ...(term && { where: [{ reference: ILike(`%${term}%`) }, { code: ILike(`%${term}%`) }] }),
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
    return { communications, total };
  }

  async create(dto: CreateCommunicationDto) {
    const { typeId, calendarEvent, ...props } = dto;

    const typeCommunication = await this.typeCommunicationRespository.findOneBy({ id: typeId });
    if (!typeCommunication) throw new BadGatewayException('Type communication not found');

    // TODO Get code from seg-tramites
    await this.checkDuplicateCode(props.code);
    const filesToConfirm = [props.fileName, props.thumbnailFileName];

    try {
      await this.fileService.confirmFiles(filesToConfirm, FileGroup.COMMUNICATIONS);

      const createdCommunication = await this.dataSource.transaction(
        async (transactionalEntityManager: EntityManager) => {
          return await transactionalEntityManager.save(Communication, {
            ...props,
            type: typeCommunication,
            ...(calendarEvent && { calendarEvent }),
          });
        },
      );
      return createdCommunication;
    } catch (error: unknown) {
      await this.fileService.deleteMany(filesToConfirm, FileGroup.COMMUNICATIONS);
      throw new InternalServerErrorException('Error creating communication');
    }
  }

  async update(id: string, dto: UpdateCommunicationDto) {
    const communication = await this.communicationRepository.findOneBy({ id });

    if (!communication) throw new NotFoundException(`Communication ${id} not found`);

    const { typeId, ...toUpdate } = dto;
    if (typeId) {
      const typeCommunication = await this.typeCommunicationRespository.findOneBy({ id: typeId });
      if (!typeCommunication) throw new BadGatewayException('Type communication not found');
      communication.type = typeCommunication;
    }
    return await this.communicationRepository.save({ ...communication, ...toUpdate });
  }

  async getLatest(limit = 5) {
    const communications = await this.communicationRepository.find({ order: { createdAt: 'DESC' }, take: limit });
    return communications.map((item) => this.plainCommunication(item));
  }

  async findPublicPaginated({ limit, offset, term, typeId }: GetPublicCommunicationsDto) {
    const queryBuilder = this.communicationRepository.createQueryBuilder('c').leftJoinAndSelect('c.type', 'type');

    if (term) {
      queryBuilder.andWhere('(c.reference ILIKE :term OR c.code ILIKE :term)', { term: `%${term}%` });
    }

    if (typeId) {
      queryBuilder.andWhere('c.typeId = :typeId', { typeId });
    }

    queryBuilder.orderBy('c.publicationDate', 'DESC').skip(offset).take(limit);

    const [communications, total] = await queryBuilder.getManyAndCount();
    return { communications: communications.map((item) => this.plainCommunication(item)), total };
  }

  async getOne(id: string) {
    const communication = await this.communicationRepository.findOne({ where: { id } });
    if (!communication) throw new NotFoundException(`Communication ${id} not found`);
    return this.plainCommunication(communication);
  }

  private async checkDuplicateCode(code: string) {
    const duplicate = await this.communicationRepository.findOneBy({ code });
    if (duplicate) throw new BadGatewayException(`Code: ${code} already exists`);
  }

  private plainCommunication(communication: Communication) {
    const { fileName, thumbnailFileName: previewName, ...rest } = communication;
    return {
      fileUrl: this.fileService.buildFileUrl(fileName, FileGroup.COMMUNICATIONS),
      previewUrl: previewName ? this.fileService.buildFileUrl(previewName, FileGroup.COMMUNICATIONS) : null,
      ...rest,
    };
  }
}
