
const pool = require('../config/db');

// Fetch the most recent position for a device
async function fetchLatestPositionByDeviceId(deviceid) {
    // const query = `
    //     SELECT p.id, p.deviceid, p.protocol,  p.servertime AS "serverTime", 
    //           p.devicetime AS "deviceTime", p.fixtime AS "fixTime", p.valid,  p.latitude, p.longitude, p.altitude, p.speed, p.course, 
    //           p.valid, p.protocol, p.address, p.attributes::json AS attributes, p.accuracy, p.network, p.geofenceids,
    //           d.name AS device_name, d.uniqueid
    //     FROM tc_positions p
    //     INNER JOIN tc_devices d ON p.deviceid = d.id
    //     WHERE p.deviceid = $1
    //     ORDER BY p.servertime DESC
    //     LIMIT 1;
    // `;
    
    
//       const query = `
//     SELECT p.id, p.deviceid, p.protocol, p.servertime AS "serverTime", 
//           p.devicetime AS "deviceTime", p.fixtime AS "fixTime", p.valid,  
//           p.latitude, p.longitude, p.altitude, p.speed, p.course, 
//           p.address, p.attributes::json AS attributes, 
//           p.accuracy, p.network, p.geofenceids,
//           d.name AS device_name, d.uniqueid
//     FROM tc_positions p
//     INNER JOIN tc_devices d ON p.deviceid = d.id
//     WHERE p.deviceid = $1
//       AND p.valid = false
//       AND p.attributes::jsonb ? 'bmsVoltage'
//     ORDER BY p.servertime DESC
//     LIMIT 1;
// `;



//   const query = `
//     SELECT p.id, p.deviceid, p.protocol, p.servertime AS "serverTime", 
//           p.devicetime AS "deviceTime", p.fixtime AS "fixTime", p.valid, p.latitude, p.longitude, 
//           p.altitude, p.speed, p.course, p.valid, p.protocol, p.address, p.attributes::json AS attributes, 
//           p.accuracy, p.network, p.geofenceids, d.name AS device_name, d.uniqueid
//     FROM tc_positions p
//     INNER JOIN tc_devices d ON p.deviceid = d.id
//     WHERE p.deviceid = $1
//       AND (p.attributes::json)->>'packetType' = '31'
//     ORDER BY p.servertime DESC
//     LIMIT 1;
// `;


// 


const query = `
    SELECT p.id, p.deviceid, p.protocol, p.servertime AS "serverTime", 
          p.devicetime AS "deviceTime", p.fixtime AS "fixTime", p.valid, 
          p.latitude, p.longitude, p.altitude, p.speed, p.course, 
          p.valid, p.protocol, p.address, p.attributes::json AS attributes, 
          p.accuracy, p.network, p.geofenceids, 
          d.name AS device_name, d.uniqueid
    FROM tc_positions p
    INNER JOIN tc_devices d ON p.deviceid = d.id
    WHERE p.deviceid = $1
      AND (p.attributes::jsonb)->>'packetType' IS NOT NULL
    ORDER BY p.servertime DESC
    LIMIT 1;
`;
    
    
    
    const result = await pool.query(query, [deviceid]);
    // Always return an array
    return result.rows.length > 0 ? result.rows : [];
}

module.exports = { fetchLatestPositionByDeviceId };




