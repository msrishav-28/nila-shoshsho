import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendWeatherAlerts = async ({ to, message }) => {
    // Clean the phone number (remove spaces, ensure + prefix)
    const cleanPhone = to.replace(/\s+/g, '').replace(/^(\d)/, '+$1');
    
    try {
      // SMS
      const sms = await client.messages.create({
        from: process.env.TWILIO_SMS_NUMBER,
        to: cleanPhone,  // Now properly formatted
        body: message,
      });
  
      // WhatsApp (try-catch as it may fail if not opted-in)
      try {
        const whatsapp = await client.messages.create({
          from: process.env.TWILIO_WHATSAPP_NUMBER,
          to: `whatsapp:${cleanPhone}`,
          body: message,
        });
        return { sms, whatsapp };
      } catch (whatsappError) {
        console.log("WhatsApp failed (user may not have opted-in)");
        return { sms };
      }
    } catch (err) {
      console.error("Failed to send alerts:", err);
      throw err;
    }
  };
