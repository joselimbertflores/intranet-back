import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DirectoryService } from './directory.service';
import { DirectoryController } from './directory.controller';
import { DirectoryEntry, DirectorySite } from './entities';
import { PublicDirectoryService } from './public-directory.service';

@Module({
  imports: [TypeOrmModule.forFeature([DirectoryEntry, DirectorySite])],
  controllers: [DirectoryController],
  providers: [DirectoryService, PublicDirectoryService],
  exports: [PublicDirectoryService],
})
export class DirectoryModule {}
