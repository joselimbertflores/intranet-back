import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/modules/auth/decorators';
import { PublicDirectoryService } from 'src/modules/directory/public-directory.service';

@Public()
@Controller('portal-directory')
export class PortalDirectoryController {
  constructor(private readonly publicDirectoryService: PublicDirectoryService) {}

  @Get()
  findAll() {
    return this.publicDirectoryService.findAll();
  }
}
