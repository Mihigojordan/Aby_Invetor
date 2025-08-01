import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import { diskStorage } from "multer";
import * as path from "path";
import * as fs from 'fs'
import { NotFoundException } from "@nestjs/common";

export const createUnifiedUploadConfig = (): MulterOptions => ({
  storage: diskStorage({
    destination: (req, file, cb) => {
      let subFolder: string | undefined;

      if (file.fieldname === 'imageurls') {
        subFolder = 'product_images';
      }else if (file.fieldname === 'profileImg') {
        subFolder = 'profile_images'; 
      }else if(file.fieldname === 'identityCard') {
        subFolder = 'identity_files_image'
      }else if(file.fieldname ===  'cv'){
        subFolder = 'cv_files'
      }

      console.log('Received file.fieldname:', file.fieldname);

      if (!subFolder) {
        const error = new Error(`Invalid upload field name: ${file.fieldname}`);
        return cb(error as Error, '' as any); // ✅ Fixed TS error
      }

    //  const uploadDir = path.join(__dirname, '..', '..', 'uploads', subFolder);
      const uploadDir = path.join(process.cwd(), 'uploads', subFolder); // Use process.cwd() for absolute path
      console.log('Uploading to:', uploadDir);

      try {
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (err) {
        cb(err as Error, '' as any); // ✅ Fixed TS error
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|pdf/;
    const isValidExt = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const isValidMime = allowedTypes.test(file.mimetype);

    if (!isValidExt || !isValidMime) {
      return cb(new Error('Only JPEG, JPG, PNG, WebP files are allowed '), false);
    }

    cb(null, true);
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 4,
  },
  // Image transformation should be handled after upload, not in MulterOptions
});


// ✅ Delete file helper
export const deleteFile = (filepath: string) => {
  if (!filepath) throw new NotFoundException('file not found');
  const fullPath = path.join(process.cwd(), filepath);
  fs.unlink(fullPath, (err) => {
    if (err) {
      console.error('Failed to delete file:', err);
    } else {
      console.log('File deleted successfully');
    }
  });
};


export const productFileFields = [
  { name: 'imageurls', maxCount: 4 },
];

export const EmployeeFileFields = [
  { name: 'profileImg', maxCount:1 },
  { name: 'identityCard', maxCount:1 },
  { name: 'cv', maxCount:1 },
]

export const productUploadConfig = createUnifiedUploadConfig()
export const EmployeeUploadConfig = createUnifiedUploadConfig()