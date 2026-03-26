import type { FC } from 'react';

interface Goal {
  id: string;
  name: string;
  type: 'PHYSICAL' | 'MENTAL' | 'OTHER';
  progress: number;
  deadline?: string;
  routines?: { count: string; task: string; completedThisWeek?: number; completedTotal?: number }[];
  milestones?: { name: string; completed: boolean }[];
}

interface StatisticsProps {
  goals: Goal[];
}

const TYPE_META = {
  PHYSICAL: { label: 'Body', color: 'var(--accent-red)' },
  MENTAL:   { label: 'Mind', color: 'var(--accent-blue)' },
  OTHER:    { label: 'Soul', color: 'var(--accent-gold)' },
};

export const Statistics: FC<StatisticsProps> = ({ goals }) => {
  const totalGoals = goals.length;
  const totalMilestones = goals.reduce((s, g) => s + (g.milestones?.length || 0), 0);
  const completedMilestones = goals.reduce((s, g) => s + (g.milestones?.filter(c => c.completed).length || 0), 0);
  const totalRoutineActions = goals.reduce((s, g) => s + (g.routines?.reduce((rs, r) => rs + parseInt(r.count || '1', 10), 0) ?? 0), 0);
  const weeklyCompleted = goals.reduce((s, g) => s + (g.routines?.reduce((rs, r) => rs + (r.completedThisWeek ?? 0), 0) ?? 0), 0);
  const allTimeCompleted = goals.reduce((s, g) => s + (g.routines?.reduce((rs, r) => rs + (r.completedTotal ?? 0), 0) ?? 0), 0);

  const byType = (['PHYSICAL', 'MENTAL', 'OTHER'] as const).map(type => ({
    type,
    count: goals.filter(g => g.type === type).length,
    ...TYPE_META[type],
  }));

  const milestonePct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const weeklyPct = totalRoutineActions > 0 ? Math.min(100, Math.round((weeklyCompleted / totalRoutineActions) * 100)) : 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '2rem' }}>
      <h1 className="serif text-gold" style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>The Chronicle</h1>
      <p className="text-secondary" style={{ fontSize: '0.7rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '2rem' }}>Your journey in numbers</p>

      {goals.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="text-secondary" style={{ letterSpacing: '2px', fontSize: '0.8rem' }}>NO ACTIVE INTENTIONS YET</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { label: 'Active Goals', value: totalGoals },
              { label: 'Actions This Week', value: `${weeklyCompleted} / ${totalRoutineActions}` },
              { label: 'Milestones Hit', value: `${completedMilestones} / ${totalMilestones}` },
              { label: 'All-time Plants', value: allTimeCompleted },
            ].map(card => (
              <div key={card.label} style={{ background: 'var(--card-bg)', borderRadius: '14px', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span className="text-secondary" style={{ fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase' }}>{card.label}</span>
                <span className="serif text-primary" style={{ fontSize: '1.8rem' }}>{card.value}</span>
              </div>
            ))}
          </div>

          {/* Category breakdown */}
          <div style={{ background: 'var(--card-bg)', borderRadius: '14px', padding: '1.4rem' }}>
            <p className="text-secondary" style={{ fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1rem' }}>By Category</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {byType.map(b => (
                <div key={b.type} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: b.color, boxShadow: `0 0 8px ${b.color}` }} />
                  <span className="serif" style={{ fontSize: '1.6rem', color: b.color }}>{b.count}</span>
                  <span className="text-secondary" style={{ fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase' }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress bars */}
          <div style={{ background: 'var(--card-bg)', borderRadius: '14px', padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <p className="text-secondary" style={{ fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Progress Overview</p>

            {[
              { label: 'Milestones Cleared', pct: milestonePct, color: 'var(--accent-gold)' },
              { label: 'Weekly Actions Done', pct: weeklyPct, color: 'var(--accent-blue)' },
            ].map(bar => (
              <div key={bar.label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-secondary" style={{ fontSize: '0.75rem' }}>{bar.label}</span>
                  <span style={{ fontSize: '0.75rem', color: bar.color }}>{bar.pct}%</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${bar.pct}%`, background: bar.color, borderRadius: '4px', transition: 'width 0.8s ease', boxShadow: `0 0 8px ${bar.color}` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Per-goal breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p className="text-secondary" style={{ fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Per Intention</p>
            {goals.map(g => {
              const meta = TYPE_META[g.type];
              const cps = g.milestones || [];
              const done = cps.filter(c => c.completed).length;
              const pct = cps.length > 0 ? Math.round((done / cps.length) * 100) : 0;
              const weekDone = g.routines?.reduce((s, r) => s + (r.completedThisWeek || 0), 0) || 0;
              const weekNeeded = g.routines?.reduce((s, r) => s + parseInt(r.count || '1', 10), 0) || 0;
              return (
                <div key={g.id} style={{ background: 'var(--card-bg)', borderRadius: '14px', padding: '1.2rem', borderLeft: `3px solid ${meta.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span className="serif text-primary" style={{ fontSize: '1.1rem' }}>{g.name}</span>
                    <span style={{ fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: meta.color }}>{meta.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div>
                      <span className="text-secondary" style={{ fontSize: '0.65rem', letterSpacing: '1px', textTransform: 'uppercase' }}>This week</span>
                      <p style={{ margin: '4px 0', color: meta.color, fontSize: '1rem', fontFamily: 'var(--font-serif)' }}>{weekDone}/{weekNeeded}</p>
                    </div>
                    <div>
                      <span className="text-secondary" style={{ fontSize: '0.65rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Milestones</span>
                      <p style={{ margin: '4px 0', color: meta.color, fontSize: '1rem', fontFamily: 'var(--font-serif)' }}>{done}/{cps.length} ({pct}%)</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
};
