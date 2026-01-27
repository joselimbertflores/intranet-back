import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { DocumentModule } from '../documents/document.module';
import { ContentModule } from '../content/content.module';
import { CommunicationsModule } from '../communications/communications.module';
import { PortalCommunicationsController } from './controllers';
import { AssistanceModule } from '../learning/learning.module';
import { PortalAssistanceController } from './controllers/portal-assistance.controller';

@Module({
  controllers: [PortalController, PortalCommunicationsController, PortalAssistanceController],
  imports: [DocumentModule, ContentModule, CommunicationsModule, AssistanceModule],
})
export class PortalModule {}
