import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';

import { FindOptionsWhere, ILike, Repository } from 'typeorm';

import { InstitutionalDocument, DocumentSection, InstitutionalDocumentType, DocumentSubType } from '../entities';
import { CreateDocumentsDto, FilterDocumentsDto, NewFilterDocumentsDto, UpdateDocumentDto } from '../dtos';
import { FilesService } from 'src/modules/files/files.service';
import { FileGroup } from 'src/modules/files/file-group.enum';
import { User } from 'src/modules/users/entities';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(InstitutionalDocumentType) private docTypeRepository: Repository<InstitutionalDocumentType>,
    @InjectRepository(InstitutionalDocument) private docRepository: Repository<InstitutionalDocument>,
    @InjectRepository(DocumentSection) private docSectionRepository: Repository<DocumentSection>,
    @InjectRepository(DocumentSubType) private docSubtypeRepository: Repository<DocumentSubType>,
    private fileService: FilesService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll(filterParamsDto: NewFilterDocumentsDto, authUser: User) {
    const { limit, offset, term, fiscalYear, sectionId, typeId, subtypeId } = filterParamsDto;
    const where: FindOptionsWhere<InstitutionalDocument> = {
      createdBy: { id: authUser.id },
      ...(term && { displayName: ILike(`%${term}%`) }),
      ...(fiscalYear && { fiscalYear }),
      ...(sectionId && { section: { id: sectionId } }),
      ...(typeId && { type: { id: typeId } }),
      ...(subtypeId && { subtype: { id: subtypeId } }),
    };
    const [documents, total] = await this.docRepository.findAndCount({
      where,
      relations: { section: true, type: true, subtype: true },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { documents, total };
  }

  async create(dto: CreateDocumentsDto, authUser: User) {
    const { documents, sectionId, typeId, subtypeId, fiscalYear } = dto;
    const currentYear = new Date().getFullYear();
    const { section, type, subtype } = await this.getValidDocumentProps(sectionId, typeId, subtypeId);

    const fileNames = documents.map((doc) => doc.fileName);
    await this.fileService.confirmFiles(fileNames, FileGroup.INSTITUTIONAL_DOCUMENTS);

    const moodels = documents.map((doc) =>
      this.docRepository.create({
        ...doc,
        section,
        type,
        ...(subtype && { subtype }),
        fiscalYear: fiscalYear ?? currentYear,
        createdBy: authUser,
      }),
    );
    const result = await this.docRepository.save(moodels);

    return result;
  }

  async update(id: string, dto: UpdateDocumentDto) {
    const documentDB = await this.docRepository.findOne({
      where: { id },
      relations: { section: true, type: true, subtype: true },
    });
    if (!documentDB) {
      throw new NotFoundException(`Document ${id} not found`);
    }
    const fileChanged = dto.fileName && dto.fileName !== documentDB.fileName;

    if (fileChanged) {
      await this.fileService.confirmFile(dto.fileName!, FileGroup.INSTITUTIONAL_DOCUMENTS);
    }
    // ** “Nunca apuntes la BD a un archivo que aún no existe”.
    this.docRepository.merge(documentDB, dto);
    const updatedDocument = await this.docRepository.save(documentDB);

    if (fileChanged) {
      await this.fileService.deleteFile(documentDB.fileName, FileGroup.INSTITUTIONAL_DOCUMENTS);
    }

    return updatedDocument;
  }

  private async getValidDocumentProps(sectionId: number, typeId: number, subtypeId: number | undefined) {
    const section = await this.docSectionRepository.findOneBy({ id: sectionId });
    if (!section) {
      throw new BadRequestException(`Document section ${sectionId} not found`);
    }
    const type = await this.docTypeRepository.findOneBy({ id: typeId, sections: { id: section.id } });
    if (!type) {
      throw new BadRequestException(`Document type ${typeId} is not available for section ${sectionId}`);
    }

    let subtype: DocumentSubType | null = null;
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
    // const { limit, offset, term, categoryId, sectionId, fiscalYear, orderDirection } = filter;
    // const where: FindOptionsWhere<InstitutionalDocument> = {
    //   ...(term && { originalName: ILike(`%${term}%`) }),
    //   ...(categoryId && { sectionCategory: { category: { id: categoryId } } }),
    //   ...(sectionId && { sectionCategory: { section: { id: sectionId } } }),
    //   ...(fiscalYear && { fiscalYear }),
    // };
    // const [documents, total] = await this.docRepository.findAndCount({
    //   where: where,
    //   order: {
    //     downloadCount: 'DESC',
    //     ...(orderDirection && { originalName: orderDirection }),
    //   },
    //   // relations: { sectionCategory: { category: true } },
    //   take: limit,
    //   skip: offset,
    // });
    // return { documents: documents.map((doc) => this.plainDocument(doc)), total };
  }

  async getMostDownloaded() {
    const docs = await this.docRepository.find({
      // relations: { sectionCategory: { category: true, section: true } },
      order: { downloadCount: 'DESC' },
      take: 8,
    });
    // return docs.map((doc) => this.plainDocument(doc));
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
}
