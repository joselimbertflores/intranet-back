import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DirectoryEntry, DirectorySite } from './entities';

@Injectable()
export class PublicDirectoryService {
  constructor(
    @InjectRepository(DirectoryEntry) private entryRepository: Repository<DirectoryEntry>,
    @InjectRepository(DirectorySite) private siteRepository: Repository<DirectorySite>,
  ) {}

  findAll() {
    return this.entryRepository.find({
      where: {
        isActive: true,
      },
      relations: {
        site: true,
      },
      order: {
        areaName: 'ASC',
        contactLabel: 'ASC',
        id: 'ASC',
      },
    });
  }

  findSites() {
    return this.siteRepository.find({ where: { isActive: true }, order: { name: 'asc' } });
  }
}
