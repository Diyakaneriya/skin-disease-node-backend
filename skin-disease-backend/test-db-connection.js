// test-db-connection.js
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'skin_disease_detection'
    });
    
    console.log('Connected to MySQL database successfully!');
    
    // Test query to verify tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Available tables:');
    tables.forEach(table => {
      console.log(`- ${Object.values(table)[0]}`);
    });
    
    await connection.end();
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

testConnection();