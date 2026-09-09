import multer from 'multer';
import cloudinary from '../lib/cloudinary.js';
import { getSql } from '../lib/db.js';
import { toUser } from '../lib/farmer.js';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed.'));
    }
  },
});

const uploadSingle = upload.single('document');

export const uploadDoc = async (req, res) => {
  uploadSingle(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err.message.includes('Only PDF')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      return res.status(400).json({ success: false, message: 'File upload error' });
    }

    try {
      const userId = req.user.neon_user_id;
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
      const header = req.file.buffer.subarray(0, 5).toString('utf8');
      if (!header.startsWith('%PDF')) {
        return res.status(400).json({ success: false, message: 'Only PDF files are allowed.' });
      }
      const safeName = String(req.file.originalname || 'document.pdf')
        .split(/[/\\]/)
        .pop()
        .replace(/[^\w.\-]/g, '_')
        .slice(0, 80) || 'document.pdf';

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'raw',
            folder: 'nila-shoshsho/documents',
            public_id: `${userId}/${safeName}-${Date.now()}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      const sql = getSql();
      const rows = await sql`
        UPDATE farmers
        SET documents = array_append(documents, ${result.secure_url}),
            updated_at = now()
        WHERE neon_user_id = ${userId}
        RETURNING *
      `;

      if (!rows[0]) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Document uploaded successfully',
        user: toUser(rows[0], req.accessToken),
      });
    } catch (err) {
      console.error('Error in uploadDoc:', err);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  });
};