import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { RoleName, Permission } from '../entities/role.entity';

describe('AuthController Integration Tests (RBAC)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  const testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'Test123456',
    firstName: 'Test',
    lastName: 'User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user with default Scrum Master role', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).toHaveProperty('roles');
      expect(Array.isArray(response.body.user.roles)).toBe(true);

      // User should have at least one role
      expect(response.body.user.roles.length).toBeGreaterThan(0);

      // Store tokens for subsequent tests
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
      userId = response.body.user.id;

      // Verify role structure
      const userRole = response.body.user.roles[0];
      expect(userRole).toHaveProperty('name');
      expect(Object.values(RoleName)).toContain(userRole.name);
    });

    it('should return user with permissions in roles', async () => {
      const uniqueEmail = `permissions${Date.now()}@example.com`;

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: uniqueEmail,
        })
        .expect(201);

      const userRole = response.body.user.roles[0];
      expect(userRole).toHaveProperty('permissions');
      expect(Array.isArray(userRole.permissions)).toBe(true);

      // Scrum Master should have all permissions
      if (userRole.name === RoleName.SCRUM_MASTER) {
        expect(userRole.permissions.length).toBeGreaterThan(0);
        expect(userRole.permissions).toContain(Permission.CREATE_PROJECT);
        expect(userRole.permissions).toContain(Permission.VIEW_PROJECT);
        expect(userRole.permissions).toContain(Permission.MANAGE_ROLES);
      }
    });

    it('should reject registration with duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password, firstName, lastName
        })
        .expect(400);
    });

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test123456',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login and return user with roles', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('roles');
      expect(response.body.user.roles.length).toBeGreaterThan(0);
    });

    it('should return user with role permissions', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const userRole = response.body.user.roles[0];
      expect(userRole).toHaveProperty('permissions');
      expect(Array.isArray(userRole.permissions)).toBe(true);
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123456',
        })
        .expect(401);
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile with roles when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', userId);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('roles');
      expect(Array.isArray(response.body.roles)).toBe(true);
      expect(response.body.roles.length).toBeGreaterThan(0);
    });

    it('should return roles with permissions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const userRole = response.body.roles[0];
      expect(userRole).toHaveProperty('name');
      expect(userRole).toHaveProperty('permissions');
      expect(Array.isArray(userRole.permissions)).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      // New tokens should be different
      expect(response.body.accessToken).not.toBe(accessToken);
      expect(response.body.refreshToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });

    it('should reject missing refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully when authenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);
    });

    it('should reject unauthenticated logout', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('Role Verification in Auth Flow', () => {
    it('should maintain roles throughout auth lifecycle', async () => {
      const uniqueEmail = `lifecycle${Date.now()}@example.com`;

      // 1. Register
      const registerResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: uniqueEmail,
        })
        .expect(201);

      const registeredRoles = registerResponse.body.user.roles;
      const token = registerResponse.body.accessToken;

      // 2. Get Profile
      const profileResponse = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const profileRoles = profileResponse.body.roles;

      // 3. Login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: uniqueEmail,
          password: testUser.password,
        })
        .expect(200);

      const loginRoles = loginResponse.body.user.roles;

      // Verify roles are consistent
      expect(registeredRoles.length).toBe(profileRoles.length);
      expect(profileRoles.length).toBe(loginRoles.length);

      // Verify role names match
      expect(registeredRoles[0].name).toBe(profileRoles[0].name);
      expect(profileRoles[0].name).toBe(loginRoles[0].name);

      // Verify permissions match
      expect(registeredRoles[0].permissions).toEqual(profileRoles[0].permissions);
      expect(profileRoles[0].permissions).toEqual(loginRoles[0].permissions);
    });

    it('should include role metadata in responses', async () => {
      const uniqueEmail = `metadata${Date.now()}@example.com`;

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: uniqueEmail,
        })
        .expect(201);

      const role = response.body.user.roles[0];

      expect(role).toHaveProperty('id');
      expect(role).toHaveProperty('name');
      expect(role).toHaveProperty('description');
      expect(role).toHaveProperty('permissions');

      // Verify role description exists
      expect(typeof role.description).toBe('string');
      expect(role.description.length).toBeGreaterThan(0);
    });
  });
});
