jest.mock('../../content/services', () => ({
  HeroSlidesService: class HeroSlidesService {},
  QuickAccessesService: class QuickAccessesService {},
}));

import { PortalLandingService } from './portal-landing.service';

describe('PortalLandingService', () => {
  it('delegates landing content loading to ContentModule', async () => {
    const heroSlides = [
      {
        id: 1,
        title: 'Bienvenidos',
        description: null,
        linkLabel: null,
        linkUrl: null,
        imageFileId: '8d8b8eb4-565d-49a8-b6f4-822c24d3550d',
        imageUrl: 'https://intranet.test/api/files/8d8b8eb4-565d-49a8-b6f4-822c24d3550d',
        sortOrder: 1,
      },
    ];
    const heroSlidesService = {
      findActive: jest.fn().mockResolvedValue(heroSlides),
    };
    const quickAccesses = [
      {
        id: 2,
        title: 'Correo',
        description: 'Correo institucional',
        iconKey: 'mail',
        url: 'https://mail.example.com',
        sortOrder: 1,
      },
    ];
    const quickAccessesService = {
      findLanding: jest.fn().mockResolvedValue(quickAccesses),
    };
    const service = new PortalLandingService(
      heroSlidesService as never,
      quickAccessesService as never,
    );

    await expect(service.getLanding()).resolves.toEqual({ heroSlides, quickAccesses });
    expect(heroSlidesService.findActive).toHaveBeenCalledTimes(1);
    expect(quickAccessesService.findLanding).toHaveBeenCalledTimes(1);
  });
});
