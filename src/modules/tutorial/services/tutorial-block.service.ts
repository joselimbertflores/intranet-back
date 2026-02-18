import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, EntityManager, In, Repository } from 'typeorm';

import { FileStatus, StoredFile } from 'src/modules/files/entities/stored-file.entity';
import { CreateTutorialBlockDto, UpdateTutorialBlockDto, ReorderTutorialBlocksDto } from '../dtos';
import { Tutorial, TutorialBlock, TutorialBlockType } from '../entities';

@Injectable()
export class TutorialBlockService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Tutorial) private tutorialRepo: Repository<Tutorial>,
    @InjectRepository(TutorialBlock) private blockRepo: Repository<TutorialBlock>,
  ) {}

  async create(tutorialId: string, dto: CreateTutorialBlockDto): Promise<TutorialBlock> {
    return this.dataSource.transaction(async (manager) => {
      const tutorial = await manager.findOneByOrFail(Tutorial, { id: tutorialId });

      const result = await manager
        .getRepository(TutorialBlock)
        .createQueryBuilder('b')
        .select('COALESCE(MAX(b.order), 0)', 'max')
        .where('b.tutorialId = :id', { id: tutorialId })
        .getRawOne<{ max: number }>();

      let file: StoredFile | null = null;

      if (dto.fileId) {
        file = await this.activateFile(manager, dto.fileId);
      }

      const block = manager.create(TutorialBlock, {
        tutorial,
        type: dto.type,
        content: dto.content,
        order: Number(result?.max ?? 0) + 1,
        ...(file && { file }),
      });

      return manager.save(block);
    });
  }

  async update(id: string, dto: UpdateTutorialBlockDto): Promise<TutorialBlock> {
    return this.dataSource.transaction(async (manager) => {
      const block = await manager.findOne(TutorialBlock, {
        where: { id: id },
        relations: { file: true },
      });

      if (!block) throw new NotFoundException();

      const finalFileId = dto.fileId !== undefined ? dto.fileId : block.file?.id;

      this.validateBlock(block.type, dto.content ?? block.content, finalFileId);

      // Si cambia archivo → REMOVED el anterior
      if (dto.fileId !== undefined && block.file && block.file.id !== dto.fileId) {
        await manager.update(StoredFile, { id: block.file.id }, { status: FileStatus.REMOVED });
      }

      let newFile: StoredFile | null | undefined = undefined;

      if (dto.fileId !== undefined) {
        newFile = dto.fileId ? await this.activateFile(manager, dto.fileId) : null;
      }

      Object.assign(block, {
        content: dto.content,
        file: newFile,
      });

      return manager.save(block);
    });
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

  // async reorder(tutorialId: string, blockIds: string[]) {
  //   return this.dataSource.transaction(async (manager) => {
  //     for (let i = 0; i < blockIds.length; i++) {
  //       await manager.update(TutorialBlock, { id: blockIds[i], tutorial: { id: tutorialId } }, { order: i + 1 });
  //     }
  //     return { ok: true };
  //   });
  // }

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
