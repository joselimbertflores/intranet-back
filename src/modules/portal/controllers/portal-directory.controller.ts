import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/modules/auth/decorators';
import { PublicDirectoryService } from 'src/modules/directory/services/public-directory.service';
import { RrhhDirectoryService } from 'src/modules/directory/services/rrhh-directory.service';

@Public()
@Controller('portal-directory')
export class PortalDirectoryController {
  constructor(
    private readonly publicDirectoryService: PublicDirectoryService,
    private readonly rrhhDirectoryService: RrhhDirectoryService,
  ) {}

  @Get()
  findAll() {
    return this.publicDirectoryService.findAll();
  }

  @Get('sites')
  findSites() {
    return this.publicDirectoryService.findSites();
  }

  @Get('authorities')
  getAuthorities() {
    return this.rrhhDirectoryService.getAuthorities();
  }
}
