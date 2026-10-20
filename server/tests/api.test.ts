import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import '../tests/setup';
import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../src/config/prisma';
import { resetDb, createInstitution, createUser, TEST_PASSWORD } from '../tests/helpers';

let app: Express;

async function login(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: TEST_PASSWORD });
  return res.body.data.token as string;
}

describe('API integration', () => {
  beforeAll(async () => {
    const mod = await import('../src/index');
    app = mod.app;
    await resetDb();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await resetDb();
  });

  it('exposes a healthy readiness probe', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('up');
  });

  it('rejects unauthenticated access to protected routes', async () => {
    const res = await request(app).get('/api/applications');
    expect(res.status).toBe(401);
  });

  it('logs in with valid credentials and rejects invalid ones', async () => {
    await createInstitution();
    await createUser({ email: 'admin@test.gov', role: 'ADMIN' });
    const good = await request(app).post('/api/auth/login').send({ email: 'admin@test.gov', password: TEST_PASSWORD });
    expect(good.status).toBe(200);
    expect(good.body.data.token).toBeTruthy();
    const bad = await request(app).post('/api/auth/login').send({ email: 'admin@test.gov', password: 'wrong' });
    expect(bad.status).toBe(401);
  });

  it('validates the login payload with structured errors', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('creates an application as an institution and auto-routes it', async () => {
    const inst = await createInstitution();
    await createUser({ email: 'college@test.edu', role: 'INSTITUTION', institutionId: inst.id });
    const token = await login('college@test.edu');
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ academicYear: '2026-27', programType: 'ENGINEERING', routeType: 'SCRUTINY_EVC' });
    expect(res.status).toBe(201);
    expect(res.body.data.currentStage).toBe('SCRUTINY');
    expect(res.body.data.slaDueAt).toBeTruthy();
  });

  it('enforces role-based authorisation', async () => {
    await createInstitution();
    await createUser({ email: 'inst@test.edu', role: 'INSTITUTION' });
    const token = await login('inst@test.edu');
    const res = await request(app).get('/api/audit').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('detects EVC scheduling conflicts on the same day', async () => {
    const inst = await createInstitution();
    await createUser({ email: 'bo@test.gov', role: 'BUREAU_OFFICER' });
    const member = await createUser({ email: 'evc@test.gov', role: 'EVC_MEMBER' });
    const app1 = await prisma.application.create({
      data: {
        applicationNumber: 'A1', institutionId: inst.id, academicYear: '2026-27',
        programType: 'ENGINEERING', assignedRegion: 'WEST', status: 'EVC_QUEUED', currentStage: 'EVC', routeType: 'SCRUTINY_EVC',
      },
    });
    const app2 = await prisma.application.create({
      data: {
        applicationNumber: 'A2', institutionId: inst.id, academicYear: '2026-27',
        programType: 'ENGINEERING', assignedRegion: 'WEST', status: 'EVC_QUEUED', currentStage: 'EVC', routeType: 'SCRUTINY_EVC',
      },
    });
    const evc1 = await prisma.evcSchedule.create({ data: { applicationId: app1.id, status: 'QUEUED' } });
    const evc2 = await prisma.evcSchedule.create({ data: { applicationId: app2.id, status: 'QUEUED' } });
    const token = await login('bo@test.gov');
    const date = '2026-11-20';
    const first = await request(app)
      .post(`/api/evc/${evc1.id}/schedule`)
      .set('Authorization', `Bearer ${token}`)
      .send({ scheduledDate: date, venue: 'HQ', memberIds: [member.id] });
    expect(first.status).toBe(200);
    const second = await request(app)
      .post(`/api/evc/${evc2.id}/schedule`)
      .set('Authorization', `Bearer ${token}`)
      .send({ scheduledDate: date, venue: 'HQ', memberIds: [member.id] });
    expect(second.status).toBe(409);
  });
});
