const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function mergePDFs(pdfPaths, outputPath) {
  const mergedPdf = await PDFDocument.create();

  for (const pdfPath of pdfPaths) {
    const existingPdf = await PDFDocument.load(fs.readFileSync(pdfPath));
    const copiedPages = await mergedPdf.copyPages(existingPdf, existingPdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const pdfBytes = await mergedPdf.save();
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`Merged PDF saved to ${outputPath}`);
}

// Example usage:
mergePDFs(['file1.pdf', 'file2.pdf'], 'merged.pdf');
