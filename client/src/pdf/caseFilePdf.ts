import { jsPDF } from 'jspdf';
import type { Application } from '../types';
import { daysUntil, formatDate, formatDateTime, humanize } from '../utils';

const PAGE = { width: 595.28, height: 841.89, margin: 48 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const FONT = 'helvetica';
const TEMPLATE_ID = 'AICTE-CF-01';

const C = {
  ink: [17, 24, 39] as [number, number, number],
  muted: [91, 100, 114] as [number, number, number],
  faint: [132, 140, 152] as [number, number, number],
  rule: [211, 216, 224] as [number, number, number],
  ruleSoft: [232, 235, 240] as [number, number, number],
  fill: [247, 248, 250] as [number, number, number],
  navy: [11, 18, 32] as [number, number, number],
  accent: [168, 85, 11] as [number, number, number],
  accentLight: [255, 176, 87] as [number, number, number],
  danger: [180, 35, 24] as [number, number, number],
};

interface Column {
  label: string;
  width: number;
  align?: 'left' | 'right';
}

function clean(value: unknown): string {
  return String(value ?? '—')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00b7/g, '/')
    .replace(/\u2192/g, 'to');
}

function safe(value: unknown): string {
  const text = clean(value).trim();
  return text.length ? text : '—';
}

function fileName(path?: string | null): string {
  if (!path) return '—';
  const base = path.split('/').pop() ?? path;
  try {
    return decodeURIComponent(base);
  } catch {
    return base;
  }
}

function label(value?: string | null): string {
  return humanize(value)
    .replace(/\bEvc\b/g, 'EVC')
    .replace(/\bSac\b/g, 'SAC')
    .replace(/\bShc\b/g, 'SHC')
    .replace(/\bSla\b/g, 'SLA')
    .replace(/\bPhd\b/g, 'PhD')
    .replace(/\bAishe\b/g, 'AISHE')
    .replace(/\bSAC SHC\b/g, 'SAC-SHC')
    .replace(/ To /g, ' to ')
    .replace(/ With /g, ' with ')
    .replace(/ Of /g, ' of ')
    .replace(/ And /g, ' and ')
    .replace(/ For /g, ' for ')
    .replace(/ In /g, ' in ')
    .replace(/ On /g, ' on ')
    .replace(/ At /g, ' at ')
    .replace(/ By /g, ' by ');
}

function dayCount(days: number): string {
  const absolute = Math.abs(days);
  return `${absolute} ${absolute === 1 ? 'day' : 'days'}`;
}

function conditionText(value: string): string {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed as Record<string, unknown>)
        .map(([key, item]) => `${label(key.replace(/([a-z0-9])([A-Z])/g, '$1_$2'))}: ${formatScalar(item)}`)
        .join(' / ');
    }
  } catch {
    return value;
  }
  return value;
}

function formatScalar(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(formatScalar).join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' && /^[A-Z0-9_]+$/.test(value)) return label(value);
  return String(value ?? '—');
}

function groupAlerts(alerts: NonNullable<Application['alerts']>) {
  const groups: { newest: (typeof alerts)[number]; oldest: (typeof alerts)[number]; count: number }[] = [];
  for (const alert of alerts) {
    const current = groups[groups.length - 1];
    if (
      current &&
      current.newest.title === alert.title &&
      current.newest.message === alert.message &&
      current.newest.severity === alert.severity
    ) {
      current.oldest = alert;
      current.count += 1;
    } else {
      groups.push({ newest: alert, oldest: alert, count: 1 });
    }
  }
  return groups;
}

class CaseFileDocument {
  private doc: jsPDF;
  private app: Application;
  private generatedBy: string;
  private y = PAGE.margin;
  private sectionNumber = 0;
  private generatedAt = new Date();

  constructor(app: Application, generatedBy: string) {
    this.app = app;
    this.generatedBy = generatedBy;
    this.doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    this.doc.setProperties({
      title: `AICTE Case File ${app.applicationNumber}`,
      subject: 'Statutory approval case file',
      author: 'AICTE Approval Workflow Automation System',
      creator: 'AICTE Approval Workflow Automation System',
    });
  }

