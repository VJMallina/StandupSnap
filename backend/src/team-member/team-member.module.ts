import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamMemberService } from './team-member.service';
import { TeamMemberController } from './team-member.controller';
import { AuthModule } from '../auth/auth.module';
import { OrgUser } from '../entities/org-user.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([OrgUser, User])],
  controllers: [TeamMemberController],
  providers: [TeamMemberService],
  exports: [TeamMemberService],
})
export class TeamMemberModule {}
