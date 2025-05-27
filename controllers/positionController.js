// const { fetchLatestPositionByDeviceId } = require('../models/positionModel');

// // Controller function to get the most recent position for a device
// async function getLatestPositionByDeviceId(req, res) {
//     const { deviceid } = req.params;
//     try {
//         const position = await fetchLatestPositionByDeviceId(deviceid);
//         if (position) {
//             res.json(position);
//         } else {
//             res.status(200).json({ massage: 'No position data found for the given device ID', success:true });
//         }
//     } catch (error) {
//         console.error('Error fetching positions:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// }

// module.exports = { getLatestPositionByDeviceId };






// const { fetchLatestPositionByDeviceId } = require('../models/positionModel');
// const { Pool } = require('pg');
// require('dotenv').config();
// // const EventEmitter = require('events');


// const pool = new Pool({
//     user: process.env.DB_USER,  //'postgres'
//     host: process.env.DB_HOST,  //'122.176.81.150'
//     database: process.env.DB_NAME, //'traccardb'
//     password:process.env.DB_PASSWORD, //'tracking
//     port:process.env.DB_PORT,
//     ssl: {
//     rejectUnauthorized: false, // Disable certificate validation
//   },
//   sslmode: 'require', // Force SSL connection

// // user:'traccar',
// // password:'traccar',
// // host:'122.176.81.150',
// // port:5432,
// // database:'traccar'

// });



// const getLatestPositionByDeviceId = (req, res) => {
//     const deviceId = req.params.deviceid;

//     // Set headers for SSE
//     res.setHeader('Content-Type', 'text/event-stream');
//     res.setHeader('Cache-Control', 'no-cache');
//     res.setHeader('Connection', 'keep-alive');
//     res.flushHeaders();  // Ensure headers are sent immediately

//     const query = `
//           SELECT p.id, p.deviceid, p.protocol, p.servertime AS "serverTime", 
//                  p.devicetime AS "deviceTime", p.fixtime AS "fixTime", p.valid,  
//                  p.latitude, p.longitude, p.altitude, p.speed, p.course, 
//                  p.valid, p.protocol, p.address, p.attributes::json AS attributes, 
//                  p.accuracy, p.network, p.geofenceids,
//                  d.name AS device_name, d.uniqueid
//           FROM tc_positions p
//           INNER JOIN tc_devices d ON p.deviceid = d.id
//           WHERE p.deviceid = $1
//           ORDER BY p.servertime DESC
//           LIMIT 1;
//         `;

//     // Execute the query immediately to get the first data fast
//     pool.query(query, [deviceId])
//         .then(result => {
//             const newData = result.rows[0]; // Assuming only one result is returned
//             if (newData) {
//                 res.write(`data: ${JSON.stringify(newData)}\n\n`);
//             }
// console.log('Client connected');
//             // Start polling after the initial data is sent
//             const interval = setInterval(async () => {
//                 try {
//                     const result = await pool.query(query, [deviceId]);
//                     const newData = result.rows[0]; // Assuming only one result is returned
//                     if (newData) {
//                         res.write(`data: ${JSON.stringify(newData)}\n\n`);
//                     }
//                 } catch (err) {
//                     console.error('Error fetching new data:', err);
//                 }
//             }, 5000);  // Poll every 5 seconds to reduce load

//             // Clear interval when connection is closed
//             req.on('close', () => {
//                 clearInterval(interval);
//                 console.log('Client disconnected');
//             });

//         })
//         .catch(err => {
//             console.error('Error fetching data:', err);
//             res.status(500).send('Error fetching data');
//         });
// };


// module.exports = { getLatestPositionByDeviceId };







// const { Pool } = require('pg');
// require('dotenv').config();

// // Create PostgreSQL connection pool
// const pool = new Pool({
//     user: process.env.DB_USER,  //'postgres'
//     host: process.env.DB_HOST,  //'122.176.81.150'
//     database: process.env.DB_NAME, //'traccardb'
//     password: process.env.DB_PASSWORD, //'tracking'
//     port: process.env.DB_PORT,
//     ssl: {
//         rejectUnauthorized: false, // Disable certificate validation
//     },
//     sslmode: 'require', // Force SSL connection
//     max: 20,  // Increase max connections based on traffic needs
//     idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
//     connectionTimeoutMillis: 2000 // Timeout for establishing a connection
// });

