import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HeroSlideController, QuickAccessController } from './controllers';
import { BannerService, QuickAccessItemService } from './services';
import { Banner, QuickAccessItem } from './entities';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([Banner, QuickAccessItem]), FilesModule],
  controllers: [HeroSlideController, QuickAccessController],
  providers: [BannerService, QuickAccessItemService],
  exports: [BannerService, QuickAccessItemService],
})
export class ContentModule {}
