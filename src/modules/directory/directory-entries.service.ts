import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  async findAll({ limit = 10, offset = 0, ...query }: DirectorySearchDto) {
    const builder = this.entryRepository.createQueryBuilder('entry').leftJoinAndSelect('entry.site', 'site');

    this.applySearch(builder, query);

    const [entries, total] = await builder
      .orderBy('entry.areaName', 'ASC')
      .addOrderBy('entry.contactLabel', 'ASC')
      .addOrderBy('entry.id', 'ASC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

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

    this.validateContactMethods(entry);
    return this.entryRepository.save(entry);
  }

  async update(id: number, dto: UpdateDirectoryEntryDto) {
    const entry = await this.entryRepository.findOne({ where: { id }, relations: { site: true } });
    if (!entry) throw new NotFoundException('Directory entry not found');

    const { siteId, ...values } = dto;
    Object.assign(entry, values);

    if (dto.contactLabel !== undefined) entry.contactLabel = this.optionalText(dto.contactLabel);
    entry.extensions = this.normalizeNumbers(dto.extensions !== undefined ? dto.extensions : entry.extensions);
    entry.phones = this.normalizeNumbers(dto.phones !== undefined ? dto.phones : entry.phones);
    if (dto.email !== undefined) entry.email = this.optionalText(dto.email);
    if (dto.siteDetails !== undefined) entry.siteDetails = this.optionalText(dto.siteDetails);

    if (siteId !== undefined) {
      entry.site = await this.directorySitesService.resolve(siteId, siteId === entry.siteId);
      entry.siteId = entry.site?.id ?? null;
    }

    this.validateContactMethods(entry);
    return this.entryRepository.save(entry);
  }

  async remove(id: number) {
    const result = await this.entryRepository.delete(id);
    if (!result.affected) throw new NotFoundException('Directory entry not found');
    return { deleted: true };
  }

  private applySearch(
    builder: SelectQueryBuilder<DirectoryEntry>,
    { term, siteId, isActive }: Omit<DirectorySearchDto, 'limit' | 'offset'>,
  ) {
    if (siteId !== undefined) builder.andWhere('entry.siteId = :siteId', { siteId });
    if (isActive !== undefined) builder.andWhere('entry.isActive = :isActive', { isActive });

    const normalizedTerm = term?.trim();
    if (!normalizedTerm) return;

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

  private normalizeNumbers(values?: string[] | null): string[] {
    return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
  }

  private optionalText(value?: string | null): string | null {
    return value?.trim() || null;
  }

  private validateContactMethods(entry: DirectoryEntry): void {
    if (entry.extensions.length === 0 && entry.phones.length === 0 && !entry.email) {
      throw new BadRequestException('A directory entry must have at least one contact method');
    }
  }
}