// // Logs the query execution time
// const logQueryTime = async (query, params) => {
//     const start = Date.now();
//     const result = await pool.query(query, params);
//     const end = Date.now();
//     console.log(`Query execution time: ${end - start}ms`);
//     return result;
// };

// // Get latest position by device ID
// const getLatestPositionByDeviceId = (req, res) => {
//     const deviceId = req.params.deviceid;

//     // Set headers for SSE
//     res.setHeader('Content-Type', 'text/event-stream');
//     res.setHeader('Cache-Control', 'no-cache');
//     res.setHeader('Connection', 'keep-alive');
//     res.flushHeaders();  // Ensure headers are sent immediately

//     console.log(`Client connected for device ID: ${deviceId}`);

//     const query = `
//         SELECT p.id, p.deviceid, p.protocol, p.servertime AS "serverTime", 
//               p.devicetime AS "deviceTime", p.fixtime AS "fixTime", p.valid,  
//               p.latitude, p.longitude, p.altitude, p.speed, p.course, 
//               p.valid, p.protocol, p.address, p.attributes::json AS attributes, 
//               p.accuracy, p.network, p.geofenceids,
//               d.name AS device_name, d.uniqueid
//         FROM tc_positions p
//         INNER JOIN tc_devices d ON p.deviceid = d.id
//         WHERE p.deviceid = $1
//         ORDER BY p.servertime DESC
//         LIMIT 1;
//     `;

//     // Execute the query immediately to get the first data fast
//     logQueryTime(query, [deviceId])
//         .then(result => {
//             const newData = result.rows[0]; // Assuming only one result is returned
//             if (newData) {
//                 console.log('Initial data sent');
//                 res.write(`data: ${JSON.stringify(newData)}\n\n`);
//             }

//             // Start polling after the initial data is sent
//             const interval = setInterval(async () => {
//                 try {
//                     const result = await logQueryTime(query, [deviceId]);
//                     const newData = result.rows[0]; // Assuming only one result is returned
//                     if (newData) {
//                         console.log('Sending new data');
//                         res.write(`data: ${JSON.stringify(newData)}\n\n`);
//                     }
//                 } catch (err) {
//                     console.error('Error fetching new data:', err);
//                 }
//             }, 5000);  // Poll every 5 seconds to reduce load

//             // Clear interval when connection is closed
//             req.on('close', () => {
//                 clearInterval(interval);
//                 console.log('Client disconnected');
//             });

//         })
//         .catch(err => {
//             console.error('Error fetching data:', err);
//             res.status(500).send('Error fetching data');
//         });
// };

// module.exports = { getLatestPositionByDeviceId };












// 12:20   0304


// const { Pool } = require('pg');
// require('dotenv').config();

// // Create PostgreSQL connection pool
// const pool = new Pool({
//     user: process.env.DB_USER,  //'postgres'
//     host: process.env.DB_HOST,  //'122.176.81.150'
//     database: process.env.DB_NAME, //'traccardb'
//     password: process.env.DB_PASSWORD, //'tracking'
//     port: process.env.DB_PORT,
//     ssl: {
//         rejectUnauthorized: false, // Disable certificate validation
//     },
//     sslmode: 'require', // Force SSL connection
//     max: 20,  // Increase max connections based on traffic needs
//     idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
//     connectionTimeoutMillis: 2000 // Timeout for establishing a connection
// });

// // Logs the query execution time
// const logQueryTime = async (query, params) => {
//     const start = Date.now();
//     const result = await pool.query(query, params);
//     const end = Date.now();
//     console.log(`Query execution time: ${end - start}ms`);
//     return result;
// };

// // Get latest position by device ID
// const getLatestPositionByDeviceId = (req, res) => {
//     const deviceId = req.params.deviceid;

//     // Set headers for SSE
//     res.setHeader('Content-Type', 'text/event-stream');
//     res.setHeader('Cache-Control', 'no-cache');
//     res.setHeader('Connection', 'keep-alive');
//     res.flushHeaders();  // Ensure headers are sent immediately

//     console.log(`Client connected for device ID: ${deviceId}`);

