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

  it('does not let an institution enumerate the staff directory', async () => {
    await createInstitution();
    await createUser({ email: 'inst@test.edu', role: 'INSTITUTION' });
    const token = await login('inst@test.edu');
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('does not let an institution read another institution\'s application', async () => {
    const instA = await createInstitution('Institute A');
    const instB = await createInstitution('Institute B');
    await createUser({ email: 'instA@test.edu', role: 'INSTITUTION', institutionId: instA.id });
    const other = await prisma.application.create({
      data: {
        applicationNumber: 'B1', institutionId: instB.id, academicYear: '2026-27',
        programType: 'ENGINEERING', assignedRegion: 'WEST', status: 'SUBMITTED', currentStage: 'SCRUTINY',
      },
    });
    const token = await login('instA@test.edu');
    const res = await request(app)
      .get(`/api/applications/${other.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('scopes the dashboard to the institution for institution users', async () => {
    const instA = await createInstitution('Institute A');
    const instB = await createInstitution('Institute B');
    await createUser({ email: 'instA@test.edu', role: 'INSTITUTION', institutionId: instA.id });
    await prisma.application.create({
      data: {
        applicationNumber: 'A1', institutionId: instA.id, academicYear: '2026-27',
        programType: 'ENGINEERING', assignedRegion: 'WEST', status: 'SUBMITTED', currentStage: 'SCRUTINY',
      },
    });
    await prisma.application.create({
      data: {
        applicationNumber: 'B1', institutionId: instB.id, academicYear: '2026-27',
        programType: 'ENGINEERING', assignedRegion: 'WEST', status: 'SUBMITTED', currentStage: 'SCRUTINY',
      },
    });
    const token = await login('instA@test.edu');
    const res = await request(app).get('/api/applications/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.summary.total).toBe(1);
  });

  it('does not let an institution submit evidence for another institution\'s undertaking', async () => {
    const instA = await createInstitution('Institute A');
    const instB = await createInstitution('Institute B');
    await createUser({ email: 'instA@test.edu', role: 'INSTITUTION', institutionId: instA.id });
    const otherApp = await prisma.application.create({
      data: {
        applicationNumber: 'B1', institutionId: instB.id, academicYear: '2026-27',
        programType: 'ENGINEERING', assignedRegion: 'WEST', status: 'APPROVED_WITH_UNDERTAKING', currentStage: 'COMPLETED',
      },
    });
    const undertaking = await prisma.undertaking.create({
      data: {
        applicationId: otherApp.id, title: 'Other institution condition',
        description: 'x', conditions: '{}', dueDate: new Date(),
      },
    });
    const token = await login('instA@test.edu');
    const list = await request(app).get('/api/undertakings').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(0);
    const submit = await request(app)
      .post(`/api/undertakings/${undertaking.id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ evidencePath: '/uploads/evidence.pdf' });
    expect(submit.status).toBe(403);
  });

  it('rejects a statutory decision applied outside the decision stage', async () => {
    const inst = await createInstitution();
    await createUser({ email: 'ca@test.gov', role: 'COMPETENT_AUTHORITY' });
    const app1 = await prisma.application.create({
      data: {
        applicationNumber: 'A1', institutionId: inst.id, academicYear: '2026-27',
        programType: 'ENGINEERING', assignedRegion: 'WEST', status: 'UNDER_SCRUTINY', currentStage: 'SCRUTINY',
      },
    });
    const token = await login('ca@test.gov');
    const res = await request(app)
      .post(`/api/applications/${app1.id}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ actionType: 'APPROVE', reason: 'Too early' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('answers 403 when a committee member attempts the statutory decision', async () => {
    const inst = await createInstitution();
    await createUser({ email: 'sac@test.gov', role: 'COMMITTEE_MEMBER' });
    const app1 = await prisma.application.create({
      data: {
        applicationNumber: 'A2', institutionId: inst.id, academicYear: '2026-27',
        programType: 'ENGINEERING', assignedRegion: 'WEST', status: 'PENDING_DECISION', currentStage: 'DECISION',
      },
    });
    const token = await login('sac@test.gov');
    const res = await request(app)
      .post(`/api/applications/${app1.id}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ actionType: 'APPROVE', reason: 'Self approval attempt' });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    const unchanged = await prisma.application.findUnique({ where: { id: app1.id } });
    expect(unchanged?.status).toBe('PENDING_DECISION');
  });
});