  build(): jsPDF {
    this.drawCover();
    this.newPage();
    this.drawInstitution();
    this.drawApplication();
    this.drawWorkflow();
    if (this.app.undertakings?.length) this.drawUndertakings();
    if (this.app.documents?.length) this.drawDocuments();
    if (this.app.evcSchedules?.length) this.drawEvc();
    if (this.app.alerts?.length) this.drawAlerts();
    this.drawCertification();
    this.drawFooters();
    return this.doc;
  }

  download(): void {
    const filename = `AICTE-Case-File-${this.app.applicationNumber.replace(/[^A-Za-z0-9]+/g, '-')}.pdf`;
    this.build().save(filename);
  }

  private newPage(): void {
    this.doc.addPage();
    this.drawRunningHeader();
    this.y = 64;
  }

  private ensureSpace(height: number): void {
    if (this.y + height > PAGE.height - 66) this.newPage();
  }

  private drawCover(): void {
    const d = this.doc;
    d.setFillColor(...C.navy);
    d.rect(0, 0, PAGE.width, 126, 'F');
    d.setFillColor(...C.accentLight);
    d.rect(0, 126, PAGE.width, 3, 'F');

    d.setFont(FONT, 'bold').setFontSize(19).setTextColor(255, 255, 255);
    d.text('AICTE', PAGE.margin, 48);
    d.setFont(FONT, 'normal').setFontSize(7.4).setTextColor(214, 220, 230);
    d.text('All India Council for Technical Education', PAGE.margin, 62);
    d.text('Approval Workflow Automation System', PAGE.margin, 74);

    d.setFont(FONT, 'bold').setFontSize(7.4).setTextColor(...C.accentLight);
    d.text('STATUTORY APPROVAL CASE FILE', PAGE.width - PAGE.margin, 48, { align: 'right' });
    d.setFont(FONT, 'normal').setFontSize(7.2).setTextColor(214, 220, 230);
    d.text('CONFIDENTIAL / FOR OFFICIAL USE', PAGE.width - PAGE.margin, 62, { align: 'right' });
    d.text(`Template ${TEMPLATE_ID}`, PAGE.width - PAGE.margin, 74, { align: 'right' });

    let y = 168;
    d.setFont(FONT, 'bold').setFontSize(7.8).setTextColor(...C.accent);
    d.text('CASE FILE', PAGE.margin, y);
    y += 22;

    const numberSize = this.fitSize(this.app.applicationNumber, CONTENT_WIDTH, 27, 18);
    d.setFont(FONT, 'bold').setFontSize(numberSize).setTextColor(...C.ink);
    d.text(this.app.applicationNumber, PAGE.margin, y);
    y += 20;

    d.setFont(FONT, 'bold').setFontSize(14).setTextColor(...C.ink);
    const institutionLines = d.splitTextToSize(safe(this.app.institution?.name), CONTENT_WIDTH) as string[];
    d.text(institutionLines, PAGE.margin, y, { lineHeightFactor: 1.25 });
    y += institutionLines.length * 17 + 8;

    d.setFont(FONT, 'normal').setFontSize(9.2).setTextColor(...C.muted);
    d.text(
      `${label(this.app.programType)} / Academic year ${safe(this.app.academicYear)} / ${label(this.app.assignedRegion)} Region`,
      PAGE.margin,
      y
    );
    y += 34;

    const boxGap = 8;
    const boxWidth = (CONTENT_WIDTH - boxGap * 2) / 3;
    const days = daysUntil(this.app.slaDueAt);
    const slaText =
      days === null ? 'Not recorded' : days < 0 ? `${dayCount(days)} overdue` : `${dayCount(days)} remaining`;
    const boxes: [string, string][] = [
      ['STATUS', label(this.app.status)],
      ['CURRENT STAGE', label(this.app.currentStage)],
      [days !== null && days < 0 ? 'SLA POSITION' : 'SLA DUE', days !== null && days < 0 ? slaText : formatDate(this.app.slaDueAt)],
    ];
    boxes.forEach(([label, value], index) => {
      const x = PAGE.margin + index * (boxWidth + boxGap);
      d.setFillColor(...C.fill);
      d.rect(x, y, boxWidth, 54, 'F');
      d.setFillColor(...(index === 2 && days !== null && days < 0 ? C.danger : C.accent));
      d.rect(x, y, boxWidth, 2, 'F');
      d.setFont(FONT, 'bold').setFontSize(6.8).setTextColor(...C.muted);
      d.text(label, x + 10, y + 18);
      d.setFont(FONT, 'bold').setFontSize(9.4).setTextColor(...C.ink);
      const valueLines = d.splitTextToSize(clean(value), boxWidth - 20) as string[];
      d.text(valueLines.slice(0, 2), x + 10, y + 32, { lineHeightFactor: 1.2 });
    });
    y += 80;

    this.sectionLabel('Case particulars', y);
    y += 18;
    const rows: [string, string][] = [
      ['Institution', safe(this.app.institution?.name)],
      ['AISHE code', safe(this.app.institution?.aisheCode)],
      ['Program', label(this.app.programType)],
      ['Academic year', safe(this.app.academicYear)],
      ['Region / state', `${label(this.app.assignedRegion)} / ${safe(this.app.institution?.state)}`],
      ['Route', label(this.app.routeType)],
      ['Submitted', formatDateTime(this.app.submittedAt)],
      ['Decision recorded', formatDateTime(this.app.decisionAt)],
      ['Assigned officer', this.app.assignedOfficer ? `${this.app.assignedOfficer.fullName} / ${label(this.app.assignedOfficer.role)}` : 'Not assigned'],
      ['Human verified', this.app.isHumanVerified ? 'Yes' : 'No'],
    ];
    y = this.coverGrid(rows, y);

    const noteY = PAGE.height - 142;
    d.setFillColor(...C.fill);
    d.rect(PAGE.margin, noteY, CONTENT_WIDTH, 74, 'F');
    d.setFillColor(...C.accent);
    d.rect(PAGE.margin, noteY, 3, 74, 'F');
    d.setFont(FONT, 'bold').setFontSize(7.4).setTextColor(...C.accent);
    d.text('SYSTEM-GENERATED RECORD', PAGE.margin + 14, noteY + 18);
    d.setFont(FONT, 'normal').setFontSize(7.6).setTextColor(...C.muted);
    const note = d.splitTextToSize(
      'This dossier is generated from the AICTE approval workflow register. It presents the recorded application data, statutory workflow trail, and compliance artefacts as held in the system. It does not replace any order separately issued by the Competent Authority.',
      CONTENT_WIDTH - 28
    ) as string[];
    d.text(note, PAGE.margin + 14, noteY + 32, { lineHeightFactor: 1.35 });

    d.setFont(FONT, 'normal').setFontSize(7.2).setTextColor(...C.faint);
    d.text(`Generated ${formatDateTime(this.generatedAt.toISOString())}`, PAGE.margin, noteY + 82);
    d.text(`Generated by ${this.generatedBy}`, PAGE.margin, noteY + 93);
  }

