const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const { auth } = require('../middleware/auth');

// Upload an image (with authentication)
router.post('/upload', 
  auth, 
  imageController.uploadMiddleware,
  imageController.uploadImage
);

// Get specific image by ID
router.get('/:id', imageController.getImageById);

// Get all images for logged-in user
router.get('/user/me', auth, imageController.getUserImages);

module.exports = router;