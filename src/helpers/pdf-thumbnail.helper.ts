import { pdfToPng } from 'pdf-to-png-converter';
import * as fs from 'fs/promises';
import * as path from 'path';

export const generatePdfThumbnail = async (pdfPath: string, outputDir: string): Promise<string | null> => {
  try {
    await fs.mkdir(outputDir, { recursive: true });

    const baseName = path.basename(pdfPath, '.pdf');

    const previewName = `${baseName}-preview.png`;

    const outputPath = path.join(outputDir, previewName);

    const images = await pdfToPng(pdfPath, {
      pagesToProcess: [1],
      viewportScale: 0.7,
      outputFolder: outputDir,
    });

    if (!images[0]?.content) {
      return null;
    }

    await fs.writeFile(outputPath, images[0].content);
    return previewName;
  } catch (err) {
    return null;
  }
};
