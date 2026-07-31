import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { CreateDirectorySiteDto, UpdateDirectorySiteDto } from './dtos';
import { DirectoryEntry, DirectorySite } from './entities';

@Injectable()
export class DirectorySitesService {
  constructor(
    @InjectRepository(DirectorySite) private readonly siteRepository: Repository<DirectorySite>,
    @InjectRepository(DirectoryEntry) private readonly entryRepository: Repository<DirectoryEntry>,
  ) {}

  findAll() {
    return this.siteRepository.find({ order: { name: 'asc' } });
  }

  async create(dto: CreateDirectorySiteDto) {
    return this.save(this.siteRepository.create({ ...dto, name: dto.name.trim() }));
  }

  async update(id: number, dto: UpdateDirectorySiteDto) {
    const site = await this.siteRepository.findOneBy({ id });
    if (!site) throw new NotFoundException('Directory site not found');

    Object.assign(site, dto);
    if (dto.name !== undefined) site.name = dto.name.trim();
    return this.save(site);
  }

  async remove(id: number) {
    const site = await this.siteRepository.findOneBy({ id });
    if (!site) throw new NotFoundException('Directory site not found');

    const isInUse = await this.entryRepository.exists({ where: { siteId: id } });
    if (isInUse) {
      throw new ConflictException('The directory site cannot be deleted because it has associated entries');
    }

    await this.siteRepository.remove(site);
    return { deleted: true };
  }

  async resolve(siteId?: number | null, allowInactive = false): Promise<DirectorySite | null> {
    if (siteId == null) return null;

    const site = await this.siteRepository.findOneBy({ id: siteId });
    if (!site) throw new NotFoundException('Directory site not found');
    if (!site.isActive && !allowInactive) {
      throw new BadRequestException('Inactive directory sites cannot be assigned to entries');
    }
    return site;
  }

  private async save(site: DirectorySite) {
    try {
      return await this.siteRepository.save(site);
    } catch (error) {
      if (error instanceof QueryFailedError && (error.driverError as { code?: string }).code === '23505') {
        throw new ConflictException('A directory site with this name already exists');
      }
      throw error;
    }
  }
}
