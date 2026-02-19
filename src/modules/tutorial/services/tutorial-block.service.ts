import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import { CreateTutorialBlockDto, UpdateTutorialBlockDto, ReorderTutorialBlocksDto } from '../dtos';
import { FileStatus, StoredFile } from 'src/modules/files/entities/stored-file.entity';
import { Tutorial, TutorialBlock, TutorialBlockType } from '../entities';
import { FilesService } from 'src/modules/files/files.service';

@Injectable()
export class TutorialBlockService {
  constructor(
    private dataSource: DataSource,
    private fileService: FilesService,
  ) {}

  async create(tutorialId: string, dto: CreateTutorialBlockDto) {
    const createdBlock = await this.dataSource.transaction(async (manager) => {
      const tutorial = await manager.findOneByOrFail(Tutorial, { id: tutorialId });
      const result = await manager
        .getRepository(TutorialBlock)
        .createQueryBuilder('b')
        .select('COALESCE(MAX(b.order), 0)', 'max')
        .where('b.tutorialId = :id', { id: tutorialId })
        .getRawOne<{ max: number }>();

      let file: StoredFile | null = null;

      this.validateBlock(dto.type, dto.content, dto.fileId);

      if (dto.fileId) {
        file = await this.activateFile(manager, dto.fileId);
      }

      const order = (Number(result?.max ?? 0) || 0) + 1;
      const block = manager.create(TutorialBlock, {
        type: dto.type,
        content: dto.content,
        tutorial,
        order,
        ...(file && { file }),
      });
      return await manager.save(block);
    });
    return this.mapBlock(createdBlock);
  }

  async update(id: string, dto: UpdateTutorialBlockDto) {
    const result = await this.dataSource.transaction(async (manager) => {
      const block = await manager.findOne(TutorialBlock, { where: { id: id }, relations: { file: true } });
      if (!block) throw new NotFoundException(`Block with id ${id} not found`);

      this.validateBlock(block.type, dto.content ?? block.content, dto.fileId ?? block.file?.id);

      if (dto.fileId && dto.fileId !== block.file?.id) {
        if (block.file) await manager.update(StoredFile, { id: block.file.id }, { status: FileStatus.REMOVED });
        block.file = await this.activateFile(manager, dto.fileId);
      }
      return manager.save(block);
    });
    return this.mapBlock(result);
  }

  async remove(blockId: string) {
    return this.dataSource.transaction(async (manager) => {
      const block = await manager.findOne(TutorialBlock, {
        where: { id: blockId },
        relations: { file: true },
      });

      if (!block) throw new NotFoundException();

      if (block.file) {
        await manager.update(StoredFile, { id: block.file.id }, { status: FileStatus.REMOVED });
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

  mapBlock(block: TutorialBlock) {
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

  private validateBlock(type: TutorialBlockType, content?: string, fileId?: string | null) {
    if (type === TutorialBlockType.TEXT && !content) {
      throw new BadRequestException('TEXT block requires content');
    }

    if (type === TutorialBlockType.VIDEO_URL && !content) {
      throw new BadRequestException('VIDEO block requires URL');
    }

    if ((type === TutorialBlockType.IMAGE || type === TutorialBlockType.FILE) && !fileId) {
      throw new BadRequestException(`${type} block requires file`);
    }
  }
}
