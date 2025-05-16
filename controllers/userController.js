const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

// Configure multer for degree uploads
const degreeStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/degrees/');
  },
  filename: function(req, file, cb) {
    cb(null, 'degree-' + Date.now() + path.extname(file.originalname));
  }
});

const degreeUpload = multer({ 
  storage: degreeStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .jpeg, .jpg, .png, and .pdf files are allowed'));
  }
}).single('degree');

const userController = {
  async register(req, res) {
    try {
      const { name, email, password, role } = req.body;
      
      // Check if user already exists
      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // For regular patients, create user directly
      if (role !== 'doctor') {
        const userId = await userModel.create(name, email, password, role);
        const user = await userModel.findById(userId);
        
        // Generate token
        const token = jwt.sign({ id: userId, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        
        return res.status(201).json({ user, token });
      }
      
      // For doctors, we'll handle their registration in the doctorRegister method
      return res.status(400).json({ 
        message: 'Doctor registration requires degree upload. Please use the doctor registration endpoint.' 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Special registration for doctors with degree upload
  async doctorRegister(req, res) {
    // Use multer to handle the file upload
    degreeUpload(req, res, async function(err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      
      try {
        // Check if degree was uploaded
        if (!req.file) {
          return res.status(400).json({ message: 'Degree document is required for doctor registration' });
        }
        
        const { name, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await userModel.findByEmail(email);
        if (existingUser) {
          return res.status(400).json({ message: 'User already exists' });
        }
        
        // Create new doctor with pending approval status
        const degreePath = req.file.path;
        const userId = await userModel.create(name, email, password, 'doctor', degreePath);
        
        res.status(201).json({ 
          message: 'Doctor registration submitted successfully. Your account is pending approval by an administrator.'
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
      }
    });
  },
  
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Find user
      const user = await userModel.findByEmail(email);
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      // Check if doctor is approved
      if (user.role === 'doctor' && user.approval_status !== 'approved') {
        return res.status(403).json({ 
          message: 'Your doctor account is pending approval by an administrator. Please check back later.'
        });
      }
      
      // Generate token
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  async getAllUsers(req, res) {
    try {
      // Check if user is admin
      const requestingUser = await userModel.findById(req.user.id);
      if (requestingUser.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }
      
      // Get all users
      const users = await userModel.findAll();
      
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Get pending doctor registrations for admin approval
  async getPendingDoctors(req, res) {
    try {
      // Check if user is admin
      const requestingUser = await userModel.findById(req.user.id);
      if (requestingUser.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }
      
      // Get pending doctor registrations
      const pendingDoctors = await userModel.findPendingDoctors();
      
      res.json(pendingDoctors);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Approve or reject doctor registration
  async updateDoctorStatus(req, res) {
    try {
      // Check if user is admin
      const requestingUser = await userModel.findById(req.user.id);
      if (requestingUser.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }
      
      const { doctorId, status } = req.body;
      
      if (!doctorId || !status) {
        return res.status(400).json({ message: 'Doctor ID and status are required' });
      }
      
      if (status !== 'approved' && status !== 'rejected') {
        return res.status(400).json({ message: 'Status must be either approved or rejected' });
      }
      
      // Update doctor approval status
      await userModel.updateApprovalStatus(doctorId, status);
      
      res.json({ message: `Doctor registration ${status}` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = userController;