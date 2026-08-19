import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DirectoryController } from './directory.controller';
import { DirectoryEntriesService } from './services/directory-entries.service';
import { DirectoryEntry, DirectorySite } from './entities';
import { PublicDirectoryService } from './services/public-directory.service';
import { DirectorySitesService } from './services';
import { RrhhDirectoryService } from './services/rrhh-directory.service';

@Module({
  imports: [TypeOrmModule.forFeature([DirectoryEntry, DirectorySite])],
  controllers: [DirectoryController],
  providers: [DirectoryEntriesService, PublicDirectoryService, DirectorySitesService, RrhhDirectoryService],
  exports: [PublicDirectoryService, RrhhDirectoryService],
})
export class DirectoryModule {}
