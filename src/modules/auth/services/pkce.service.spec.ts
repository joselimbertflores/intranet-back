import { PkceService } from './pkce.service';

describe('PkceService', () => {
  const service = new PkceService();

  it('generates a PKCE verifier with allowed characters and length', () => {
    const verifier = service.generateCodeVerifier();

    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(verifier).toMatch(/^[A-Za-z0-9._~-]+$/);
  });

  it('builds an S256 code challenge from the verifier', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';

    expect(service.buildCodeChallenge(verifier)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
});