  private fitSize(text: string, width: number, preferred: number, minimum: number): number {
    let size = preferred;
    this.doc.setFont(FONT, 'bold').setFontSize(size);
    while (size > minimum && this.doc.getTextWidth(clean(text)) > width) {
      size -= 0.5;
      this.doc.setFontSize(size);
    }
    return size;
  }

  private sectionLabel(text: string, y: number): void {
    this.doc.setFont(FONT, 'bold').setFontSize(7.2).setTextColor(...C.muted);
    this.doc.text(text.toUpperCase(), PAGE.margin, y);
    this.doc.setDrawColor(...C.rule);
    this.doc.setLineWidth(0.6);
    this.doc.line(PAGE.margin, y + 6, PAGE.width - PAGE.margin, y + 6);
  }

  private coverGrid(rows: [string, string][], startY: number): number {
    const d = this.doc;
    const colWidth = CONTENT_WIDTH / 2;
    let y = startY;
    for (let i = 0; i < rows.length; i += 2) {
      const pair = rows.slice(i, i + 2);
      const heights = pair.map(([, value]) => {
        d.setFont(FONT, 'normal').setFontSize(8.2);
        return (d.splitTextToSize(clean(value), colWidth - 20) as string[]).length;
      });
      const height = 27 + Math.max(...heights, 1) * 9.5;
      pair.forEach(([label, value], index) => {
        const x = PAGE.margin + index * colWidth;
        d.setFont(FONT, 'bold').setFontSize(6.8).setTextColor(...C.faint);
        d.text(label.toUpperCase(), x, y + 10);
        d.setFont(FONT, 'normal').setFontSize(8.2).setTextColor(...C.ink);
        const lines = d.splitTextToSize(clean(value), colWidth - 20) as string[];
        d.text(lines, x, y + 20, { lineHeightFactor: 1.25 });
      });
      d.setDrawColor(...C.ruleSoft);
      d.setLineWidth(0.5);
      d.line(PAGE.margin, y + height, PAGE.width - PAGE.margin, y + height);
      y += height;
    }
    return y;
  }