//     const query = `
//         SELECT p.id, p.deviceid, p.protocol, p.servertime AS "serverTime", 
//               p.devicetime AS "deviceTime", p.fixtime AS "fixTime", p.valid,  
//               p.latitude, p.longitude, p.altitude, p.speed, p.course, 
//               p.valid, p.protocol, p.address, p.attributes::json AS attributes, 
//               p.accuracy, p.network, p.geofenceids,
//               d.name AS device_name, d.uniqueid
//         FROM tc_positions p
//         INNER JOIN tc_devices d ON p.deviceid = d.id
//         WHERE p.deviceid = $1
//         ORDER BY p.servertime DESC
//         LIMIT 1;
//     `;

//     // Execute the query immediately to get the first data fast
//     logQueryTime(query, [deviceId])
//         .then(result => {
//             const newData = result.rows[0]; // Assuming only one result is returned
//             if (newData) {
//                 console.log('Initial data sent');
//                 res.write(`data: ${JSON.stringify(newData)}\n\n`);
//             }

//             // Start polling after the initial data is sent
//             const interval = setInterval(async () => {
//                 try {
//                     console.log('Polling for new data...'); // Add logging for polling
//                     const result = await logQueryTime(query, [deviceId]);
//                     const newData = result.rows[0]; // Assuming only one result is returned
//                     if (newData) {
//                         console.log('Sending new data');
//                         res.write(`data: ${JSON.stringify(newData)}\n\n`);
//                     } else {
//                         console.log('No new data available');
//                     }
//                 } catch (err) {
//                     console.error('Error fetching new data:', err);
//                 }
//             }, 5000);  // Poll every 5 seconds to reduce load

//             // Clear interval when connection is closed
//             req.on('close', () => {
//                 clearInterval(interval);
//                 console.log('Client disconnected');
//             });

//         })
//         .catch(err => {
//             console.error('Error fetching data:', err);
//             res.status(500).send('Error fetching data');
//         });
// };

// module.exports = { getLatestPositionByDeviceId };








// 12:26 0304

// const { Pool } = require('pg');
// require('dotenv').config();

// const pool = new Pool({
//     user: process.env.DB_USER,
//     host: process.env.DB_HOST,
//     database: process.env.DB_NAME,
//     password: process.env.DB_PASSWORD,
//     port: process.env.DB_PORT,
//     ssl: { rejectUnauthorized: false }
// });

// const getLatestPositionByDeviceId = (req, res) => {
//     const deviceId = req.params.deviceid;

//     // Set headers for SSE
//     res.setHeader('Content-Type', 'text/event-stream');
//     res.setHeader('Cache-Control', 'no-cache');
//     res.setHeader('Connection', 'keep-alive');
//     res.flushHeaders();

//     // Initial Query
//     const query = `
//         SELECT p.id, p.deviceid, p.protocol, p.servertime AS "serverTime", 
//               p.devicetime AS "deviceTime", p.fixtime AS "fixTime", p.valid,  
//               p.latitude, p.longitude, p.altitude, p.speed, p.course, 
//               p.valid, p.protocol, p.address, p.attributes::json AS attributes, 
//               p.accuracy, p.network, p.geofenceids,
//               d.name AS device_name, d.uniqueid
//         FROM tc_positions p
//         INNER JOIN tc_devices d ON p.deviceid = d.id
//         WHERE p.deviceid = $1
//         ORDER BY p.servertime DESC
//         LIMIT 1;
//     `;

//     // Query data and send immediately
//     pool.query(query, [deviceId])
//         .then(result => {
//             const newData = result.rows[0];
//             if (newData) {
//                 res.write(`data: ${JSON.stringify(newData)}\n\n`);
//             }

//             // Set interval to send updates every 5 seconds
//             const interval = setInterval(async () => {
//                 try {
//                     const result = await pool.query(query, [deviceId]);
//                     const newData = result.rows[0];
//                     if (newData) {
//                         res.write(`data: ${JSON.stringify(newData)}\n\n`);
//                     }
//                 } catch (err) {
//                     console.error('Error fetching new data:', err);
//                 }
//             }, 5000);

//             req.on('close', () => {
//                 clearInterval(interval);
//                 console.log('Client disconnected');
//             });

//         })
//         .catch(err => {
//             console.error('Error fetching data:', err);
//             res.status(500).send('Error fetching data');
//         });
// };

// module.exports = { getLatestPositionByDeviceId };











const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

