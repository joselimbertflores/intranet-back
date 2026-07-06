import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { FilesService } from '../../files/files.service';

import { CreateLandingNoticeDto, UpdateLandingNoticeDto } from '../dtos';
import { LandingNotice } from '../entities/landing-notice.entity';
import { User } from 'src/modules/users/entities';

@Injectable()
export class LandingNoticesService {
  constructor(
    @InjectRepository(LandingNotice)
    private readonly noticesRepository: Repository<LandingNotice>,
    private readonly dataSource: DataSource,
    private readonly filesService: FilesService,
  ) {}

  async findAll() {
    const [notices, total] = await this.noticesRepository.findAndCount({
      relations: { image: true },
      order: { createdAt: 'DESC' },
    });
    return { notices: notices.map((notice) => this.mapToAdminDto(notice)), total };
  }

  async findVisible() {
    const notices = await this.noticesRepository
      .createQueryBuilder('notice')
      .where('notice.isActive = :isActive', { isActive: true })
      .andWhere('(notice.visibleFrom IS NULL OR notice.visibleFrom <= NOW())')
      .andWhere('(notice.visibleUntil IS NULL OR notice.visibleUntil >= NOW())')
      .orderBy('notice.isPinned', 'DESC')
      .addOrderBy('notice.createdAt', 'DESC')
      .limit(5)
      .getMany();

    return notices.map((notice) => ({
      id: notice.id,
      title: notice.title,
      contentHtml: notice.contentHtml,
      imageUrl: notice.imageId ? this.filesService.buildPublicFileUrl(notice.imageId) : null,
      imageAlt: notice.imageAlt,
      imageLinkUrl: notice.imageLinkUrl,
      updatedAt: notice.updatedAt,
    }));
  }

  async create(dto: CreateLandingNoticeDto, currentUser: User) {
    const { imageId, ...props } = dto;
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(LandingNotice);

      const image = imageId ? await this.filesService.claimPendingFile(imageId, manager) : null;
      const model = repository.create({
        ...props,
        imageId: image?.id ?? null,
        image,
        createdBy: currentUser,
      });
      this.assertValidNoticeState(model);
      const createdNotice = await repository.save(model);
      return this.mapToAdminDto(createdNotice);
    });
  }

  async update(id: string, dto: UpdateLandingNoticeDto, currentUser: User) {
    const { imageId, ...updateProps } = dto;
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(LandingNotice);
      const notice = await repository.findOne({ where: { id } });

      if (!notice) throw new NotFoundException('Landing notice not found');

      await this.applyImageChange(notice, imageId, manager);

      Object.assign(notice, updateProps);

      notice.updatedBy = currentUser;

      this.assertValidNoticeState(notice);

      return this.mapToAdminDto(await repository.save(notice));
    });
  }

  async remove(id: string): Promise<{ ok: true; message: string }> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(LandingNotice);
      const notice = await repository.findOne({ where: { id } });
      if (!notice) throw new NotFoundException('Landing notice not found');

      if (notice.imageId) await this.filesService.markActiveFileAsOrphaned(notice.imageId, manager);
      await repository.delete(id);
      return { ok: true, message: 'Landing notice removed successfully' };
    });
  }

  private assertValidNoticeState(notice: LandingNotice): void {
    if (!notice.contentHtml && !notice.imageId) {
      throw new BadRequestException('contentHtml or imageId is required');
    }
    if (notice.imageId && !notice.imageAlt) {
      throw new BadRequestException('imageAlt is required when imageId is provided');
    }
    if (notice.visibleFrom && notice.visibleUntil && notice.visibleFrom > notice.visibleUntil) {
      throw new BadRequestException('visibleFrom must be before or equal to visibleUntil');
    }
  }

  private async applyImageChange(notice: LandingNotice, imageId: string | null | undefined, manager: EntityManager) {
    if (imageId === undefined) return;

    if (notice.imageId === imageId) return;

    if (imageId === null) {
      if (notice.imageId) {
        await this.filesService.markActiveFileAsOrphaned(notice.imageId, manager);
      }
      notice.image = null;
      notice.imageId = null;
      return;
    }

    if (notice.imageId) {
      notice.image = await this.filesService.replaceActiveFileWithPendingFile(notice.imageId, imageId, manager);
    } else {
      notice.image = await this.filesService.claimPendingFile(imageId, manager);
    }

    notice.imageId = imageId;
  }

  private mapToAdminDto(notice: LandingNotice) {
    return {
      ...notice,
      imageUrl: notice.imageId ? this.filesService.buildPublicFileUrl(notice.imageId) : null,
    };
  }
}