  private drawRunningHeader(): void {
    const d = this.doc;
    d.setFont(FONT, 'bold').setFontSize(7).setTextColor(...C.ink);
    d.text('AICTE / APPROVAL WORKFLOW', PAGE.margin, 29);
    d.setFont(FONT, 'normal').setFontSize(7).setTextColor(...C.muted);
    d.text('CASE FILE / CONFIDENTIAL', PAGE.width / 2, 29, { align: 'center' });
    d.text(safe(this.app.applicationNumber), PAGE.width - PAGE.margin, 29, { align: 'right' });
    d.setDrawColor(...C.rule);
    d.setLineWidth(0.6);
    d.line(PAGE.margin, 38, PAGE.width - PAGE.margin, 38);
  }

  private section(kicker: string, title: string): void {
    this.ensureSpace(58);
    this.sectionNumber += 1;
    const d = this.doc;
    d.setFont(FONT, 'bold').setFontSize(7.2).setTextColor(...C.accent);
    d.text(`${String(this.sectionNumber).padStart(2, '0')} / ${kicker.toUpperCase()}`, PAGE.margin, this.y);
    this.y += 16;
    d.setFont(FONT, 'bold').setFontSize(14).setTextColor(...C.ink);
    d.text(title, PAGE.margin, this.y);
    this.y += 9;
    d.setDrawColor(...C.accent);
    d.setLineWidth(1.2);
    d.line(PAGE.margin, this.y, PAGE.margin + 34, this.y);
    this.y += 20;
  }

  private subheading(text: string): void {
    this.ensureSpace(34);
    this.doc.setFont(FONT, 'bold').setFontSize(9).setTextColor(...C.ink);
    this.doc.text(text, PAGE.margin, this.y);
    this.y += 14;
  }

  private paragraph(text: string, size = 8.6): void {
    const lines = this.doc.splitTextToSize(clean(text), CONTENT_WIDTH) as string[];
    this.ensureSpace(lines.length * size * 1.4 + 8);
    this.doc.setFont(FONT, 'normal').setFontSize(size).setTextColor(...C.ink);
    this.doc.text(lines, PAGE.margin, this.y, { lineHeightFactor: 1.35 });
    this.y += lines.length * size * 1.4 + 8;
  }

  private noteBox(title: string, text: string, tone: 'accent' | 'danger' = 'accent'): void {
    const d = this.doc;
    this.ensureSpace(72);
    const color = tone === 'danger' ? C.danger : C.accent;
    const lines = d.splitTextToSize(clean(text), CONTENT_WIDTH - 28) as string[];
    const height = 32 + lines.length * 10.5;
    d.setFillColor(...C.fill);
    d.rect(PAGE.margin, this.y, CONTENT_WIDTH, height, 'F');
    d.setFillColor(...color);
    d.rect(PAGE.margin, this.y, 3, height, 'F');
    d.setFont(FONT, 'bold').setFontSize(7.4).setTextColor(...color);
    d.text(title.toUpperCase(), PAGE.margin + 14, this.y + 16);
    d.setFont(FONT, 'normal').setFontSize(8.2).setTextColor(...C.ink);
    d.text(lines, PAGE.margin + 14, this.y + 29, { lineHeightFactor: 1.3 });
    this.y += height + 14;
  }