// Function to get the latest position by deviceId
const getLatestPositionByDeviceId = (req, res) => {
    const deviceId = req.params.deviceid;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

//   // Initial Query
//     const query = `
//         SELECT p.id, p.deviceid, p.protocol, p.servertime AS "serverTime", 
//               p.devicetime AS "deviceTime", p.fixtime AS "fixTime", p.valid,  
//               p.latitude, p.longitude, p.altitude, p.speed, p.course, 
//               p.valid, p.protocol, p.address, p.attributes::json AS attributes, 
//               p.accuracy, p.network, p.geofenceids,
//               d.name AS device_name, d.uniqueid
//         FROM tc_positions p
//         INNER JOIN tc_devices d ON p.deviceid = d.id
//         WHERE p.deviceid = $1
//         ORDER BY p.servertime DESC
//         LIMIT 1;
//     `;
    
    







//     const query = `
// SELECT p.id, p.deviceid, p.protocol, p.servertime AS "serverTime", 
//       p.devicetime AS "deviceTime", p.fixtime AS "fixTime", p.valid, 
//       p.latitude, p.longitude, p.altitude, p.speed, p.course, 
//       p.address, p.attributes::json AS attributes, 
//       p.accuracy, p.network, p.geofenceids, 
//       d.name AS device_name, d.uniqueid
// FROM tc_positions p
// INNER JOIN tc_devices d ON p.deviceid = d.id
// WHERE p.deviceid = $1
//   AND (p.attributes::jsonb)->>'packetType' IS NOT NULL
// ORDER BY p.servertime DESC
// LIMIT 1;
// `;



// const query = `
//   SELECT 
//     p.id, 
//     p.deviceid, 
//     p.protocol, 
//     (p.servertime + INTERVAL '5 hours 30 minutes') AS "serverTime", 
//     (p.devicetime + INTERVAL '5 hours 30 minutes') AS "deviceTime", 
//     (p.fixtime + INTERVAL '5 hours 30 minutes') AS "fixTime", 
//     p.valid, 
//     p.latitude, 
//     p.longitude, 
//     p.altitude, 
//     p.speed, 
//     p.course, 
//     p.address, 
//     p.attributes::json AS attributes, 
//     p.accuracy, 
//     p.network, 
//     p.geofenceids, 
//     d.name AS device_name, 
//     d.uniqueid
//   FROM tc_positions p
//   INNER JOIN tc_devices d ON p.deviceid = d.id
//   WHERE p.deviceid = $1
//     AND (p.attributes::jsonb)->>'packetType' IS NOT NULL
//   ORDER BY p.servertime DESC
//   LIMIT 1;
// `;



const query = `
  SELECT 
    d.id AS device_id,
    d.name AS device_name,
    d.uniqueid,
    p.id AS position_id,
    p.protocol,
    (p.servertime + INTERVAL '5 hours 30 minutes') AS "serverTime", 
    (p.devicetime + INTERVAL '5 hours 30 minutes') AS "deviceTime", 
    (p.fixtime + INTERVAL '5 hours 30 minutes') AS "fixTime", 
    p.valid, 
    p.latitude, 
    p.longitude, 
    p.altitude, 
    p.speed, 
    p.course, 
    p.address, 
    p.attributes::json AS attributes, 
    p.accuracy, 
    p.network, 
    p.geofenceids
  FROM tc_devices d
  JOIN LATERAL (
    SELECT p.*
    FROM tc_positions p
    WHERE p.deviceid = d.id
      AND (p.attributes::jsonb->>'packetType') IS NOT NULL
      AND (p.attributes::jsonb->>'packetType') != '10'
    ORDER BY p.fixtime DESC
    LIMIT 1
  ) p ON true
  WHERE d.id = $1;
`;



    // Helper function to send data
    const sendData = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Initial query to send the first data immediately
    pool.query(query, [deviceId])
        .then(result => {
            const newData = result.rows[0];
            if (newData) {
                sendData(newData);  // Send the first data to the client
            }

            // Set interval to send updates every 5 seconds
            const interval = setInterval(async () => {
                try {
                    const result = await pool.query(query, [deviceId]);
                    const newData = result.rows[0];
                    if (newData) {
                        sendData(newData);  // Send updated data to the client
                    }
                } catch (err) {
                    console.error('Error fetching new data:', err);
                }
            }, 5000);

            // Clean up the interval when the client disconnects
            req.on('close', () => {
                clearInterval(interval);
                console.log('Client disconnected');
            });

        })
        .catch(err => {
            console.error('Error fetching data:', err);
            res.status(500).send('Error fetching data');
        });
};

module.exports = { getLatestPositionByDeviceId };
