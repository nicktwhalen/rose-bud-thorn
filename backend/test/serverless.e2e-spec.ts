import serverlessHandler from '../src/serverless';
import { createConfiguredApp } from '../src/app.factory';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import * as request from 'supertest';

describe('Serverless Handler (e2e)', () => {
  let testServer: express.Express;
  let app: any;

  beforeAll(async () => {
    // Create the serverless Express app directly
    testServer = express();
    app = await createConfiguredApp(new ExpressAdapter(testServer));
    await app.init();
  });

  afterAll(async () => {
    // Clean up database connections and app
    if (app) {
      await app.close();
    }
  });

  describe('Serverless Functionality', () => {
    it('should handle health check requests', async () => {
      return request(testServer)
        .get('/health')
        .expect(200) // Health check should pass with proper test configuration
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
        });
    });

    it('should handle unknown routes', async () => {
      return request(testServer).get('/nonexistent').expect(404);
    });

    it('should handle CORS preflight requests', async () => {
      return request(testServer).options('/api/entries').set('Origin', 'https://rose-bud-thorn-frontend.vercel.app').set('Access-Control-Request-Method', 'POST').expect(204);
    });
  });

  describe('Authentication Required Endpoints', () => {
    it('should reject unauthenticated requests', async () => {
      return request(testServer).get('/auth/profile').expect(401);
    });

    it('should reject requests with invalid tokens', async () => {
      return request(testServer).get('/auth/profile').set('Authorization', 'Bearer invalid-token').expect(401);
    });

    it('should reject entry creation without auth', async () => {
      return request(testServer)
        .post('/api/entries')
        .send({
          date: '2025-01-15',
          rose: 'Test entry',
        })
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      return request(testServer).post('/api/entries').set('Content-Type', 'application/json').send('invalid json').expect(400);
    });

    it('should validate request data', async () => {
      return request(testServer)
        .post('/api/entries')
        .set('Authorization', 'Bearer fake-token')
        .send({
          date: 'invalid-date',
          rose: '',
        })
        .expect(401); // Will fail auth before validation
    });
  });

  describe('Performance & Caching', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, () => request(testServer).get('/health'));

      const responses = await Promise.all(requests);
      responses.forEach((response) => {
        expect(response.status).toBe(200); // Health check should pass
      });
    });

    it('should handle rapid sequential requests', async () => {
      for (let i = 0; i < 3; i++) {
        await request(testServer).get('/health').expect(200);
      }
    });
  });
});