  private grid(rows: [string, string][]): void {
    const d = this.doc;
    const colWidth = CONTENT_WIDTH / 2;
    for (let i = 0; i < rows.length; i += 2) {
      const pair = rows.slice(i, i + 2);
      const lineCounts = pair.map(([, value]) => {
        d.setFont(FONT, 'normal').setFontSize(8.4);
        return (d.splitTextToSize(clean(value), colWidth - 18) as string[]).length;
      });
      const height = 28 + Math.max(...lineCounts, 1) * 10;
      this.ensureSpace(height + 2);
      pair.forEach(([label, value], index) => {
        const x = PAGE.margin + index * colWidth;
        d.setFont(FONT, 'bold').setFontSize(6.8).setTextColor(...C.faint);
        d.text(label.toUpperCase(), x, this.y + 10);
        d.setFont(FONT, 'normal').setFontSize(8.4).setTextColor(...C.ink);
        const lines = d.splitTextToSize(clean(value), colWidth - 18) as string[];
        d.text(lines, x, this.y + 21, { lineHeightFactor: 1.25 });
      });
      d.setDrawColor(...C.ruleSoft);
      d.setLineWidth(0.5);
      d.line(PAGE.margin, this.y + height, PAGE.width - PAGE.margin, this.y + height);
      this.y += height;
    }
    this.y += 8;
  }

  private table(columns: Column[], rows: string[][]): void {
    if (!rows.length) return;
    const d = this.doc;
    const drawHeader = () => {
      d.setFillColor(...C.fill);
      d.rect(PAGE.margin, this.y, CONTENT_WIDTH, 22, 'F');
      let x = PAGE.margin;
      d.setFont(FONT, 'bold').setFontSize(6.8).setTextColor(...C.muted);
      columns.forEach((column) => {
        const align = column.align ?? 'left';
        const tx = align === 'right' ? x + column.width - 6 : x + 6;
        d.text(column.label.toUpperCase(), tx, this.y + 14, { align });
        x += column.width;
      });
      this.y += 22;
    };

    this.ensureSpace(60);
    drawHeader();
    rows.forEach((row, rowIndex) => {
      const cellLines = row.map((cell, index) => {
        d.setFont(FONT, index === 0 ? 'bold' : 'normal').setFontSize(8.1);
        return d.splitTextToSize(clean(cell), columns[index].width - 12) as string[];
      });
      const height = Math.max(...cellLines.map((lines) => lines.length), 1) * 10.2 + 9;
      if (this.y + height > PAGE.height - 66) {
        this.newPage();
        drawHeader();
      }
      if (rowIndex % 2 === 1) {
        d.setFillColor(251, 251, 252);
        d.rect(PAGE.margin, this.y, CONTENT_WIDTH, height, 'F');
      }
      let x = PAGE.margin;
      columns.forEach((column, index) => {
        d.setFont(FONT, index === 0 ? 'bold' : 'normal').setFontSize(8.1);
        d.setTextColor(...(index === 0 ? C.ink : C.ink));
        const align = column.align ?? 'left';
        const tx = align === 'right' ? x + column.width - 6 : x + 6;
        d.text(cellLines[index], tx, this.y + 12, { align, lineHeightFactor: 1.25 });
        x += column.width;
      });
      d.setDrawColor(...C.ruleSoft);
      d.setLineWidth(0.5);
      d.line(PAGE.margin, this.y + height, PAGE.width - PAGE.margin, this.y + height);
      this.y += height;
    });
    this.y += 12;
  }

  private drawInstitution(): void {
    const institution = this.app.institution;
    this.section('Institution', 'Institution profile');
    this.grid([
      ['Institution', safe(institution?.name)],
      ['AISHE code', safe(institution?.aisheCode)],
      ['Institution type', label(institution?.type)],
      ['Region', label(this.app.assignedRegion || institution?.region)],
      ['State', safe(institution?.state)],
      ['Application route', label(this.app.routeType)],
      ['New institution', institution?.isNewInstitution ? 'Yes' : 'No'],
      ['Assigned officer', this.app.assignedOfficer ? `${this.app.assignedOfficer.fullName} / ${label(this.app.assignedOfficer.role)}` : 'Not assigned'],
    ]);
  }

