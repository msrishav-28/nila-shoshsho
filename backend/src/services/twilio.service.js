import twilio from 'twilio';

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

export const sendSMS = async ({ to, message }) => {
    try {
        const response = await client.messages.create({
            body: message,
            to: to.startsWith('+') ? to : `+${to}`,
            from: process.env.TWILIO_PHONE_NUMBER
        });
        
        return response;
    } catch (error) {
        console.error('Error sending SMS:', error);
        throw error;
    }
};