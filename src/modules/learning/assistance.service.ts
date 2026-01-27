import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, In, Repository } from 'typeorm';

import slugify from 'slugify';

import { CreateTutorialDto, UpdateTutorialDto } from './dtos/tutorial.dto';
import { Tutorial, TutorialVideo } from './entities';
import { FilesService } from '../files/files.service';
import { FileGroup } from '../files/file-group.enum';
import { PaginationParamsDto } from '../common';

@Injectable()
export class AssistanceService {
  constructor(
    @InjectRepository(Tutorial) private tutorialRepository: Repository<Tutorial>,
    @InjectRepository(TutorialVideo) private videoRepository: Repository<TutorialVideo>,
    private fileService: FilesService,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreateTutorialDto) {
    const { videos, ...props } = dto;

    const model = this.tutorialRepository.create({
      ...props,
      videos: videos.map((video) => this.videoRepository.create(video)),
    });

    const tutorial = await this.tutorialRepository.save(model);

    return this.plainTutorial(tutorial);
  }

  async update(id: string, dto: UpdateTutorialDto) {
    const tutorial = await this.tutorialRepository.findOneBy({ id });

    if (!tutorial) throw new BadRequestException(`Ttorial ${id} not found`);

    const { videos, ...toUpdate } = dto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (videos) {
        await queryRunner.manager.delete(TutorialVideo, { tutorial: { id } });
        tutorial.videos = videos.map((video) => this.videoRepository.create(video));
      }
      const updatedTutorial = this.tutorialRepository.merge(tutorial, toUpdate);
      await queryRunner.manager.save(tutorial);
      await queryRunner.commitTransaction();
      return this.plainTutorial(tutorial);
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(`Failed to update tutorial ${id}`);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll({ term, limit, offset }: PaginationParamsDto) {
    const [tutorials, total] = await this.tutorialRepository.findAndCount({
      ...(term && { where: { title: ILike(`%${term}%`) } }),
      take: limit,
      skip: offset,
    });
    return { tutorials: tutorials.map((item) => this.plainTutorial(item)), total };
  }

  async findBySlug(slug: string) {
    const tutorail = await this.tutorialRepository.findOne({ where: { slug } });
    if (!tutorail) throw new NotFoundException(`Tutorail with ${slug} not found`);
    return this.plainTutorial(tutorail);
  }

  private plainTutorial(tutorial: Tutorial) {
    const { videos, image, ...rest } = tutorial;
    return {
      imageUrl: image ? this.fileService.buildFileUrl(image, FileGroup.ASSISTANCE) : null,
      videos: videos.map(({ fileName, ...proos }) => ({
        ...proos,
        fileUrl: this.fileService.buildFileUrl(fileName, FileGroup.ASSISTANCE),
      })),
      ...rest,
    };
  }
}
