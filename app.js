const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const axios = require('axios');
const qs = require('qs');
const app = express();


// Load environment variables
dotenv.config();

const deviceRoutes = require('./routes/deviceRoutes');
const positionRoutes = require('./routes/positionRoutes');

// Enable CORS for all routes
app.use(cors({ origin: '*' }));

// Middleware to parse JSON requests
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database pool configuration

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
    rejectUnauthorized: false, // Disable certificate validation
  },
  sslmode: 'require', // Force SSL connection
});

const poolReg = new Pool({
    user: process.env.DB_USERREG,
    host: process.env.DB_HOSTREG,
    database: process.env.DB_NAMEREG,
    password: process.env.DB_PASSWORDREG,
    port: process.env.DB_PORTREG,
    ssl: {
    rejectUnauthorized: false, // Disable certificate validation
  },
  sslmode: 'require', // Force SSL connection
});

// Use device and position routes
app.use('/v1/api/bms', deviceRoutes);
app.use('/v1/api/bms', positionRoutes);

// Serve static files from the uploads directory
app.use('/v1/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure the upload directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// File upload configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = './uploads';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath); // Save to 'uploads' folder
    },
    filename: function (req, file, cb) {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName); // Save with a unique name
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Max file size: 5 MB
}).single('aadharOrGSTCertificate');

// Generate OTP
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

// Nodemailer transport setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,    //sending email  
        pass: process.env.EMAIL_PASS,    //email password
    },
});

// Send OTP Email
async function sendEmailOTP(email, otp) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is: ${otp}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('OTP sent to', email);
    } catch (error) {
        console.error('Error sending OTP:', error);
        throw new Error('Failed to send OTP');
    }
}

// this is for mobile otp 
async function sendMobileOTP(mobile, mobileOTP) {
    const url = "https://sms.indiasms.com/SMSApi/send";
    const data = qs.stringify({
        userid: process.env.SMS_API_USERID,
        password: process.env.SMS_API_PASSWORD,
        mobile: `91${mobile}`,
        msg: `Your OTP for logging into app is ${mobileOTP}. The OTP is valid for the next 10 minutes. M2CLOUD`,
        senderid: process.env.SMS_SENDERID,
        msgType: 'text',
        dltEntityId: process.env.DLT_ENTITY_ID,
        dltTemplateId: process.env.DLT_TEMPLATE_ID,
        duplicatecheck: 'true',
        output: 'json',
        sendMethod: 'quick',
    });

    const headers = {
        'apikey': process.env.SMS_API_KEY,
        'cache-control': 'no-cache',
        'content-type': 'application/x-www-form-urlencoded',
    };

    try {
        const response = await axios.post(url, data, { headers });
        console.log('OTP sent to', mobile);
        return response.data;
    } catch (error) {
        console.error("Error sending OTP:", error);
        throw new Error('Failed to send OTP');
    }
}

// Send approval email
async function sendEmailApprove(email) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'M2CLOUD ACCOUNT APPROVE',
        text: 'Your registration is successfully completed.',
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Approval email sent to', email);
    } catch (error) {
        console.error('Error sending approval email:', error);
        throw new Error('Failed to send approval email');
    }
}

// Check if user already exists (by email or mobile)
const checkIfExists = async (email, mobile) => {
    const result = await poolReg.query(
        'SELECT * FROM users WHERE email = $1 OR mobile = $2',
        [email, mobile]
    );
    return result.rows.length > 0;
};

