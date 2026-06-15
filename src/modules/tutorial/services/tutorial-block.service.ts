import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import { CreateTutorialBlockDto, UpdateTutorialBlockDto, ReorderTutorialBlocksDto } from '../dtos';
import { FileStatus, StoredFile } from 'src/modules/files/entities/stored-file.entity';
import { Tutorial, TutorialBlock, TutorialBlockType } from '../entities';
import { FilesService } from 'src/modules/files/files.service';
import { sanitizeHtml } from 'src/helpers';
import { TutorialVideoHelper } from '../helpers';

@Injectable()
export class TutorialBlockService {
  constructor(
    private dataSource: DataSource,
    private fileService: FilesService,
  ) {}

  async create(tutorialId: string, dto: CreateTutorialBlockDto) {
    const { fileId, content, type } = dto;
    const createdBlock = await this.dataSource.transaction(async (manager) => {
      const tutorial = await manager.findOneByOrFail(Tutorial, { id: tutorialId });

      const { max } = (await manager
        .getRepository(TutorialBlock)
        .createQueryBuilder('b')
        .select('COALESCE(MAX(b.order), 0)', 'max')
        .where('b.tutorialId = :id', { id: tutorialId })
        .getRawOne<{ max: number }>()) ?? { max: 0 };

      this.validateBlock(type, content, fileId);

      let file: StoredFile | null = null;
      if (dto.fileId) {
        file = await this.activateFile(manager, dto.fileId);
      }

      const block = manager.create(TutorialBlock, {
        type,
        tutorial,
        content: this.normalizeContent(type, content),
        order: Number(max) + 1,
        ...(file && { file }),
      });

      return manager.save(block);
    });

    return this.mapToAdminBlock(createdBlock);
  }

  async update(id: string, dto: UpdateTutorialBlockDto) {
    const { content, ...toUpdate } = dto;
    const result = await this.dataSource.transaction(async (manager) => {
      const block = await manager.findOne(TutorialBlock, {
        where: { id },
        relations: { file: true },
      });
      if (!block) throw new NotFoundException(`Block with id ${id} not found`);

      const nextContent = dto.content ?? block.content;
      const nextFileId = dto.fileId ?? block.file?.id;

      this.validateBlock(block.type, nextContent, nextFileId);

      if (dto.fileId && dto.fileId !== block.file?.id) {
        if (block.file) {
          await manager.update(StoredFile, { id: block.file.id }, { status: FileStatus.ORPHANED });
        }
        block.file = await this.activateFile(manager, dto.fileId);
      }

      if (dto.content !== undefined) {
        block.content = this.normalizeContent(block.type, dto.content);
      }

      Object.assign(block, toUpdate);

      return manager.save(block);
    });

    return this.mapToAdminBlock(result);
  }

  async remove(blockId: string) {
    return this.dataSource.transaction(async (manager) => {
      const block = await manager.findOne(TutorialBlock, {
        where: { id: blockId },
        relations: { file: true },
      });

      if (!block) throw new NotFoundException();

      if (block.file) {
        await manager.update(StoredFile, { id: block.file.id }, { status: FileStatus.ORPHANED });
      }

      await manager.delete(TutorialBlock, { id: blockId });
      return { ok: true };
    });
  }

  async updateBlocksOrder(tutorialId: string, { items }: ReorderTutorialBlocksDto) {
    await this.dataSource.transaction(async (manager) => {
      const ids = items.map((i) => i.id);
      const count = await manager.count(TutorialBlock, {
        where: {
          id: In(ids),
          tutorial: { id: tutorialId },
        },
      });

      if (count !== items.length) {
        throw new BadRequestException('One or more blocks do not belong to this tutorial');
      }

      for (const item of items) {
        await manager.update(TutorialBlock, { id: item.id }, { order: item.order });
      }
    });

    return { ok: true, message: 'Order updated successfully' };
  }

  mapToAdminBlock(block: TutorialBlock) {
    if (block.type === TutorialBlockType.VIDEO_URL && block.content) {
      return {
        id: block.id,
        type: block.type,
        order: block.order,
        content: TutorialVideoHelper.toEmbedUrl(block.content),
      };
    }
    return {
      id: block.id,
      type: block.type,
      content: block.content,
      order: block.order,
      ...(block.file && {
        file: {
          id: block.file.id,
          url: this.fileService.buildPublicFileUrl(block.file.id),
          originalName: block.file.originalName,
          mimeType: block.file.mimeType,
          size: Number(block.file.sizeBytes),
        },
      }),
    };
  }

  private async activateFile(manager: EntityManager, fileId: string): Promise<StoredFile> {
    const file = await manager.findOne(StoredFile, {
      where: { id: fileId },
    });

    if (!file) throw new BadRequestException('File not found');
    if (file.status === FileStatus.PENDING) {
      await manager.update(StoredFile, { id: file.id }, { status: FileStatus.ACTIVE });
    }
    return file;
  }

  private validateBlock(type: TutorialBlockType, content?: string | null, fileId?: string | null) {
    switch (type) {
      case TutorialBlockType.TEXT:
        if (!content?.trim()) {
          throw new BadRequestException('TEXT block requires content');
        }
        break;

      case TutorialBlockType.VIDEO_URL:
        if (!content?.trim()) {
          throw new BadRequestException('VIDEO_URL block requires content');
        }
        break;

      case TutorialBlockType.IMAGE:
      case TutorialBlockType.VIDEO_FILE:
      case TutorialBlockType.FILE:
        if (!fileId) {
          throw new BadRequestException(`${type} block requires file`);
        }
        break;
      default:
        break;
    }
  }

  private normalizeContent(type: TutorialBlockType, content?: string): string | undefined {
    if (!content) return undefined;
    switch (type) {
      case TutorialBlockType.TEXT:
        return sanitizeHtml(content);

      case TutorialBlockType.VIDEO_URL:
        if (content.startsWith('youtube:')) return content;
        return TutorialVideoHelper.normalizeContent(content);

      default:
        return content;
    }
  }
}
