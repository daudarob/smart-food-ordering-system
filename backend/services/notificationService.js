const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');

// Initialize services conditionally
let twilioClient = null;
let firebaseInitialized = false;

try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
} catch (error) {
  console.warn('Twilio initialization failed:', error.message);
}

try {
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'dummy') {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  } else {
    console.log('SendGrid not configured for development - skipping initialization');
  }
} catch (error) {
  console.warn('SendGrid initialization failed:', error.message);
}

try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID !== 'dummy') {
    const serviceAccount = require('../config/firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    firebaseInitialized = true;
  } else {
    console.log('Firebase not configured for development - skipping initialization');
  }
} catch (error) {
  console.warn('Firebase initialization failed:', error.message);
}

class NotificationService {
  async sendSMS(to, message) {
    if (!twilioClient) {
      console.warn('SMS not sent: Twilio not initialized');
      return;
    }
    try {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to
      });
      console.log('SMS sent successfully');
    } catch (error) {
      console.error('Error sending SMS:', error);
    }
  }

  async sendEmail(to, subject, text, html) {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('Email not sent: SendGrid not initialized');
      return;
    }
    try {
      const msg = {
        to: to,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: subject,
        text: text,
        html: html
      };
      await sgMail.send(msg);
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  async sendPushNotification(token, title, body, data = {}) {
    if (!firebaseInitialized) {
      console.warn('Push notification not sent: Firebase not initialized');
      return;
    }
    try {
      const message = {
        token: token,
        notification: {
          title: title,
          body: body
        },
        data: data
      };
      await admin.messaging().send(message);
      console.log('Push notification sent successfully');
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  async notifyOrderStatusChange(order, user) {
    const message = `Your order #${order.id} status has been updated to: ${order.status}`;
    const emailSubject = `Order Status Update - Order #${order.id}`;
    const emailHtml = `<p>Dear ${user.name},</p><p>${message}</p><p>Thank you for choosing our service!</p>`;

    // Send SMS if phone number available
    if (user.phone) {
      await this.sendSMS(user.phone, message);
    }

    // Send Email
    await this.sendEmail(user.email, emailSubject, message, emailHtml);

    // Send Push Notification if FCM token available (assuming user has fcm_token field)
    if (user.fcm_token && firebaseInitialized) {
      await this.sendPushNotification(user.fcm_token, 'Order Status Update', message, { orderId: order.id, status: order.status });
    }
  }
}

module.exports = new NotificationService();