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

    if (siteId) builder.andWhere('entry.siteId = :siteId', { siteId });
    if (term) {
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

    return builder.orderBy('entry.areaName', 'ASC').addOrderBy('entry.contactLabel', 'ASC').getMany();
  }

  findSites() {
    return this.siteRepository.find({ where: { isActive: true }, order: { name: 'asc' } });
  }
}
