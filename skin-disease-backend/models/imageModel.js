const db = require('../config/db');

const imageModel = {
  async create(userId, imagePath) {
    const [result] = await db.execute(
      'INSERT INTO images (user_id, image_path) VALUES (?, ?)',
      [userId, imagePath]
    );
    return result.insertId;
  },

  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM images WHERE id = ?', [id]);
    return rows[0];
  },

  async findByUserId(userId) {
    const [rows] = await db.execute('SELECT * FROM images WHERE user_id = ?', [userId]);
    return rows;
  },

  async updateStatus(id, status) {
    await db.execute('UPDATE images SET status = ? WHERE id = ?', [status, id]);
  }
};

module.exports = imageModel;