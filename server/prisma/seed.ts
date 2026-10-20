import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma';
import { Role, Region, InstitutionType, ApplicationStatus, Stage, RuleType } from '../src/types/domain';
import {
  APH_ROUTING_MATRIX,
  SLA_TIMELINES,
  ESCALATION_MATRIX,
  NOTIFICATION_RULES,
  AGEING_THRESHOLDS,
} from '../src/config/defaultRules';

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysFrom = (n: number) => new Date(Date.now() + n * DAY);

async function main() {
  console.log('[seed] clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.escalation.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.evcMember.deleteMany();
  await prisma.evcSchedule.deleteMany();
  await prisma.undertaking.deleteMany();
  await prisma.document.deleteMany();
  await prisma.workflowAction.deleteMany();
  await prisma.application.deleteMany();
  await prisma.user.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.ruleConfig.deleteMany();

  console.log('[seed] rule configs...');
  const ruleSeeds: Array<[RuleType, string, unknown]> = [
    [RuleType.APH_ROUTING_MATRIX, 'APH Routing Matrix (base)', APH_ROUTING_MATRIX],
    [RuleType.SLA_TIMELINES, 'SLA Timelines (base)', SLA_TIMELINES],
    [RuleType.ESCALATION_MATRIX, 'Escalation Matrix (base)', ESCALATION_MATRIX],
    [RuleType.NOTIFICATION_RULES, 'Notification Rules (base)', NOTIFICATION_RULES],
    [RuleType.AGEING_THRESHOLDS, 'Ageing Thresholds (base)', AGEING_THRESHOLDS],
  ];
  for (const [type, name, config] of ruleSeeds) {
    await prisma.ruleConfig.create({
      data: { type, version: 1, name, config: JSON.stringify(config), isActive: true },
    });
  }

  console.log('[seed] institutions...');
  const institutions = await Promise.all([
    prisma.institution.create({
      data: { name: 'Lokmanya Tilak College of Engineering', aisheCode: 'C-11001', type: InstitutionType.ENGINEERING, region: Region.WEST, state: 'Maharashtra', contactEmail: 'principal@ltce.edu', isNewInstitution: false },
    }),
    prisma.institution.create({
      data: { name: 'Sunrise Institute of Technology', aisheCode: 'C-11002', type: InstitutionType.ENGINEERING, region: Region.SOUTH, state: 'Tamil Nadu', contactEmail: 'office@sunrise.edu', isNewInstitution: true },
    }),
    prisma.institution.create({
      data: { name: 'Ganga Business School', aisheCode: 'C-11003', type: InstitutionType.MANAGEMENT, region: Region.NORTH, state: 'Delhi', contactEmail: 'dean@ganga.edu', isNewInstitution: false },
    }),
    prisma.institution.create({
      data: { name: 'Everest Polytechnic', aisheCode: 'C-11004', type: InstitutionType.POLYTECHNIC, region: Region.NORTH_EAST, state: 'Assam', contactEmail: 'admin@everest.edu', isNewInstitution: true },
    }),
    prisma.institution.create({
      data: { name: 'Deccan College of Pharmacy', aisheCode: 'C-11005', type: InstitutionType.PHARMACY, region: Region.CENTRAL, state: 'Madhya Pradesh', contactEmail: 'hod@deccan.edu', isNewInstitution: false },
    }),
  ]);

  console.log('[seed] users...');
  const passwordHash = await bcrypt.hash('password123', 10);
  const mkUser = (email: string, fullName: string, role: string, region?: string, institutionId?: string, designation?: string) =>
    prisma.user.create({ data: { email, passwordHash, fullName, role, region: region ?? null, institutionId: institutionId ?? null, designation } });

  const admin = await mkUser('admin@aicte.gov.in', 'System Administrator', Role.ADMIN, undefined, undefined, 'Platform Admin');
  const ca = await mkUser('ca@aicte.gov.in', 'Dr. R. Mehta', Role.COMPETENT_AUTHORITY, undefined, undefined, 'Competent Authority');
  const boNorth = await mkUser('bo.north@aicte.gov.in', 'S. Iyer', Role.BUREAU_OFFICER, Region.NORTH, undefined, 'Bureau Officer');
  const roWest = await mkUser('ro.west@aicte.gov.in', 'A. Deshpande', Role.REGIONAL_OFFICER, Region.WEST, undefined, 'Regional Officer');
  const roSouth = await mkUser('ro.south@aicte.gov.in', 'K. Raman', Role.REGIONAL_OFFICER, Region.SOUTH, undefined, 'Regional Officer');
  const roNE = await mkUser('ro.ne@aicte.gov.in', 'B. Das', Role.REGIONAL_OFFICER, Region.NORTH_EAST, undefined, 'Regional Officer');
  const evc1 = await mkUser('evc1@aicte.gov.in', 'Prof. V. Nair', Role.EVC_MEMBER, Region.WEST, undefined, 'EVC Expert');
  const evc2 = await mkUser('evc2@aicte.gov.in', 'Prof. M. Gupta', Role.EVC_MEMBER, Region.NORTH, undefined, 'EVC Expert');
  const sac1 = await mkUser('sac1@aicte.gov.in', 'Dr. P. Singh', Role.COMMITTEE_MEMBER, undefined, undefined, 'SAC Member');
  const instUser1 = await mkUser('college@ltce.edu', 'LTCE Registrar', Role.INSTITUTION, Region.WEST, institutions[0].id, 'Registrar');
  const instUser2 = await mkUser('office@sunrise.edu', 'Sunrise Registrar', Role.INSTITUTION, Region.SOUTH, institutions[1].id, 'Registrar');
  const instUser4 = await mkUser('admin@everest.edu', 'Everest Registrar', Role.INSTITUTION, Region.NORTH_EAST, institutions[3].id, 'Principal');

  console.log('[seed] applications...');
  const mkApp = async (
    num: string,
    instIdx: number,
    status: string,
    stage: string,
    routeType: string,
    createdDaysAgo: number,
    officerId: string | null,
    slaDaysFrom: number,
    isBreached = false
  ) => {
    const inst = institutions[instIdx];
    return prisma.application.create({
      data: {
        applicationNumber: num,
        institutionId: inst.id,
        academicYear: '2026-27',
        programType: inst.type,
        status,
        currentStage: stage,
        routeType,
        assignedRegion: inst.region,
        assignedOfficerId: officerId,
        submittedAt: daysAgo(createdDaysAgo),
        slaDueAt: daysFrom(slaDaysFrom),
        isBreached,
        createdAt: daysAgo(createdDaysAgo),
      },
    });
  };

  const app1 = await mkApp('AICTE/2026-27/00001', 0, ApplicationStatus.UNDER_SCRUTINY, Stage.SCRUTINY, 'SCRUTINY_EVC', 9, roWest.id, 6);
  const app2 = await mkApp('AICTE/2026-27/00002', 1, ApplicationStatus.EVC_QUEUED, Stage.EVC, 'NEW_INSTITUTION', 22, roSouth.id, -2, true);
  const app3 = await mkApp('AICTE/2026-27/00003', 2, ApplicationStatus.PENDING_DECISION, Stage.DECISION, 'ONLY_SCRUTINY', 35, boNorth.id, 3);
  const app4 = await mkApp('AICTE/2026-27/00004', 3, ApplicationStatus.SUBMITTED, Stage.SUBMISSION, 'NEW_INSTITUTION', 3, roNE.id, 12);
  const app5 = await mkApp('AICTE/2026-27/00005', 4, ApplicationStatus.APPROVED_WITH_UNDERTAKING, Stage.COMPLETED, 'SCRUTINY_EVC', 60, roWest.id, 0);
  const app6 = await mkApp('AICTE/2026-27/00006', 0, ApplicationStatus.UNDER_SAC_SHC, Stage.SAC_SHC, 'EVC_SAC_SHC', 28, roWest.id, -5, true);

  console.log('[seed] workflow actions...');
  const actions = [
    [app1.id, instUser1.id, 'SUBMIT', Stage.SUBMISSION, Stage.SCRUTINY],
    [app1.id, roWest.id, 'SCRUTINY_PASS', Stage.SCRUTINY, Stage.EVC],
    [app2.id, instUser2.id, 'SUBMIT', Stage.SUBMISSION, Stage.SCRUTINY],
    [app2.id, roSouth.id, 'ROUTE_TO_EVC', Stage.SCRUTINY, Stage.EVC],
    [app3.id, boNorth.id, 'SCRUTINY_PASS', Stage.SCRUTINY, Stage.DECISION],
    [app6.id, roWest.id, 'ROUTE_TO_SAC_SHC', Stage.EVC, Stage.SAC_SHC],
  ] as const;
  for (const [applicationId, actorId, actionType, fromStage, toStage] of actions) {
    await prisma.workflowAction.create({
      data: { applicationId, actorId, actionType, fromStage, toStage, isAutomated: false },
    });
  }

  console.log('[seed] EVC schedules...');
  await prisma.evcSchedule.create({
    data: { applicationId: app2.id, status: 'QUEUED', queuedAt: daysAgo(8), dueAt: daysAgo(2), isBreached: true, notes: 'Awaiting committee availability' },
  });
  const evcSched2 = await prisma.evcSchedule.create({
    data: { applicationId: app6.id, status: 'SCHEDULED', queuedAt: daysAgo(15), dueAt: daysFrom(5), scheduledDate: daysFrom(5), venue: 'AICTE Western Regional Office, Mumbai', notes: 'EVC visit confirmed' },
  });
  await prisma.evcMember.createMany({
    data: [
      { evcScheduleId: evcSched2.id, userId: evc1.id, role: 'Chair' },
      { evcScheduleId: evcSched2.id, userId: evc2.id, role: 'Member' },
    ],
  });

  console.log('[seed] undertakings...');
  await prisma.undertaking.create({
    data: {
      applicationId: app5.id,
      title: 'Submission of Fire Safety Certificate',
      description: 'Institution to submit a valid fire safety certificate from the local authority within 90 days of approval.',
      conditions: JSON.stringify({ documentType: 'FIRE_SAFETY', validityMonths: 12 }),
      dueDate: daysAgo(4),
      status: 'ESCALATED',
      escalated: true,
    },
  });
  await prisma.undertaking.create({
    data: {
      applicationId: app5.id,
      title: 'Faculty PhD Ratio Compliance',
      description: 'Achieve minimum 60% faculty with PhD qualification by the end of the academic year.',
      conditions: JSON.stringify({ targetRatio: 0.6 }),
      dueDate: daysFrom(20),
      status: 'PENDING',
    },
  });
  await prisma.undertaking.create({
    data: {
      applicationId: app1.id,
      title: 'Land Use Conversion Approval',
      description: 'Submit land use conversion approval from the revenue department.',
      conditions: JSON.stringify({ department: 'Revenue' }),
      dueDate: daysFrom(6),
      status: 'SUBMITTED',
      submittedAt: daysAgo(1),
      evidencePath: 'uploads/land-use-conversion.pdf',
    },
  });

  console.log('[seed] documents...');
  await prisma.document.create({
    data: { institutionId: institutions[0].id, type: 'LEASE_DEED', title: 'Campus Lease Deed (10 acres)', filePath: 'uploads/ltce-lease.pdf', validFrom: daysAgo(1000), validUntil: daysFrom(6), status: 'VALID' },
  });
  await prisma.document.create({
    data: { institutionId: institutions[1].id, type: 'FIRE_SAFETY', title: 'Fire Safety Certificate', filePath: 'uploads/sunrise-fire.pdf', validUntil: daysAgo(3), status: 'EXPIRED', escalated: true },
  });
  await prisma.document.create({
    data: { institutionId: institutions[2].id, type: 'BUILDING_APPROVAL', title: 'Building Plan Approval', filePath: 'uploads/ganga-building.pdf', validUntil: daysFrom(25), status: 'VALID' },
  });
  await prisma.document.create({
    data: { institutionId: institutions[3].id, type: 'LEASE_DEED', title: 'Land Lease Agreement', filePath: 'uploads/everest-lease.pdf', validUntil: daysFrom(45), status: 'VALID' },
  });

  console.log('[seed] alerts...');
  await prisma.alert.create({
    data: { type: 'SLA_BREACHED', severity: 'CRITICAL', title: 'SLA breached: AICTE/2026-27/00002', message: 'Application exceeded its prescribed timeline by 2 day(s).', applicationId: app2.id, recipientRole: 'BUREAU_OFFICER', entityType: 'Application', entityId: app2.id },
  });
  await prisma.alert.create({
    data: { type: 'DOCUMENT_EXPIRING', severity: 'CRITICAL', title: 'Document expiring: Campus Lease Deed', message: 'LEASE_DEED expires in 6 day(s).', recipientRole: 'INSTITUTION', entityType: 'Document' },
  });
  await prisma.alert.create({
    data: { type: 'UNDERTAKING_OVERDUE', severity: 'WARNING', title: 'Undertaking overdue', message: 'Fire Safety Certificate was due 4 day(s) ago.', recipientRole: 'REGIONAL_OFFICER', entityType: 'Undertaking' },
  });

  console.log('[seed] escalations...');
  await prisma.escalation.createMany({
    data: [
      { entityType: 'Application', entityId: app2.id, reason: 'SLA breached by 2 days', toRole: 'BUREAU_OFFICER', level: 1 },
      { entityType: 'Document', entityId: institutions[1].id, reason: 'Fire safety certificate expired', toRole: 'BUREAU_OFFICER', level: 1 },
    ],
  });

  console.log('[seed] notifications...');
  await prisma.notification.createMany({
    data: [
      { userId: instUser1.id, channel: 'IN_APP', status: 'SENT', subject: 'Lease deed expiring soon', body: 'Your campus lease deed expires in 6 days. Please submit a renewal.', sentAt: new Date() },
      { userId: instUser4.id, channel: 'EMAIL', status: 'SENT', subject: 'Application received', body: 'Your application AICTE/2026-27/00004 has been received.', sentAt: new Date() },
    ],
  });

  console.log('[seed] audit logs...');
  await prisma.auditLog.createMany({
    data: [
      { userId: instUser1.id, userRole: 'INSTITUTION', action: 'APPLICATION_SUBMITTED', entityType: 'Application', entityId: app1.id, details: JSON.stringify({ applicationNumber: app1.applicationNumber }) },
      { userId: roWest.id, userRole: 'REGIONAL_OFFICER', action: 'WORKFLOW_SCRUTINY_PASS', entityType: 'Application', entityId: app1.id, details: JSON.stringify({ fromStage: 'SCRUTINY', toStage: 'EVC' }) },
      { userId: admin.id, userRole: 'ADMIN', action: 'RULE_ACTIVATED', entityType: 'RuleConfig', entityId: 'seed' },
    ],
  });

  console.log('[seed] done. Login with any seeded email / password123');
  console.log('  admin@aicte.gov.in, ca@aicte.gov.in, ro.west@aicte.gov.in, college@ltce.edu');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
