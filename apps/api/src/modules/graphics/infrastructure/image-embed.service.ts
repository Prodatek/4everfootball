import { Injectable, Logger } from '@nestjs/common';

const FETCH_TIMEOUT_MS = 4_000;
// Plenty for a logo/photo, guards a render job against an accidentally huge
// upload turning into a giant base64 blob inside the SVG.
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

@Injectable()
export class ImageEmbedService {
  private readonly logger = new Logger(ImageEmbedService.name);

  /**
   * Fetches a remote image and returns it as a data: URI, or null on any
   * failure — satori has no network layer, so every <img src> it renders
   * must already be a data URI. A failure here just means the template
   * falls back to its initials badge (see domain/templates/layout.ts's
   * badge()), never a failed render.
   */
  async embed(url: string | null | undefined): Promise<string | null> {
    if (!url) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.startsWith('image/')) {
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > MAX_IMAGE_BYTES) {
        return null;
      }

      return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch (error) {
      this.logger.warn(
        `Failed to embed image ${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Generic convention, not a per-template manifest: any key in `data`
   * ending in "Url" with a string value gets fetched and embedded under a
   * sibling "...DataUri" key — e.g. homeLogoUrl -> homeLogoDataUri. Every
   * template's data shape (domain/templates/types.ts) opts into image
   * embedding just by naming its raw URL fields consistently.
   */
  async prepare(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const prepared: Record<string, unknown> = { ...data };
    const urlEntries = Object.entries(data).filter(
      (entry): entry is [string, string | null] =>
        entry[0].endsWith('Url') &&
        (typeof entry[1] === 'string' || entry[1] === null),
    );

    await Promise.all(
      urlEntries.map(async ([key, url]) => {
        const dataUriKey = `${key.slice(0, -'Url'.length)}DataUri`;
        prepared[dataUriKey] = await this.embed(url);
      }),
    );

    return prepared;
  }
}
