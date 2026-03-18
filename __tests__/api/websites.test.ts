import request from 'supertest';
import { describe, it, expect, jest } from '@jest/globals';
import app from '../../api/app';

// Mock Supabase to prevent actual DB calls during tests
jest.mock('../../api/utils/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn<any>().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      })
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn<any>().mockResolvedValue({
      data: { id: 'test-site-id', name: 'Test Site', url: 'https://example.com' },
      error: null
    })
  }
}));

describe('Websites API', () => {
  it('should create a new website', async () => {
    const res = await request(app)
      .post('/api/websites')
      .set('Authorization', 'Bearer test-token')
      .send({
        name: 'Test Site',
        url: 'https://example.com',
        check_interval: 5,
        is_owned: true
      });
      
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toEqual('Test Site');
  });

  it('should reject invalid auth token', async () => {
    // Override mock for this specific test
    const { supabase } = require('../../api/utils/supabase');
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' }
    });

    const res = await request(app)
      .get('/api/websites')
      .set('Authorization', 'Bearer invalid-token');
      
    expect(res.statusCode).toEqual(401);
  });
});