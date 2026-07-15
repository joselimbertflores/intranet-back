import { Controller, Get, Query } from '@nestjs/common';
import { Public } from 'src/modules/auth/decorators';
import { PublicDirectoryService } from 'src/modules/directory/public-directory.service';
import { DirectorySearchDto } from 'src/modules/directory/dtos';

@Public()
@Controller('portal-directory')
export class PortalDirectoryController {
  constructor(private readonly publicDirectoryService: PublicDirectoryService) {}

  @Get()
  findAll(@Query() query: DirectorySearchDto) {
    return this.publicDirectoryService.findAll(query);
  }

  @Get('sites')
  findSites() {
    return this.publicDirectoryService.findSites();
  }
}
