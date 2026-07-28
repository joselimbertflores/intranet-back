import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { once } from 'events';

import { FilesService } from 'src/modules/files/files.service';
import { FileStatus } from 'src/modules/files/entities/stored-file.entity';

import { DocumentRecord, DocumentStatus } from '../entities';

@Injectable()
export class DocumentDownloadService {
  constructor(
    @InjectRepository(DocumentRecord) private readonly documentRepository: Repository<DocumentRecord>,
    private readonly filesService: FilesService,
  ) {}

  async getDocumentFileStream(documentId: string, options?: { countDownload?: boolean }) {
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
        status: DocumentStatus.ACTIVE,
      },
      relations: {
        file: true,
        type: true,
        subtype: true,
      },
    });

    const isVisible =
      document &&
      document.file.status === FileStatus.ACTIVE &&
      document.type.isActive &&
      (!document.subtype || document.subtype.isActive);

    if (!isVisible) throw new NotFoundException('Document not found');

    const result = await this.filesService.getActiveFileStream(document.file.id);

    if (result.stream.pending) {
      await once(result.stream, 'open');
    }

    if (options?.countDownload) {
      try {
        await this.documentRepository.increment({ id: document.id }, 'downloadCount', 1);
      } catch (error) {
        result.stream.destroy();
        throw error;
      }
    }

    return result;
  }
}
