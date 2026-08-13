import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateDirectoryEntryDto, DirectorySearchDto, UpdateDirectoryEntryDto } from '../dtos';
import { DirectorySitesService } from './directory-sites.service';
import { DirectoryEntry } from '../entities';

@Injectable()
export class DirectoryEntriesService {
  constructor(
    @InjectRepository(DirectoryEntry) private entryRepository: Repository<DirectoryEntry>,
    private directorySitesService: DirectorySitesService,
  ) {}

  async findAll({ limit, offset, ...query }: DirectorySearchDto) {
    const builder = this.entryRepository.createQueryBuilder('entry').leftJoinAndSelect('entry.site', 'site');

    if (query.siteId !== undefined) builder.andWhere('entry.siteId = :siteId', { siteId: query.siteId });
    if (query.isActive !== undefined) builder.andWhere('entry.isActive = :isActive', { isActive: query.isActive });

    const normalizedTerm = query.term?.trim();
    if (normalizedTerm) {
      builder.andWhere(
        `(
            entry.areaName ILIKE :term
            OR COALESCE(entry.contactLabel, '') ILIKE :term
            OR COALESCE(entry.email, '') ILIKE :term
            OR COALESCE(entry.siteDetails, '') ILIKE :term
            OR COALESCE(site.name, '') ILIKE :term
            OR array_to_string(entry.extensions, ' ') ILIKE :term
            OR array_to_string(entry.phones, ' ') ILIKE :term
          )`,
        { term: `%${normalizedTerm}%` },
      );
    }

    const [entries, total] = await builder.addOrderBy('entry.id', 'DESC').skip(offset).take(limit).getManyAndCount();

    return { entries, total };
  }

  async findAreaNames(): Promise<string[]> {
    const rows = await this.entryRepository
      .createQueryBuilder('entry')
      .select('DISTINCT entry.areaName', 'areaName')
      .orderBy('entry.areaName', 'ASC')
      .getRawMany<{ areaName: string }>();

    return rows.map(({ areaName }) => areaName);
  }

  async create(dto: CreateDirectoryEntryDto) {
    const site = dto.siteId ? await this.directorySitesService.resolve(dto.siteId) : null;
    const entry = this.entryRepository.create({
      ...dto,
      site,
    });

    this.validateContactMethods(entry);
    return this.entryRepository.save(entry);
  }

  async update(id: number, dto: UpdateDirectoryEntryDto) {
    const entry = await this.entryRepository.findOne({ where: { id }, relations: { site: true } });
    if (!entry) throw new NotFoundException('Directory entry not found');

    const { siteId, ...values } = dto;
    Object.assign(entry, values);

    if (siteId) {
      entry.site = await this.directorySitesService.resolve(siteId, siteId === entry.siteId);
    }

    this.validateContactMethods(entry);
    return this.entryRepository.save(entry);
  }

  async remove(id: number) {
    const result = await this.entryRepository.delete(id);
    if (!result.affected) throw new NotFoundException('Directory entry not found');
    return { deleted: true };
  }

  private validateContactMethods(entry: DirectoryEntry): void {
    if (entry.extensions.length === 0 && entry.phones.length === 0 && !entry.email) {
      throw new BadRequestException('A directory entry must have at least one contact method');
    }
  }
}
