import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { DocumentModule } from '../documents/document.module';
import { ContentModule } from '../content/content.module';
import { CommunicationsModule } from '../communications/communications.module';
import { PortalAssistanceController, PortalCommunicationsController, PortalDocumentsController } from './controllers';
import { AssistanceModule } from '../learning/learning.module';

@Module({
  controllers: [
    PortalController,
    PortalCommunicationsController,
    PortalAssistanceController,
    PortalDocumentsController,
  ],
  imports: [DocumentModule, ContentModule, CommunicationsModule, AssistanceModule],
})
export class PortalModule {}
