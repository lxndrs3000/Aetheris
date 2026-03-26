import type { FC } from 'react';
import { useState } from 'react';

interface Goal {
  id: string;
  name: string;
  type: 'PHYSICAL' | 'MENTAL' | 'OTHER';
  progress: number;
  deadline?: string;
  routines?: any[];
  milestones?: any[];
}

interface LegacyVaultProps {
  goals: Goal[];
  onBack: () => void;
  onGoalClick: (goal: Goal) => void;
}

type CategoryType = 'PHYSICAL' | 'MENTAL' | 'OTHER';

const TYPE_META: Record<CategoryType, { label: string; color: string; rgb: string }> = {
  PHYSICAL: { label: 'Body', color: 'var(--accent-red)',  rgb: '255, 91, 113' },
  MENTAL:   { label: 'Mind', color: 'var(--accent-blue)', rgb: '113, 128, 255' },
  OTHER:    { label: 'Soul', color: 'var(--accent-gold)', rgb: '246, 177, 94'  },
};

export const LegacyVault: FC<LegacyVaultProps> = ({ goals, onBack, onGoalClick }) => {
  const [activeFilters, setActiveFilters] = useState<Set<CategoryType>>(
    new Set(['PHYSICAL', 'MENTAL', 'OTHER'])
  );

  const toggleFilter = (type: CategoryType) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const filtered = goals.filter(g => activeFilters.has(g.type));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '2rem' }}>

      {/* Back */}
      <button
        onClick={onBack}
        style={{
          background: 'transparent', border: 'none', color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
          padding: 0, marginBottom: '1.8rem', width: 'fit-content',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span style={{ fontSize: '0.7rem', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>The Drift</span>
      </button>

      {/* Header */}
      <h1 className="serif text-gold" style={{ fontSize: '2rem', margin: '0 0 0.3rem' }}>The Legacy</h1>
      <p className="text-secondary" style={{ fontSize: '0.7rem', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 2rem' }}>
        {goals.length} intention{goals.length !== 1 ? 's' : ''} transcended
      </p>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {(['PHYSICAL', 'MENTAL', 'OTHER'] as const).map(type => {
          const meta = TYPE_META[type];
          const active = activeFilters.has(type);
          return (
            <button
              key={type}
              onClick={() => toggleFilter(type)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: active ? `rgba(${meta.rgb}, 0.12)` : 'var(--card-bg)',
                border: `1px solid ${active ? meta.color : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '999px', padding: '8px 16px',
                color: active ? meta.color : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.2s ease',
                boxShadow: active ? `0 0 12px rgba(${meta.rgb}, 0.2)` : 'none',
              }}
            >
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: meta.color,
                boxShadow: active ? `0 0 6px ${meta.color}` : 'none',
                transition: 'all 0.2s ease',
              }} />
              <span style={{ fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Goal list */}
      {filtered.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="text-secondary" style={{ fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
            No intentions match this filter
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
          {filtered.map(goal => {
            const meta = TYPE_META[goal.type];
            const milestoneCount = goal.milestones?.length ?? 0;
            const routineCount = goal.routines?.length ?? 0;
            return (
              <div
                key={goal.id}
                onClick={() => onGoalClick(goal)}
                style={{
                  background: 'var(--card-bg)',
                  borderRadius: '18px',
                  padding: '1.4rem 1.6rem',
                  borderLeft: `3px solid ${meta.color}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: `0 0 0 0 rgba(${meta.rgb}, 0)`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                }}
                onPointerEnter={e => (e.currentTarget.style.boxShadow = `0 0 20px rgba(${meta.rgb}, 0.12)`)}
                onPointerLeave={e => (e.currentTarget.style.boxShadow = `0 0 0 0 rgba(${meta.rgb}, 0)`)}
              >
                <div style={{ minWidth: 0 }}>
                  <h3
                    className="serif"
                    style={{
                      color: '#fff', margin: '0 0 6px', fontSize: '1.3rem',
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}
                  >
                    {goal.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ color: meta.color, fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
                      {meta.label}
                    </span>
                    {milestoneCount > 0 && (
                      <span className="text-secondary" style={{ fontSize: '0.6rem', letterSpacing: '1px' }}>
                        {milestoneCount} milestone{milestoneCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {routineCount > 0 && (
                      <span className="text-secondary" style={{ fontSize: '0.6rem', letterSpacing: '1px' }}>
                        {routineCount} seed{routineCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: `radial-gradient(circle, rgba(${meta.rgb}, 0.6) 0%, transparent 70%)`,
                    border: `1px solid rgba(${meta.rgb}, 0.3)`,
                    boxShadow: `0 0 12px rgba(${meta.rgb}, 0.25)`,
                  }} />
                  <span style={{ fontSize: '0.5rem', letterSpacing: '1.5px', color: meta.color, textTransform: 'uppercase', opacity: 0.7 }}>
                    ZENITH
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
