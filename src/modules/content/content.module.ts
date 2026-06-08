import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BannerController, QuickAccessController } from './controllers';
import { BannerService, QuickAccessItemService } from './services';
import { Banner, QuickAccessItem } from './entities';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([Banner, QuickAccessItem]), FilesModule],
  controllers: [BannerController, QuickAccessController],
  providers: [BannerService, QuickAccessItemService],
  exports: [BannerService, QuickAccessItemService],
})
export class ContentModule {}
