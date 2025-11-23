import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendInvitation(
    email: string,
    token: string,
    role: string,
    projectName?: string,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${frontendUrl}/register?token=${token}`;

    const roleDisplay = role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    console.log(`Attempting to send invitation email to ${email}`);

    const result = await this.mailerService.sendMail({
      to: email,
      subject: `You're invited to join StandupSnap${projectName ? ` - ${projectName}` : ''}`,
      template: 'invitation',
      context: {
        inviteUrl,
        role: roleDisplay,
        projectName,
        email,
      },
    });

    console.log(`Email sent successfully to ${email}`, result);
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    console.log(`Attempting to send password reset email to ${email}`);

    const result = await this.mailerService.sendMail({
      to: email,
      subject: 'Reset your StandupSnap password',
      template: 'password-reset',
      context: {
        resetUrl,
        email,
      },
    });

    console.log(`Password reset email sent successfully to ${email}`, result);
  }
}
