const emailUtils = require('../utils/emailUtils');

class OrderEmailService {
  constructor() {
    this.emailUtils = emailUtils;
  }

  createOrderEmailTemplate(order) {
    try {
      // Extract order details with safe fallbacks
      const customer = order?.customer || {};
      const address = order?.address || {};
      const items = order?.orderDetails || [];
      const amount = order?.amount || {};

      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #E57A44; margin: 0;">${this.emailUtils.COMPANY_NAME}</h1>
            <p style="color: #666; margin-top: 10px;">Order Confirmation</p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Order Details</h2>
            <p style="margin: 5px 0;"><strong>Order ID:</strong> ${order?._id || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Order Date:</strong> ${this.emailUtils.formatDate(order?.createdAt)}</p>
            
            <div style="margin-top: 20px; background-color: #fff; padding: 15px; border-radius: 6px;">
              <h3 style="color: #333; margin-top: 0;">Delivery Information</h3>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${customer.name || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${customer.email || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Delivery Address:</strong><br/>
                ${address.street || 'N/A'}<br/>
                ${address.city || 'N/A'}<br/>
                ${address.postcode || 'N/A'}
              </p>
            </div>
            
            <div style="margin-top: 20px;">
              <h3 style="color: #333; margin-bottom: 15px;">Order Summary</h3>
              <div style="border-top: 1px solid #ddd;">
                ${items.map(item => `
                  <div style="padding: 10px 0; border-bottom: 1px solid #ddd;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="font-weight: bold;">${item.name || 'Unknown Item'}</span>
                      <span>£${this.emailUtils.formatCurrency((item.price || 0) * (item.quantity || 1))}</span>
                    </div>
                    <div style="color: #666; font-size: 0.9em; margin-top: 5px;">
                      Quantity: ${item.quantity || 1}
                      ${item.size ? ` • Size: ${item.size}` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
              
              <div style="margin-top: 20px; text-align: right;">
                <p style="margin: 5px 0;">Subtotal: £${this.emailUtils.formatCurrency(amount.subtotal || 0)}</p>
                <p style="margin: 5px 0;">Delivery Fee: £${this.emailUtils.formatCurrency(amount.deliveryFee || 2.50)}</p>
                <p style="font-weight: bold; font-size: 1.1em; margin: 10px 0;">
                  Total Amount: £${this.emailUtils.formatCurrency(amount.total || 0)}
                </p>
              </div>
            </div>
          </div>

          <div style="text-align: center; margin-top: 30px; color: #666;">
            <p style="margin: 5px 0;">Need help? Contact us at ${this.emailUtils.SUPPORT_EMAIL}</p>
            <p style="margin: 5px 0; font-size: 0.9em;">
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error creating email template:', error);
      throw error;
    }
  }

  async sendOrderConfirmation(email, order) {
    try {
      if (!email || !order) {
        throw new Error('Email and order are required');
      }

      const subject = `Order Confirmation #${order._id} - ${this.emailUtils.COMPANY_NAME}`;
      const htmlContent = this.createOrderEmailTemplate(order);
      
      await this.emailUtils.sendEmail(email, subject, htmlContent);
      
      console.log('Order confirmation sent successfully:', {
        orderId: order._id,
        email
      });
    } catch (error) {
      console.error('Failed to send order confirmation:', error);
      throw error;
    }
  }
}

// Export a singleton instance
const orderEmailService = new OrderEmailService();
module.exports = orderEmailService;