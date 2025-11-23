import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { JwtAuthGlobalGuard } from './auth/guards/jwt-auth-global.guard';
import { DataSource } from 'typeorm';
import { runSeeders } from './database/seed';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function killPortProcess(port: number): Promise<void> {
  try {
    if (process.platform === 'win32') {
      // Windows: find and kill process using the port
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.split('\n').filter(line => line.includes('LISTENING'));
      const pids = new Set<string>();

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(Number(pid))) {
          pids.add(pid);
        }
      }

      for (const pid of pids) {
        try {
          await execAsync(`taskkill /F /PID ${pid}`);
          console.log(`Killed process ${pid} using port ${port}`);
        } catch {
          // Process might have already exited
        }
      }
    } else {
      // Unix/Linux/Mac
      await execAsync(`lsof -ti:${port} | xargs kill -9`);
      console.log(`Killed process using port ${port}`);
    }
  } catch {
    // No process found on port, which is fine
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global JWT authentication guard
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGlobalGuard(reflector));

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('StandupSnap API')
    .setDescription('API documentation for StandupSnap - Quick Standup Generator')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Run database seeders
  const dataSource = app.get(DataSource);
  await runSeeders(dataSource);

  const port = Number(process.env.PORT) || 3000;

  // Only kill port in development
  if (process.env.NODE_ENV !== 'production') {
    await killPortProcess(port);
  }

  // Listen on 0.0.0.0 for container environments
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on port ${port}`);
}
bootstrap();
