const imageModel = require('../models/imageModel');
const path = require('path');
const multer = require('multer');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const util = require('util');

// Convert callback-based exec to Promise-based
const execPromise = util.promisify(exec);

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for images
const fileFilter = (req, file, cb) => {
  // Accept all image types including BMP files
  if (file.mimetype.startsWith('image/') || 
      file.mimetype === 'image/bmp' || 
      path.extname(file.originalname).toLowerCase() === '.bmp') {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images (including .bmp).'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

const imageController = {
  uploadMiddleware: upload.single('image'),
  
  
  // Add this function to imageController.js
async getUserImages(req, res) {
  try {
    const userId = req.user.id;
    const images = await imageModel.findByUserId(userId);
    
    // Add URL to each image
    const imagesWithUrls = images.map(image => ({
      ...image,
      imageUrl: `${req.protocol}://${req.get('host')}/${image.image_path}`
    }));
    
    res.status(200).json(imagesWithUrls);
  } catch (error) {
    console.error('Error fetching user images:', error);
    res.status(500).json({ message: 'Failed to retrieve images' });
  }
},

// Modify uploadImage to save the user's ID and extract features using Python script
async uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }
    
    const userId = req.user.id; // Get user ID from auth middleware
    const imagePath = req.file.path.replace(/\\/g, '/');
    
    // Save image with user ID
    const imageId = await imageModel.create(userId, imagePath);
    
    // Process image with feature extraction and classification
    let features = null;
    let classification = null;
    let processingError = null;
    
    try {
      console.log('Processing image:', imagePath);
      
      // Create a temporary directory for the output if it doesn't exist
      const tempDir = path.resolve(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      
      // Set up paths for the Python script
      const absoluteImagePath = path.resolve(imagePath);
      const outputPath = path.resolve(tempDir, `${imageId}.json`);
      const scriptPath = path.resolve(__dirname, '../../ml-service/process_image.py');
      
      // Execute the Python script synchronously to wait for results
      const { stdout, stderr } = await execPromise(`python "${scriptPath}" "${absoluteImagePath}" "${outputPath}"`);
      
      if (stderr) {
        console.error('Python script stderr:', stderr);
      }
      
      // Read the output JSON file
      if (fs.existsSync(outputPath)) {
        const processedData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        features = processedData.features;
        classification = processedData.classification;
        console.log('Image processed successfully: features extracted and image classified');
        
        // Clean up - remove the temporary file
        fs.unlinkSync(outputPath);
      } else {
        throw new Error('Feature extraction output file was not created');
      }
    } catch (featureError) {
      console.error('Feature extraction error:', featureError.message);
      processingError = 'Feature extraction failed, but image was saved';
      // Image upload still succeeded, so we continue
    }
    
    res.status(201).json({
      success: true,
      imageId,
      imagePath: `/${imagePath}`,
      features: features,
      classification: classification,
      processingError: processingError,
      message: processingError || 'Image uploaded, features extracted, and classified successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Failed to upload image' });
  }
},
  
  async getImageById(req, res) {
    try {
      const imageId = req.params.id;
      const image = await imageModel.findById(imageId);
      
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }
      
      image.imageUrl = `${req.protocol}://${req.get('host')}/${image.image_path}`;
      
      res.status(200).json(image);
    } catch (error) {
      console.error('Error fetching image:', error);
      res.status(500).json({ message: 'Failed to retrieve image' });
    }
  }
};

module.exports = imageController;