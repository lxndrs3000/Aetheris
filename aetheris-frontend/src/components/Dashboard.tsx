import type { FC } from 'react';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { calculateGoalProgress, parseWeeks } from '../utils/goalCalc';
import { AvatarPicker, AVATARS } from './AvatarPicker';

interface Goal {
  id: string;
  name: string;
  type: 'PHYSICAL' | 'MENTAL' | 'OTHER';
  deadline: string;
  progress: number;
  routines?: { count: string; task: string; completedThisWeek?: number; completedTotal?: number; lastPlantedDate?: string }[];
  weeklyStreak?: number;
  bestStreak?: number;
}

interface DashboardProps {
  goals: Goal[];
  isDailyOverview: boolean;
  setIsDailyOverview: (val: boolean) => void;
  onGoalClick: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onUpdateGoal: (updatedGoal: any) => void;
  onViewLegacy: () => void;
  homeResetCount: number;
  currentUser: { id: string; username: string; avatarId: number } | null;
  onUpdateAvatar: (avatarId: number) => void;
  onLogout: () => void;
  onOpenAuth: () => void;
}

interface BubbleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface NebulaState {
  topPct: number;
  leftPct: number;
  sizePx: number;
}

export const Dashboard: FC<DashboardProps> = ({ goals, isDailyOverview, setIsDailyOverview, onGoalClick, onDeleteGoal, onUpdateGoal, onViewLegacy, homeResetCount, currentUser, onUpdateAvatar, onLogout, onOpenAuth }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [timeFormat, setTimeFormat] = useState(localStorage.getItem('aetheris_timeFormat') || '24h');
  const [weekStart, setWeekStart] = useState(localStorage.getItem('aetheris_weekStart') || 'Monday');
  const containerRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<Map<string, BubbleState>>(new Map());
  const nebulaPositionsRef = useRef<Map<string, NebulaState>>(new Map());
  const animFrameRef = useRef<number | null>(null);
  const draggingRef = useRef<{ id: string; lastX: number; lastY: number; didDrag: boolean } | null>(null);
  const [, forceRender] = useState(0);

  const activeGoals = useMemo(() => goals.filter(g => (g.progress ?? 0) < 100), [goals]);
  const completedGoals = useMemo(() => goals.filter(g => (g.progress ?? 0) >= 100), [goals]);

  // Close settings whenever the home nav button is tapped
  useEffect(() => {
    setIsSettingsOpen(false);
    setConfirmDeleteId(null);
  }, [homeResetCount]);

  const handleTimeFormatChange = (val: string) => { setTimeFormat(val); localStorage.setItem('aetheris_timeFormat', val); };
  const handleWeekStartChange = (val: string) => { setWeekStart(val); localStorage.setItem('aetheris_weekStart', val); };

  const stars = useMemo(() => Array.from({ length: 80 }, (_, i) => ({
    id: i,
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 4,
    duration: 2 + Math.random() * 3
  })), []);

  const handleSeedToggle = (goalId: string, routineIndex: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const updatedRoutines = [...(goal.routines || [])];
    const target = { ...updatedRoutines[routineIndex] };
    const today = new Date().toDateString();
    const targetCount = parseInt(target.count, 10);

    if (target.lastPlantedDate === today) {
      // Unplant: reverse today's action
      target.completedThisWeek = Math.max(0, (target.completedThisWeek || 0) - 1);
      target.completedTotal = Math.max(0, (target.completedTotal || 0) - 1);
      target.lastPlantedDate = undefined;
    } else if ((target.completedThisWeek || 0) < targetCount) {
      // Plant
      target.completedThisWeek = (target.completedThisWeek || 0) + 1;
      target.completedTotal = (target.completedTotal || 0) + 1;
      target.lastPlantedDate = today;
    } else {
      return; // already at target and not planted today — nothing to do
    }

    updatedRoutines[routineIndex] = target;
    const updatedGoal = { ...goal, routines: updatedRoutines };
    updatedGoal.progress = calculateGoalProgress(updatedGoal);
    onUpdateGoal(updatedGoal);
  };

  const runPhysics = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const FRICTION = 0.92;
    const BOUNCE = 0.5;
    const BUBBLE_SIZE_PX = 140;
    const BUBBLE_W_PERCENT = (BUBBLE_SIZE_PX / cw) * 100;
    const BUBBLE_H_PERCENT = (BUBBLE_SIZE_PX / ch) * 100;

    let anyMoving = false;
    const bubbleIds = Array.from(bubblesRef.current.keys());

    bubblesRef.current.forEach((b, id) => {
      const goal = goals.find(g => g.id === id);
      if (!goal) return;
      const sizePx = getSize(goal);
      const radiusW = (sizePx / cw) * 50;
      const radiusH = (sizePx / ch) * 50;

      // Collision with other bubbles
      bubbleIds.forEach(otherId => {
        if (id === otherId) return;
        const otherGoal = goals.find(g => g.id === otherId);
        if (!otherGoal) return;
        const otherB = bubblesRef.current.get(otherId)!;
        const otherSizePx = getSize(otherGoal);
        const otherRadiusW = (otherSizePx / cw) * 50;
        const otherRadiusH = (otherSizePx / ch) * 50;

        const dx = (b.x + radiusW) - (otherB.x + otherRadiusW);
        const dy = (b.y + radiusH) - (otherB.y + otherRadiusH);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = radiusW + otherRadiusW;

        if (distance < minDistance && distance > 0) {
          const angle = Math.atan2(dy, dx);
          const force = (minDistance - distance) * 0.08;
          b.vx += Math.cos(angle) * force;
          b.vy += Math.sin(angle) * force;
          otherB.vx -= Math.cos(angle) * force;
          otherB.vy -= Math.sin(angle) * force;
          anyMoving = true;
        }
      });

      if (Math.abs(b.vx) < 0.01 && Math.abs(b.vy) < 0.01) return;
      anyMoving = true;
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= FRICTION;
      b.vy *= FRICTION;

      const maxX = 100 - BUBBLE_W_PERCENT;
      const maxY = 100 - BUBBLE_H_PERCENT;
      if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx) * BOUNCE; }
      if (b.x > maxX) { b.x = maxX; b.vx = -Math.abs(b.vx) * BOUNCE; }
      if (b.y < 0) { b.y = 0; b.vy = Math.abs(b.vy) * BOUNCE; }
      if (b.y > maxY) { b.y = maxY; b.vy = -Math.abs(b.vy) * BOUNCE; }
      bubblesRef.current.set(id, { ...b });
    });

    forceRender(n => n + 1);
    if (anyMoving) {
      animFrameRef.current = requestAnimationFrame(runPhysics);
    } else {
      animFrameRef.current = null;
    }
  }, []);

  const startPhysics = useCallback(() => {
    if (!animFrameRef.current) {
      animFrameRef.current = requestAnimationFrame(runPhysics);
    }
  }, [runPhysics]);

  const handleMouseDown = (e: React.MouseEvent, goal: Goal) => {
    // Transcended goals are "memories in the sky" - they must not be draggable.
    if ((goal.progress ?? 0) >= 100) return;
    e.preventDefault();
    draggingRef.current = { id: goal.id, lastX: e.clientX, lastY: e.clientY, didDrag: false };
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    const b = bubblesRef.current.get(goal.id);
    if (b) bubblesRef.current.set(goal.id, { ...b, vx: 0, vy: 0 });
  };

  const handleTouchStart = (e: React.TouchEvent, goal: Goal) => {
    if ((goal.progress ?? 0) >= 100) return;
    e.preventDefault();
    const touch = e.touches[0];
    draggingRef.current = { id: goal.id, lastX: touch.clientX, lastY: touch.clientY, didDrag: false };
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    const b = bubblesRef.current.get(goal.id);
    if (b) bubblesRef.current.set(goal.id, { ...b, vx: 0, vy: 0 });
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const { id, lastX, lastY } = draggingRef.current;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const dx = ((e.clientX - lastX) / cw) * 100;
      const dy = ((e.clientY - lastY) / ch) * 100;
      const b = bubblesRef.current.get(id);
      if (b) bubblesRef.current.set(id, { ...b, x: b.x + dx, y: b.y + dy, vx: dx * 1.5, vy: dy * 1.5 });
      draggingRef.current.lastX = e.clientX;
      draggingRef.current.lastY = e.clientY;
      draggingRef.current.didDrag = true;
      forceRender(n => n + 1);
    };

    const onMouseUp = () => {
      if (!draggingRef.current) return;
      const { didDrag, id } = draggingRef.current;
      draggingRef.current = null;
      startPhysics();
      if (!didDrag) {
        const goal = goals.find(g => g.id === id);
        if (goal) onGoalClick(goal);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const { id, lastX, lastY } = draggingRef.current;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const dx = ((touch.clientX - lastX) / cw) * 100;
      const dy = ((touch.clientY - lastY) / ch) * 100;
      const b = bubblesRef.current.get(id);
      if (b) bubblesRef.current.set(id, { ...b, x: b.x + dx, y: b.y + dy, vx: dx * 1.5, vy: dy * 1.5 });
      draggingRef.current.lastX = touch.clientX;
      draggingRef.current.lastY = touch.clientY;
      draggingRef.current.didDrag = true;
      forceRender(n => n + 1);
    };

    const onTouchEnd = () => {
      if (!draggingRef.current) return;
      const { didDrag, id } = draggingRef.current;
      draggingRef.current = null;
      startPhysics();
      if (!didDrag) {
        const goal = goals.find(g => g.id === id);
        if (goal) onGoalClick(goal);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [goals, onGoalClick, startPhysics]);

  const getNebulaSeed = (id: string) => {
    // Simple deterministic hash for stable layout across renders.
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  const rand01 = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const TYPE_COLORS = {
    PHYSICAL: 'var(--accent-red)',
    MENTAL: 'var(--accent-blue)',
    OTHER: 'var(--accent-gold)'
  };

  const TYPE_RGB = {
    PHYSICAL: '255, 91, 113',
    MENTAL: '113, 128, 255',
    OTHER: '246, 177, 94',
  };

  const _TYPE_NEBULA: Record<'PHYSICAL' | 'MENTAL' | 'OTHER', { colorVar: string; icon: string; glow1: string; glow2: string; glow3: string; border: string }> = {
    PHYSICAL: { colorVar: TYPE_COLORS.PHYSICAL, icon: '🏃', glow1: 'rgba(255, 91, 113, 0.42)', glow2: 'rgba(255, 91, 113, 0.22)', glow3: 'rgba(255, 91, 113, 0.10)', border: 'rgba(255, 91, 113, 0.28)' },
    MENTAL: { colorVar: TYPE_COLORS.MENTAL, icon: '🎹', glow1: 'rgba(113, 128, 255, 0.42)', glow2: 'rgba(113, 128, 255, 0.22)', glow3: 'rgba(113, 128, 255, 0.10)', border: 'rgba(113, 128, 255, 0.28)' },
    OTHER: { colorVar: TYPE_COLORS.OTHER, icon: '✨', glow1: 'rgba(246, 177, 94, 0.42)', glow2: 'rgba(246, 177, 94, 0.22)', glow3: 'rgba(246, 177, 94, 0.10)', border: 'rgba(246, 177, 94, 0.28)' }
  };
  void _TYPE_NEBULA;

  const getColorClass = (type: string) => {
    switch (type) {
      case 'PHYSICAL': return 'glow-red'; case 'MENTAL': return 'glow-blue'; default: return 'glow-gold';
    }
  };
  const getTextColor = (type: string) => {
    switch (type) {
      case 'PHYSICAL': return 'var(--accent-red)'; case 'MENTAL': return 'var(--accent-blue)'; default: return 'var(--accent-gold)';
    }
  };
  // Goals grow from 120px to 220px based on manifestation progress
  const getSize = (goal: Goal) => 120 + (goal.progress / 100) * 100;

  // Keep transcended positions stable and exclude them from bubble physics.
  useEffect(() => {
    goals.forEach((goal, index) => {
      const isTranscended = (goal.progress ?? 0) >= 100;

      if (isTranscended) {
        bubblesRef.current.delete(goal.id);
        if (!nebulaPositionsRef.current.has(goal.id)) {
          const seed = getNebulaSeed(goal.id);
          // Scale nebula size by goal duration — longer goals = larger nebulae
          const weeks = parseWeeks(goal.deadline);
          const durationSize = 120 + Math.log2(weeks + 1) * 42;
          const sizePx = durationSize + rand01(seed + 2 + index) * 30;
          const topPct = 8 + rand01(seed + 3 + index) * 62;
          const leftPct = 12 + rand01(seed + 4 + index) * 76;
          nebulaPositionsRef.current.set(goal.id, { topPct, leftPct, sizePx });
        }
        return;
      }

      if (!bubblesRef.current.has(goal.id)) {
        const top = 8 + ((index * 22) % 55);
        const left = (index % 2 === 0 ? 15 : 55) + ((index * 7) % 15);
        bubblesRef.current.set(goal.id, { x: left, y: top, vx: 0, vy: 0 });
      }
    });

    forceRender(n => n + 1);
  }, [goals]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, padding: '1.2rem', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.4); }
        }
        @keyframes nebulaBreath {
          0%, 100% { opacity: var(--nebula-opacity-low); transform: scale(1); }
          50% { opacity: var(--nebula-opacity-high); transform: scale(1.04); }
        }
        .glow-red { box-shadow: 0 0 20px rgba(255, 107, 107, 0.2); }
        .glow-blue { box-shadow: 0 0 20px rgba(78, 205, 196, 0.2); }
        .glow-gold { box-shadow: 0 0 20px rgba(246, 177, 94, 0.2); }
        .hide-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Starfield */}
      {stars.map(star => (
        <div key={star.id} style={{
          position: 'absolute', top: `${star.top}%`, left: `${star.left}%`,
          width: `${star.size}px`, height: `${star.size}px`, borderRadius: '50%',
          background: 'white', animation: `twinkle ${star.duration}s ${star.delay}s ease-in-out infinite`,
          pointerEvents: 'none', zIndex: 0
        }} />
      ))}

      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', marginBottom: '20px', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: 'var(--accent-gold)', fontSize: '0.9rem' }}>✨</span>
          <h2 className="serif text-gold" style={{ fontSize: '0.85rem', margin: 0, letterSpacing: '0.8px' }}>Aetheris</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => setIsSettingsOpen(true)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-gold)', fontSize: '0.9rem', cursor: 'pointer' }}>⚙</button>
          <button
            onClick={() => currentUser ? setShowAvatarPicker(true) : onOpenAuth()}
            style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: currentUser ? '1px solid rgba(255,255,255,0.15)' : '1px dashed rgba(246,177,94,0.4)', overflow: 'hidden', cursor: 'pointer', padding: 0 }}
          >
            {currentUser ? (
              <img src={AVATARS[currentUser.avatarId ?? 0]?.url} alt="Profile" style={{ width: '100%', height: '100%' }} />
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgba(246,177,94,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: 'auto', display: 'block' }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {isSettingsOpen && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', flexDirection: 'column', padding: '2rem 1.5rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="serif text-gold" style={{ fontSize: '1.4rem', margin: 0 }}>System Settings</h2>
            <button onClick={() => { setIsSettingsOpen(false); setConfirmDeleteId(null); }} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-primary" style={{ fontSize: '1.1rem' }}>Time Format</span>
              <div style={{ display: 'flex', gap: '10px', background: 'var(--card-bg)', padding: '5px', borderRadius: '15px' }}>
                <button onClick={() => handleTimeFormatChange('12h')} style={{ background: timeFormat === '12h' ? 'var(--accent-gold)' : 'transparent', color: timeFormat === '12h' ? '#000' : 'var(--text-secondary)', border: 'none', padding: '5px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>12h</button>
                <button onClick={() => handleTimeFormatChange('24h')} style={{ background: timeFormat === '24h' ? 'var(--accent-gold)' : 'transparent', color: timeFormat === '24h' ? '#000' : 'var(--text-secondary)', border: 'none', padding: '5px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>24h</button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-primary" style={{ fontSize: '1.1rem' }}>Week Starts On</span>
              <div style={{ display: 'flex', gap: '10px', background: 'var(--card-bg)', padding: '5px', borderRadius: '15px' }}>
                <button onClick={() => handleWeekStartChange('Monday')} style={{ background: weekStart === 'Monday' ? 'var(--accent-gold)' : 'transparent', color: weekStart === 'Monday' ? '#000' : 'var(--text-secondary)', border: 'none', padding: '5px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>Mon</button>
                <button onClick={() => handleWeekStartChange('Sunday')} style={{ background: weekStart === 'Sunday' ? 'var(--accent-gold)' : 'transparent', color: weekStart === 'Sunday' ? '#000' : 'var(--text-secondary)', border: 'none', padding: '5px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>Sun</button>
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <h3 className="serif text-primary" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '15px' }}>Manage Intentions</h3>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 className="serif text-gold" style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Active</h4>
                  <span className="text-secondary" style={{ fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
                    {activeGoals.length}
                  </span>
                </div>
                {activeGoals.length === 0 ? (
                  <p className="text-secondary" style={{ margin: 0, opacity: 0.7 }}>No active intentions.</p>
                ) : (
                  activeGoals.map(g => (
                    <div key={g.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px 20px', borderRadius: '10px', marginBottom: '10px', transition: 'all 0.2s ease' }}>
                      {confirmDeleteId === g.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem' }}>
                            Delete <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>{g.name}</span>? This cannot be undone.
                          </p>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', padding: '7px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => { setConfirmDeleteId(null); onDeleteGoal(g.id); }}
                              style={{ flex: 1, background: 'rgba(255,91,113,0.15)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '7px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                            >
                              Confirm Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="text-primary" style={{ fontSize: '1.1rem' }}>{g.name}</span>
                          <button
                            onClick={() => setConfirmDeleteId(g.id)}
                            style={{ background: 'transparent', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 className="serif text-gold" style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Completed</h4>
                  <span className="text-secondary" style={{ fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
                    {completedGoals.length}
                  </span>
                </div>
                {completedGoals.length === 0 ? (
                  <p className="text-secondary" style={{ margin: 0, opacity: 0.7 }}>No completed intentions yet.</p>
                ) : (
                  completedGoals.map(g => (
                    <div
                      key={g.id}
                      style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', marginBottom: '10px', overflow: 'hidden', transition: 'all 0.2s ease' }}
                    >
                      {confirmDeleteId === g.id ? (
                        <div style={{ padding: '15px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem' }}>
                            Delete <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>{g.name}</span>? This cannot be undone.
                          </p>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', padding: '7px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => { setConfirmDeleteId(null); onDeleteGoal(g.id); }}
                              style={{ flex: 1, background: 'rgba(255,91,113,0.15)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '7px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                            >
                              Confirm Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => { setIsSettingsOpen(false); onGoalClick(g); }}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', cursor: 'pointer' }}
                        >
                          <span className="text-primary" style={{ fontSize: '1.1rem', opacity: 0.95 }}>{g.name}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(g.id); }}
                            style={{ background: 'transparent', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {currentUser ? (
                <button
                  onClick={onLogout}
                  style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,91,113,0.35)', color: 'var(--accent-red)', padding: '12px', borderRadius: '14px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => { setIsSettingsOpen(false); onOpenAuth(); }}
                  style={{
                    width: '100%', background: 'rgba(246,177,94,0.08)', border: '1px solid rgba(246,177,94,0.3)',
                    color: 'var(--accent-gold)', padding: '14px', borderRadius: '14px', cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save your progress — Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!isDailyOverview ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', paddingLeft: '10px', zIndex: 100 }}>
            <div>
              <h1 className="serif text-primary" style={{ fontSize: '1.8rem', margin: '3px 0' }}>The Drift</h1>
              <p className="text-secondary" style={{ fontSize: '0.65rem', maxWidth: '280px', margin: '6px 0', lineHeight: '1.4' }}>
                Your intentions are stars in the void. Watch them burn brighter as they reach fulfillment.
              </p>
            </div>
            <button 
              onClick={() => setIsDailyOverview(true)}
              style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(246, 177, 94, 0.3)',
                borderRadius: '40px',
                padding: '12px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                color: 'var(--accent-gold)',
                marginTop: '15px'
              }}
              onMouseOver={(e) => e.currentTarget.style.border = '1px solid rgba(246, 177, 94, 0.6)'}
              onMouseOut={(e) => e.currentTarget.style.border = '1px solid rgba(246, 177, 94, 0.3)'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                <path d="M16 7l-5 5 5 5" />
              </svg>
              <span className="serif" style={{ fontSize: '1.1rem', fontStyle: 'italic', letterSpacing: '0.5px' }}>Weekly View</span>
            </button>
          </div>
          
          {completedGoals.length > 0 && (
            <button
              onClick={onViewLegacy}
              style={{
                position: 'absolute',
                bottom: '110px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(246, 177, 94, 0.25)',
                borderRadius: '999px',
                padding: '10px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                color: 'var(--accent-gold)',
                zIndex: 10,
                transition: 'all 0.2s ease',
              }}
              onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(246,177,94,0.55)')}
              onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(246,177,94,0.25)')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span style={{ fontSize: '0.65rem', letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                {completedGoals.length} Transcended
              </span>
            </button>
          )}

          <div style={{ flex: 1, position: 'relative', minHeight: '60vh', zIndex: 1 }}>
            {goals.map(goal => {
              const b = bubblesRef.current.get(goal.id);
              const isTranscended = (goal.progress ?? 0) >= 100;
              const size = getSize(goal);
              const isDragging = draggingRef.current?.id === goal.id;
              
              if (isTranscended) {
                const pos = nebulaPositionsRef.current.get(goal.id);
                const seed = getNebulaSeed(goal.id);
                const rgb = TYPE_RGB[goal.type];

                // 5 seeded-random gradient blobs — unique per goal
                const blobs = Array.from({ length: 5 }, (_, i) => ({
                  x: 8 + rand01(seed + i * 7 + 10) * 78,
                  y: 8 + rand01(seed + i * 7 + 11) * 78,
                  spread: 36 + rand01(seed + i * 7 + 12) * 34,
                  opacity: (i === 0 ? 0.30 : 0.07 + rand01(seed + i * 7 + 13) * 0.16),
                }));
                const blurPx = (14 + rand01(seed + 50) * 14).toFixed(1);
                const baseOpacity = 0.52 + rand01(seed + 51) * 0.28;
                const breathLow = (baseOpacity * 0.80).toFixed(2);
                const breathHigh = baseOpacity.toFixed(2);
                const breathDuration = (7 + rand01(seed + 52) * 6).toFixed(1);

                const bgGradient = blobs
                  .map(b => `radial-gradient(circle at ${b.x.toFixed(1)}% ${b.y.toFixed(1)}%, rgba(${rgb}, ${b.opacity.toFixed(2)}) 0%, transparent ${b.spread.toFixed(1)}%)`)
                  .join(', ');

                return (
                  <div
                    key={goal.id}
                    style={{
                      position: 'absolute',
                      top: pos ? `${pos.topPct}%` : '20%',
                      left: pos ? `${pos.leftPct}%` : '50%',
                      width: pos ? `${pos.sizePx}px` : '220px',
                      height: pos ? `${pos.sizePx}px` : '220px',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 1,
                      pointerEvents: 'none'
                    }}
                  >
                    {/* Nebula cloud — seeded random, soft and diffuse */}
                    <div style={{
                      position: 'absolute',
                      inset: '-20%',
                      background: bgGradient,
                      filter: `blur(${blurPx}px) saturate(1.3)`,
                      ['--nebula-opacity-low' as any]: breathLow,
                      ['--nebula-opacity-high' as any]: breathHigh,
                      animation: `nebulaBreath ${breathDuration}s ease-in-out infinite`,
                    }} />

                    {(() => {
                      // Convert brightest blob coords (in expanded inset:-20% space) to container %
                      const textX = Math.min(82, Math.max(18, blobs[0].x * 1.4 - 20));
                      const textY = Math.min(82, Math.max(18, blobs[0].y * 1.4 - 20));
                      return (
                        <div style={{
                          position: 'absolute',
                          left: `${textX}%`,
                          top: `${textY}%`,
                          transform: 'translate(-50%, -50%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          textAlign: 'center',
                          pointerEvents: 'none',
                        }}>
                          <h3
                            className="serif"
                            style={{ color: '#fff', fontSize: '1.05rem', margin: 0, textShadow: '0 0 12px rgba(255,255,255,0.3)', opacity: 0.55 }}
                          >
                            {goal.name}
                          </h3>
                          <span
                            style={{ color: getTextColor(goal.type), fontSize: '0.45rem', letterSpacing: '2px', fontWeight: 'bold', opacity: 0.45, textTransform: 'uppercase' }}
                          >
                            {goal.type}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                );
              }

              return (
                <div
                  key={goal.id}
                  onMouseDown={(e) => handleMouseDown(e, goal)}
                  onTouchStart={(e) => handleTouchStart(e, goal)}
                  className={getColorClass(goal.type)}
                  style={{
                    position: 'absolute',
                    top: b ? `${b.y}%` : '10%',
                    left: b ? `${b.x}%` : '20%',
                    width: size + 'px', height: size + 'px',
                    borderRadius: '50%',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--card-bg)',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    transform: isDragging ? 'scale(1.08)' : 'scale(1)',
                    transition: isDragging ? 'none' : 'transform 0.2s ease',
                    boxShadow: isDragging ? '0 20px 60px rgba(0,0,0,0.5)' : undefined,
                    padding: '10px', textAlign: 'center', zIndex: isDragging ? 10 : 5
                  }}
                >
                  <h3 className="serif" style={{ color: '#fff', fontSize: '1rem', margin: '5px 0', pointerEvents: 'none' }}>{goal.name}</h3>
                  <span style={{ color: getTextColor(goal.type), fontSize: '0.6rem', letterSpacing: '1px', fontWeight: 'bold', pointerEvents: 'none' }}>{goal.type}</span>
                  {(goal.weeklyStreak || 0) > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '5px', pointerEvents: 'none' }}>
                      <span style={{ fontSize: '0.7rem' }}>🔥</span>
                      <span style={{ color: '#F9C384', fontSize: '0.58rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>{goal.weeklyStreak}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', paddingLeft: '10px', zIndex: 100 }}>
            <div>
              <h1 className="serif text-primary" style={{ fontSize: '1.9rem', margin: '8px 0', letterSpacing: '0.5px' }}>Weekly Archive</h1>
              <p className="text-secondary" style={{ fontSize: '0.65rem', maxWidth: '300px', margin: '4px 0', lineHeight: '1.5', opacity: 0.8 }}>
                Nurture the seeds of your intent. Every action is a star forming in the quiet void.
              </p>
            </div>
            <button 
              onClick={() => setIsDailyOverview(false)}
              style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(246, 177, 94, 0.3)',
                borderRadius: '40px',
                padding: '12px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                color: 'var(--accent-gold)',
                marginTop: '15px'
              }}
              onMouseOver={(e) => e.currentTarget.style.border = '1px solid rgba(246, 177, 94, 0.6)'}
              onMouseOut={(e) => e.currentTarget.style.border = '1px solid rgba(246, 177, 94, 0.3)'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M3 12c0 9 9 9 9 9" />
                <path d="M21 12c0-9-9-9-9-9" />
                <path d="M12 21c-9 0-9-9-9-9" />
                <path d="M12 3c9 0 9 9 9 9" />
                <path d="M12 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z" />
              </svg>
              <span className="serif" style={{ fontSize: '1.1rem', fontStyle: 'italic', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Orbit View</span>
            </button>
          </div>

          <div className="hide-scroll" style={{ flex: 1, zIndex: 1, overflowY: 'auto', padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '40px' }}>
            {activeGoals.map(goal => (
              <div
                key={goal.id}
                style={{
                background: 'rgba(30, 31, 46, 0.6)',
                borderRadius: '35px', 
                padding: '30px',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '25px',
                boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <p style={{ color: TYPE_COLORS[goal.type], fontSize: '0.7rem', letterSpacing: '2px', margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: 'bold' }}>{goal.type}</p>
                    <h2 className="serif" style={{
                      fontSize: '2.4rem',
                      color: '#fff',
                      margin: 0,
                      fontWeight: 300,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>{goal.name}</h2>
                    {(goal.weeklyStreak || 0) > 0 && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(246,177,94,0.07)', border: '1px solid rgba(246,177,94,0.2)', borderRadius: '20px', padding: '3px 12px', marginTop: '10px' }}>
                        <span style={{ fontSize: '0.75rem' }}>🔥</span>
                        <span style={{ color: 'var(--accent-gold)', fontSize: '0.58rem', fontWeight: 'bold', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                          {goal.weeklyStreak} week{(goal.weeklyStreak || 0) > 1 ? 's' : ''} streak
                        </span>
                        {(goal.bestStreak || 0) > (goal.weeklyStreak || 0) && (
                          <span style={{ color: 'rgba(246,177,94,0.4)', fontSize: '0.52rem', letterSpacing: '1px' }}>
                            · best {goal.bestStreak}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ 
                    flexShrink: 0,
                    width: '100px',
                    height: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{ 
                      width: `${60 + (goal.progress ?? 0) * 0.4}px`, 
                      height: `${60 + (goal.progress ?? 0) * 0.4}px`, 
                      borderRadius: '50%', 
                      background: `radial-gradient(circle, ${TYPE_COLORS[goal.type]} 0%, rgba(0,0,0,0) 70%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid rgba(255,255,255,0.1)',
                      position: 'relative',
                      boxShadow: `0 0 30px ${TYPE_COLORS[goal.type]}33`
                    }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: TYPE_COLORS[goal.type], boxShadow: `0 0 15px ${TYPE_COLORS[goal.type]}` }} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {(goal.routines || []).map((r, ri) => {
                    const today = new Date().toDateString();
                    const isDoneToday = r.lastPlantedDate === today;
                    const isTargetReached = (r.completedThisWeek || 0) >= parseInt(r.count, 10);
                    const isDisabled = isTargetReached && !isDoneToday;

                    return (
                      <div
                        key={ri}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          padding: '20px 25px',
                          borderRadius: '20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          border: isDoneToday ? `1px solid ${TYPE_COLORS[goal.type]}33` : '1px solid rgba(255,255,255,0.02)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <span style={{ color: isDoneToday ? TYPE_COLORS[goal.type] : 'rgba(255,255,255,0.3)', fontSize: '1.2rem' }}>
                            {isDoneToday ? '✓' : '🌿'}
                          </span>
                          <div>
                            <p style={{ color: '#fff', fontSize: '1.1rem', margin: 0, opacity: isDoneToday ? 0.6 : 1, textDecoration: isDoneToday ? 'line-through' : 'none' }}>{r.task}</p>
                            {r.count !== '1' && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '1px' }}>{r.completedThisWeek || 0} / {r.count} Weekly</p>}
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isDisabled) handleSeedToggle(goal.id, ri);
                          }}
                          style={{
                            background: isDoneToday ? `${TYPE_COLORS[goal.type]}15` : 'rgba(255,255,255,0.05)',
                            border: isDoneToday ? `1px solid ${TYPE_COLORS[goal.type]}55` : '1px solid rgba(255,255,255,0.1)',
                            color: isDoneToday ? TYPE_COLORS[goal.type] : '#fff',
                            padding: '8px 20px',
                            borderRadius: '15px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            cursor: isDisabled ? 'default' : 'pointer',
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            opacity: isDisabled ? 0.3 : 1
                          }}
                        >
                          {isDoneToday ? 'PLANTED ✓' : 'PLANT'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '5px' }}>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${goal.progress}%`, 
                      height: '100%', 
                      background: `linear-gradient(90deg, transparent 0%, ${TYPE_COLORS[goal.type]} 100%)`,
                      borderRadius: '10px',
                      transition: 'width 1s ease-out'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px' }}>{goal.progress}% GROWN</span>
                  </div>
                </div>
              </div>
            ))}
            {activeGoals.length === 0 && completedGoals.length === 0 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p className="text-secondary" style={{ letterSpacing: '2px', fontSize: '0.8rem' }}>THE VOID IS SILENT. ADD AN INTENTION.</p>
              </div>
            )}
            {completedGoals.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem', paddingBottom: '1rem' }}>
                <button
                  onClick={onViewLegacy}
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(246, 177, 94, 0.25)',
                    borderRadius: '999px',
                    padding: '10px 28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    color: 'var(--accent-gold)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(246,177,94,0.55)')}
                  onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(246,177,94,0.25)')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span style={{ fontSize: '0.65rem', letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                    {completedGoals.length} Transcended
                  </span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {showAvatarPicker && currentUser && (
        <AvatarPicker
          currentAvatarId={currentUser.avatarId ?? 0}
          onSelect={(id) => { onUpdateAvatar(id); setShowAvatarPicker(false); }}
          onClose={() => setShowAvatarPicker(false)}
          onLogout={onLogout}
        />
      )}
    </div>
  );
};
