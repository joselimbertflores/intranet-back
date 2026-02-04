import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DirectoryService } from './directory.service';
import { DirectoryController } from './directory.controller';
import { DirectoryContact, DirectorySection } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([DirectorySection, DirectoryContact])],
  controllers: [DirectoryController],
  providers: [DirectoryService],
})
export class DirectoryModule {}
