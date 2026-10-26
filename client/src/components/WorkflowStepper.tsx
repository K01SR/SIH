import { STAGES, humanize } from '../utils';

export function WorkflowStepper({ currentStage }: { currentStage: string }) {
  let idx = STAGES.indexOf(currentStage);
  if (idx === -1) {
    const fallback = currentStage === 'RESCRUTINY' ? 'SCRUTINY' : currentStage;
    idx = STAGES.indexOf(fallback);
  }

  return (
    <div
      className="flex min-w-max items-end gap-0 overflow-x-auto pb-1"
      role="list"
      aria-label="Approval workflow stages"
    >
      {STAGES.map((stage, i) => {
        const done = idx > i;
        const active = idx === i;
        return (
          <div key={stage} className="flex items-end" role="listitem">
            <div
              aria-current={active ? 'step' : undefined}
              className="group flex w-[92px] flex-col gap-2 sm:w-[118px]"
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`flex h-4 w-4 items-center justify-center rounded-[2px] border font-mono text-[8px] font-medium ${
                    active
                      ? 'border-accent bg-accent text-ground'
                      : done
                        ? 'border-value bg-value text-ground'
                        : 'border-line text-ink-muted'
                  }`}
                >
                  {done ? '✓' : String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className={`h-px flex-1 ${
                    active ? 'bg-accent' : done ? 'bg-value/60' : 'bg-line'
                  }`}
                />
              </div>
              <span
                className={`label leading-tight ${
                  active ? 'text-accent' : done ? 'text-ink' : 'text-ink-muted'
                }`}
              >
                {humanize(stage)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
