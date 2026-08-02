import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { sanitizeHtml } from 'src/helpers';
import { FileContext } from 'src/modules/files/enums/file-context.enum';
import { FilesService } from 'src/modules/files/files.service';

import { CreateTutorialBlockDto, ReorderTutorialBlocksDto, UpdateTutorialBlockDto } from '../dtos';
import { Tutorial, TutorialBlock, TutorialBlockType } from '../entities';
import { TutorialVideoHelper } from '../helpers';

const ALLOWED_MIME_TYPES: Partial<Record<TutorialBlockType, readonly string[]>> = {
  [TutorialBlockType.IMAGE]: ['image/jpeg', 'image/png', 'image/webp'],
  [TutorialBlockType.VIDEO_FILE]: ['video/mp4'],
  [TutorialBlockType.FILE]: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
};

@Injectable()
export class TutorialBlockService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly filesService: FilesService,
  ) {}

  async create(tutorialId: string, dto: CreateTutorialBlockDto) {
    const createdBlock = await this.dataSource.transaction(async (manager) => {
      const tutorial = await manager.findOneBy(Tutorial, { id: tutorialId });
      if (!tutorial) throw new NotFoundException('Tutorial not found');

      const { max } = (await manager
        .getRepository(TutorialBlock)
        .createQueryBuilder('block')
        .select('COALESCE(MAX(block.order), 0)', 'max')
        .where('block.tutorialId = :tutorialId', { tutorialId })
        .getRawOne<{ max: number }>()) ?? { max: 0 };

      let content: string | null = null;
      let file: TutorialBlock['file'] = null;

      if (this.isFileBlock(dto.type)) {
        this.assertFileBlockPayload(dto.type, dto.content, dto.fileId);
        try {
          file = await this.filesService.claimPendingFile(dto.fileId!, FileContext.TUTORIALS, manager);
        } catch (error) {
          if (error instanceof NotFoundException) throw new BadRequestException('File not found');
          throw error;
        }
        this.assertCompatibleMimeType(dto.type, file.mimeType);
      } else {
        content = this.normalizeContentBlock(dto.type, dto.content, dto.fileId);
      }

      const block = manager.create(TutorialBlock, {
        type: dto.type,
        tutorial,
        content,
        file,
        order: Number(max) + 1,
      });

      return manager.save(block);
    });

    return this.mapToAdminBlock(createdBlock);
  }

  async update(id: string, dto: UpdateTutorialBlockDto) {
    const updatedBlock = await this.dataSource.transaction(async (manager) => {
      const block = await manager.findOne(TutorialBlock, {
        where: { id },
        relations: { file: true },
      });

      if (!block) throw new NotFoundException('Tutorial block not found');

      if (this.isFileBlock(block.type)) {
        if (dto.content !== undefined) {
          throw new BadRequestException(`${block.type} blocks do not accept content`);
        }

        if (dto.fileId !== undefined) {
          if (!block.file) throw new BadRequestException(`${block.type} block has no active file to replace`);

          try {
            block.file = await this.filesService.replaceActiveFileWithPendingFile(
              block.file.id,
              dto.fileId,
              FileContext.TUTORIALS,
              manager,
            );
          } catch (error) {
            if (error instanceof NotFoundException) throw new BadRequestException('File not found');
            throw error;
          }
        }

        if (!block.file) throw new BadRequestException(`${block.type} block requires a file`);
        this.assertCompatibleMimeType(block.type, block.file.mimeType);
        block.content = null;
      } else {
        if (dto.fileId !== undefined) {
          throw new BadRequestException(`${block.type} blocks do not accept files`);
        }
        if (block.file) {
          throw new BadRequestException(`${block.type} block has an unexpected file association`);
        }

        block.content = this.normalizeContentBlock(block.type, dto.content ?? block.content ?? undefined, undefined);
      }

      return manager.save(block);
    });

    return this.mapToAdminBlock(updatedBlock);
  }

  async remove(blockId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const block = await manager.findOne(TutorialBlock, {
        where: { id: blockId },
        relations: { file: true, tutorial: true },
      });

      if (!block) throw new NotFoundException('Tutorial block not found');

      if (block.tutorial.isPublished) {
        const blockCount = await manager.count(TutorialBlock, { where: { tutorial: { id: block.tutorial.id } } });
        if (blockCount <= 1) {
          throw new BadRequestException('A published tutorial must have at least one block');
        }
      }

      if (block.file) {
        await this.filesService.markActiveFileAsOrphaned(block.file.id, manager, FileContext.TUTORIALS);
      }

      await manager.remove(block);
    });
  }

  async updateBlocksOrder(tutorialId: string, { blockIds }: ReorderTutorialBlocksDto) {
    await this.dataSource.transaction(async (manager) => {
      const tutorialExists = await manager.exists(Tutorial, { where: { id: tutorialId } });
      if (!tutorialExists) throw new NotFoundException('Tutorial not found');

      if (new Set(blockIds).size !== blockIds.length) {
        throw new BadRequestException('Duplicate block IDs are not allowed');
      }

      const blocks = await manager.find(TutorialBlock, {
        where: { tutorial: { id: tutorialId } },
        select: { id: true },
      });
      const currentIds = new Set(blocks.map((block) => block.id));

      if (blockIds.length !== blocks.length || blockIds.some((id) => !currentIds.has(id))) {
        throw new BadRequestException('blockIds must contain every block in this tutorial exactly once');
      }

      for (const [index, id] of blockIds.entries()) {
        await manager.update(TutorialBlock, { id }, { order: index + 1 });
      }
    });

    return { ok: true, message: 'Order updated successfully' };
  }

  mapToAdminBlock(block: TutorialBlock) {
    const isFileBlock = this.isFileBlock(block.type);
    return {
      id: block.id,
      type: block.type,
      order: block.order,
      content:
        !isFileBlock && block.type === TutorialBlockType.YOUTUBE
          ? TutorialVideoHelper.toEmbedUrl(block.content)
          : !isFileBlock
            ? (block.content ?? null)
            : null,
      file:
        isFileBlock && block.file
          ? {
              id: block.file.id,
              url: this.filesService.buildPublicFileUrl(block.file.id),
              originalName: block.file.originalName,
              mimeType: block.file.mimeType,
              size: Number(block.file.sizeBytes),
            }
          : null,
    };
  }

  private normalizeContentBlock(type: TutorialBlockType, content?: string, fileId?: string): string {
    if (fileId !== undefined) throw new BadRequestException(`${type} blocks do not accept files`);
    if (!content?.trim()) throw new BadRequestException(`${type} block requires content`);

    if (type === TutorialBlockType.TEXT) {
      const sanitized = sanitizeHtml(content).trim();
      if (!this.hasVisibleText(sanitized)) {
        throw new BadRequestException('TEXT block content is empty after sanitization');
      }
      return sanitized;
    }

    if (type === TutorialBlockType.YOUTUBE) {
      return TutorialVideoHelper.normalizeContent(content);
    }

    throw new BadRequestException('Invalid content-based tutorial block type');
  }

  private assertFileBlockPayload(type: TutorialBlockType, content?: string, fileId?: string): void {
    if (content !== undefined) throw new BadRequestException(`${type} blocks do not accept content`);
    if (!fileId) throw new BadRequestException(`${type} block requires a file`);
  }

  private assertCompatibleMimeType(type: TutorialBlockType, mimeType: string): void {
    const allowedMimeTypes = ALLOWED_MIME_TYPES[type];
    if (!allowedMimeTypes?.includes(mimeType)) {
      throw new BadRequestException(`${mimeType} is not allowed for ${type} blocks`);
    }
  }

  private isFileBlock(type: TutorialBlockType): boolean {
    return type === TutorialBlockType.IMAGE || type === TutorialBlockType.VIDEO_FILE || type === TutorialBlockType.FILE;
  }

  private hasVisibleText(html: string): boolean {
    return (
      html
        .replace(/<[^>]*>/g, '')
        .replace(/&(?:nbsp|#160|#xA0);/gi, ' ')
        .trim().length > 0
    );
  }
}
