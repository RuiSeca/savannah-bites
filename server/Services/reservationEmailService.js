const emailUtils = require('../utils/emailUtils');

class ReservationEmailService {
  constructor() {
    this.emailUtils = emailUtils;
  }

  createReservationEmailTemplate(reservation) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #E57A44; margin: 0;">${this.emailUtils.COMPANY_NAME}</h1>
          <p style="color: #666; margin-top: 10px;">Your Table Reservation Confirmation</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #333; margin-top: 0;">Reservation Details</h2>
          <div style="background-color: #fff; padding: 15px; border-radius: 6px;">
            <h3 style="color: #333; margin-top: 0;">Booking Information</h3>
            <p style="margin: 5px 0;"><strong>Confirmation Number:</strong> ${reservation._id}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${this.emailUtils.formatDate(reservation.date)}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${this.emailUtils.formatTime(reservation.time)}</p>
            <p style="margin: 5px 0;"><strong>Number of Guests:</strong> ${reservation.guests}</p>
            
            <div style="margin-top: 15px;">
              <h4 style="color: #333; margin-bottom: 5px;">Guest Details</h4>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${reservation.name}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${reservation.email}</p>
              <p style="margin: 5px 0;"><strong>Phone:</strong> ${reservation.phone || 'Not provided'}</p>
            </div>

            ${reservation.allergies ? `
              <div style="margin-top: 15px;">
                <h4 style="color: #333; margin-bottom: 5px;">Special Requirements</h4>
                <p style="margin: 5px 0;"><strong>Dietary Notes:</strong> ${reservation.allergies}</p>
              </div>
            ` : ''}
          </div>

          <div style="margin-top: 20px; padding: 15px; background-color: #fff; border-radius: 6px;">
            <h3 style="color: #333; margin-top: 0;">Important Information</h3>
            <ul style="padding-left: 20px; margin: 10px 0;">
              <li style="margin-bottom: 8px;">Please arrive 5-10 minutes before your reservation time.</li>
              <li style="margin-bottom: 8px;">Your table will be held for 15 minutes after your reservation time.</li>
              <li style="margin-bottom: 8px;">If you need to modify or cancel your reservation, please contact us at least 2 hours in advance.</li>
            </ul>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px; color: #666;">
          <p style="margin: 5px 0;">Need to make changes? Contact us at ${this.emailUtils.SUPPORT_EMAIL}</p>
          <p style="margin: 5px 0;">Or call us at: (123) 456-7890</p>
          <p style="margin: 15px 0;">Thank you for choosing ${this.emailUtils.COMPANY_NAME}!</p>
          <p style="margin: 5px 0; font-size: 0.9em;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      </div>
    `;
  }

  async sendReservationConfirmation(email, reservation) {
    try {
      const subject = `Table Reservation Confirmation - ${this.emailUtils.COMPANY_NAME}`;
      const htmlContent = this.createReservationEmailTemplate(reservation);
      
      await this.emailUtils.sendEmail(email, subject, htmlContent);
      
      console.log('Reservation confirmation sent successfully:', {
        reservationId: reservation._id,
        email
      });
    } catch (error) {
      console.error('Failed to send reservation confirmation:', error);
      throw error;
    }
  }
}

module.exports = new ReservationEmailService();