  private drawApplication(): void {
    const slaDays = daysUntil(this.app.slaDueAt);
    const slaStatus = this.app.isBreached
      ? 'Breached'
      : slaDays !== null && slaDays < 0
        ? 'Past recorded due date'
        : 'Within SLA';
    this.section('Application', 'Application particulars');
    this.grid([
      ['Application number', safe(this.app.applicationNumber)],
      ['Academic year', safe(this.app.academicYear)],
      ['Program', label(this.app.programType)],
      ['Current stage', label(this.app.currentStage)],
      ['Status', label(this.app.status)],
      ['Route', label(this.app.routeType)],
      ['Submitted', formatDateTime(this.app.submittedAt)],
      ['Decision recorded', formatDateTime(this.app.decisionAt)],
      ['Statutory SLA due', formatDateTime(this.app.slaDueAt)],
      ['SLA status', slaStatus],
      ['Human verified', this.app.isHumanVerified ? 'Yes' : 'No'],
      ['Record created', formatDateTime(this.app.createdAt)],
    ]);

    if (this.app.remarks) {
      this.subheading('Recorded remarks');
      this.paragraph(this.app.remarks);
    }

    if (slaDays !== null && slaDays < 0) {
      this.noteBox(
        'Statutory SLA exception',
        this.app.isBreached
          ? `The application has exceeded its recorded SLA due date by ${dayCount(slaDays)}. This exception remains visible in the case file for review and escalation.`
          : `The recorded SLA due date passed ${dayCount(slaDays)} ago. The register does not currently carry a breach flag for this application.`,
        this.app.isBreached ? 'danger' : 'accent'
      );
    }

    if (['APPROVED', 'APPROVED_WITH_UNDERTAKING', 'REJECTED', 'WITHDRAWN'].includes(this.app.status)) {
      this.noteBox(
        'Recorded decision',
        `${label(this.app.status)} recorded${this.app.decisionAt ? ` on ${formatDateTime(this.app.decisionAt)}` : ''}. Statutory effect is limited to the decision recorded in the workflow register.`
      );
    }
  }

  private drawWorkflow(): void {
    this.section('Workflow', 'Chronological workflow trail');
    const actions = this.app.actions ?? [];
    if (!actions.length) {
      this.paragraph('No workflow actions have been recorded for this application.');
      return;
    }
    this.table(
      [
        { label: '#', width: 22 },
        { label: 'Date', width: 78 },
        { label: 'Action', width: 93 },
        { label: 'Stage movement', width: 108 },
        { label: 'Recorded by', width: 88 },
        { label: 'Reason / remark', width: 110 },
      ],
      actions.map((action, index) => [
        String(index + 1),
        formatDateTime(action.createdAt),
        label(action.actionType),
        `${label(action.fromStage ?? 'Start')} to ${label(action.toStage ?? 'End')}`,
        action.isAutomated ? 'Automated system' : `${action.actor?.fullName ?? 'System'} / ${label(action.actor?.role)}`,
        action.reason || '—',
      ])
    );
    this.paragraph('Workflow entries are append-only and shown in chronological order. Automated entries are identified by the system actor.', 7.6);
  }

  private drawUndertakings(): void {
    const undertakings = this.app.undertakings ?? [];
    this.section('Compliance', 'Undertakings and conditions');
    this.table(
      [
        { label: 'Undertaking', width: 186 },
        { label: 'Status', width: 90 },
        { label: 'Due', width: 72 },
        { label: 'Submitted', width: 76 },
        { label: 'Verified', width: 75 },
      ],
      undertakings.map((item) => [
        item.title,
        label(item.status),
        formatDate(item.dueDate),
        formatDate(item.submittedAt),
        formatDate(item.verifiedAt),
      ])
    );

    undertakings.forEach((item) => {
      this.ensureSpace(28);
      this.subheading(`${item.title} / ${label(item.status)}`);
      if (item.conditions) this.paragraph(`Conditions: ${conditionText(item.conditions)}`, 8.2);
      if (item.description) this.paragraph(`Description: ${item.description}`, 8.2);
      if (item.verificationRemarks) this.paragraph(`Verification remark: ${item.verificationRemarks}`, 8.2);
      this.y += 2;
    });
  }

  private drawDocuments(): void {
    const documents = this.app.documents ?? [];
    this.section('Records', 'Documents on record');
    this.table(
      [
        { label: 'Document', width: 180 },
        { label: 'Type', width: 94 },
        { label: 'Valid until', width: 74 },
        { label: 'Status', width: 75 },
        { label: 'File reference', width: 76 },
      ],
      documents.map((item) => [
        item.title,
        label(item.type),
        formatDate(item.validUntil),
        label(item.status),
        fileName(item.filePath),
      ])
    );
    this.paragraph('Document validity is tracked against the institutional register. File references point to the controlled upload held by the system.', 7.6);
  }

