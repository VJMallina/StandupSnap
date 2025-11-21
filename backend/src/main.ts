import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
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

  // Run database seeders
  const dataSource = app.get(DataSource);
  await runSeeders(dataSource);

  const port = Number(process.env.PORT) || 3000;
  await killPortProcess(port);
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
