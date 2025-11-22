import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        let transport;

        // Use Ethereal for testing if no MAIL_USER is configured or in development
        if (!configService.get('MAIL_USER') || configService.get('MAIL_HOST') === 'smtp.ethereal.email') {
          const testAccount = await nodemailer.createTestAccount();
          console.log('========================================');
          console.log('ETHEREAL TEST EMAIL ACCOUNT CREATED');
          console.log('View sent emails at: https://ethereal.email');
          console.log('Login:', testAccount.user);
          console.log('Password:', testAccount.pass);
          console.log('========================================');

          transport = {
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          };
        } else {
          transport = {
            host: configService.get('MAIL_HOST', 'smtp.gmail.com'),
            port: parseInt(configService.get('MAIL_PORT', '587')),
            secure: configService.get('MAIL_SECURE') === 'true',
            auth: {
              user: configService.get('MAIL_USER'),
              pass: configService.get('MAIL_PASSWORD'),
            },
          };
        }

        return {
          transport,
          defaults: {
            from: `"StandupSnap" <${configService.get('MAIL_FROM', 'noreply@standupsnap.com')}>`,
          },
          template: {
            dir: join(__dirname, 'templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
