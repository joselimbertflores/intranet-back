import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DirectoryController } from './directory.controller';
import { DirectoryEntriesService } from './directory-entries.service';
import { DirectorySitesService } from './directory-sites.service';
import { DirectoryEntry, DirectorySite } from './entities';
import { PublicDirectoryService } from './public-directory.service';

@Module({
  imports: [TypeOrmModule.forFeature([DirectoryEntry, DirectorySite])],
  controllers: [DirectoryController],
  providers: [DirectoryEntriesService, DirectorySitesService, PublicDirectoryService],
  exports: [PublicDirectoryService],
})
export class DirectoryModule {}
