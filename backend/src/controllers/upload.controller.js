import multer from 'multer';
import cloudinary from '../lib/cloudinary.js';
import User from '../models/user.model.js';

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
      const userId = req.user._id;
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'raw',
            folder: 'krishisetu/documents',
            public_id: `${userId}/${req.file.originalname}-${Date.now()}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $push: { documents: result.secure_url },
        },
        { new: true }
      ).select('-password');

      if (!updatedUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Document uploaded successfully',
        user: {
          _id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          phoneNo: updatedUser.phoneNo,
          role: updatedUser.role,
          gender: updatedUser.gender,
          profilePic: updatedUser.profilePic,
          dob: updatedUser.dob,
          age: updatedUser.age,
          location: updatedUser.location,
          governmentId: updatedUser.governmentId,
          languageSpoken: updatedUser.languageSpoken,
          bio: updatedUser.bio,
          socialLinks: updatedUser.socialLinks,
          documents: updatedUser.documents,
          isVerified: updatedUser.isVerified,
        },
      });
    } catch (err) {
      console.error('Error in uploadDoc:', err);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  });
};