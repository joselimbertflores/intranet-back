import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, EntityManager, In, Repository } from 'typeorm';

import { ReplaceBannersDto, BannerItemDto } from '../dtos';
import { Banner, BannerLinkType } from '../entities';
import { FileStatus, StoredFile } from 'src/modules/files/entities/stored-file.entity';
import { FilesService } from 'src/modules/files/files.service';

@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(Banner) private heroSlidesRepository: Repository<Banner>,
    private dataSource: DataSource,
    private fileService: FilesService,
  ) {}

  async findAll() {
    const slides = await this.heroSlidesRepository.find({ relations: { image: true }, order: { order: 'ASC' } });
    return this.mapBannersToDto(slides);
  }

  async replaceAll(dto: ReplaceBannersDto): Promise<Banner[]> {
    const items = dto.items ?? [];
    this.assertNoDuplicateIds(items);

    return this.dataSource.transaction(async (manager) => {
      const bannerRepo = manager.getRepository(Banner);
      const fileRepo = manager.getRepository(StoredFile);

      const existingMap = await this.loadExistingBannersMap(bannerRepo, items);
      const imageMap = await this.loadImagesMap(fileRepo, items);

      const toCreate: Banner[] = [];
      const toUpdate: Banner[] = [];

      const filesToActivate = new Set<string>();
      const filesToRemove = new Set<string>();

      for (let index = 0; index < items.length; index++) {
        const it = items[index];

        const patch: Partial<Banner> = {
          title: it.title?.trim(),
          subtitle: it.subtitle?.trim(),
          linkType: it.linkType ?? BannerLinkType.INTERNAL,
          url: it.url?.trim(),
          openInNewTab: it.openInNewTab ?? false,
          isActive: it.isActive ?? true,
          order: index,
        };

        if (it.id) {
          const current = existingMap.get(it.id)!;
          if (it.imageId) {
            const newImage = imageMap.get(it.imageId);
            if (!newImage) throw new NotFoundException(`Image ${it.imageId} not found.`);

            filesToActivate.add(newImage.id);
            if (current.image.id !== newImage.id) filesToRemove.add(current.image.id);
            current.image = newImage;
          }
          toUpdate.push(Object.assign(current, patch));
        } else {
          if (!it.imageId) throw new BadRequestException('Image is required for new banners.');
          const image = imageMap.get(it.imageId);
          if (!image) throw new NotFoundException(`Image ${it.imageId} not found.`);

          filesToActivate.add(image.id);
          toCreate.push(bannerRepo.create({ ...patch, image }));
        }
      }

      if (toUpdate.length) await bannerRepo.save(toUpdate);
      if (toCreate.length) await bannerRepo.save(toCreate);

      await this.markFilesRemoved(manager, [...filesToRemove]);
      await this.markFilesActive(manager, [...filesToActivate]);

      // Devuelve lista completa (admin)
      return bannerRepo.find({ relations: { image: true }, order: { order: 'ASC' } });
    });
  }

  async remove(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const bannerRepo = manager.getRepository(Banner);

      const banner = await bannerRepo.findOne({ where: { id }, relations: { image: true } });
      if (!banner) throw new NotFoundException('Banner not found');
      await bannerRepo.delete(id);

      await manager.getRepository(StoredFile).update({ id: banner.image.id }, { status: FileStatus.REMOVED });

      return { ok: true, message: 'Banner removed successfully' };
    });
  }

  private async markFilesRemoved(manager: EntityManager, fileIds: string[]) {
    await manager.getRepository(StoredFile).update({ id: In(fileIds) }, { status: FileStatus.REMOVED });
  }

  private async markFilesActive(manager: EntityManager, fileIds: string[]) {
    await manager.getRepository(StoredFile).update({ id: In(fileIds) }, { status: FileStatus.ACTIVE });
  }

  private assertNoDuplicateIds(items: BannerItemDto[]) {
    const ids = items.filter((i) => i.id).map((i) => i.id!);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate banner ids are not allowed in the payload.');
    }
  }

  private async loadExistingBannersMap(
    bannerRepo: Repository<Banner>,
    items: BannerItemDto[],
  ): Promise<Map<number, Banner>> {
    const ids = items.filter((i) => i.id).map((i) => i.id!);
    if (!ids.length) return new Map();
    const existing = await bannerRepo.find({ where: { id: In(ids) }, relations: { image: true } });
    const map = new Map(existing.map((b) => [b.id, b]));
    for (const id of ids) {
      if (!map.has(id)) throw new NotFoundException(`Banner with id=${id} not found.`);
    }
    return map;
  }

  private async loadImagesMap(
    fileRepo: Repository<StoredFile>,
    items: BannerItemDto[],
  ): Promise<Map<string, StoredFile>> {
    const imageIds = [...new Set(items.map((i) => i.imageId).filter(Boolean) as string[])];
    if (!imageIds.length) return new Map();

    const files = await fileRepo.findBy({ id: In(imageIds) });

    if (files.length !== imageIds.length) {
      const found = new Set(files.map((f) => f.id));
      const missing = imageIds.filter((id) => !found.has(id));
      throw new NotFoundException(`Images not found: ${missing.join(', ')}`);
    }

    const map = new Map(files.map((f) => [f.id, f]));
    return map;
  }

  private mapBannersToDto(banners: Banner[]) {
    return banners.map((item) => {
      const { image, ...rest } = item;
      return {
        ...rest,
        imageUrl: this.fileService.buildPublicFileUrl(image.id),
      };
    });
  }
}
