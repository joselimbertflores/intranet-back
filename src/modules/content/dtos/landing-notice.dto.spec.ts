import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateLandingNoticeDto } from './landing-notice.dto';

describe('CreateLandingNoticeDto', () => {
  it('sanitizes rich text, normalizes editor spaces and keeps allowed markup', async () => {
    const dto = plainToInstance(CreateLandingNoticeDto, {
      title: ' Aviso ',
      contentHtml:
        '<p class="lead">Hola&nbsp;<strong>equipo</strong><img src=x onerror=alert(1)></p><script>alert(1)</script>',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.title).toBe('Aviso');
    expect(dto.contentHtml).toBe('<p>Hola <strong>equipo</strong></p>');
  });

  it('converts editor-only empty markup to null', async () => {
    const dto = plainToInstance(CreateLandingNoticeDto, {
      title: 'Aviso',
      contentHtml: '<p>&nbsp;<br></p>',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.contentHtml).toBeNull();
  });

  it.each([
    'https://ejemplo.com',
    'http://ejemplo.com',
    '/comunicados',
    '/comunicados?year=2026',
    '/documentos?type=formularios',
  ])('accepts image link %s', async (imageLinkUrl) => {
    const dto = plainToInstance(CreateLandingNoticeDto, {
      title: 'Aviso',
      contentHtml: '<p>Contenido</p>',
      imageLinkUrl,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([
    'comunicados?year=2026',
    'documents',
    'www.google.com',
    '//google.com',
    'javascript:alert(1)',
    'data:text/html',
  ])('rejects image link %s', async (imageLinkUrl) => {
    const dto = plainToInstance(CreateLandingNoticeDto, {
      title: 'Aviso',
      contentHtml: '<p>Contenido</p>',
      imageLinkUrl,
    });

    const errors = await validate(dto);
    expect(errors.some(({ property }) => property === 'imageLinkUrl')).toBe(true);
  });
});
