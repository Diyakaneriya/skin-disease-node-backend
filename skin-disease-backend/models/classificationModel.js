const db = require('../config/db');

const classificationModel = {
  async create(imageId, result, confidence) {
    const [classResult] = await db.execute(
      'INSERT INTO classifications (image_id, classification_result, confidence_score) VALUES (?, ?, ?)',
      [imageId, result, confidence]
    );
    return classResult.insertId;
  },

  async saveFeatures(imageId, features) {
    const { 
      asymmetry, pigmentNetwork, dotsGlobules, streaks, 
      regressionAreas, blueWhitishVeil, colorWhite, colorRed, 
      colorLightBrown, colorDarkBrown, colorBlueGray, colorBlack 
    } = features;

    const [result] = await db.execute(
      `INSERT INTO image_features 
      (image_id, asymmetry, pigment_network, dots_globules, streaks, 
      regression_areas, blue_whitish_veil, color_white, color_red, 
      color_light_brown, color_dark_brown, color_blue_gray, color_black) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [imageId, asymmetry, pigmentNetwork, dotsGlobules, streaks, 
      regressionAreas, blueWhitishVeil, colorWhite, colorRed, 
      colorLightBrown, colorDarkBrown, colorBlueGray, colorBlack]
    );
    return result.insertId;
  },

  async findByImageId(imageId) {
    const [rows] = await db.execute(
      `SELECT c.*, f.* 
      FROM classifications c
      LEFT JOIN image_features f ON c.image_id = f.image_id
      WHERE c.image_id = ?`,
      [imageId]
    );
    return rows[0];
  }
};

module.exports = classificationModel;