const pool = require('../config/db');

// Function to get device details for a user with header "AD"
const getDeviceDetailsByUserId = async (userId) => {
    // const query = `
    //     SELECT DISTINCT ON (d.id)
    //         d.id, 
    //         d.uniqueid, 
    //         d.name, 
    //         (p.attributes::jsonb)->>'mode' AS mode
    //     FROM 
    //         tc_user_device ud
    //     JOIN 
    //         tc_devices d ON ud.deviceid = d.id
    //     LEFT JOIN 
    //         tc_positions p ON d.id = p.deviceid
    //     WHERE 
    //         ud.userid = $1 AND
    //         (p.attributes::jsonb)->>'event' = 'AD'
    //     ORDER BY 
    //         d.id, p.servertime DESC;


    // `;
    
//        const query = `
//     SELECT DISTINCT ON (d.id)
//         d.id, 
//         d.uniqueid, 
//         d.name, 
//         (p.attributes::jsonb)->>'packetType' AS packetType
//     FROM 
//         tc_user_device ud
//     JOIN 
//         tc_devices d ON ud.deviceid = d.id
//     LEFT JOIN 
//         tc_positions p ON d.id = p.deviceid
//     WHERE 
//         ud.userid = $1 AND
//        (p.attributes::jsonb)->>'packetType' = '11' OR
//        (p.attributes::jsonb)->>'packetType' = '12' OR
//        (p.attributes::jsonb)->>'packetType' = '13' OR
//        (p.attributes::jsonb)->>'packetType' = '31' OR
//        (p.attributes::jsonb)->>'packetType' = '32' OR
//        (p.attributes::jsonb)->>'packetType' = '36' OR
//        (p.attributes::jsonb)->>'packetType' = '38'

//     ORDER BY 
//         d.id, p.servertime DESC;



        const query=`SELECT DISTINCT ON (d.id)
    d.id, 
    d.uniqueid, 
    d.name, 
    (p.attributes::jsonb)->>'packetType' AS packetType
FROM 
    tc_user_device ud
JOIN 
    tc_devices d ON ud.deviceid = d.id
LEFT JOIN 
    tc_positions p ON d.id = p.deviceid
WHERE 
    ud.userid = $1
    AND (p.attributes::jsonb->>'packetType') IN ('11', '12', '13', '14', '31', '32', '36', '38')
   
ORDER BY 
    d.id, p.servertime DESC;
`;
    
    
    try {
        const result = await pool.query(query, [userId]);
        return result.rows; // Return only devices
    } catch (err) {
        throw new Error('Database query failed: ' + err.message);
    }
};

module.exports = {
    getDeviceDetailsByUserId
};
