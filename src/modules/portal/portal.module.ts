import { Module } from '@nestjs/common';

import { CommunicationsModule } from '../communications/communications.module';
import { DocumentsModule } from '../documents/documents.module';
import { PortalContentModule } from '../portal-content/portal-content.module';
import {
  PortalCommunicationsController,
  PortalTutorialsController,
  PortalDocumentsController,
  PortalDirectoryController,
  PortalCalendarController,
  PortalLandingController,
} from './controllers';
import { PortalService } from './services';
import { TutorialModule } from '../tutorial/tutorial.module';
import { DirectoryModule } from '../directory/directory.module';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  controllers: [
    PortalLandingController,
    PortalCalendarController,
    PortalCommunicationsController,
    PortalTutorialsController,
    PortalDocumentsController,
    PortalDirectoryController,
  ],
  providers: [PortalService],
  imports: [
    DocumentsModule,
    PortalContentModule,
    CommunicationsModule,
    DirectoryModule,
    TutorialModule,
    CalendarModule,
  ],
})
export class PortalModule {}
