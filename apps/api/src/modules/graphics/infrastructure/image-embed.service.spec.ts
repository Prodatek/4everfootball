import { ImageEmbedService } from './image-embed.service';

describe('ImageEmbedService', () => {
  let service: ImageEmbedService;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    service = new ImageEmbedService();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('embed', () => {
    it('returns null for a null/undefined url without fetching', async () => {
      await expect(service.embed(null)).resolves.toBeNull();
      await expect(service.embed(undefined)).resolves.toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns a base64 data URI for a successful image fetch', async () => {
      const bytes = Buffer.from('fake-png-bytes');
      fetchSpy.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'image/png' }),
        arrayBuffer: async () =>
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ),
      } as Response);

      const result = await service.embed('https://example.com/logo.png');

      expect(result).toBe(`data:image/png;base64,${bytes.toString('base64')}`);
    });

    it('returns null when the response is not ok', async () => {
      fetchSpy.mockResolvedValue({ ok: false } as Response);
      await expect(
        service.embed('https://example.com/missing.png'),
      ).resolves.toBeNull();
    });

    it('returns null when the content-type is not an image', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
      } as Response);
      await expect(
        service.embed('https://example.com/not-an-image'),
      ).resolves.toBeNull();
    });

    it('returns null when the fetch throws or times out', async () => {
      fetchSpy.mockRejectedValue(new Error('network error'));
      await expect(
        service.embed('https://example.com/logo.png'),
      ).resolves.toBeNull();
    });

    it('returns null when the image exceeds the size cap', async () => {
      const huge = Buffer.alloc(4 * 1024 * 1024);
      fetchSpy.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'image/png' }),
        arrayBuffer: async () => huge.buffer,
      } as Response);
      await expect(
        service.embed('https://example.com/huge.png'),
      ).resolves.toBeNull();
    });
  });

  describe('prepare', () => {
    it('embeds every string field ending in "Url" under a sibling "DataUri" key', async () => {
      const bytes = Buffer.from('logo-bytes');
      fetchSpy.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'image/png' }),
        arrayBuffer: async () =>
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ),
      } as Response);

      const result = await service.prepare({
        homeTeamName: 'Ikorodu FC',
        homeLogoUrl: 'https://example.com/home.png',
      });

      expect(result.homeTeamName).toBe('Ikorodu FC');
      expect(result.homeLogoUrl).toBe('https://example.com/home.png');
      expect(result.homeLogoDataUri).toBe(
        `data:image/png;base64,${bytes.toString('base64')}`,
      );
    });

    it('sets DataUri to null for a null Url field rather than skipping it', async () => {
      const result = await service.prepare({ homeLogoUrl: null });
      expect(result.homeLogoDataUri).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('leaves fields that do not end in "Url" untouched', async () => {
      const result = await service.prepare({
        competitionName: 'Lagos Cup',
        minute: 45,
      });
      expect(result).toEqual({ competitionName: 'Lagos Cup', minute: 45 });
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