  private drawEvc(): void {
    const schedules = this.app.evcSchedules ?? [];
    this.section('Committee', 'EVC schedule and committee');
    schedules.forEach((schedule) => {
      this.ensureSpace(46);
      this.subheading(`Schedule / ${label(schedule.status)}`);
      this.grid([
        ['Scheduled', formatDate(schedule.scheduledDate)],
        ['Completed', formatDate(schedule.completedDate)],
        ['Due', formatDate(schedule.dueAt)],
        ['Venue', safe(schedule.venue)],
        ['SLA', schedule.isBreached ? 'Breached' : 'Within SLA'],
        ['Committee members', String(schedule.members?.length ?? 0)],
      ]);
      if (schedule.notes) this.paragraph(`Schedule notes: ${schedule.notes}`, 8.2);
      if (schedule.members?.length) {
        this.subheading('Committee roster');
        this.table(
          [
            { label: 'Member', width: 246 },
            { label: 'Role', width: 160 },
            { label: 'Availability', width: 93 },
          ],
          schedule.members.map((member) => [
            member.user?.fullName ?? '—',
            label(member.role || member.user?.role),
            member.isAvailable ? 'Available' : 'Not available',
          ])
        );
      }
      this.y += 4;
    });
  }

  private drawAlerts(): void {
    const alerts = this.app.alerts ?? [];
    const groups = groupAlerts(alerts);
    this.section('Notifications', 'Alerts and escalation trail');
    this.table(
      [
        { label: 'Occurrence window', width: 105 },
        { label: 'Severity', width: 66 },
        { label: 'Alert', width: 128 },
        { label: 'Message', width: 160 },
        { label: 'Count', width: 40, align: 'right' },
      ],
      groups.map((group) => [
        group.count > 1
          ? `${formatDateTime(group.oldest.createdAt)} to ${formatDateTime(group.newest.createdAt)}`
          : formatDateTime(group.newest.createdAt),
        `${label(group.newest.severity)}${group.newest.isEscalated ? ' / escalated' : ''}`,
        group.newest.title,
        group.newest.message,
        group.count > 1 ? `x${group.count}` : '1',
      ])
    );
    this.paragraph(
      `${alerts.length} alert${alerts.length === 1 ? '' : 's'} recorded, consolidated into ${groups.length} unique notice${groups.length === 1 ? '' : 's'} by message and severity. Repeated notices retain their full occurrence window.`,
      7.6
    );
  }

  private drawCertification(): void {
    if (this.y > PAGE.height - 360) this.newPage();
    this.section('Traceability', 'Certification and record control');
    this.noteBox(
      'System of record',
      `This case file was generated from the AICTE approval workflow register on ${formatDateTime(this.generatedAt.toISOString())} by ${this.generatedBy}. The entries above reflect the data held by the system at the time of generation.`
    );
    this.grid([
      ['Document template', TEMPLATE_ID],
      ['Generated on', formatDateTime(this.generatedAt.toISOString())],
      ['Generated by', this.generatedBy],
      ['Source', 'AICTE Approval Workflow Automation System'],
    ]);
    this.paragraph(
      'This is a system-generated case file and does not replace any statutory order, notice, or communication issued separately by the Competent Authority. Where a decision is recorded, it must be read together with the applicable statutory provisions and the workflow trail above.',
      8.1
    );
  }

  private drawFooters(): void {
    const d = this.doc;
    const total = d.getNumberOfPages();
    for (let page = 1; page <= total; page += 1) {
      d.setPage(page);
      d.setDrawColor(...C.rule);
      d.setLineWidth(0.6);
      d.line(PAGE.margin, PAGE.height - 42, PAGE.width - PAGE.margin, PAGE.height - 42);
      d.setFont(FONT, 'normal').setFontSize(6.8).setTextColor(...C.faint);
      d.text('AICTE / Approval Workflow Automation System', PAGE.margin, PAGE.height - 28);
      d.text('CASE FILE / CONFIDENTIAL', PAGE.width / 2, PAGE.height - 28, { align: 'center' });
      d.text(`Page ${page} of ${total}`, PAGE.width - PAGE.margin, PAGE.height - 28, { align: 'right' });
    }
  }
}

export function downloadCaseFilePdf(app: Application, generatedBy: string): void {
  new CaseFileDocument(app, generatedBy || 'Authorised user').download();
}
