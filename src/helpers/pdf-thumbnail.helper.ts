import { pdfToPng } from 'pdf-to-png-converter';

export const generatePdfPreview = async (pdfPath: string): Promise<Buffer | null> => {
  const [page] = await pdfToPng(pdfPath, {
    pagesToProcess: [1],
    disableFontFace: true,
    viewportScale: 1.25,
    outputFolder: undefined,
  });
  return page?.content ?? null;
};
