
export type ParsedVideoContent = {
  id: string;
  provider: 'youtube';
  embedUrl: string;
};

export class TutorialVideoHelper {
  /**
   * Recibe lo que el admin pega (URL o ID)
   * Devuelve el content normalizado para DB: youtube:VIDEO_ID
   */
  static normalizeContent(input: string): string {
    const videoId = this.extractYoutubeId(input);
    return `youtube:${videoId}`;
  }

  /**
   * Recibe el content guardado en DB (youtube:VIDEO_ID)
   * Devuelve la URL embed lista para iframe
   */
  static toEmbedUrl(content?: string | null): string | null {
    if (!content) return null;

    const [provider, videoId] = content.split(':', 2);
    if (provider !== 'youtube' || !videoId) return null;

    return `https://www.youtube.com/embed/${videoId}`;
  }

  /**
   * Extrae el ID de YouTube desde URL o ID directo
   */
  private static extractYoutubeId(input: string): string {
    const trimmed = input.trim();

    // Si ya es un ID válido (11 chars)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    // Extraer desde URL
    const match = trimmed.match(/(?:youtube\.com\/.*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);


    console.log(match);

    if (!match) {
      throw new Error('Invalid YouTube URL');
    }

    return match[1];
  }
}
