import { pdfToPng } from 'pdf-to-png-converter';

export const generatePdfPreview = async (pdfPath: string): Promise<Buffer | null> => {
  try {
    const [page] = await pdfToPng(pdfPath, {
      pagesToProcess: [1],
      disableFontFace: true,
      viewportScale: 1.5,
      outputFolder: undefined,
    });
    if (!page?.content) return null;
    return page.content;
  } catch (err) {
    console.error(`Error generating preview for ${pdfPath}: ${err}`);
    return null;
  }
};
