import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsWhere, ILike, Repository } from 'typeorm';

import { CreateCommunicationDto, GetPublicCommunicationsDto, UpdateCommunicationDto } from './dtos/communication.dto';
import { Communication, TypeCommunication } from './entities';
import { FilesService } from '../files/files.service';
import { FileGroup } from '../files/file-group.enum';
import { PaginationParamsDto } from '../common';

@Injectable()
export class CommunicationService {
  constructor(
    @InjectRepository(Communication) private communicationRepository: Repository<Communication>,
    @InjectRepository(TypeCommunication) private typeCommunicationRespository: Repository<TypeCommunication>,
    private fileService: FilesService,
  ) {}

  async getTypes() {
    return await this.typeCommunicationRespository.find();
  }

  async findAll({ limit, offset, term }: PaginationParamsDto) {
    const [communications, total] = await this.communicationRepository.findAndCount({
      ...(term && { where: [{ reference: ILike(`%${term}%`) }, { code: ILike(`%${term}%`) }] }),
      take: limit,
      skip: offset,
      order: { publicationDate: 'DESC' },
    });
    return { communications, total };
  }

  async create(dto: CreateCommunicationDto) {
    const { typeId: typeCommunicationId, ...props } = dto;

    const typeCommunication = await this.typeCommunicationRespository.findOneBy({ id: typeCommunicationId });

    if (!typeCommunication) throw new BadGatewayException('Type communication not found');

    await this.checkDuplicateCode(props.code);

    const entity = this.communicationRepository.create({ ...props, type: typeCommunication });

    return this.communicationRepository.save(entity);
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
    const communications = await this.communicationRepository.find({ order: { publicationDate: 'DESC' }, take: limit });
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
    const duplicate = await this.communicationRepository.findOneBy({ code: code });
    if (duplicate) throw new BadGatewayException(`Code: ${code} already exists}`);
  }

  private plainCommunication(communication: Communication) {
    const { fileName, previewName, ...rest } = communication;
    return {
      fileUrl: this.fileService.buildFileUrl(fileName, FileGroup.COMUNICATIONS),
      previewUrl: previewName ? this.fileService.buildFileUrl(previewName, FileGroup.COMUNICATIONS) : null,
      ...rest,
    };
  }
}
