import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository, DataSource } from 'typeorm';
import { Client } from 'pg';
import { AppModule } from '../src/app.module';
import { Entry } from '../src/entries/entities/entry.entity';
import { User } from '../src/auth/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

async function createTestDatabaseIfNotExists() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres', // Connect to default postgres database first
  });

  try {
    await client.connect();

    // Check if test database exists
    const result = await client.query("SELECT 1 FROM pg_database WHERE datname = 'rose_bud_thorn_test'");

    if (result.rows.length === 0) {
      // Database doesn't exist, create it
      await client.query('CREATE DATABASE rose_bud_thorn_test');
      console.log('✅ Created test database: rose_bud_thorn_test');
    } else {
      console.log('✅ Test database already exists: rose_bud_thorn_test');
    }
  } catch (error) {
    console.error('❌ Error creating test database:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

describe('EntriesController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let testUser: User;
  let authToken: string;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    // Ensure test database exists before running tests
    await createTestDatabaseIfNotExists();
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'rose_bud_thorn_test',
          entities: [Entry, User],
          synchronize: true,
          dropSchema: true,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Enable global validation pipe like in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.enableCors();
    await app.init();

    // Get JWT service and repository for test user creation
    jwtService = moduleFixture.get<JwtService>(JwtService);
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));

    // Create a test user in the database with proper UUID and unique email for each test
    const userId = uuidv4();
    const uniqueSuffix = Date.now().toString();
    testUser = userRepository.create({
      id: userId,
      googleId: `test-google-id-${uniqueSuffix}`,
      email: `test-${uniqueSuffix}@example.com`,
      name: 'Test User',
    });
    await userRepository.save(testUser);

    // Generate auth token
    authToken = jwtService.sign({
      sub: testUser.id,
      googleId: testUser.googleId,
      email: testUser.email,
      name: testUser.name,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/api/entries (POST)', () => {
    it('should create a new entry', () => {
      return request(app.getHttpServer())
        .post('/api/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rose: 'Beautiful sunset today',
          thorn: 'Traffic was terrible',
          bud: 'Looking forward to weekend',
          date: '2025-07-18',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.rose).toBe('Beautiful sunset today');
          expect(res.body.date).toBe('2025-07-18');
        });
    });

    it('should return 409 when creating duplicate entry', async () => {
      const entryData = {
        rose: 'First entry',
        date: '2025-07-19',
      };

      // Create first entry
      await request(app.getHttpServer()).post('/api/entries').set('Authorization', `Bearer ${authToken}`).send(entryData).expect(201);

      // Try to create duplicate
      return request(app.getHttpServer()).post('/api/entries').set('Authorization', `Bearer ${authToken}`).send(entryData).expect(409);
    });
  });

  describe('/api/entries/upsert (POST)', () => {
    it('should create new entry when none exists', () => {
      return request(app.getHttpServer())
        .post('/api/entries/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rose: 'New entry via upsert',
          date: '2025-07-20',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.rose).toBe('New entry via upsert');
        });
    });

    it('should update existing entry', async () => {
      const date = '2025-07-21';

      // Create initial entry
      await request(app.getHttpServer())
        .post('/api/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rose: 'Original rose',
          date,
        })
        .expect(201);

      // Update via upsert
      return request(app.getHttpServer())
        .post('/api/entries/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rose: 'Updated rose',
          thorn: 'New thorn',
          date,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.rose).toBe('Updated rose');
          expect(res.body.thorn).toBe('New thorn');
        });
    });
  });

  describe('/api/entries (GET)', () => {
    it('should return all entries', async () => {
      // Create test entries
      await request(app.getHttpServer()).post('/api/entries').set('Authorization', `Bearer ${authToken}`).send({ rose: 'Entry 1', date: '2025-07-22' });

      await request(app.getHttpServer()).post('/api/entries').set('Authorization', `Bearer ${authToken}`).send({ rose: 'Entry 2', date: '2025-07-23' });

      return request(app.getHttpServer())
        .get('/api/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('entries');
          expect(res.body).toHaveProperty('total');
          expect(res.body.entries.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('should support pagination', async () => {
      return request(app.getHttpServer())
        .get('/api/entries?limit=1&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.entries.length).toBeLessThanOrEqual(1);
        });
    });
  });

  describe('/api/entries/:date (GET)', () => {
    it('should return specific entry', async () => {
      const date = '2025-07-24';

      // Create entry
      await request(app.getHttpServer()).post('/api/entries').set('Authorization', `Bearer ${authToken}`).send({
        rose: 'Specific entry',
        date,
      });

      return request(app.getHttpServer())
        .get(`/api/entries/${date}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.rose).toBe('Specific entry');
          expect(res.body.date).toBe(date);
        });
    });

    it('should return 404 for non-existent entry', () => {
      return request(app.getHttpServer()).get('/api/entries/2025-12-31').set('Authorization', `Bearer ${authToken}`).expect(404);
    });
  });

  describe('/api/entries/:date (PATCH)', () => {
    it('should update existing entry', async () => {
      const date = '2025-07-25';

      // Create entry
      await request(app.getHttpServer()).post('/api/entries').set('Authorization', `Bearer ${authToken}`).send({
        rose: 'Original content',
        date,
      });

      return request(app.getHttpServer())
        .patch(`/api/entries/${date}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rose: 'Updated content',
          thorn: 'New thorn content',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.rose).toBe('Updated content');
          expect(res.body.thorn).toBe('New thorn content');
        });
    });

    it('should return 404 when updating non-existent entry', () => {
      return request(app.getHttpServer()).patch('/api/entries/2025-12-31').set('Authorization', `Bearer ${authToken}`).send({ rose: 'Test' }).expect(404);
    });
  });

  describe('/api/entries/:date (DELETE)', () => {
    it('should delete existing entry', async () => {
      const date = '2025-07-26';

      // Create entry
      await request(app.getHttpServer()).post('/api/entries').set('Authorization', `Bearer ${authToken}`).send({
        rose: 'To be deleted',
        date,
      });

      return request(app.getHttpServer())
        .delete(`/api/entries/${date}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('should return 404 when deleting non-existent entry', () => {
      return request(app.getHttpServer()).delete('/api/entries/2025-12-31').set('Authorization', `Bearer ${authToken}`).expect(404);
    });
  });
});
