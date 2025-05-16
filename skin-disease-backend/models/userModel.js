const db = require('../config/db');
const bcrypt = require('bcrypt');

const userModel = {
  async create(name, email, password, role = 'patient', degreePath = null) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // If role is doctor, set approval status to pending
    let approvalStatus = null;
    if (role === 'doctor') {
      approvalStatus = 'pending';
    }
    
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, role, degree_path, approval_status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role, degreePath, approvalStatus]
    );
    return result.insertId;
  },

  async findByEmail(email) {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  },

  async findById(id) {
    const [rows] = await db.execute('SELECT id, name, email, role, created_at, degree_path, approval_status FROM users WHERE id = ?', [id]);
    return rows[0];
  },
  
  async findAll() {
    const [rows] = await db.execute('SELECT id, name, email, role, created_at, degree_path, approval_status FROM users');
    return rows;
  },
  
  async findPendingDoctors() {
    const [rows] = await db.execute(
      'SELECT id, name, email, role, created_at, degree_path, approval_status FROM users WHERE role = ? AND approval_status = ?',
      ['doctor', 'pending']
    );
    return rows;
  },
  
  async updateApprovalStatus(userId, status) {
    await db.execute(
      'UPDATE users SET approval_status = ? WHERE id = ?',
      [status, userId]
    );
    return true;
  }
};

module.exports = userModel;