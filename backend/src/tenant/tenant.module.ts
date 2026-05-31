import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantService } from './tenant.service';
import { TenantMiddleware } from './tenant.middleware';

/**
 * @Global() so every module in the app can inject TenantService without
 * explicitly importing TenantModule.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [TenantService, TenantMiddleware],
  exports: [TenantService, TenantMiddleware],
})
export class TenantModule {}
