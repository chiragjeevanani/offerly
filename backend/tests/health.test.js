import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Health Check API', () => {
  it('should return 200 OK for /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('should return 404 for non-existent routes', async () => {
    const res = await request(app).get('/api/non-existent-route');
    expect(res.statusCode).toEqual(404);
  });
});
