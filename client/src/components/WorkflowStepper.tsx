import { STAGES, humanize } from '../utils';

export function WorkflowStepper({ currentStage }: { currentStage: string }) {
  // Normalise: SUBMISSION and COMPLETED are terminal-ish book ends.
  const idx = STAGES.indexOf(currentStage);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {STAGES.map((stage, i) => {
        const done = idx > i;
        const active = idx === i;
        return (
          <div key={stage} className="flex items-center">
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
                active
                  ? 'bg-blue-600 text-white'
                  : done
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  active ? 'bg-white text-blue-600' : done ? 'bg-green-600 text-white' : 'bg-slate-300 text-white'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              {humanize(stage)}
            </div>
            {i < STAGES.length - 1 && (
              <div className={`mx-1 h-0.5 w-5 ${done ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
