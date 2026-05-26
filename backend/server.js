const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = 5000;

// CORS configuration for Vercel
app.use(cors({
  origin: ['https://email-sender-mauve-iota.vercel.app'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Multer memory storage for Vercel (read-only filesystem)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes('sheet') ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
    }
  }
});

// Hardcoded SMTP credentials
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'msddiru@gmail.com',
    pass: 'pynivynegybmnyhn'
  }
};

// Email regex pattern
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Function to extract valid emails from all cells in the workbook
function extractEmailsFromExcel(workbook) {
  const emails = new Set();

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    data.forEach(row => {
      if (Array.isArray(row)) {
        row.forEach(cell => {
          if (cell && typeof cell === 'string') {
            const trimmed = cell.trim();
            if (EMAIL_REGEX.test(trimmed)) {
              emails.add(trimmed.toLowerCase());
            }
          } else if (cell && typeof cell === 'number') {
            const cellStr = String(cell);
            if (EMAIL_REGEX.test(cellStr)) {
              emails.add(cellStr.toLowerCase());
            }
          }
        });
      }
    });
  });

  return Array.from(emails).sort();
}

// Create email transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: SMTP_CONFIG.host,
    port: SMTP_CONFIG.port,
    secure: SMTP_CONFIG.secure,
    auth: {
      user: SMTP_CONFIG.auth.user,
      pass: SMTP_CONFIG.auth.pass
    }
  });
}

// Route: Upload Excel file and extract emails
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read from memory buffer (Vercel compatible)
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const emails = extractEmailsFromExcel(workbook);

    res.json({
      success: true,
      emails: emails,
      count: emails.length
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: error.message || 'Failed to process file' });
  }
});

// Route: Send emails to extracted addresses
app.post('/api/send', async (req, res) => {
  const { emails, subject, body } = req.body;

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: 'No email addresses provided' });
  }

  if (!subject || !body) {
    return res.status(400).json({ error: 'Subject and body are required' });
  }

  try {
    const transporter = createTransporter();

    // Verify SMTP connection
    await transporter.verify();

    const mailOptions = {
      from: SMTP_CONFIG.auth.user,
      subject: subject,
      text: body,
      html: `<p>${body.replace(/\n/g, '<br>')}</p>`
    };

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Send emails to all recipients
    for (const email of emails) {
      try {
        await transporter.sendMail({
          ...mailOptions,
          to: email
        });
        results.push({ email, status: 'success' });
        successCount++;
      } catch (error) {
        results.push({ email, status: 'failed', error: error.message });
        failCount++;
      }
    }

    res.json({
      success: true,
      totalSent: successCount,
      failed: failCount,
      results: results
    });
  } catch (error) {
    console.error('Error sending emails:', error);
    res.status(500).json({ error: error.message || 'Failed to send emails' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: error.message });
  } else if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

// Vercel serverless handler
module.exports = app;