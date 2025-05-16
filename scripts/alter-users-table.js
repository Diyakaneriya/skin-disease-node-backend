const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function alterUsersTable() {
  try {
    console.log('Connecting to database...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Check if columns already exist
    const [columns] = await connection.execute('DESCRIBE users');
    const columnNames = columns.map(col => col.Field);
    
    console.log('Current columns in users table:', columnNames);
    
    // Add degree_path column if it doesn't exist
    if (!columnNames.includes('degree_path')) {
      console.log('Adding degree_path column...');
      await connection.execute('ALTER TABLE users ADD COLUMN degree_path VARCHAR(255) DEFAULT NULL');
    } else {
      console.log('degree_path column already exists.');
    }
    
    // Add approval_status column if it doesn't exist
    if (!columnNames.includes('approval_status')) {
      console.log('Adding approval_status column...');
      await connection.execute("ALTER TABLE users ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') DEFAULT NULL");
    } else {
      console.log('approval_status column already exists.');
    }

    console.log('Database schema update completed successfully!');
    await connection.end();
  } catch (error) {
    console.error('Error updating database schema:', error.message);
  }
}

alterUsersTable();