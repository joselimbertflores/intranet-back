import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, FindOptionsWhere, ILike, In, Repository } from 'typeorm';

import { DocumentRecord, Section, DocumentType, DocumentSubtype } from '../entities';
import { CreateDocumentsDto, FilterDocumentsDto, NewFilterDocumentsDto, UpdateDocumentDto } from '../dtos';
import { FilesService } from 'src/modules/files/files.service';
import { FileGroup } from 'src/modules/files/file-group.enum';
import { User } from 'src/modules/users/entities';
import { FileStatus, StoredFile } from 'src/modules/files/entities/stored-file.entity';
import { SectionService } from './section.service';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentType) private docTypeRepository: Repository<DocumentType>,
    @InjectRepository(DocumentRecord) private docRepository: Repository<DocumentRecord>,
    @InjectRepository(Section) private docSectionRepository: Repository<Section>,
    @InjectRepository(DocumentSubtype) private docSubtypeRepository: Repository<DocumentSubtype>,
    @InjectRepository(StoredFile) private fileRepository: Repository<StoredFile>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private sectionService: SectionService,
    private fileService: FilesService,
    private dataSource: DataSource,
  ) {}

  async findAll(filterParamsDto: NewFilterDocumentsDto, authUser: User) {
    const { limit, offset, term, fiscalYear, sectionId, typeId, subtypeId } = filterParamsDto;
    const sectionIds = sectionId ? await this.sectionService.getSectionAndDescendantIds(sectionId) : undefined;
    const where: FindOptionsWhere<DocumentRecord> = {
      ...(term && { title: ILike(`%${term}%`) }),
      ...(sectionIds && { section: { id: In(sectionIds) } }),
      ...(typeId && { type: { id: typeId } }),
      ...(subtypeId && { subtype: { id: subtypeId } }),
      ...(fiscalYear && { fiscalYear }),
    };
    const [documents, total] = await this.docRepository.findAndCount({
      where,
      relations: { section: true, type: true, subtype: true, file: true },
      order: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return { documents, total };
  }

  async create(dto: CreateDocumentsDto, _authUser: User) {
    const { documents, sectionId, typeId, subtypeId, fiscalYear } = dto;
    const { section, type, subtype } = await this.getValidDocumentProps(sectionId, typeId, subtypeId);
    const fileIds = documents.map((doc) => doc.fileId);

    const files = await this.fileRepository.find({ where: { id: In(fileIds) } });

    if (files.length !== fileIds.length) {
      throw new BadRequestException('One or more files do not exist');
    }

    const filesById = new Map(files.map((file) => [file.id, file]));
    const invalidFiles = files.filter((file) => file.status !== FileStatus.PENDING);

    if (invalidFiles.length > 0) {
      throw new BadRequestException('One or more files are not available');
    }

    return this.dataSource.transaction(async (manager) => {
      const models = documents.map((doc) => {
        const file = filesById.get(doc.fileId);
        if (!file) throw new BadRequestException(`File ${doc.fileId} not found`);

        return manager.create(DocumentRecord, {
          fiscalYear,
          section,
          type,
          subtype,
          file,
          title: doc.title ?? file.originalName,
        });
      });

      await manager.update(StoredFile, { id: In(fileIds) }, { status: FileStatus.ACTIVE });
      return manager.save(models);
    });
  }

  async update(id: string, dto: UpdateDocumentDto) {
    // const documentDB = await this.docRepository.findOne({
    //   where: { id },
    //   relations: { section: true, type: true, subtype: true },
    // });
    // if (!documentDB) {
    //   throw new NotFoundException(`Document ${id} not found`);
    // }
    // const oldFileName = documentDB.fileName;
    // const fileChanged = dto.fileName && dto.fileName !== oldFileName;
    // try {
    //   if (fileChanged) {
    //     await this.fileService.finalizeFile(dto.fileName!, FileGroup.INSTITUTIONAL_DOCUMENTS);
    //   }
    //   // ** “Nunca apuntes la BD a un archivo que aún no existe”.
    //   this.docRepository.merge(documentDB, dto);
    //   const updatedDocument = await this.docRepository.save(documentDB);
    //   if (fileChanged) {
    //     await this.fileService.deleteFile(oldFileName, FileGroup.INSTITUTIONAL_DOCUMENTS);
    //   }
    //   return updatedDocument;
    // } catch (error) {
    //   if (fileChanged) {
    //     await this.fileService.deleteFile(dto.fileName!, FileGroup.INSTITUTIONAL_DOCUMENTS);
    //   }
    //   throw error;
    // }
  }

  private async getValidDocumentProps(sectionId: string, typeId: number, subtypeId: number | undefined) {
    const section = await this.docSectionRepository.findOneBy({ id: sectionId });
    if (!section) {
      throw new BadRequestException(`Document section ${sectionId} not found`);
    }
    const type = await this.docTypeRepository.findOneBy({ id: typeId });
    if (!type) {
      throw new BadRequestException(`Document type ${typeId} not found`);
    }

    let subtype: DocumentSubtype | null = null;
    if (subtypeId) {
      subtype = await this.docSubtypeRepository.findOne({
        where: {
          id: subtypeId,
          type: { id: type.id },
        },
      });
      if (!subtype) {
        throw new BadRequestException(`Document subtype ${subtypeId} not found or does not belong to type ${typeId}`);
      }
    }
    return { section, type, ...(subtype && { subtype }) };
  }

  async filterDocuments(filter: FilterDocumentsDto) {
    // const { limit, offset, term, sectionId, typeId, subtypeId, fiscalYear, orderDirection } = filter;
    // const where: FindOptionsWhere<DocumentRecord> = {
    //   ...(term && { displayName: ILike(`%${term}%`) }),
    //   ...(sectionId && { section: { id: sectionId } }),
    //   ...(typeId && { type: { id: typeId } }),
    //   ...(subtypeId && { subtype: { id: subtypeId } }),
    //   ...(fiscalYear && { fiscalYear }),
    // };
    // const [documents, total] = await this.docRepository.findAndCount({
    //   where: where,
    //   order: {
    //     downloadCount: 'DESC',
    //     ...(orderDirection && { originalName: orderDirection }),
    //   },
    //   relations: { section: true, type: true, subtype: true },
    //   take: limit,
    //   skip: offset,
    // });
    // return { documents: documents.map((doc) => this.plainDocument(doc)), total };
  }

  async getMostDownloaded() {
    // const docs = await this.docRepository.find({
    //   relations: { section: true, type: true },
    //   order: { downloadCount: 'DESC' },
    //   take: 8,
    // });
    // return docs.map((doc) => this.plainDocument(doc));
  }

  async incrementDownloadCount(id: string, userIp: string) {
    // const cacheKey = `download:${id}:${userIp}`;
    // const alreadyCounted = await this.cacheManager.get<boolean>(cacheKey);
    // if (alreadyCounted) return { skipped: true, message: 'Too frequent' };
    // const doc = await this.docRepository.findOneBy({ id });
    // if (!doc) throw new NotFoundException(`Document ${id} not found - download count`);
    // doc.downloadCount++;
    // await this.docRepository.save(doc);
    // await this.cacheManager.set(cacheKey, true, 300000);
    // return { skippend: false, message: 'Document downloaded count updated', newCount: doc.downloadCount };
  }

  private plainDocument(item: DocumentRecord) {
    // const { fileName, ...pros } = item;
    // return {
    //   ...pros,
    //   fileName: this.fileService.buildFileUrl(fileName, FileGroup.INSTITUTIONAL_DOCUMENTS),
    // };
  }
}
