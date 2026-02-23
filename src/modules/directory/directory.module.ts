import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DirectoryService } from './directory.service';
import { DirectoryController } from './directory.controller';
import { DirectoryEntry } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([DirectoryEntry])],
  controllers: [DirectoryController],
  providers: [DirectoryService],
  exports: [DirectoryService],
})
export class DirectoryModule {}
