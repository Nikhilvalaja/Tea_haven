const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    // Check if email is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.log('Email service not configured - SMTP credentials missing');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    this.initialized = true;
    console.log('Email service initialized');
  }

  async sendEmail({ to, subject, html, text }) {
    this.initialize();

    if (!this.transporter) {
      console.log('Email not sent - service not configured');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || '"TeaHaven" <noreply@teahaven.com>',
        to,
        subject,
        html,
        text
      });

      console.log('Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, message: error.message };
    }
  }

  async sendPasswordResetEmail(email, token, baseUrl) {
    const resetLink = `${baseUrl}/reset-password/${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2E7D32, #4CAF50); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #2E7D32; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TeaHaven</h1>
            <p>Password Reset Request</p>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password for your TeaHaven account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button" style="color: white;">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2E7D32;">${resetLink}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} TeaHaven - Premium Imported Tea</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      TeaHaven - Password Reset

      We received a request to reset your password.

      Click this link to reset your password:
      ${resetLink}

      This link will expire in 1 hour.

      If you didn't request this, you can ignore this email.
    `;

    return this.sendEmail({
      to: email,
      subject: 'TeaHaven - Reset Your Password',
      html,
      text
    });
  }

  async sendWelcomeEmail(email, firstName) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2E7D32, #4CAF50); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to TeaHaven!</h1>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>Thank you for joining TeaHaven! We're excited to have you as part of our tea-loving community.</p>
            <p>Explore our premium collection of imported teas from around the world:</p>
            <ul>
              <li>Black Teas from India & Sri Lanka</li>
              <li>Green Teas from Japan & China</li>
              <li>Oolong Teas from Taiwan</li>
              <li>Herbal & Wellness Blends</li>
            </ul>
            <p>Happy sipping!</p>
            <p>The TeaHaven Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} TeaHaven - Premium Imported Tea</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to TeaHaven!',
      html,
      text: `Welcome to TeaHaven, ${firstName}! Thank you for joining our tea-loving community.`
    });
  }

  async sendOrderConfirmationEmail(email, order) {
    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">$${item.price.toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2E7D32, #4CAF50); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #2E7D32; color: white; padding: 10px; text-align: left; }
          .total { font-size: 18px; font-weight: bold; color: #2E7D32; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed!</h1>
            <p>Order #${order.id}</p>
          </div>
          <div class="content">
            <p>Thank you for your order!</p>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <p class="total">Total: $${order.total.toFixed(2)}</p>
            <p>We'll send you another email when your order ships.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} TeaHaven</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `TeaHaven - Order Confirmation #${order.id}`,
      html,
      text: `Order #${order.id} confirmed! Total: $${order.total.toFixed(2)}`
    });
  }
}

module.exports = new EmailService();
