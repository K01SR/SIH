import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ok, created, fail } from '../utils/response';
import { RuleType } from '../types/domain';
import { RulesEngine } from '../engines/rules.engine';
import { recordAudit } from '../services/audit.service';

export async function listRules(req: Request, res: Response) {
  const { type } = req.query as Record<string, string>;
  const configs = await prisma.ruleConfig.findMany({
    where: { type: type as never },
    orderBy: [{ type: 'asc' }, { version: 'desc' }],
  });
  return ok(res, configs);
}

export async function getActiveRules(_req: Request, res: Response) {
  const types = Object.values(RuleType);
  const result: Record<string, unknown> = {};
  for (const t of types) {
    result[t] = await RulesEngine.getActive(t);
  }
  return ok(res, result);
}

export async function createRuleVersion(req: Request, res: Response) {
  const { type, name, description, config, activate } = req.body;
  if (!type || !config) return fail(res, 400, 'type and config are required');

  const latest = await prisma.ruleConfig.findFirst({
    where: { type },
    orderBy: { version: 'desc' },
  });
  const version = (latest?.version ?? 0) + 1;

  const record = await prisma.ruleConfig.create({
    data: {
      type,
      version,
      name: name ?? `${type} v${version}`,
      description,
      config: typeof config === 'string' ? config : JSON.stringify(config),
      isActive: false,
      createdById: req.user!.id,
    },
  });

  if (activate) {
    await prisma.ruleConfig.updateMany({ where: { type }, data: { isActive: false } });
    await prisma.ruleConfig.update({ where: { id: record.id }, data: { isActive: true } });
  }

  await recordAudit({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'RULE_VERSION_CREATED',
    entityType: 'RuleConfig',
    entityId: record.id,
    details: { type, version, activated: !!activate },
  });

  return created(res, record, 'Rule version created');
}

export async function activateRule(req: Request, res: Response) {
  const rule = await prisma.ruleConfig.findUnique({ where: { id: req.params.id } });
  if (!rule) return fail(res, 404, 'Rule config not found');
  await prisma.ruleConfig.updateMany({ where: { type: rule.type }, data: { isActive: false } });
  const updated = await prisma.ruleConfig.update({ where: { id: rule.id }, data: { isActive: true } });
  await recordAudit({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'RULE_ACTIVATED',
    entityType: 'RuleConfig',
    entityId: rule.id,
    details: { type: rule.type, version: rule.version },
  });
  return ok(res, updated, 'Rule activated');
}
