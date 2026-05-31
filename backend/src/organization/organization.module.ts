import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { Organization } from '../entities/organization.entity';
import { OrgUser } from '../entities/org-user.entity';
import { OrgRole } from '../entities/org-role.entity';
import { OrgInvitation } from '../entities/org-invitation.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { User } from '../entities/user.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrgUser,
      OrgRole,
      OrgInvitation,
      RolePermission,
      User,
    ]),
    MailModule,
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
