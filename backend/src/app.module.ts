import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StandupModule } from './standup/standup.module';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { SprintModule } from './sprint/sprint.module';
import { InvitationModule } from './invitation/invitation.module';
import { UsersModule } from './users/users.module';
import { TeamMemberModule } from './team-member/team-member.module';
import { CardModule } from './card/card.module';
import { SnapModule } from './snap/snap.module';

// Team Management Module for non-login team members
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: +configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    StandupModule,
    ProjectModule,
    SprintModule,
    InvitationModule,
    UsersModule,
    TeamMemberModule,
    CardModule,
    SnapModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
