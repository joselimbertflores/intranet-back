import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { CreateDirectoryEntryDto, DirectorySearchDto, UpdateDirectoryEntryDto } from './dtos';
import { DirectoryEntry } from './entities';
import { DirectorySitesService } from './directory-sites.service';

@Injectable()
export class DirectoryEntriesService {
  constructor(
    @InjectRepository(DirectoryEntry) private readonly entryRepository: Repository<DirectoryEntry>,
    private readonly directorySitesService: DirectorySitesService,
  ) {}

  findAll(query: DirectorySearchDto) {
    const builder = this.entryRepository.createQueryBuilder('entry').leftJoinAndSelect('entry.site', 'site');

    this.applySearch(builder, query);

    return builder.orderBy('entry.areaName', 'ASC').addOrderBy('entry.contactLabel', 'ASC').getMany();
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
    const site = await this.directorySitesService.resolve(dto.siteId);
    const entry = this.entryRepository.create({
      ...dto,
      contactLabel: this.optionalText(dto.contactLabel),
      extensions: this.normalizeNumbers(dto.extensions),
      phones: this.normalizeNumbers(dto.phones),
      email: this.optionalText(dto.email),
      site,
      siteId: site?.id ?? null,
      siteDetails: this.optionalText(dto.siteDetails),
    });

    return this.entryRepository.save(entry);
  }

  async update(id: number, dto: UpdateDirectoryEntryDto) {
    const entry = await this.entryRepository.findOne({ where: { id }, relations: { site: true } });
    if (!entry) throw new NotFoundException('Directory entry not found');

    const { siteId, ...values } = dto;
    Object.assign(entry, values);

    if (dto.contactLabel !== undefined) entry.contactLabel = this.optionalText(dto.contactLabel);
    if (dto.extensions !== undefined) entry.extensions = this.normalizeNumbers(dto.extensions);
    if (dto.phones !== undefined) entry.phones = this.normalizeNumbers(dto.phones);
    if (dto.email !== undefined) entry.email = this.optionalText(dto.email);
    if (dto.siteDetails !== undefined) entry.siteDetails = this.optionalText(dto.siteDetails);

    if (siteId !== undefined) {
      entry.site = await this.directorySitesService.resolve(siteId);
      entry.siteId = entry.site?.id ?? null;
    }

    return this.entryRepository.save(entry);
  }

  async remove(id: number) {
    const result = await this.entryRepository.delete(id);
    if (!result.affected) throw new NotFoundException('Directory entry not found');
    return { deleted: true };
  }

  private applySearch(builder: SelectQueryBuilder<DirectoryEntry>, { term, siteId }: DirectorySearchDto) {
    if (siteId) builder.andWhere('entry.siteId = :siteId', { siteId });
    if (!term) return;

    builder.andWhere(
      `(
        LOWER(entry.areaName) LIKE LOWER(:term)
        OR LOWER(COALESCE(entry.contactLabel, '')) LIKE LOWER(:term)
        OR LOWER(COALESCE(entry.email, '')) LIKE LOWER(:term)
        OR LOWER(COALESCE(entry.siteDetails, '')) LIKE LOWER(:term)
        OR LOWER(COALESCE(site.name, '')) LIKE LOWER(:term)
        OR LOWER(array_to_string(entry.extensions, ' ')) LIKE LOWER(:term)
        OR LOWER(array_to_string(entry.phones, ' ')) LIKE LOWER(:term)
      )`,
      { term: `%${term}%` },
    );
  }

  private normalizeNumbers(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }

  private optionalText(value?: string | null): string | null {
    return value?.trim() || null;
  }
}
