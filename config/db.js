const {Pool } =require('pg');
require('dotenv').config();

const pool1 = new Pool({
    user: process.env.DB_USER,  //'postgres'
    host: process.env.DB_HOST,  //'122.176.81.150'
    database: process.env.DB_NAME, //'traccardb'
    password:process.env.DB_PASSWORD, //'tracking
    port:process.env.DB_PORT,
    ssl: {
    rejectUnauthorized: false, // Disable certificate validation
  },
  sslmode: 'require', // Force SSL connection

});
const pool2 = new Pool({
    user: process.env.DB_USER,  //'postgres'
    host: process.env.DB_HOST,  //'122.176.81.150'
    database: process.env.DB_NAME, //'traccardb'
    password:process.env.DB_PASSWORD, //'tracking
    port:process.env.DB_PORT,
    ssl: {
    rejectUnauthorized: false, // Disable certificate validation
  },
  sslmode: 'require', // Force SSL connection

});

pool1.connect()
    .then(() => console.log("Connected to the database"))
    .catch(err => console.log("Error connecting to the database:", err));

module.exports = pool1,pool2;
