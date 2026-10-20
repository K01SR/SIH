import '../tests/setup';
import { prisma } from '../src/config/prisma';
import bcrypt from 'bcryptjs';

export interface TestUser {
  id: string;
  email: string;
  token: string;
  role: string;
  region?: string | null;
  institutionId?: string | null;
}

export async function resetDb() {
  // Delete in dependency order (children first).
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.escalation.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.workflowAction.deleteMany();
  await prisma.evcMember.deleteMany();
  await prisma.evcSchedule.deleteMany();
  await prisma.undertaking.deleteMany();
  await prisma.document.deleteMany();
  await prisma.application.deleteMany();
  await prisma.ruleConfig.deleteMany();
  await prisma.user.deleteMany();
  await prisma.institution.deleteMany();
}

const TEST_PASSWORD = 'password123';

export const TEST_PASSWORD_HASH = () => bcrypt.hash(TEST_PASSWORD, 4);

export async function createInstitution(name = 'Test Institute', region = 'WEST') {
  return prisma.institution.create({
    data: {
      name,
      aisheCode: `AISHE-${Math.random().toString(36).slice(2, 9)}`,
      type: 'ENGINEERING',
      region,
      state: 'Maharashtra',
      isNewInstitution: false,
    },
  });
}

export async function createUser(params: {
  email: string;
  role: string;
  region?: string | null;
  institutionId?: string | null;
  fullName?: string;
}) {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);
  return prisma.user.create({
    data: {
      email: params.email,
      passwordHash,
      fullName: params.fullName ?? params.email.split('@')[0],
      role: params.role,
      region: params.region ?? null,
      institutionId: params.institutionId ?? null,
    },
  });
}

export { TEST_PASSWORD };
