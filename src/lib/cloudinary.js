import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'q7pax8nl',
  api_key: process.env.CLOUDINARY_API_KEY || '741439941482299',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'Edb1sCCzmPLi50hwQVCGlne2OYw',
  secure: true,
});

export default cloudinary;
