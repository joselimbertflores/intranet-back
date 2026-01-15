import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { ILike, Repository, DataSource, FindOptionsWhere } from 'typeorm';

import { InstitutionalDocument, DocumentSection } from '../entities';
import { CreateDocumentsDto, FilterDocumentsDto } from '../dtos';
import { FilesService } from 'src/modules/files/files.service';
import { FileGroup } from 'src/modules/files/file-group.enum';
import { PaginationDto } from 'src/modules/common';

@Injectable()
export class DocumentService {
  constructor(
    private dataSource: DataSource,
    private fileService: FilesService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    // @InjectRepository(SectionCategory) private sectionCategoryRep: Repository<SectionCategory>,
    @InjectRepository(InstitutionalDocument) private docRepository: Repository<InstitutionalDocument>,
  ) {}

  async getDocumentsToManage({ term, limit, offset }: PaginationDto) {
    // const [items, total] = await this.sectionCategoryRep.findAndCount({
    //   ...(term && {
    //     where: { documents: { originalName: ILike(`%${term}%`) } },
    //   }),
    //   // TODO filter by user id
    //   relations: { documents: true, section: true, category: true },
    //   order: { documents: { createdAt: 'DESC' } },
    //   take: limit,
    //   skip: offset,
    // });
    // return { items, total };
  }

  async syncDocuments(relationId: number, docsDto: CreateDocumentsDto) {
    // const { documents } = docsDto;
    // const sectionCategory = await this.sectionCategoryRep.findOne({
    //   where: { id: relationId },
    //   relations: { category: true, section: true, documents: true },
    // });

    // if (!sectionCategory) {
    //   throw new BadRequestException(`Relation ${relationId} not found`);
    // }

    // const queryRunner = this.dataSource.createQueryRunner();
    // await queryRunner.connect();
    // await queryRunner.startTransaction();

    // try {
    //   const existingDocs = sectionCategory.documents;

    //   const newIds = documents.filter((d) => d.id).map((d) => d.id);

    //   const validIds = newIds.filter((id) => existingDocs.some((doc) => doc.id === id));

    //   const toDelete = existingDocs.filter((doc) => !validIds.includes(doc.id));
    //   if (toDelete.length) {
    //     await queryRunner.manager.remove(toDelete);
    //   }

    //   const toSave = documents.map((doc) =>
    //     queryRunner.manager.create(Document, {
    //       ...doc,
    //       sectionCategory,
    //     }),
    //   );

    //   const result = await queryRunner.manager.save(toSave);

    //   await queryRunner.commitTransaction();

    //   return { ...sectionCategory, documents: result };
    // } catch (error: unknown) {
    //   await queryRunner.rollbackTransaction();
    //   throw new InternalServerErrorException(`Failed create documents`);
    // } finally {
    //   await queryRunner.release();
    // }
  }

  async filterDocuments(filter: FilterDocumentsDto) {
    const { limit, offset, term, categoryId, sectionId, fiscalYear, orderDirection } = filter;

    const where: FindOptionsWhere<InstitutionalDocument> = {
      ...(term && { originalName: ILike(`%${term}%`) }),
      ...(categoryId && { sectionCategory: { category: { id: categoryId } } }),
      ...(sectionId && { sectionCategory: { section: { id: sectionId } } }),
      ...(fiscalYear && { fiscalYear }),
    };

    const [documents, total] = await this.docRepository.findAndCount({
      where: where,
      order: {
        downloadCount: 'DESC',
        ...(orderDirection && { originalName: orderDirection }),
      },
      // relations: { sectionCategory: { category: true } },
      take: limit,
      skip: offset,
    });
    return { documents: documents.map((doc) => this.plainDocument(doc)), total };
  }

  async getMostDownloaded() {
    const docs = await this.docRepository.find({
      // relations: { sectionCategory: { category: true, section: true } },
      order: { downloadCount: 'DESC' },
      take: 8,
    });
    return docs.map((doc) => this.plainDocument(doc));
  }

  async incrementDownloadCount(id: string, userIp: string) {
    const cacheKey = `download:${id}:${userIp}`;

    const alreadyCounted = await this.cacheManager.get<boolean>(cacheKey);

    if (alreadyCounted) return { skipped: true, message: 'Too frequent' };

    const doc = await this.docRepository.findOneBy({ id });
    if (!doc) throw new NotFoundException(`Document ${id} not found - download count`);

    doc.downloadCount++;

    await this.docRepository.save(doc);

    await this.cacheManager.set(cacheKey, true, 300000);

    return { skippend: false, message: 'Document downloaded count updated', newCount: doc.downloadCount };
  }

  private plainDocument(doc: InstitutionalDocument) {
    const { fileName, ...properties } = doc;
    return {
      ...properties,
      fileName: this.fileService.buildFileUrl(fileName, FileGroup.DOCUMENTIS),
    };
  }
}
