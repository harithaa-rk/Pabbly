import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (env.smtp.user && env.smtp.password) {
      this.transporter = nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465,
        auth: {
          user: env.smtp.user,
          pass: env.smtp.password,
        },
      });
    }
  }

  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const verificationUrl = `${env.frontendUrl}/verify-email?token=${token}`;

    if (!this.transporter) {
      console.log('----------------------------------------------------');
      console.log('📧 [EMAIL VERIFICATION LINK - LOCAL/DEV SIMULATION]');
      console.log(`To: ${name} <${email}>`);
      console.log(`Verification URL: ${verificationUrl}`);
      console.log('----------------------------------------------------');
      return;
    }

    const mailOptions = {
      from: env.smtp.from,
      to: email,
      subject: 'Verify your Kaira Connect account',
      text: `Hello ${name},\n\nPlease verify your Kaira Connect email address by clicking the link below:\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nBest regards,\nThe Kaira Connect Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
          <h2 style="color: #4f46e5;">Welcome to Kaira Connect!</h2>
          <p>Hello ${name},</p>
          <p>Thank you for signing up for Kaira Connect, the next-generation automation workflow platform.</p>
          <p>Please click the button below to verify your email address:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
          </p>
          <p>Or paste this link into your browser: <br/><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p style="color: #64748b; font-size: 13px; margin-top: 30px;">This link will expire in 24 hours. If you did not create this account, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('❌ Failed to send verification email via SMTP:', error);
      console.log(`Fallback Verification Link: ${verificationUrl}`);
    }
  }

  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    const resetUrl = `${env.frontendUrl}/reset-password?token=${token}`;

    if (!this.transporter) {
      console.log('----------------------------------------------------');
      console.log('🔑 [PASSWORD RESET LINK - LOCAL/DEV SIMULATION]');
      console.log(`To: ${name} <${email}>`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log('----------------------------------------------------');
      return;
    }

    const mailOptions = {
      from: env.smtp.from,
      to: email,
      subject: 'Reset your Kaira Connect password',
      text: `Hello ${name},\n\nYou requested a password reset for your Kaira Connect account. Click the link below to set a new password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
          <h2 style="color: #4f46e5;">Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>We received a request to reset the password for your Kaira Connect account.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </p>
          <p>Or paste this link into your browser: <br/><a href="${resetUrl}">${resetUrl}</a></p>
          <p style="color: #64748b; font-size: 13px; margin-top: 30px;">This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this message.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('❌ Failed to send password reset email via SMTP:', error);
      console.log(`Fallback Reset Link: ${resetUrl}`);
    }
  }
}

export const emailService = new EmailService();

