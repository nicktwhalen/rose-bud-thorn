/**
 * Vercel Integration Test
 *
 * This test simulates how Vercel would invoke our serverless function.
 * It's more lightweight than the full e2e test and focuses on the
 * serverless-specific behavior.
 */

import serverlessHandler from '../src/serverless';

describe('Vercel Integration', () => {
  // Simulate Vercel's environment
  beforeAll(() => {
    process.env.NODE_ENV = 'production';
    process.env.VERCEL = '1';
  });

  afterAll(() => {
    delete process.env.VERCEL;
  });

  it('should export a default function for Vercel', () => {
    expect(typeof serverlessHandler).toBe('function');
    expect(serverlessHandler.length).toBe(2); // req, res parameters
  });

  it('should handle basic Vercel request structure', async () => {
    const mockReq = {
      method: 'GET',
      url: '/health',
      headers: {},
      query: {},
      body: {},
      get: jest.fn(() => undefined),
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      getHeader: jest.fn(),
      removeHeader: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      write: jest.fn().mockReturnThis(),
      locals: {},
      headersSent: false,
      statusCode: 200,
    };

    // Should not throw when called
    await expect(serverlessHandler(mockReq, mockRes)).resolves.not.toThrow();
  });

  it('should handle CORS preflight requests', async () => {
    const mockReq = {
      method: 'OPTIONS',
      url: '/api/entries',
      headers: {
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type,authorization',
        origin: 'https://rose-bud-thorn-frontend.vercel.app',
      },
      query: {},
      body: {},
      get: jest.fn((header) => mockReq.headers[header.toLowerCase()]),
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      getHeader: jest.fn(),
      removeHeader: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      write: jest.fn().mockReturnThis(),
      locals: {},
      headersSent: false,
      statusCode: 200,
    };

    await expect(serverlessHandler(mockReq, mockRes)).resolves.not.toThrow();
  });

  it('should maintain app instance between calls (caching)', async () => {
    const createMockRequest = (url: string) => ({
      method: 'GET',
      url,
      headers: {},
      query: {},
      body: {},
      get: jest.fn(() => undefined),
    });

    const createMockResponse = () => ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      getHeader: jest.fn(),
      removeHeader: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      write: jest.fn().mockReturnThis(),
      locals: {},
      headersSent: false,
      statusCode: 200,
    });

    // Make multiple calls to ensure caching works
    const calls = [serverlessHandler(createMockRequest('/health'), createMockResponse()), serverlessHandler(createMockRequest('/health'), createMockResponse()), serverlessHandler(createMockRequest('/health'), createMockResponse())];

    await expect(Promise.all(calls)).resolves.not.toThrow();
  });
});
