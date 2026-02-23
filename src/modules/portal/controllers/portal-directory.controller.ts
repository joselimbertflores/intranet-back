import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/modules/auth/decorators';
import { DirectoryService } from 'src/modules/directory/directory.service';

@Public()
@Controller('portal-directory')
export class PortalDirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get()
  findAll() {
    return this.directoryService.getTree();
  }
}
