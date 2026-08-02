import { BadRequestException } from '@nestjs/common';

export class TutorialVideoHelper {
  static normalizeContent(input: string): string {
    return `youtube:${this.extractYoutubeId(input)}`;
  }

  static toEmbedUrl(content?: string | null): string | null {
    if (!content) return null;
    return `https://www.youtube.com/embed/${this.extractNormalizedYoutubeId(content)}`;
  }

  private static extractYoutubeId(input: string): string {
    const trimmed = input.trim();

    if (this.isValidYoutubeId(trimmed)) return trimmed;
    if (trimmed.startsWith('youtube:')) return this.extractNormalizedYoutubeId(trimmed);

    try {
      const url = new URL(trimmed);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Unsupported YouTube URL protocol');
      }
      const host = url.hostname.toLowerCase();
      let candidate: string | null = null;

      if (host === 'youtu.be' || host === 'www.youtu.be') {
        const segments = url.pathname.split('/').filter(Boolean);
        if (segments.length === 1) candidate = segments[0];
      } else if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com') {
        const segments = url.pathname.split('/').filter(Boolean);

        if (url.pathname === '/watch') {
          candidate = url.searchParams.get('v');
        } else if (segments.length === 2 && (segments[0] === 'embed' || segments[0] === 'shorts')) {
          candidate = segments[1];
        }
      }

      if (candidate && this.isValidYoutubeId(candidate)) return candidate;
    } catch {
      // Use the same functional error for malformed URLs and invalid IDs.
    }

    throw new BadRequestException('Invalid YouTube URL or video ID');
  }

  private static extractNormalizedYoutubeId(content: string): string {
    const match = /^youtube:([a-zA-Z0-9_-]{11})$/.exec(content.trim());
    if (!match) throw new BadRequestException('Invalid YouTube URL or video ID');
    return match[1];
  }

  private static isValidYoutubeId(value: string): boolean {
    return /^[a-zA-Z0-9_-]{11}$/.test(value);
  }
}
