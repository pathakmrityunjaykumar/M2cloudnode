// const pool = require('../config/db');

// // Function to get device details for a user with header "AD"
// const getDeviceDetailsByUserId = async (userId) => {
//     // const query = `
//     //     SELECT DISTINCT ON (d.id)
//     //         d.id, 
//     //         d.uniqueid, 
//     //         d.name, 
//     //         (p.attributes::jsonb)->>'mode' AS mode
//     //     FROM 
//     //         tc_user_device ud
//     //     JOIN 
//     //         tc_devices d ON ud.deviceid = d.id
//     //     LEFT JOIN 
//     //         tc_positions p ON d.id = p.deviceid
//     //     WHERE 
//     //         ud.userid = $1 AND
//     //         (p.attributes::jsonb)->>'event' = 'AD'
//     //     ORDER BY 
//     //         d.id, p.servertime DESC;


//     // `;
    
// //        const query = `
// //     SELECT DISTINCT ON (d.id)
// //         d.id, 
// //         d.uniqueid, 
// //         d.name, 
// //         (p.attributes::jsonb)->>'packetType' AS packetType
// //     FROM 
// //         tc_user_device ud
// //     JOIN 
// //         tc_devices d ON ud.deviceid = d.id
// //     LEFT JOIN 
// //         tc_positions p ON d.id = p.deviceid
// //     WHERE 
// //         ud.userid = $1 AND
// //        (p.attributes::jsonb)->>'packetType' = '11' OR
// //        (p.attributes::jsonb)->>'packetType' = '12' OR
// //        (p.attributes::jsonb)->>'packetType' = '13' OR
// //        (p.attributes::jsonb)->>'packetType' = '31' OR
// //        (p.attributes::jsonb)->>'packetType' = '32' OR
// //        (p.attributes::jsonb)->>'packetType' = '36' OR
// //        (p.attributes::jsonb)->>'packetType' = '38'

// //     ORDER BY 
// //         d.id, p.servertime DESC;



//         const query=`SELECT DISTINCT ON (d.id)
//     d.id, 
//     d.uniqueid, 
//     d.name, 
//     (p.attributes::jsonb)->>'packetType' AS packetType
// FROM 
//     tc_user_device ud
// JOIN 
//     tc_devices d ON ud.deviceid = d.id
// LEFT JOIN 
//     tc_positions p ON d.id = p.deviceid
// WHERE 
//     ud.userid = $1
//     AND (p.attributes::jsonb->>'packetType') IN ('11', '12', '13', '14', '31', '32', '36', '38')
   
// ORDER BY 
//     d.id, p.servertime DESC;
// `;
    
    
//     try {
//         const result = await pool.query(query, [userId]);
//         return result.rows; // Return only devices
//     } catch (err) {
//         throw new Error('Database query failed: ' + err.message);
//     }
// };

// module.exports = {
//     getDeviceDetailsByUserId
// };



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



//         const query=`SELECT DISTINCT ON (d.id)
//     d.id, 
//     d.uniqueid, 
//     d.name, 
//     (p.attributes::jsonb)->>'packetType' AS packetType
// FROM 
//     tc_user_device ud
// JOIN 
//     tc_devices d ON ud.deviceid = d.id
// LEFT JOIN 
//     tc_positions p ON d.id = p.deviceid
// WHERE 
//     ud.userid = $1
//     AND (p.attributes::jsonb->>'packetType') IN ('11', '12', '13', '14', '31', '32', '36', '38')
   
// ORDER BY 
//     d.id, p.servertime DESC;
// `;
    
//     const query = `SELECT id,name,uniqueid 
// FROM public.tc_devices
// WHERE id IN (
// 	SELECT DISTINCT deviceid 
// 	FROM public.tc_positions 
// 	WHERE (attributes::jsonb->>'packetType') IN ('11', '12', '13', '14', '31', '32', '36', '38')
// )
// AND id IN (
// 	SELECT deviceid 
// 	FROM public.tc_user_device
// 	WHERE userid = $1
// );`

// const query = `SELECT d.id, d.name, d.uniqueid
// FROM public.tc_devices d
// JOIN public.tc_user_device ud ON d.id = ud.deviceid
// JOIN public.tc_positions p ON d.id = p.deviceid
// WHERE ud.userid = $1
// AND (p.attributes::jsonb->>'packetType') IN ('11', '12', '13', '14', '31', '32', '36', '38')
// GROUP BY d.id, d.name, d.uniqueid;
// `;



const query = `SELECT d.id, d.name, d.uniqueid
FROM public.tc_devices d
JOIN public.tc_user_device ud ON d.id = ud.deviceid
JOIN LATERAL (
    SELECT p.*
    FROM public.tc_positions p
    WHERE p.deviceid = d.id
      AND (p.attributes::jsonb->>'packetType') IN ('11', '12', '13', '14', '31', '32','34','36', '38')
    ORDER BY p.fixtime DESC
    LIMIT 1
) AS last_position ON true
WHERE ud.userid = $1;`;


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
