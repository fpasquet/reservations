import { Test } from '@nestjs/testing';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller.js';

describe('GET /health', () => {
  it('answers ok', async () => {
    const module = await Test.createTestingModule({ controllers: [HealthController] }).compile();
    const app = module.createNestApplication();
    await app.init();
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get('/health');
    expect(response.body).toEqual({ status: 'ok' });
    await app.close();
  });
});
