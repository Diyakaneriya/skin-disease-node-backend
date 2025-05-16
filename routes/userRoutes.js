const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, isAdmin } = require('../middleware/auth');

// User registration and authentication routes
router.post('/register', userController.register);
router.post('/doctor/register', userController.doctorRegister);
router.post('/login', userController.login);

// Admin routes
router.get('/all', auth, isAdmin, userController.getAllUsers);
router.get('/doctors/pending', auth, isAdmin, userController.getPendingDoctors);
router.post('/doctor/approve', auth, isAdmin, userController.updateDoctorStatus);


module.exports = router;