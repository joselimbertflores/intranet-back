import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { FilesService } from '../../files/files.service';
import { FileContext } from '../../files/enums/file-context.enum';

import { CreateLandingNoticeDto, UpdateLandingNoticeDto } from '../dtos';
import { LandingNotice } from '../entities/landing-notice.entity';
import { User } from 'src/modules/users/entities';

export interface LandingNoticeAdminResponse {
  id: string;
  title: string;
  contentHtml: string | null;
  imageId: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  imageLinkUrl: string | null;
  isActive: boolean;
  visibleFrom: Date | null;
  visibleUntil: Date | null;
  isPinned: boolean;
  createdById: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class LandingNoticesService {
  constructor(
    @InjectRepository(LandingNotice)
    private readonly noticesRepository: Repository<LandingNotice>,
    private readonly dataSource: DataSource,
    private readonly filesService: FilesService,
  ) {}

  async findAll(): Promise<LandingNoticeAdminResponse[]> {
    const notices = await this.noticesRepository.find({ order: { createdAt: 'DESC' } });
    return notices.map((notice) => this.mapToAdminResponse(notice));
  }

  async create(dto: CreateLandingNoticeDto, currentUser: User): Promise<LandingNoticeAdminResponse> {
    const { imageId, ...props } = dto;
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(LandingNotice);

      const image = imageId
        ? await this.filesService.claimPendingFile(imageId, FileContext.LANDING_NOTICES, manager)
        : null;
      const model = repository.create({
        title: props.title,
        contentHtml: props.contentHtml ?? null,
        imageId: image?.id ?? null,
        image,
        imageAlt: props.imageAlt ?? null,
        imageLinkUrl: props.imageLinkUrl ?? null,
        isActive: props.isActive ?? true,
        visibleFrom: props.visibleFrom ?? null,
        visibleUntil: props.visibleUntil ?? null,
        isPinned: props.isPinned ?? false,
        createdById: currentUser.id,
        createdBy: currentUser,
        updatedById: null,
        updatedBy: null,
      });
      this.assertValidNoticeState(model);
      const createdNotice = await repository.save(model);
      return this.mapToAdminResponse(createdNotice);
    });
  }

  async update(id: string, dto: UpdateLandingNoticeDto, currentUser: User): Promise<LandingNoticeAdminResponse> {
    const { imageId, ...updateProps } = dto;
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(LandingNotice);
      const notice = await repository.findOne({ where: { id } });

      if (!notice) throw new NotFoundException('Landing notice not found');

      await this.applyImageChange(notice, imageId, manager);

      Object.assign(notice, updateProps);

      notice.updatedById = currentUser.id;
      notice.updatedBy = currentUser;

      this.assertValidNoticeState(notice);

      return this.mapToAdminResponse(await repository.save(notice));
    });
  }

  async remove(id: string): Promise<{ ok: true; message: string }> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(LandingNotice);
      const notice = await repository.findOne({ where: { id } });
      if (!notice) throw new NotFoundException('Landing notice not found');

      if (notice.imageId) {
        await this.filesService.markActiveFileAsOrphaned(notice.imageId, manager, FileContext.LANDING_NOTICES);
      }
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
    if (!notice.imageId && (notice.imageAlt || notice.imageLinkUrl)) {
      throw new BadRequestException('imageAlt and imageLinkUrl require imageId');
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
        await this.filesService.markActiveFileAsOrphaned(notice.imageId, manager, FileContext.LANDING_NOTICES);
      }
      notice.image = null;
      notice.imageId = null;
      notice.imageAlt = null;
      notice.imageLinkUrl = null;
      return;
    }

    if (notice.imageId) {
      notice.image = await this.filesService.replaceActiveFileWithPendingFile(
        notice.imageId,
        imageId,
        FileContext.LANDING_NOTICES,
        manager,
      );
    } else {
      notice.image = await this.filesService.claimPendingFile(imageId, FileContext.LANDING_NOTICES, manager);
    }

    notice.imageId = imageId;
    notice.imageAlt = null;
    notice.imageLinkUrl = null;
  }

  private mapToAdminResponse(notice: LandingNotice): LandingNoticeAdminResponse {
    return {
      id: notice.id,
      title: notice.title,
      contentHtml: notice.contentHtml ?? null,
      imageId: notice.imageId,
      imageUrl: notice.imageId ? this.filesService.buildPublicFileUrl(notice.imageId) : null,
      imageAlt: notice.imageAlt ?? null,
      imageLinkUrl: notice.imageLinkUrl ?? null,
      isActive: notice.isActive,
      visibleFrom: notice.visibleFrom ?? null,
      visibleUntil: notice.visibleUntil ?? null,
      isPinned: notice.isPinned,
      createdById: notice.createdById,
      updatedById: notice.updatedById ?? null,
      createdAt: notice.createdAt,
      updatedAt: notice.updatedAt,
    };
  }
}
