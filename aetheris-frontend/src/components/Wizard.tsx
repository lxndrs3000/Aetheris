import type { FC } from 'react';
import { useState } from 'react';

interface WizardProps {
  onComplete: (goal: any) => void;
}

export const Wizard: FC<WizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [goalName, setGoalName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [goalType, setGoalType] = useState<'PHYSICAL' | 'MENTAL' | 'OTHER'>('OTHER');
  const [routines, setRoutines] = useState<{count: string, task: string}[]>([{count: '2', task: ''}]);

  const CATEGORIES = [
    { type: 'PHYSICAL' as const, label: 'Body', color: 'var(--accent-red)' },
    { type: 'MENTAL'   as const, label: 'Mind', color: 'var(--accent-blue)' },
    { type: 'OTHER'    as const, label: 'Soul', color: 'var(--accent-gold)' },
  ];
  const activeColor = CATEGORIES.find(c => c.type === goalType)?.color ?? 'var(--accent-gold)';

  const isDeadlineValid = (str: string) => {
    const s = str.toLowerCase().trim();
    // Reject if contains negative sign
    if (s.includes('-')) return false;
    const numMatch = s.match(/(\d+)/);
    if (!numMatch) return false;
    const num = parseInt(numMatch[1], 10);
    if (num <= 0) return false;
    const hasUnit = /year|month|week|day/.test(s);
    if (!hasUnit) return false;
    // If using days, must be at least 7
    if (/day/.test(s) && num < 7) return false;
    return true;
  };

  const handleNext = () => {
    if (step === 2) {
      const validRoutines = routines.filter(r => r.task.trim() !== '');
      onComplete({ name: goalName, deadline, type: goalType, routines: validRoutines });
    } else {
      if (!goalName || !deadline || !isDeadlineValid(deadline)) return;
      setStep(step + 1);
    }
  };

  return (
    <div className="wizard-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      
      {step === 1 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%' }}>
          <p className="text-secondary text-center" style={{ fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            The Genesis
          </p>
          <div style={{ textAlign: 'center', fontSize: '1.7rem', lineHeight: '2.2', fontFamily: 'var(--font-serif)', color: activeColor, transition: 'color 0.3s ease' }}>
            <span>I want to</span><br/>
            <input
              type="text"
              placeholder="e.g. Master Piano"
              value={goalName}
              maxLength={30}
              onChange={(e) => {
                const words = e.target.value.split(' ');
                const formatted = words.map(w => w.substring(0, 10)).join(' ');
                setGoalName(formatted);
              }}
              style={{
                background: 'transparent', border: 'none', borderBottom: `2px dashed ${activeColor}`,
                color: '#fff', fontSize: '1.7rem', textAlign: 'center', outline: 'none',
                fontFamily: 'var(--font-serif)', fontStyle: 'italic', width: '90%', maxWidth: '300px', margin: '0 8px',
                transition: 'border-color 0.3s ease'
              }}
            /><br/>
            <span style={{ transition: 'color 0.3s ease' }}>in</span><br/>
            <input
              type="text"
              placeholder="e.g. 6 months, 1 year"
              value={deadline}
              maxLength={20}
              onChange={(e) => setDeadline(e.target.value)}
              style={{
                background: 'transparent', border: 'none', borderBottom: `2px dashed ${activeColor}`,
                color: '#fff', fontSize: '1.7rem', textAlign: 'center', outline: 'none',
                fontFamily: 'var(--font-serif)', fontStyle: 'italic', width: '70%', maxWidth: '240px', margin: '0 8px',
                transition: 'border-color 0.3s ease'
              }}
            />
          </div>

          {/* Category selector */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', marginTop: '2rem' }}>
            {CATEGORIES.map(cat => (
              <div key={cat.type} onClick={() => setGoalType(cat.type)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: goalType === cat.type ? cat.color : 'transparent',
                  border: `1.5px solid ${cat.color}`,
                  boxShadow: goalType === cat.type ? `0 0 10px ${cat.color}` : 'none',
                  transition: 'all 0.25s ease'
                }} />
                <span style={{ fontSize: '0.6rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: goalType === cat.type ? cat.color : 'rgba(255,255,255,0.3)', transition: 'color 0.25s ease' }}>{cat.label}</span>
              </div>
            ))}
          </div>

          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6rem', letterSpacing: '0.3px', textAlign: 'center', marginTop: '1.5rem', lineHeight: '1.6', maxWidth: '260px', alignSelf: 'center' }}>
            Aetheris is designed for long-term goals. Set a deadline of at least 1 week.
          </p>
        </div>
      )}

      {step === 2 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', alignItems: 'center' }}>
          <h1 className="serif text-center" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: activeColor, transition: 'color 0.3s ease' }}>
            Set your first weekly routine
          </h1>
          <p className="text-secondary text-center" style={{ fontSize: '0.75rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '2rem', maxWidth: '300px' }}>
            Habits are the seeds of transformation.
          </p>
          
          <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '3rem' }}>
            {routines.map((r, index) => (
              <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="number" 
                  min="1"
                  placeholder="#"
                  value={r.count}
                  onChange={(e) => {
                    const newRoutines = [...routines];
                    newRoutines[index].count = e.target.value;
                    setRoutines(newRoutines);
                  }}
                  style={{
                    background: 'transparent', border: 'none', borderBottom: `1px solid ${activeColor}`,
                    color: 'var(--text-primary)', fontSize: '1rem', textAlign: 'center', outline: 'none',
                    padding: '10px', width: '60px', transition: 'border-color 0.3s ease'
                  }}
                />
                <span className="text-secondary" style={{ fontSize: '0.9rem' }}>times</span>
                <input 
                  type="text" 
                  placeholder="e.g. 5k runs"
                  value={r.task}
                  maxLength={40}
                  onChange={(e) => {
                    const newRoutines = [...routines];
                    newRoutines[index].task = e.target.value;
                    setRoutines(newRoutines);
                  }}
                  style={{
                    background: 'transparent', border: 'none', borderBottom: `1px solid ${activeColor}`,
                    color: 'var(--text-primary)', fontSize: '1rem', outline: 'none',
                    padding: '10px', flex: 1, transition: 'border-color 0.3s ease'
                  }}
                />
                {routines.length > 1 && (
                  <button 
                    onClick={() => {
                      const newRoutines = [...routines];
                      newRoutines.splice(index, 1);
                      setRoutines(newRoutines);
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 10px' }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            
            <button 
              onClick={() => setRoutines([...routines, {count: '1', task: ''}])}
              style={{ 
                background: 'transparent', border: `1px dashed ${activeColor}`, 
                color: activeColor, padding: '10px', borderRadius: '10px', 
                cursor: 'pointer', marginTop: '10px', fontSize: '0.8rem', letterSpacing: '1px',
                textTransform: 'uppercase', transition: 'all 0.3s ease'
              }}
            >
              + Add Routine
            </button>
          </div>
        </div>
      )}

      <button 
        onClick={handleNext} 
        disabled={step === 1 && (!goalName || !deadline || !isDeadlineValid(deadline))}
        className="btn-primary glow-gold" 
        style={{ 
          marginTop: 'auto', width: '100%', maxWidth: '300px', 
          opacity: (step === 1 && (!goalName || !deadline || !isDeadlineValid(deadline))) ? 0.5 : 1,
          transition: 'all 0.3s ease'
        }}
      >
        {step === 2 ? 'Seed Intent' : 'Continue'}
      </button>
    </div>
  );
};
