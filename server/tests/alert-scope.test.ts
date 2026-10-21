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

describe('Alert scoping', () => {
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

  it('does not show one institution another institution\'s alerts', async () => {
    const instA = await createInstitution('Institute A', 'WEST');
    const instB = await createInstitution('Institute B', 'EAST');
    const userA = await createUser({ email: 'a@test.gov', role: 'INSTITUTION', institutionId: instA.id });
    await createUser({ email: 'b@test.gov', role: 'INSTITUTION', institutionId: instB.id });

    await prisma.alert.create({
      data: {
        type: 'DOCUMENT_EXPIRING',
        severity: 'WARNING',
        title: 'Institute B document expiring',
        message: 'A document belonging to Institute B is expiring.',
        recipientRole: 'INSTITUTION',
        institutionId: instB.id,
      },
    });

    const token = await login('a@test.gov');
    const res = await request(app).get('/api/alerts').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('shows an institution its own alerts', async () => {
    const instA = await createInstitution('Institute A', 'WEST');
    await createUser({ email: 'a@test.gov', role: 'INSTITUTION', institutionId: instA.id });

    await prisma.alert.create({
      data: {
        type: 'DOCUMENT_EXPIRING',
        severity: 'WARNING',
        title: 'Institute A document expiring',
        message: 'A document belonging to Institute A is expiring.',
        recipientRole: 'INSTITUTION',
        institutionId: instA.id,
      },
    });

    const token = await login('a@test.gov');
    const res = await request(app).get('/api/alerts').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('scopes role-addressed alerts to the regional officer\'s own region', async () => {
    const instWest = await createInstitution('West Institute', 'WEST');
    const instEast = await createInstitution('East Institute', 'EAST');
    await createUser({ email: 'ro.west@test.gov', role: 'REGIONAL_OFFICER', region: 'WEST' });

    await prisma.alert.create({
      data: {
        type: 'SLA_APPROACHING',
        severity: 'WARNING',
        title: 'East application due',
        message: 'An East-region application is close to its SLA.',
        recipientRole: 'REGIONAL_OFFICER',
        applicationId: (
          await prisma.application.create({
            data: {
              applicationNumber: 'EAST-1',
              institutionId: instEast.id,
              academicYear: '2026-27',
              programType: 'ENGINEERING',
              assignedRegion: 'EAST',
              status: 'UNDER_SCRUTINY',
              currentStage: 'SCRUTINY',
            },
          })
        ).id,
      },
    });

    const token = await login('ro.west@test.gov');
    const res = await request(app).get('/api/alerts').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(instWest.id).toBeTruthy();
  });

  it('lets a regional officer see alerts raised for their own region', async () => {
    const instWest = await createInstitution('West Institute', 'WEST');
    await createUser({ email: 'ro.west@test.gov', role: 'REGIONAL_OFFICER', region: 'WEST' });

    await prisma.application.create({
      data: {
        applicationNumber: 'WEST-1',
        institutionId: instWest.id,
        academicYear: '2026-27',
        programType: 'ENGINEERING',
        assignedRegion: 'WEST',
        status: 'UNDER_SCRUTINY',
        currentStage: 'SCRUTINY',
      },
    });
    const application = await prisma.application.findFirst({ where: { applicationNumber: 'WEST-1' } });
    await prisma.alert.create({
      data: {
        type: 'SLA_APPROACHING',
        severity: 'WARNING',
        title: 'West application due',
        message: 'A West-region application is close to its SLA.',
        recipientRole: 'REGIONAL_OFFICER',
        applicationId: application!.id,
      },
    });

    const token = await login('ro.west@test.gov');
    const res = await request(app).get('/api/alerts').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('refuses to mark an invisible alert as read', async () => {
    const instA = await createInstitution('Institute A', 'WEST');
    const instB = await createInstitution('Institute B', 'EAST');
    await createUser({ email: 'a@test.gov', role: 'INSTITUTION', institutionId: instA.id });

    const alert = await prisma.alert.create({
      data: {
        type: 'DOCUMENT_EXPIRING',
        severity: 'WARNING',
        title: 'Institute B document expiring',
        message: 'Belongs to Institute B.',
        recipientRole: 'INSTITUTION',
        institutionId: instB.id,
      },
    });

    const token = await login('a@test.gov');
    const res = await request(app)
      .patch(`/api/alerts/${alert.id}/read`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    const unchanged = await prisma.alert.findUnique({ where: { id: alert.id } });
    expect(unchanged?.isRead).toBe(false);
  });
});
