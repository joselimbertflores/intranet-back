import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';

import {
  CreateDirectoryContactDto,
  CreateDirectorySectionDto,
  GetDirectoryContactsDto,
  GetDirectorySectionsDto,
  UpdateDirectoryContactDto,
  UpdateDirectorySectionDto,
} from './dtos';
import { DirectoryContact, DirectorySection } from './entities';

export class PublicDirectoryContactDto {
  id: string;
  title: string;
  internalPhone?: string | null;
  externalPhone?: string | null;
  order: number;
}

export class PublicDirectorySectionDto {
  id: string;
  name: string;
  order: number;
  contacts: PublicDirectoryContactDto[];
  children: PublicDirectorySectionDto[];
}

@Injectable()
export class DirectoryService {
  constructor(
    @InjectRepository(DirectorySection) private sectionRepository: Repository<DirectorySection>,
    @InjectRepository(DirectoryContact) private contactRepository: Repository<DirectoryContact>,
  ) {}

  async findSections({ limit, offset, term, isActive, parentId }: GetDirectorySectionsDto) {
    const where: FindOptionsWhere<DirectorySection> = {
      ...(term && { name: ILike(`%${term}%`) }),
      ...(typeof isActive === 'boolean' && { isActive }),
      ...(parentId && { parent: { id: parentId } }),
    };

    const [sections, total] = await this.sectionRepository.findAndCount({
      where,
      relations: { parent: true, children: true },
      order: { order: 'ASC', name: 'ASC' },
      take: limit,
      skip: offset,
    });

    return sections
  }

  getContacts(sectionId: string) {
    return this.contactRepository.find({
      where: { section: { id: sectionId } },
      relations: { section: true },
      order: { order: 'ASC', title: 'ASC' },
    });
  }

  async createSection(dto: CreateDirectorySectionDto) {
    const { parentId, ...props } = dto;

    let parent: DirectorySection | null = null;
    if (parentId) {
      parent = await this.sectionRepository.findOneBy({ id: parentId });
      if (!parent) throw new NotFoundException(`Directory section ${parentId} not found`);
    }

    const model = this.sectionRepository.create({
      ...props,
      ...(parentId && { parent }),
    });

    return this.sectionRepository.save(model);
  }

  async updateSection(id: string, dto: UpdateDirectorySectionDto) {
    const section = await this.sectionRepository.findOne({
      where: { id },
      relations: { parent: true },
    });

    if (!section) throw new NotFoundException(`Directory section ${id} not found`);

    const { parentId, ...toUpdate } = dto;

    if ('parentId' in dto) {
      if (parentId === id) throw new BadRequestException('Section cannot be its own parent');
      if (parentId === null) {
        section.parent = null;
      } else if (parentId) {
        const parent = await this.sectionRepository.findOneBy({ id: parentId });
        if (!parent) throw new NotFoundException(`Directory section ${parentId} not found`);
        section.parent = parent;
      }
    }

    this.sectionRepository.merge(section, toUpdate);
    return this.sectionRepository.save(section);
  }

  async findContacts({ limit, offset, term, isActive, sectionId }: GetDirectoryContactsDto) {
    const where: FindOptionsWhere<DirectoryContact> = {
      ...(term && { name: ILike(`%${term}%`) }),
      ...(typeof isActive === 'boolean' && { isActive }),
      ...(sectionId && { section: { id: sectionId } }),
    };

    const [contacts, total] = await this.contactRepository.findAndCount({
      where,
      relations: { section: true },
      order: { order: 'ASC', title: 'ASC' },
      take: limit,
      skip: offset,
    });

    return { contacts, total };
  }

  async createContact(dto: CreateDirectoryContactDto) {
    const { sectionId, ...props } = dto;

    const section = await this.sectionRepository.findOneBy({ id: sectionId });
    if (!section) throw new NotFoundException(`Directory section ${sectionId} not found`);

    const model = this.contactRepository.create({ ...props, section });
    console.log(model);
    return this.contactRepository.save(model);
  }

  async updateContact(id: string, dto: UpdateDirectoryContactDto) {
    const contact = await this.contactRepository.findOne({
      where: { id },
      relations: { section: true },
    });

    if (!contact) throw new NotFoundException(`Directory contact ${id} not found`);

    const { sectionId, ...toUpdate } = dto;

    if (sectionId) {
      const section = await this.sectionRepository.findOneBy({ id: sectionId });
      if (!section) throw new NotFoundException(`Directory section ${sectionId} not found`);
      contact.section = section;
    }

    this.contactRepository.merge(contact, toUpdate);
    return this.contactRepository.save(contact);
  }

  async getDirectoryTree(): Promise<PublicDirectorySectionDto[]> {
    const sections = await this.sectionRepository.find({
      where: { isActive: true },
      order: { order: 'ASC' },
    });

    const contacts = await this.contactRepository.find({
      where: { isActive: true },
      relations: { section: true },
      order: { order: 'ASC' },
    });

    const result= this.buildTree(sections, contacts);
    return result
  }

private buildTree(sections: DirectorySection[], contacts: DirectoryContact[]): PublicDirectorySectionDto[] {
  const sectionMap = new Map<string, PublicDirectorySectionDto>();

  for (const s of sections) {
    sectionMap.set(s.id, { id: s.id, name: s.name, order: s.order, contacts: [], children: [] });
  }

  for (const c of contacts) {
    const s = sectionMap.get(c.section.id);
    if (s) {
      s.contacts.push({
        id: c.id,
        title: c.title,
        internalPhone: c.internalPhone,
        externalPhone: c.externalPhone,
        order: c.order,
      });
    }
  }

  const roots: PublicDirectorySectionDto[] = [];

  for (const s of sections) {
    const dto = sectionMap.get(s.id)!;

    if (s.parentId) {
      sectionMap.get(s.parentId)?.children.push(dto);
    } else {
      roots.push(dto);
    }
  }

  // opcional: ordenar children/contacts recursivo
  const sortRec = (nodes: PublicDirectorySectionDto[]) => {
    nodes.sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
    for (const n of nodes) {
      n.contacts.sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
      sortRec(n.children);
    }
  };
  sortRec(roots);

  return roots;
}

}
