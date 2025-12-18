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
import { AssigneeModule } from './assignee/assignee.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { StandupBookModule } from './standup-book/standup-book.module';
import { ArtifactsModule } from './artifacts/artifacts.module';
import { StandaloneMomModule } from './standalone-mom/standalone-mom.module';
import { ScrumRoomsModule } from './scrum-rooms/scrum-rooms.module';
import { ResourceModule } from './resource/resource.module';

// Team Management Module for non-login team members
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get('DATABASE_URL');

        if (databaseUrl) {
          // Use DATABASE_URL (Fly.io format)
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true, // Enable for initial deployment, disable later
            logging: process.env.NODE_ENV === 'development',
            // Connection pooling for better performance with remote database
            extra: {
              max: 10, // Maximum number of connections in pool
              min: 2,  // Minimum number of connections in pool
              connectionTimeoutMillis: 5000, // Timeout for acquiring connection
              idleTimeoutMillis: 30000, // Close idle connections after 30s
            },
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          };
        }

        // Fallback to individual env vars (local development)
        return {
          type: 'postgres',
          host: configService.get('DATABASE_HOST'),
          port: +configService.get('DATABASE_PORT'),
          username: configService.get('DATABASE_USER'),
          password: configService.get('DATABASE_PASSWORD'),
          database: configService.get('DATABASE_NAME'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: process.env.NODE_ENV === 'development',
          logging: process.env.NODE_ENV === 'development',
          // Connection pooling for better performance with remote database
          extra: {
            max: 10, // Maximum number of connections in pool
            min: 2,  // Minimum number of connections in pool
            connectionTimeoutMillis: 5000, // Timeout for acquiring connection
            idleTimeoutMillis: 30000, // Close idle connections after 30s
          },
          ssl: configService.get('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        };
      },
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
    AssigneeModule,
    DashboardModule,
    StandupBookModule,
    ArtifactsModule,
    StandaloneMomModule,
    ScrumRoomsModule,
    ResourceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
