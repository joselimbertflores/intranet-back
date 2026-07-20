import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { CreateDirectorySiteDto, UpdateDirectorySiteDto } from './dtos';
import { DirectorySite } from './entities';

@Injectable()
export class DirectorySitesService {
  constructor(@InjectRepository(DirectorySite) private readonly siteRepository: Repository<DirectorySite>) {}

  findAll() {
    return this.siteRepository.find({ order: { name: 'asc' } });
  }

  async create(dto: CreateDirectorySiteDto) {
    return this.save(this.siteRepository.create(dto));
  }

  async update(id: number, dto: UpdateDirectorySiteDto) {
    const site = await this.siteRepository.findOneBy({ id });
    if (!site) throw new NotFoundException('Directory site not found');

    Object.assign(site, dto);
    return this.save(site);
  }

  async remove(id: number) {
    const result = await this.siteRepository.delete(id);
    if (!result.affected) throw new NotFoundException('Directory site not found');
    return { deleted: true };
  }

  async resolve(siteId?: number | null): Promise<DirectorySite | null> {
    if (!siteId) return null;

    const site = await this.siteRepository.findOneBy({ id: siteId });
    if (!site) throw new NotFoundException('Directory site not found');
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
