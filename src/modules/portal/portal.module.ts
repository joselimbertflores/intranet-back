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
  PortalCalendarController,
  PortalLandingController,
} from './controllers';
import { PortalLandingService } from './services';
import { TutorialModule } from '../tutorial/tutorial.module';
import { DirectoryModule } from '../directory/directory.module';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  controllers: [
    PortalController,
    PortalLandingController,
    PortalCalendarController,
    PortalCommunicationsController,
    PortalAssistanceController,
    PortalDocumentsController,
    PortalDirectoryController,
  ],
  providers: [PortalLandingService],
  imports: [DocumentModule, ContentModule, CommunicationsModule, DirectoryModule, TutorialModule, CalendarModule],
})
export class PortalModule {}