// Registration endpoint
app.post('/v1/api/registers', upload, async (req, res) => {
    const { fullName, email, mobile, isType, billingName, billingAddr, aadharOrGSTNumber } = req.body;

    if (!fullName || !email || !mobile || !isType || !billingName || !billingAddr || !aadharOrGSTNumber) {
        return res.status(400).json({ message: 'Missing required fields', success: false });
    }

    // Check if email or mobile already exists
    if (await checkIfExists(email, mobile)) {
        return res.status(200).json({ message: 'Email or Phone already registered', success: false });
    }

    const emailOTP = generateOTP();
    const mobileOTP = generateOTP();

    const filePath = req.file ? req.file.filename : null;
    const fileUrl = filePath ? `http://localhost:${process.env.PORT || 3000}/uploads/${filePath}` : null;

    try {
        // Insert into temporary user data table
        const result = await poolReg.query(
            `INSERT INTO temporary_user_data (full_name, email, mobile, is_type, billing_name, billing_addr, aadhar_or_gst_number, email_otp, mobile_otp, file_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [
                fullName, email, mobile, isType, billingName, billingAddr, aadharOrGSTNumber, emailOTP, mobileOTP, filePath,
            ]
        );
        sendEmailOTP(email, emailOTP);
        sendMobileOTP(mobile, mobileOTP);

        // Respond back with a user ID for verification
        res.status(200).json({
            message: 'OTPs have been sent.',
            success: true,
            userId: result.rows[0].id,
        });
    } catch (error) {
        console.error('Error in registration:', error);
        res.status(500).json({ message: 'Error in registration', success: false, error });
    }
});

// Verification endpoint for OTPs
app.post('/v1/api/verify-otp', async (req, res) => {
    const { userId, emailOTP, mobileOTP } = req.body;

    try {
        const result = await poolReg.query(
            `SELECT * FROM temporary_user_data WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found', success: false });
        }

        const user = result.rows[0];

        let emailVerified = false;
        let mobileVerified = false;
        let errorMessage = [];

        if (Number(emailOTP) === Number(user.email_otp)) {
            emailVerified = true;
        } else {
            errorMessage.push('Invalid email OTP.');
        }

        if (Number(mobileOTP) === Number(user.mobile_otp)) {
            mobileVerified = true;
        } else {
            errorMessage.push('Invalid mobile OTP.');
        }

        if (emailVerified && mobileVerified) {
            await poolReg.query(
                `INSERT INTO users (full_name, email, mobile, is_type, billing_name, billing_addr, aadhar_or_gst_number, terms_and_conditions, file_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    user.full_name, user.email, user.mobile, user.is_type, user.billing_name, user.billing_addr, user.aadhar_or_gst_number, true, user.file_url,
                ]
            );

            await poolReg.query(`DELETE FROM temporary_user_data WHERE id = $1`, [userId]);

            res.status(200).json({ success: true, message: 'Registration Completed' });
        } else {
            res.status(400).json({
                success: false,
                message: errorMessage.join(' '),
            });
        }
    } catch (error) {
        console.error('Error in OTP verification:', error);
        res.status(500).json({ success: false, message: 'Error in registration process', error });
    }
});

// API to get all user data, including file URL
app.get('/v1/api/users', async (req, res) => {
    try {
        // Query the database to fetch all users from the main user table
        const result = await poolReg.query(
            `SELECT id, full_name, email, mobile, is_type, billing_name, billing_addr, aadhar_or_gst_number, file_url, status FROM users`
        );

        // Check if there are any users in the database
        if (result.rows.length === 0) {
            return res.status(200).json({ message: 'No users found', success:true });
        }

        // Send the retrieved data back as a response
        res.status(200).json({
            success: true,
            users: result.rows || [],
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Error fetching users', error });
    }
});

// API to approve user
const apiUrl = process.env.API_URL;
app.post('/v1/api/approve', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required.' });
    }

    try {
        const result = await poolReg.query('SELECT full_name, email, status FROM users WHERE id = $1', [userId]);

        if (result.rows.length === 0) {
            return res.status(200).json({ message: 'User not found' });
        }

        const user = result.rows[0];

        if (user.status === 'Approved') {
            return res.status(200).json({ message: 'User is already approved.', success: true });
        }

        const response = await axios.post(apiUrl, {
            name: user.full_name,
            email: user.email,

        });

         sendEmailApprove(user.email);

        await poolReg.query('UPDATE users SET status = $1 WHERE id = $2', ['Approved', userId]);

        res.status(200).json({
            message: 'User approved successfully',
            data: response.data,
            success: true,
        });
    } catch (error) {
        console.error('Error in approval process:', error.message);
        res.status(500).json({ message: 'Error approving user', error: error.message });
    }
});

// Reject user endpoint
app.post('/v1/api/reject', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    try {
        const result = await poolReg.query('SELECT * FROM users WHERE id = $1', [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await poolReg.query('DELETE FROM users WHERE id = $1', [userId]);

        res.status(200).json({ success: true, message: 'User rejected successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Error rejecting user', error: error.message });
    }
});



//add sim in sim-invertary 

app.post('/v1/api/sim', async (req, res) => {
    const { operator, simNumber, imsiNumber, iccidNumber, simType, assignTo, simPlan, billingCycle, status, simPlanDuration } = req.body;
    const { oprator2, simid2, imsi_number2, iccid_number2, type2 } = req.body;
    const { oprator3, simid3, imsi_number3, iccid_number3, type3 } = req.body;
    const { oprator4, simid4, imsi_number4, iccid_number4, type4 } = req.body;
    const { oprator5, simid5, imsi_number5, iccid_number5, type5 } = req.body;
    const { oprator6, simid6, imsi_number6, iccid_number6, type6 } = req.body;
    const { oprator7, simid7, imsi_number7, iccid_number7, type7 } = req.body;

    if (!operator || !simNumber || !imsiNumber || !iccidNumber || !simType || !assignTo || !simPlan || !billingCycle || !status || !simPlanDuration) {
        return res.status(200).json({
            message: 'All fields are required',
            success: false,
            // data1: result1.rows[0],

        });
    }

    try {


        //check for sim is exist

        const checkQuery = 'SELECT * FROM test1 WHERE iccidNumber = $1';
        const checkValues = [iccidNumber];
        const result = await poolReg.query(checkQuery, checkValues);

        if (result.rows.length > 0) {
            // If deviceId already exists, return an error
            return res.status(200).json({
                message: 'Sim is already exist',
                success: false,
            });
        }


        // Insert into test1 table
        const query1 = `
            INSERT INTO test1 (operator, simNumber, imsiNumber, iccidNumber, simType, assignTo, simPlan, billingCycle, status,simPlanDuration)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;
        `;
        const values1 = [operator, simNumber, imsiNumber, iccidNumber, simType, assignTo, simPlan, billingCycle, status, simPlanDuration];
        // Insert into test2 table


        const result1 = await poolReg.query(query1, values1);


        res.status(200).json({
            message: 'Fields added successfully',
            success: true,
            // data1: result1.rows[0],

        });
    } catch (error) {
        console.error('Error adding/updating data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET route to fetch the total number of SIMs and their statuses (active, deactivated, stack)
app.get('/v1/api/totalsim', async (req, res) => {
    try {
        // Count total SIMs, active, deactivated, and stack SIMs
        const totalQuery = `SELECT COUNT(*) FROM test1`;
        const activeQuery = `SELECT COUNT(*) FROM test1 WHERE status = 'active'`;
        const deactivatedQuery = `SELECT COUNT(*) FROM test1 WHERE status = 'deactivated'`;
        const stackQuery = `SELECT COUNT(*) FROM test1 WHERE status = 'stack'`;

        const totalResult = await poolReg.query(totalQuery);
        const activeResult = await poolReg.query(activeQuery);
        const deactivatedResult = await poolReg.query(deactivatedQuery);
        const stackResult = await poolReg.query(stackQuery);

        res.status(200).json({
            totalSIMs: totalResult.rows[0].count,
            activeSIMs: activeResult.rows[0].count,
            deactivatedSIMs: deactivatedResult.rows[0].count,
            stackSIMs: stackResult.rows[0].count,
        });
    } catch (error) {
        console.error('Error fetching total SIM counts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/v1/api/sim-details', async (req, res) => {
    try {
        const result = await poolReg.query(` 
            SELECT 
                operator, 
                simNumber as "simNumber", 
                imsiNumber as "imsiNumber", 
                iccidNumber as "iccidNumber", 
                simType as "simType", 
                assignTo as "assignTo", 
                simPlan as "simPlan", 
                entryDate as "entryDate", 
                simPlanDuration as "simPlanDuration",
                installationDate as "installationDate",
                status,
                CASE
                    WHEN simPlanDuration = 'Monthly' THEN
                        SUBSTRING(billingCycle FROM 9 FOR 10) || ' of Month'
                    WHEN simPlanDuration = 'Annually' THEN
                        SUBSTRING(billingCycle FROM 9 FOR 10) || '-' ||
                        CASE 
                            WHEN SUBSTRING(billingCycle FROM 6 FOR 2) = '01' THEN 'Jan'
                            WHEN SUBSTRING(billingCycle FROM 6 FOR 2) = '02' THEN 'Feb'
                            WHEN SUBSTRING(billingCycle FROM 6 FOR 2) = '03' THEN 'Mar'
                            WHEN SUBSTRING(billingCycle FROM 6 FOR 2) = '04' THEN 'Apr'
                            WHEN SUBSTRING(billingCycle FROM 6 FOR 2) = '05' THEN 'May'
                            WHEN SUBSTRING(billingCycle FROM 6 FOR 2) = '06' THEN 'Jun'
                            WHEN SUBSTRING(billingCycle FROM 6 FOR 2) = '07' THEN 'Jul'
                            WHEN SUBSTRING(billingCycle FROM 6 FOR 2) = '08' THEN 'Aug'
                            WHEN SUBSTRING(billingCycle FROM 6 FOR 2) = '09' THEN 'Sep'
                            WHEN SUBSTRING(billingCycle FROM 6 FOR 2) = '10' THEN 'Oct'
                            WHEN SUBSTRING(billingCycle FROM 6 FOR 2) = '11' THEN 'Nov'
                            WHEN SUBSTRING(billingCycle FROM 6 FOR 2) = '12' THEN 'Dec'
                            ELSE 'InvalidMonth'
                        END
                    ELSE
                        billingCycle
                END AS "billingCycle"
            FROM test1;
        `);

        if (result.rows.length === 0) {
            return res.status(200).json({ message: 'No SIM data found', success: true });
        }

        res.status(200).json({
            success: true,
            users: result.rows,
        });
    } catch (error) {
        console.error('Error fetching SIM details:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});


// update the sim details
// PUT endpoint to update a record based on ICCID number
app.put('/v1/api/sim/:iccidNumber', async (req, res) => {
    const { iccidNumber, operator, simNumber, imsiNumber, simType, assignTo, simPlan, billingCycle, status, simPlanDuration } = req.body;

    if (!iccidNumber || !operator || !simNumber || !imsiNumber || !simType || !assignTo || !simPlan || !billingCycle || !status || !simPlanDuration) {
        return res.status(200).json({
            message: 'All fields are required',
            success: false,
            // data1: result1.rows[0],

        });
    }

    try {
        // Update the data in the test1 table based on iccidNumber
        const query = `
            UPDATE test1
            SET operator = $1, simNumber = $2, imsiNumber = $3, simType = $4, assignTo = $5, simPlan = $6, billingCycle = $7, status = $8, simPlanDuration = $9
            WHERE iccidNumber = $10
            RETURNING *;
        `;
        const values = [operator, simNumber, imsiNumber, simType, assignTo, simPlan, billingCycle, status, simPlanDuration, iccidNumber];

        const result = await poolReg.query(query, values);

        if (result.rows.length === 0) {
            return res.status(200).json({ message: 'Record not found with the provided ICCID Number', success: false });
        }

        res.status(200).json({
            message: 'Record updated successfully',
            success: true,
            data: result.rows[0],  // Return the updated record
        });
    } catch (error) {
        console.error('Error updating data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE endpoint to delete a record based on ICCID number
app.delete('/v1/api/sim/:iccidNumber', async (req, res) => {
    const { iccidNumber } = req.params;

    if (!iccidNumber) {
        return res.status(200).json({ error: 'ICCID Number is required', success: false });
    }

    try {
        // Delete the record from the test1 table based on iccidNumber
        const query = `
            DELETE FROM test1
            WHERE iccidNumber = $1
            RETURNING *;
        `;
        const values = [iccidNumber];

        const result = await poolReg.query(query, values);

        if (result.rows.length === 0) {
            return res.status(200).json({ message: 'Record not found with the provided ICCID Number', success: false });
        }

        res.status(200).json({
            message: 'Record deleted successfully',
            success: true,
            data: result.rows[0],  // Return the deleted record
        });
    } catch (error) {
        console.error('Error deleting data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// POST Request: Add a new device
// add the devices 

app.post('/v1/api/device', async (req, res) => {
    const { deviceId, status, manufactureName, assignTo } = req.body;

    console.log(req.body);

   // Validate the required fields
    if (!status || !manufactureName || !assignTo || !deviceId ) {
        return res.status(200).json({ message: 'All fields are required', success: false });
    }

    try {
        // Check for device existence in poolReg (traccarplus)
        const checkQuery = 'SELECT * FROM device WHERE deviceid = $1';
        const checkValues = [deviceId];
        const result = await poolReg.query(checkQuery, checkValues);

        if (result.rows.length > 0) {
            return res.status(200).json({
                message: 'Device already exists in M2cloud',
                success: false,
            });
        }

        // Insert into poolReg.device table
        const insertDeviceQuery = `
            INSERT INTO device (deviceid, status, manufacturer_name, assign_to, created_date)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP);
        `;
        const deviceValues = [deviceId, status, manufactureName, assignTo];
        await poolReg.query(insertDeviceQuery, deviceValues);

        // Insert into pool.tc_devices table (using deviceId for both deviceId and uniqueid)
        // const insertTcDevicesQuery = `
        //     INSERT INTO tc_devices (name, uniqueid, lastupdate)
        //     VALUES ($1, $2, CURRENT_TIMESTAMP);
        // `;
        // const tcDeviceValues = [deviceName, deviceId]; // Using deviceName (name) in tc_devices table
        // await pool.query(insertTcDevicesQuery, tcDeviceValues);

        res.status(200).json({
            success: true,
            message: 'Device added successfully.',
        });
    } catch (error) {
        console.error('Error adding device data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//update the devices

app.put('/v1/api/device/:deviceId', async (req, res) => {
    const deviceId = req.params.deviceId;  // Extract deviceId from URL parameter
    const { status, manufactureName, assignTo } = req.body;  // Directly destructure deviceName from request body

    // Validate required fields
    if (!status || !manufactureName || !assignTo ) {
        return res.status(200).json({ message: 'All fields are required', success: false });
    }

    try {
        // First, check if the device exists in the poolReg.device table using deviceId
        const checkDeviceExistence = 'SELECT * FROM device WHERE deviceid = $1';
        const result = await poolReg.query(checkDeviceExistence, [deviceId]);

        if (result.rows.length === 0) {
            return res.status(200).json({ message: 'Device not found in M2cloud', success: false });
        }

        // Update the device in the poolReg.device table using deviceId
        const updateDeviceQuery = `
            UPDATE device
            SET status = $1, manufacturer_name = $2, assign_to = $3
            WHERE deviceid = $4;
        `;
        const updateValues = [status, manufactureName, assignTo, deviceId];
        await poolReg.query(updateDeviceQuery, updateValues);

        // Update the device in the pool.tc_devices table using uniqueid (same as deviceId)
        // const updateTcDevicesQuery = `
        //     UPDATE tc_devices
        //     SET name = $1, uniqueid = $2, lastupdate = CURRENT_TIMESTAMP
        //     WHERE uniqueid = $3;
        // `;
        // const tcDeviceValues = [deviceName, deviceId, deviceId];  // Using deviceName in tc_devices table
        // await pool.query(updateTcDevicesQuery, tcDeviceValues);

        res.status(200).json({
            success: true,
            message: 'Device updated successfully in both',
        });
    } catch (error) {
        console.error('Error updating device data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE Request: Delete a device
app.delete('/v1/api/device/:deviceId', async (req, res) => {
    const deviceId = req.params.deviceId;  // Extract deviceId from URL parameter

    try {
        // First, check if the device exists in the poolReg.device table using deviceId
        const checkDeviceExistence = 'SELECT * FROM device WHERE deviceid = $1';
        const result = await poolReg.query(checkDeviceExistence, [deviceId]);

        if (result.rows.length === 0) {
            return res.status(200).json({ message: 'Device not found in M2cloud', success: false });
        }

        // Delete from poolReg.device table using deviceId
        const deleteDeviceQuery = 'DELETE FROM device WHERE deviceid = $1';
        await poolReg.query(deleteDeviceQuery, [deviceId]);

        // Delete from pool.tc_devices table using uniqueid (same as deviceId)
        // const deleteTcDevicesQuery = 'DELETE FROM tc_devices WHERE uniqueid = $1';
        // await pool.query(deleteTcDevicesQuery, [deviceId]);

        res.status(200).json({
            success: true,
            message: 'Device deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting device data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});





// GET Request: Get all device details from both tables
app.get('/v1/api/device-details', async (req, res) => {
    try {
        // Step 1: Fetch all device details from the poolReg (device) table
        const deviceResult = await poolReg.query(`
            SELECT 
                id, 
                deviceid AS "deviceId", 
                status, 
                manufacturer_name AS "manufactureName", 
                created_date AS "createdDate", 
                assign_to AS "assignTo"
            FROM 
                device
        `);

        // If no devices are found in the poolReg device table, return a message
        if (deviceResult.rows.length === 0) {
            return res.status(200).json({ message: 'No devices found in M2cloud', success: false });
        }

        // Log the device results to check deviceId values
        console.log("Device Result:", deviceResult.rows);

        // Step 2: Fetch all device names from the tc_devices table based on deviceId and uniqueid
        const deviceIds = deviceResult.rows.map(device => `'${device.deviceId}'`).join(',');

        // Log the deviceIds to make sure we're querying with the correct deviceId values
        console.log("Device IDs being queried:", deviceIds);

        const tcDevicesResult = await pool.query(`
            SELECT 
                uniqueid AS "deviceId", 
                name AS "deviceName"
            FROM 
                tc_devices
            WHERE 
                uniqueid IN (${deviceIds})
        `);

        // Log the tc_devices results to check if we have matching device names
        console.log("TC Devices Result:", tcDevicesResult.rows);

        // Step 3: Create a lookup object for device names from tc_devices
        const tcDeviceLookup = {};
        tcDevicesResult.rows.forEach(tcDevice => {
            tcDeviceLookup[tcDevice.deviceId] = tcDevice.deviceName;
        });

        // Log the lookup object to verify the mapping
        console.log("TC Device Lookup:", tcDeviceLookup);

        // Step 4: Combine data from both tables
        const devicesWithNames = deviceResult.rows.map(device => {
            return {
                ...device,
                deviceName: tcDeviceLookup[device.deviceId] || null  // Add deviceName if found, otherwise null
            };
        });

        // Step 5: Return the combined data as a response
        res.status(200).json({
            success: true,
            devices: devicesWithNames,  // Return the final combined device details
        });

    } catch (error) {
        console.error('Error fetching device data:', error);
        res.status(500).json({success: false, error: 'Internal Server Error' });
    }
});





// POST route to add or update fields for a specific record by ID
app.post('/v1/api/sim-device', async (req, res) => {
    const { role, sim, device } = req.body;

    if (!role || !sim || !device) {
        return res.status(200).json({ message: 'All fields are required', success: false });
    }

    try {
        // Insert into device table
        const query = `
            INSERT INTO simdevice (role, sim, device)
            VALUES ($1, $2, $3);
        `;
        const values = [role, sim, device];

        // Perform the insert query
        await poolReg.query(query, values);

        // Return a success message
        res.status(200).json({
            message: 'sim + Device added successfully',
            success: true,
        });
    } catch (error) {
        console.error('Error adding device data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



//update(PUT request) the detalis

app.put('/v1/api/sim-device/:id', async (req, res) => {
    const { id } = req.params; // Get the ID from the URL parameter
    const { role, sim, device } = req.body; // Get the data to update from the request body

    if (!role || !sim || !device) {
        return res.status(200).json({ message: 'All fields are required', success: false });
    }

    try {
        // SQL query to update the record by ID
        const query = `
            UPDATE simdevice 
            SET role = $1, sim = $2, device = $3
            WHERE id = $4;
        `;
        const values = [role, sim, device, id];

        // Perform the update query
        const result = await poolReg.query(query, values);

        if (result.rowCount === 0) {
            // If no rows are affected, meaning the ID was not found
            return res.status(200).json({
                message: 'Record not found',
                success: false,
            });
        }

        // Return a success message
        res.status(200).json({
            message: `Sim + Device updated successfully`,
            success: true,
        });
    } catch (error) {
        console.error('Error updating device data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



// GET route to fetch device details
app.get('/v1/api/simdevice-details', async (req, res) => {
    try {
        // Query for device details
        const result = await poolReg.query(`SELECT id, role, sim, device FROM simdevice`);

        // Check if there are any devices in the database
        if (result.rows.length === 0) {
            return res.status(200).json({ message: 'Data not found', success: true });
        }

        // Send the retrieved data back as a response
        res.status(200).json({
            success: true,
            devices: result.rows,
        });
    } catch (error) {
        console.error('Error fetching device data:', error);
        res.status(500).json({success: false, error: 'Internal Server Error' });
    }
});

// delete the sim + device 
app.delete('/v1/api/sim-device/:id', async (req, res) => {
    const { id } = req.params; 

    if (!id) {
        return res.status(400).json({ message: 'ID is required', success: false });
    }

    try {
        // SQL query to delete a record by ID
        const query = `
            DELETE FROM simdevice WHERE id = $1;
        `;
        const values = [id];

        // Perform the delete query
        const result = await poolReg.query(query, values);

        if (result.rowCount === 0) {
            // No rows deleted, meaning the ID was not found
            return res.status(200).json({
                message: 'Device not found',
                success: false,
            });
        }

        // Return a success message
        res.status(200).json({
            message: `Deleted successfully`,
            success: true,
        });
    } catch (error) {
        console.error('Error deleting device data:', error);
        res.status(500).json({success: false, error: 'Internal Server Error' });
    }
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});