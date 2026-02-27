import { Module } from '@nestjs/common';

import { CommunicationsModule } from '../communications/communications.module';
import { DocumentModule } from '../documents/document.module';
import { ContentModule } from '../content/content.module';
import {
  PortalCommunicationsController,
  PortalAssistanceController,
  PortalDocumentsController,
  PortalDirectoryController,
  PortalController,
} from './controllers';
import { TutorialModule } from '../tutorial/tutorial.module';
import { DirectoryModule } from '../directory/directory.module';

@Module({
  controllers: [
    PortalController,
    PortalCommunicationsController,
    PortalAssistanceController,
    PortalDocumentsController,
    PortalDirectoryController,
  ],
  imports: [DocumentModule, ContentModule, CommunicationsModule, DirectoryModule, TutorialModule],
})
export class PortalModule {}
