import twilio from 'twilio';

// Initialize Twilio client
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// Temporary In-Memory Store (just a simple object)
const otpStore = {}; // { phoneNo: { code, expiresAt, attempts } }

// Generate and send OTP
export const generateAndSendOTP = async (req, res) => {
    try {
        console.log('hiii')
        const { phoneNo } = req.body;
        console.log('phone for twilio otp' , phoneNo)

        if (!phoneNo) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        // Check if last OTP was sent within 1 minute
        if (
            otpStore[phoneNo] &&
            otpStore[phoneNo].lastSent &&
            Date.now() - otpStore[phoneNo].lastSent.getTime() < 6000
        ) {
            return res.status(429).json({
                success: false,
                message: "Please wait 0.1 minute before requesting another OTP"
            });
        }

        // Generate 4-digit OTP
        const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); 

        // Save OTP to memory
        otpStore[phoneNo] = {
            code: otpCode,
            expiresAt: otpExpiry,
            attempts: 0,
            lastSent: new Date()
        };

        // Send OTP via Twilio SMS
        await client.messages.create({
            body: `Your verification code is: ${otpCode}. Valid for 10 minutes.`,
            to: phoneNo,
            from: process.env.TWILIO_SMS_NUMBER // ⚡ Correct Twilio number
        });

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully"
        });

    } catch (error) {
        console.error("OTP Generation Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate and send OTP"
        });
    }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
    try {
        const { phoneNo, otp } = req.body;

        if (!phoneNo || !otp) {
            return res.status(400).json({
                success: false,
                message: "Phone number and OTP are required"
            });
        }

        const storedOTP = otpStore[phoneNo];

        if (!storedOTP) {
            return res.status(400).json({
                success: false,
                message: "No OTP requested for this number"
            });
        }

        // Check if OTP expired
        if (storedOTP.expiresAt < new Date()) {
            delete otpStore[phoneNo];
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one"
            });
        }

        // Check max attempts (Optional, you can limit retries)
        if (storedOTP.attempts >= 3) {
            delete otpStore[phoneNo];
            return res.status(400).json({
                success: false,
                message: "Maximum verification attempts exceeded. Please request a new OTP"
            });
        }

        // Check if OTP matches
        if (storedOTP.code !== otp) {
            storedOTP.attempts += 1;
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please try again"
            });
        }

        // OTP Verified Successfully
        delete otpStore[phoneNo]; // Clear the OTP after success

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully"
        });

    } catch (error) {
        console.error("OTP Verification Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to verify OTP"
        });
    }
};
