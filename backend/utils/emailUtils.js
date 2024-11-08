const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailUtils {
  constructor() {
    this.EMAIL_USER = process.env.EMAIL_USER;
    this.EMAIL_PASS = process.env.EMAIL_APP_PASSWORD;
    this.COMPANY_NAME = 'Savannah Bites';
    this.SUPPORT_EMAIL = 'support@savannahbites.com';
    
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.EMAIL_USER,
        pass: this.EMAIL_PASS,
      },
      pool: true,
      maxConnections: 1,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
    });
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(String(email).toLowerCase());
  }

  formatDate(date) {
    if (!date) return 'Date not specified';
    
    try {
      const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      return new Date(date).toLocaleDateString('en-US', options);
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Date not available';
    }
  }

  formatTime(time) {
    if (!time) return 'Time not specified';
    return time;
  }

  // Add the missing formatCurrency function
  formatCurrency(amount) {
    try {
      // Handle null, undefined, or invalid input
      if (!amount || isNaN(amount)) {
        return '0.00';
      }
      // Convert to number and format with 2 decimal places
      return Number(amount).toFixed(2);
    } catch (error) {
      console.error('Currency formatting error:', error);
      return '0.00';
    }
  }

  async sendEmail(to, subject, htmlContent, retryAttempts = 3) {
    if (!this.validateEmail(to)) {
      throw new Error('Invalid email address');
    }

    const mailOptions = {
      from: `"${this.COMPANY_NAME}" <${this.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    let lastError;
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const info = await this.transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', {
          to,
          subject,
          messageId: info.messageId,
          attempt
        });
        return true;
      } catch (error) {
        lastError = error;
        console.error(`Email attempt ${attempt} failed:`, error);
        if (attempt < retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new Error(`Failed to send email after ${retryAttempts} attempts: ${lastError.message}`);
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service is ready');
      return true;
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }
}

// Export a singleton instance
const emailUtils = new EmailUtils();
module.exports = emailUtils;