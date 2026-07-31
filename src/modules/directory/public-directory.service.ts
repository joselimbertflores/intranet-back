import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DirectorySearchDto } from './dtos';
import { DirectoryEntry, DirectorySite } from './entities';

@Injectable()
export class PublicDirectoryService {
  constructor(
    @InjectRepository(DirectoryEntry) private readonly entryRepository: Repository<DirectoryEntry>,
    @InjectRepository(DirectorySite) private readonly siteRepository: Repository<DirectorySite>,
  ) {}

  findAll({ term, siteId }: DirectorySearchDto) {
    const builder = this.entryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.site', 'site')
      .where('entry.isActive = true')
      .andWhere('(site.id IS NULL OR site.isActive = true)');

    if (siteId !== undefined) builder.andWhere('entry.siteId = :siteId', { siteId });

    const normalizedTerm = term?.trim();
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

    return builder
      .orderBy('entry.areaName', 'ASC')
      .addOrderBy('entry.contactLabel', 'ASC')
      .addOrderBy('entry.id', 'ASC')
      .getMany();
  }

  findSites() {
    return this.siteRepository.find({ where: { isActive: true }, order: { name: 'asc' } });
  }
}
