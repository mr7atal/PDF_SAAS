const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib'); // Correct library for page extraction
const pdfParse = require('pdf-parse');

const app = express();
const port = 3000;

// Set up static files (for HTML and CSS)
app.use(express.static('public'));

// Middleware for parsing URL-encoded data and multipart form data (file uploads)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Ensure the uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Route for the homepage (index)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route for PDF merge
app.get('/merge', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'merge.html'));
});

// Route for PDF extract
app.get('/extract', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'extract.html'));
});

// Route to handle PDF merge
app.post('/merge', upload.array('pdfs', 2), async (req, res) => {
  try {
    const pdf1 = req.files[0];
    const pdf2 = req.files[1];

    const pdfDoc1 = await PDFDocument.load(fs.readFileSync(pdf1.path));
    const pdfDoc2 = await PDFDocument.load(fs.readFileSync(pdf2.path));

    // Create a new document and add pages from both PDFs
    const mergedDoc = await PDFDocument.create();
    const copiedPages1 = await mergedDoc.copyPages(pdfDoc1, pdfDoc1.getPages().map((_, i) => i));
    const copiedPages2 = await mergedDoc.copyPages(pdfDoc2, pdfDoc2.getPages().map((_, i) => i));

    // Add pages to merged document
    copiedPages1.forEach((page) => mergedDoc.addPage(page));
    copiedPages2.forEach((page) => mergedDoc.addPage(page));

    // Save the merged PDF
    const mergedPdfBytes = await mergedDoc.save();

    // Write the merged PDF to a file
    const outputPath = path.join('uploads', 'merged.pdf');
    fs.writeFileSync(outputPath, mergedPdfBytes);

    // Provide the download link
    res.send(`
      <h3>PDF Merged Successfully!</h3>
      <a href="/uploads/merged.pdf" download>Download the merged PDF</a>
    `);
  } catch (error) {
    res.status(500).send('Error merging PDFs.');
  }
});

// Route to handle PDF extraction
app.post('/extract', upload.single('pdf'), async (req, res) => {
  try {
    const uploadedPdf = req.file;
    const pagesToExtract = req.body.pages.split(',').map(Number); // Extract pages like "1,3,5"

    const pdfBuffer = fs.readFileSync(uploadedPdf.path);
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    const totalPages = pdfDoc.getPages().length;

    // Validate pages to extract
    const validPages = pagesToExtract.filter((pageNum) => pageNum > 0 && pageNum <= totalPages);

    if (validPages.length === 0) {
      return res.status(400).send('No valid pages selected.');
    }

    // Create a new PDF document for the extracted pages
    const extractedPdf = await PDFDocument.create();
    for (const pageNum of validPages) {
      const page = pdfDoc.getPages()[pageNum - 1]; // pages in pdf-lib are 0-indexed
      // Copy the page from the original document
      const copiedPage = await extractedPdf.copyPages(pdfDoc, [pageNum - 1]);
      // Add the copied page to the new document
      extractedPdf.addPage(copiedPage[0]);
    }

    const extractedPdfBytes = await extractedPdf.save();
    const outputPath = path.join('uploads', 'extracted.pdf');
    fs.writeFileSync(outputPath, extractedPdfBytes);

    // Provide the download link
    res.send(`
      <h3>PDF Pages Extracted Successfully!</h3>
      <a href="/uploads/extracted.pdf" download>Download the extracted PDF</a>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error extracting pages from the PDF.');
  }
});

// Serve uploaded files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
