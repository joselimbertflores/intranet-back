import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, ILike, Repository } from 'typeorm';

import { FilesService } from '../../files/files.service';

import { CreateLandingModalNoticeDto, UpdateLandingModalNoticeDto } from '../dtos';
import { LandingModalNotice } from '../entities/landing-modal-notice.entity';
import { User } from 'src/modules/users/entities';
import { PaginationParamsDto } from 'src/modules/common';

@Injectable()
export class LandingModalNoticesService {
  constructor(
    @InjectRepository(LandingModalNotice) private noticesRepository: Repository<LandingModalNotice>,
    private dataSource: DataSource,
    private filesService: FilesService,
  ) {}

  async findAll({ limit, offset, term }: PaginationParamsDto) {
    const [notices, total] = await this.noticesRepository.findAndCount({
      where: { ...(term && { title: ILike(`%${term}%`) }) },
      relations: { image: true },
      order: { isPinned: 'DESC', createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    console.log(notices);
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
      title: notice.title,
      contentHtml: notice.contentHtml,
      imageUrl: notice.imageId ? this.filesService.buildPublicFileUrl(notice.imageId) : null,
      imageAlt: notice.imageAlt,
      imageLinkUrl: notice.imageLinkUrl,
    }));
  }

  async create(dto: CreateLandingModalNoticeDto, currentUser: User) {
    const { imageId, ...props } = dto;
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(LandingModalNotice);

      const image = imageId ? await this.filesService.claimPendingFile(imageId, manager) : null;
      const model = repository.create({
        ...props,
        image,
        createdBy: currentUser,
      });
      this.assertValidNoticeState(model);
      const createdNotice = await repository.save(model);
      return this.mapToAdminDto(createdNotice);
    });
  }

  async update(id: string, dto: UpdateLandingModalNoticeDto, currentUser: User) {
    const { imageId, ...updateProps } = dto;
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(LandingModalNotice);
      const notice = await repository.findOne({ where: { id } });

      if (!notice) throw new NotFoundException('Landing modal notice not found');

      await this.applyImageChange(notice, imageId, manager);

      Object.assign(notice, updateProps);

      notice.updatedBy = currentUser;

      this.assertValidNoticeState(notice);

      return this.mapToAdminDto(await repository.save(notice));
    });
  }

  async remove(id: string): Promise<{ ok: true; message: string }> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(LandingModalNotice);
      const notice = await repository.findOne({ where: { id } });
      if (!notice) throw new NotFoundException('Landing modal notice not found');

      if (notice.imageId) await this.filesService.markActiveFileAsOrphaned(notice.imageId, manager);
      await repository.delete(id);
      return { ok: true, message: 'Landing modal notice removed successfully' };
    });
  }

  private assertValidNoticeState(notice: LandingModalNotice): void {
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

  private async applyImageChange(
    notice: LandingModalNotice,
    imageId: string | null | undefined,
    manager: EntityManager,
  ) {
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

  private mapToAdminDto({ imageId, ...props }: LandingModalNotice) {
    console.log(imageId);
    return {
      ...props,
      imageUrl: imageId ? this.filesService.buildPublicFileUrl(imageId) : null,
    };
  }
}
