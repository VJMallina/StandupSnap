import { Module } from '@nestjs/common';
import { IncidentService } from './incident.service';
import { IncidentController } from './incident.controller';
import { IncidentGateway } from './incident.gateway';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TenantModule, AuthModule],
  providers: [IncidentService, IncidentGateway],
  controllers: [IncidentController],
  exports: [IncidentService, IncidentGateway],
})
export class IncidentModule {}
