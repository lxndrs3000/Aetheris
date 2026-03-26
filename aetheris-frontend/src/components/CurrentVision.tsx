import type { FC } from 'react';
import { useState, useEffect, useRef } from 'react';
import { calculateGoalProgress } from '../utils/goalCalc';

interface CurrentVisionProps {
  goal: any;
  onUpdateGoal?: (goal: any) => void;
  onBack?: () => void;
}

export const CurrentVision: FC<CurrentVisionProps> = ({ goal, onUpdateGoal, onBack }) => {
  const [localGoal, setLocalGoal] = useState(() => {
    const initializedRoutines = (goal.routines || []).map((r: any) => ({
      ...r,
      completedThisWeek: r.completedThisWeek !== undefined ? r.completedThisWeek : (r.completed || 0),
      completedTotal: r.completedTotal || r.completed || 0
    }));
    return { ...goal, routines: initializedRoutines, milestones: goal.milestones || [] };
  });

  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestoneName, setNewMilestoneName] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [swipeOffsets, setSwipeOffsets] = useState<Record<number, number>>({});
  const [undoState, setUndoState] = useState<{ milestone: any; index: number } | null>(null);
  const [dragInfo, setDragInfo] = useState<{ idx: number; offsetY: number; dropIdx: number } | null>(null);
  const [showWeeklyNotes, setShowWeeklyNotes] = useState(false);
  const [weeklyNotesList, setWeeklyNotesList] = useState<{ weekKey: string; weekNum: number; text: string }[]>(() => {
    const raw = goal.weeklyNotes;
    if (!raw || typeof raw === 'string') return [];
    return Array.isArray(raw) ? raw : [];
  });
  const [expandedWeekKeys, setExpandedWeekKeys] = useState<Set<string>>(new Set());

  const getCurrentWeekKey = () => {
    const pref = localStorage.getItem('aetheris_weekStart') || 'Monday';
    const now = new Date();
    const day = now.getDay();
    const target = pref === 'Monday' ? 1 : 0;
    let diff = day - target;
    if (diff < 0) diff += 7;
    const start = new Date(now);
    start.setDate(now.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start.toISOString().slice(0, 10);
  };
  const [editingSeedIdx, setEditingSeedIdx] = useState<number | null>(null);
  const [editingSeedTask, setEditingSeedTask] = useState('');
  const [editingSeedCount, setEditingSeedCount] = useState('');
  const [showAddSeed, setShowAddSeed] = useState(false);
  const [newSeedTask, setNewSeedTask] = useState('');
  const [newSeedCount, setNewSeedCount] = useState('1');
  const [seedDragInfo, setSeedDragInfo] = useState<{ idx: number; offsetY: number; dropIdx: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showJourneyFinal, setShowJourneyFinal] = useState(false);
  const [notesCopied, setNotesCopied] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStartRef = useRef<{ idx: number; x: number; y: number } | null>(null);
  const dragStateRef = useRef<{ idx: number; startY: number } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeOffsetRef = useRef<Record<number, number>>({});
  const localGoalRef = useRef(localGoal);
  const dragInfoRef = useRef<{ idx: number; offsetY: number; dropIdx: number } | null>(null);
  const seedLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seedPointerStartRef = useRef<{ idx: number; y: number } | null>(null);
  const seedDragStateRef = useRef<{ idx: number; startY: number } | null>(null);
  const seedDragInfoRef = useRef<{ idx: number; offsetY: number; dropIdx: number } | null>(null);

  useEffect(() => {
    const initializedRoutines = (goal.routines || []).map((r: any) => ({
      ...r,
      completedThisWeek: r.completedThisWeek !== undefined ? r.completedThisWeek : (r.completed || 0),
      completedTotal: r.completedTotal || r.completed || 0
    }));
    setLocalGoal({ ...goal, routines: initializedRoutines, milestones: goal.milestones || [] });
    const rawNotes = goal.weeklyNotes;
    setWeeklyNotesList(!rawNotes || typeof rawNotes === 'string' ? [] : Array.isArray(rawNotes) ? rawNotes : []);
    setShowJourneyFinal(false);
  }, [goal.id, goal.routines, goal.milestones]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const containerRect = container.getBoundingClientRect();
    const centerY = containerRect.top + (containerRect.height / 2);
    const nodes = container.querySelectorAll('.milestone-wrapper');
    nodes.forEach((node) => {
      const htmlNode = node as HTMLElement;
      const rect = htmlNode.getBoundingClientRect();
      const nodeCenterY = rect.top + (rect.height / 2);
      const distance = Math.abs(centerY - nodeCenterY);
      const maxDist = containerRect.height / 2;
      let scale = 1; let opacity = 1;
      if (distance > 30) {
        const ratio = (distance - 30) / (maxDist - 30);
        scale = Math.max(0.4, 1 - ratio * 0.6);
        opacity = Math.max(0.1, 1 - ratio * 0.9);
      }
      htmlNode.style.transform = `scale(${scale})`;
      htmlNode.style.opacity = opacity.toString();
    });
  };

  useEffect(() => {
    const timeout = setTimeout(handleScroll, 50);
    return () => clearTimeout(timeout);
  }, [localGoal.milestones, isAddingMilestone]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (scrollRef.current) {
        const nextGoalNode = scrollRef.current.querySelector('#next-goal-node') || scrollRef.current.firstElementChild;
        if (nextGoalNode) {
          const container = scrollRef.current;
          const nodeTop = (nextGoalNode as HTMLElement).offsetTop;
          const nodeHeight = (nextGoalNode as HTMLElement).offsetHeight;
          container.scrollTo({ top: nodeTop - (container.clientHeight / 2) + (nodeHeight / 2), behavior: 'smooth' });
        }
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  const calculatedProgress = calculateGoalProgress(localGoal);
  const isZenith = calculatedProgress >= 100;

  const completedMilestones = (localGoal.milestones || []).map((cp: any) => ({ ...cp, completed: true }));
  const plantedRoutines = localGoal.routines || [];
  const _totalPlants = plantedRoutines.reduce((s: number, r: any) => s + (r.completedTotal || 0), 0);
  void _totalPlants;

  const handlePlant = (index: number) => {
    const updatedRoutines = [...localGoal.routines];
    const targetRoutine = { ...updatedRoutines[index] };
    const targetCount = parseInt(targetRoutine.count, 10);
    const today = new Date().toDateString();
    if (targetRoutine.lastPlantedDate === today) {
      // Unplant: reverse today's action
      targetRoutine.completedThisWeek = Math.max(0, (targetRoutine.completedThisWeek || 0) - 1);
      targetRoutine.completedTotal = Math.max(0, (targetRoutine.completedTotal || 0) - 1);
      targetRoutine.lastPlantedDate = undefined;
    } else if ((targetRoutine.completedThisWeek || 0) < targetCount) {
      // Plant
      targetRoutine.completedThisWeek = (targetRoutine.completedThisWeek || 0) + 1;
      targetRoutine.completedTotal = (targetRoutine.completedTotal || 0) + 1;
      targetRoutine.lastPlantedDate = today;
    } else {
      return;
    }
    updatedRoutines[index] = targetRoutine;
    const updatedGoal = { ...localGoal, routines: updatedRoutines };
    updatedGoal.progress = calculateGoalProgress(updatedGoal);
    setLocalGoal(updatedGoal);
    if (onUpdateGoal) onUpdateGoal(updatedGoal);
  };

  const handleSaveWeeklyNotes = (text: string) => {
    const currentKey = getCurrentWeekKey();
    const existing = weeklyNotesList.find(n => n.weekKey === currentKey);
    let updated: { weekKey: string; weekNum: number; text: string }[];
    if (existing) {
      updated = weeklyNotesList.map(n => n.weekKey === currentKey ? { ...n, text } : n);
    } else {
      const nextNum = weeklyNotesList.length > 0 ? weeklyNotesList[weeklyNotesList.length - 1].weekNum + 1 : 1;
      updated = [...weeklyNotesList, { weekKey: currentKey, weekNum: nextNum, text }];
    }
    setWeeklyNotesList(updated);
    const updatedGoal = { ...localGoal, weeklyNotes: updated };
    setLocalGoal(updatedGoal);
    if (onUpdateGoal) onUpdateGoal(updatedGoal);
  };

  const handleSaveSeedEdit = () => {
    if (editingSeedIdx === null) return;
    const updatedRoutines = [...(localGoal.routines || [])];
    updatedRoutines[editingSeedIdx] = {
      ...updatedRoutines[editingSeedIdx],
      task: editingSeedTask.trim() || updatedRoutines[editingSeedIdx].task,
      count: editingSeedCount || updatedRoutines[editingSeedIdx].count,
    };
    const updatedGoal = { ...localGoal, routines: updatedRoutines };
    updatedGoal.progress = calculateGoalProgress(updatedGoal);
    setLocalGoal(updatedGoal);
    if (onUpdateGoal) onUpdateGoal(updatedGoal);
    setEditingSeedIdx(null);
  };

  const handleSeedPointerDown = (e: React.PointerEvent, idx: number) => {
    if (editingSeedIdx !== null) return;
    seedPointerStartRef.current = { idx, y: e.clientY };
    seedLongPressRef.current = setTimeout(() => {
      if (!seedPointerStartRef.current) return;
      seedDragStateRef.current = { idx, startY: seedPointerStartRef.current.y };
      setSeedDragInfo({ idx, offsetY: 0, dropIdx: idx });
    }, 450);
  };

  const handleAddSeed = () => {
    if (!newSeedTask.trim()) return;
    const newRoutine = { task: newSeedTask.trim(), count: newSeedCount || '1', completedThisWeek: 0, completedTotal: 0 };
    const updatedRoutines = [...(localGoal.routines || []), newRoutine];
    const updatedGoal = { ...localGoal, routines: updatedRoutines };
    updatedGoal.progress = calculateGoalProgress(updatedGoal);
    setLocalGoal(updatedGoal);
    if (onUpdateGoal) onUpdateGoal(updatedGoal);
    setNewSeedTask('');
    setNewSeedCount('1');
  };

  const handleDeleteSeed = (index: number) => {
    const updatedRoutines = localGoal.routines.filter((_: any, i: number) => i !== index);
    const updatedGoal = { ...localGoal, routines: updatedRoutines };
    updatedGoal.progress = calculateGoalProgress(updatedGoal);
    setLocalGoal(updatedGoal);
    if (onUpdateGoal) onUpdateGoal(updatedGoal);
  };

  const _handleMoveSeed = (from: number, to: number) => {
    if (to < 0 || to >= localGoal.routines.length) return;
    const updatedRoutines = [...localGoal.routines];
    const [moved] = updatedRoutines.splice(from, 1);
    updatedRoutines.splice(to, 0, moved);
    const updatedGoal = { ...localGoal, routines: updatedRoutines };
    setLocalGoal(updatedGoal);
    if (onUpdateGoal) onUpdateGoal(updatedGoal);
  };
  void _handleMoveSeed;

  const handleAddMilestone = () => {
    if (newMilestoneName.trim()) {
      const updatedMilestones = [...(localGoal.milestones || []), { name: newMilestoneName.trim(), completed: false }];
      const newGoal = { ...localGoal, milestones: updatedMilestones };
      setLocalGoal(newGoal);
      if (onUpdateGoal) onUpdateGoal(newGoal);
      setNewMilestoneName('');
      setIsAddingMilestone(false);
    }
  };

  const handleToggleMilestone = (index: number) => {
    const updatedMilestones = [...(localGoal.milestones || [])];
    updatedMilestones[index].completed = !updatedMilestones[index].completed;
    const newGoal = { ...localGoal, milestones: updatedMilestones };
    setLocalGoal(newGoal);
    if (onUpdateGoal) onUpdateGoal(newGoal);
  };

  const _handleDeleteMilestone = (index: number) => {
    const updatedMilestones = [...(localGoal.milestones || [])];
    updatedMilestones.splice(index, 1);
    const newGoal = { ...localGoal, milestones: updatedMilestones };
    setLocalGoal(newGoal);
    if (onUpdateGoal) onUpdateGoal(newGoal);
  };
  void _handleDeleteMilestone;

  const handleEditStart = (idx: number, name: string) => {
    setEditingIdx(idx);
    setEditingText(name);
  };

  const handleEditCommit = (idx: number) => {
    if (editingText.trim()) {
      const updatedMilestones = [...(localGoal.milestones || [])];
      updatedMilestones[idx] = { ...updatedMilestones[idx], name: editingText.trim() };
      const newGoal = { ...localGoal, milestones: updatedMilestones };
      setLocalGoal(newGoal);
      if (onUpdateGoal) onUpdateGoal(newGoal);
    }
    setEditingIdx(null);
    setEditingText('');
  };

  const handleUndo = () => {
    if (!undoState) return;
    const milestones = [...(localGoal.milestones || [])];
    milestones.splice(undoState.index, 0, undoState.milestone);
    const newGoal = { ...localGoal, milestones };
    setLocalGoal(newGoal);
    if (onUpdateGoal) onUpdateGoal(newGoal);
    setUndoState(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const handleMilestonePointerDown = (e: React.PointerEvent, idx: number) => {
    if (editingIdx !== null) return;
    pointerStartRef.current = { idx, x: e.clientX, y: e.clientY };
    longPressTimerRef.current = setTimeout(() => {
      if (!pointerStartRef.current) return;
      dragStateRef.current = { idx, startY: pointerStartRef.current.y };
      setDragInfo({ idx, offsetY: 0, dropIdx: idx });
    }, 450);
  };

  // Keep refs in sync so window listeners always read fresh values.
  useEffect(() => { localGoalRef.current = localGoal; }, [localGoal]);
  useEffect(() => { dragInfoRef.current = dragInfo; }, [dragInfo]);
  useEffect(() => { seedDragInfoRef.current = seedDragInfo; }, [seedDragInfo]);

  // Window-level pointer tracking — reliable inside nested scroll containers.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!pointerStartRef.current) return;
      const { idx, x, y } = pointerStartRef.current;
      const dx = e.clientX - x;
      const dy = e.clientY - y;

      if (dragStateRef.current && dragStateRef.current.idx === idx) {
        const offsetY = e.clientY - dragStateRef.current.startY;
        const ROW_HEIGHT = 76;
        const total = (localGoalRef.current.milestones || []).length;
        const dropIdx = Math.max(0, Math.min(total - 1, idx - Math.round(offsetY / ROW_HEIGHT)));
        const info = { idx, offsetY, dropIdx };
        dragInfoRef.current = info;
        setDragInfo(info);
        return;
      }

      if (Math.abs(dx) > 8 && longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (Math.abs(dy) > 12 && longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      swipeOffsetRef.current[idx] = dx;
      setSwipeOffsets(prev => ({ ...prev, [idx]: dx }));
    };

    const onUp = () => {
      if (!pointerStartRef.current) return;
      const { idx } = pointerStartRef.current;

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      const currentDrag = dragInfoRef.current;
      if (dragStateRef.current && dragStateRef.current.idx === idx) {
        if (currentDrag && currentDrag.dropIdx !== idx) {
          const milestones = [...(localGoalRef.current.milestones || [])];
          const item = milestones[idx];
          milestones.splice(idx, 1);
          milestones.splice(currentDrag.dropIdx, 0, item);
          const newGoal = { ...localGoalRef.current, milestones };
          setLocalGoal(newGoal);
          if (onUpdateGoal) onUpdateGoal(newGoal);
        }
        dragStateRef.current = null;
        dragInfoRef.current = null;
        setDragInfo(null);
        pointerStartRef.current = null;
        return;
      }

      const offset = swipeOffsetRef.current[idx] || 0;
      if (Math.abs(offset) > 80) {
        const milestone = (localGoalRef.current.milestones || [])[idx];
        setUndoState({ milestone, index: idx });
        const updatedMilestones = (localGoalRef.current.milestones || []).filter((_: any, i: number) => i !== idx);
        const newGoal = { ...localGoalRef.current, milestones: updatedMilestones };
        setLocalGoal(newGoal);
        if (onUpdateGoal) onUpdateGoal(newGoal);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => setUndoState(null), 3500);
      }

      delete swipeOffsetRef.current[idx];
      setSwipeOffsets(prev => { const n = { ...prev }; delete n[idx]; return n; });
      pointerStartRef.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onUpdateGoal]);

  // Seed drag (long press to reorder)
  useEffect(() => {
    const SEED_ROW_H = 85;
    const onSeedMove = (e: PointerEvent) => {
      if (!seedPointerStartRef.current) return;
      const { idx, y } = seedPointerStartRef.current;
      const dy = e.clientY - y;
      if (!seedDragStateRef.current && Math.abs(dy) > 8) {
        if (seedLongPressRef.current) { clearTimeout(seedLongPressRef.current); seedLongPressRef.current = null; }
        seedPointerStartRef.current = null;
        return;
      }
      if (seedDragStateRef.current && seedDragStateRef.current.idx === idx) {
        const offsetY = e.clientY - seedDragStateRef.current.startY;
        const total = localGoalRef.current.routines?.length || 0;
        const dropIdx = Math.max(0, Math.min(total - 1, idx + Math.round(offsetY / SEED_ROW_H)));
        setSeedDragInfo({ idx, offsetY, dropIdx });
      }
    };
    const onSeedUp = () => {
      if (seedLongPressRef.current) { clearTimeout(seedLongPressRef.current); seedLongPressRef.current = null; }
      if (seedDragStateRef.current) {
        const info = seedDragInfoRef.current;
        if (info && info.idx !== info.dropIdx) {
          const routines = [...(localGoalRef.current.routines || [])];
          const [moved] = routines.splice(info.idx, 1);
          routines.splice(info.dropIdx, 0, moved);
          const updatedGoal = { ...localGoalRef.current, routines };
          if (onUpdateGoal) onUpdateGoal(updatedGoal);
        }
        seedDragStateRef.current = null;
        setSeedDragInfo(null);
      }
      seedPointerStartRef.current = null;
    };
    window.addEventListener('pointermove', onSeedMove);
    window.addEventListener('pointerup', onSeedUp);
    return () => {
      window.removeEventListener('pointermove', onSeedMove);
      window.removeEventListener('pointerup', onSeedUp);
    };
  }, [onUpdateGoal]);

  if (isZenith && !showJourneyFinal) {
    return (
      <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '2.5rem', left: '2rem', zIndex: 100 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer', opacity: 0.7 }}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg></button>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ background: 'rgba(246, 177, 94, 0.1)', border: '1px solid var(--accent-gold)', borderRadius: '20px', padding: '4px 20px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>⭐</span>
            <span style={{ fontSize: '0.65rem', letterSpacing: '2px', color: 'var(--accent-gold)', fontWeight: 'bold' }}>ZENITH REACHED</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>⭐</span>
          </div>
          <h1 className="serif text-primary" style={{ fontSize: '3.5rem', margin: '10px 0', lineHeight: 1.1, maxWidth: '500px' }}>A star has reached its zenith</h1>
          <p className="text-secondary" style={{ fontSize: '1rem', lineHeight: '1.6', marginTop: '1.5rem', maxWidth: '400px', opacity: 0.8 }}>Your persistence has woven a new constellation in the quiet void. This light is yours to keep.</p>
        </div>

        <div style={{ width: '100%', maxWidth: '400px', background: 'rgba(30,31,46,0.5)', borderRadius: '35px', padding: '30px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '3rem', position: 'relative', overflow: 'hidden' }}>
          <style>{`
            @keyframes zenithStarPulse {
              0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(246,177,94,0); }
              50% { transform: scale(1.07); box-shadow: 0 0 40px rgba(246,177,94,0.35); }
            }
            @keyframes zenithStarTwinkle {
              0%, 100% { opacity: 0.75; filter: saturate(1.05) brightness(1); }
              50% { opacity: 1; filter: saturate(1.25) brightness(1.25); }
            }
            @keyframes zenithStarDrift {
              0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.55; }
              50% { transform: translate(-50%, -50%) scale(1.12); opacity: 0.95; }
            }
          `}</style>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
             <div>
               <p style={{ color: 'var(--accent-gold)', fontSize: '0.6rem', letterSpacing: '2px', margin: '0 0 5px 0', textTransform: 'uppercase' }}>{localGoal.type} • ARCHIVED</p>
               <h2 className="serif text-primary" style={{ fontSize: '2rem', margin: 0 }}>{localGoal.name}</h2>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                 <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>✔</span>
                 <span className="text-secondary" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>Fully Bloomed Cycle</span>
               </div>
             </div>
             <div
               style={{
                 width: '70px',
                 height: '70px',
                 borderRadius: '50%',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 position: 'relative',
                 overflow: 'hidden',
                 background:
                   'radial-gradient(circle at 35% 30%, rgba(246,177,94,0.55) 0%, rgba(246,177,94,0.18) 45%, rgba(0,0,0,0) 70%)',
                 border: '1px solid rgba(246,177,94,0.35)',
                 boxShadow: '0 0 25px rgba(246,177,94,0.22)',
                 animation: 'zenithStarPulse 2.8s ease-in-out infinite'
               }}
             >
               <div
                 style={{
                   position: 'absolute',
                   left: '50%',
                   top: '50%',
                   width: '110px',
                   height: '110px',
                   borderRadius: '50%',
                   background: 'radial-gradient(circle, rgba(246,177,94,0.35) 0%, transparent 60%)',
                   filter: 'blur(6px)',
                   transform: 'translate(-50%, -50%)',
                   animation: 'zenithStarDrift 3.2s ease-in-out infinite'
                 }}
               />
               <div
                 style={{
                   position: 'absolute',
                   inset: 0,
                   borderRadius: '50%',
                   border: '1px solid rgba(246,177,94,0.25)',
                   boxShadow: 'inset 0 0 0 1px rgba(246,177,94,0.10)',
                   opacity: 0.9
                 }}
               />
               <span
                 style={{
                   fontSize: '1.65rem',
                   color: 'var(--accent-gold)',
                   textShadow: '0 0 18px rgba(246,177,94,0.55), 0 0 40px rgba(246,177,94,0.25)',
                   animation: 'zenithStarTwinkle 2.1s ease-in-out infinite'
                 }}
               >
                 ⭐
               </span>
             </div>
           </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {localGoal.routines?.map((r: any, i: number) => (
              <div
                key={i}
                style={{
                  background: 'rgba(246, 177, 94, 0.10)',
                  padding: '15px 20px',
                  borderRadius: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid rgba(246, 177, 94, 0.20)',
                  boxShadow: '0 0 28px rgba(246, 177, 94, 0.10)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid rgba(246, 177, 94, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--accent-gold)', fontSize: '0.8rem' }}>✔</span>
                  </div>
                  <span className="serif" style={{ color: 'var(--accent-gold)', fontSize: '1.1rem', textShadow: '0 0 10px rgba(246,177,94,0.25)' }}>
                    {r.task}
                  </span>
                </div>
                <span style={{ color: 'var(--accent-gold)', fontSize: '0.6rem', letterSpacing: '2px', fontWeight: 'bold', opacity: 0.95 }}>
                  DONE
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px', marginTop: '2.5rem' }}>
            {/* Visual acknowledgement only (matches screenshot; not a primary CTA). */}
            <div
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                padding: '12px',
                borderRadius: '30px',
                fontSize: '0.7rem',
                letterSpacing: '1px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: 0.95
              }}
            >
              <span style={{ color: 'var(--accent-gold)' }}>☞</span> BLOOM COMPLETE
            </div>

            <button
              onClick={() => setShowJourneyFinal(true)}
              style={{
                flex: 1,
                background: 'var(--accent-gold)',
                border: 'none',
                color: '#000',
                padding: '12px',
                borderRadius: '30px',
                fontSize: '0.7rem',
                letterSpacing: '1px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              VIEW JOURNEY
            </button>
          </div>
        </div>
        <div style={{ marginBottom: '4rem' }} />
      </div>
    );
  }

  if (isZenith && showJourneyFinal) {
    return (
      <div style={{ 
        flex: 1, 
        padding: '2rem', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        overflowY: 'auto', 
        position: 'relative', 
        background: 'radial-gradient(circle at 50% 0%, rgba(249, 195, 132, 0.10) 0%, rgba(19, 20, 24, 1) 70%)',
        backgroundColor: '#131418' 
      }}>
        {/* Back Button */}
        <div style={{ position: 'absolute', top: '2.5rem', left: '2rem', zIndex: 100 }}>
          <button
            onClick={onBack}
            style={{ background: 'transparent', border: 'none', color: '#F9C384', cursor: 'pointer', opacity: 0.7 }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        </div>
  
        <div style={{ width: '100%', maxWidth: '520px', marginTop: '3.5rem', zIndex: 1 }}>
  
          {/* Header Text */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p style={{ margin: 0, color: 'rgba(249, 195, 132, 0.9)', letterSpacing: '4px', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700 }}>
              The intention has manifested.
            </p>
            <p style={{ margin: '0.5rem 0 0', color: 'rgba(255,255,255,0.25)', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.6rem' }}>
              Archive Entry: Vision Realized
            </p>
            <h1 className="serif" style={{ fontSize: '3.2rem', margin: '1.2rem 0 0', lineHeight: 1.05, color: '#FFFFFF', fontWeight: 400 }}>
              {localGoal.name}
            </h1>
            <p style={{ fontSize: '1rem', lineHeight: 1.7, marginTop: '1.2rem', color: 'rgba(255,255,255,0.65)', maxWidth: '90%', marginInline: 'auto' }}>
              The path toward endurance is now part of your firmament. Every mile a star, every breath a part of your legacy.
            </p>
          </div>
  
          {/* Eye Section Container - Increased height for more "space" */}
          <div style={{ margin: '2.5rem auto 2rem', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '520px', width: '300px' }}>
  
            {/* Localized Aura */}
            <div style={{
              position: 'absolute',
              left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '380px', height: '380px',
              background: 'radial-gradient(circle, rgba(249, 195, 132, 0.15) 0%, transparent 40%)',
              pointerEvents: 'none',
              zIndex: 0,
            }} />
  
            {/* SVG Eye Path - Slightly larger and bolder */}
            <svg width="200" height="420" viewBox="0 0 180 380" style={{ position: 'absolute', zIndex: 1 }}>
              <path
                d="M90,8 C140,80 165,150 165,190 C165,230 140,300 90,372 C40,300 15,230 15,190 C15,150 40,80 90,8 Z"
                fill="none"
                stroke="#D4A76A"
                strokeWidth="2.5" 
                style={{ opacity: 0.8 }}
              />
            </svg>
  
            {/* Vertical Decor Orbs - Pushed further out (Spacier) and Sized Up */}
            {/* Top Orb */}
            <div style={{ position: 'absolute', top: '5px', width: '22px', height: '22px', borderRadius: '50%', background: '#F9C384', boxShadow: '0 0 20px rgba(249, 195, 132, 0.6)', zIndex: 2 }} />
            
            {/* Bottom Orb */}
            <div style={{ position: 'absolute', bottom: '5px', width: '22px', height: '22px', borderRadius: '50%', background: '#F9C384', boxShadow: '0 0 20px rgba(249, 195, 132, 0.6)', zIndex: 2 }} />
            
            {/* Inner Dots - Pushed further from the center orb */}
            <div style={{ position: 'absolute', top: '115px', width: '12px', height: '12px', borderRadius: '50%', background: '#F9C384', opacity: 0.9, zIndex: 2 }} />
            <div style={{ position: 'absolute', bottom: '115px', width: '12px', height: '12px', borderRadius: '50%', background: '#F9C384', opacity: 0.9, zIndex: 2 }} />
  
            {/* MAIN CENTER ORB - Perfectly Centered */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '92px', // Bigger orb
              height: '92px', // Bigger orb
              borderRadius: '50%',
              border: '3.5px solid #F9C384',
              background: '#0B0C10',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(249, 195, 132, 0.2)',
              zIndex: 3
            }}>
              {/* BIGGER STAR */}
              <span style={{ fontSize: '2.6rem', color: '#F9C384', textShadow: '0 0 15px rgba(249, 195, 132, 0.5)' }}>✦</span>
              
              {/* ZENITH TEXT - Adjusted left position to accommodate larger orb */}
              <div style={{ 
                position: 'absolute', 
                left: '115px', 
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex', 
                flexDirection: 'column',
                whiteSpace: 'nowrap'
              }}>
                <span style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '2.4rem', color: '#F9C384', lineHeight: 1 }}>
                  Zenith
                </span>
                <span style={{ fontSize: '0.6rem', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '6px' }}>
                  Ascension Complete
                </span>
              </div>
            </div>
          </div>
  
          {/* 100% Manifested Section */}
          <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
            <p className="serif" style={{ color: '#F9C384', fontSize: '3.2rem', fontStyle: 'italic', margin: 0, fontWeight: 400 }}>
              100% Manifested
            </p>
            <div style={{
              width: '100%', height: '2px', marginTop: '1.2rem',
              background: 'linear-gradient(90deg, transparent 0%, #D4A76A 50%, transparent 100%)',
              opacity: 0.8
            }} />
          </div>
  
          {/* Legacy Milestones List */}
          <div style={{ marginTop: '5rem' }}>
            <p style={{ fontFamily: 'serif', fontStyle: 'italic', color: '#F9C384', fontSize: '1.6rem', marginBottom: '2rem' }}>
              Legacy of the Star
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
              {completedMilestones.map((cp: any, idx: number) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '18px', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2.2px solid #D4A76A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#F9C384', fontSize: '0.9rem' }}>✓</span>
                      </div>
                      <h3 className="serif" style={{ margin: 0, color: '#FFF', fontSize: '1.3rem', fontWeight: 400 }}>{cp.name}</h3>
                    </div>
                    <span style={{ color: 'rgba(249, 195, 132, 0.7)', fontSize: '0.65rem', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700 }}>Reflected</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Weekly reflections on journey screen */}
          {weeklyNotesList.filter(n => n.text.trim()).length > 0 && (
            <div style={{ marginTop: '5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '2rem' }}>
                <p style={{ fontFamily: 'serif', fontStyle: 'italic', color: '#F9C384', fontSize: '1.6rem', margin: 0 }}>
                  Reflections Along the Way
                </p>
                <button
                  onClick={() => {
                    const text = weeklyNotesList
                      .filter(n => n.text.trim())
                      .map(n => `Week ${n.weekNum}\n${n.text.trim()}`)
                      .join('\n\n');
                    // Try modern clipboard API first, fall back to execCommand
                    const doCopy = () => {
                      const ta = document.createElement('textarea');
                      ta.value = text;
                      ta.style.position = 'fixed';
                      ta.style.opacity = '0';
                      document.body.appendChild(ta);
                      ta.focus();
                      ta.select();
                      document.execCommand('copy');
                      document.body.removeChild(ta);
                    };
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(text).catch(doCopy);
                    } else {
                      doCopy();
                    }
                    setNotesCopied(true);
                    setTimeout(() => setNotesCopied(false), 2000);
                  }}
                  title="Copy all reflections"
                  style={{
                    background: notesCopied ? 'rgba(249,195,132,0.2)' : 'rgba(249,195,132,0.08)',
                    border: `1px solid rgba(249,195,132,${notesCopied ? '0.5' : '0.25'})`,
                    borderRadius: '8px',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {notesCopied ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F9C384" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F9C384" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                  <span style={{ fontSize: '0.55rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(249,195,132,0.8)', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                    {notesCopied ? 'Copied!' : 'Copy'}
                  </span>
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {weeklyNotesList.filter(n => n.text.trim()).map(n => (
                  <div key={n.weekKey} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '18px', padding: '20px 24px' }}>
                    <span style={{ fontSize: '0.55rem', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(249,195,132,0.6)', fontWeight: 700, display: 'block', marginBottom: '10px' }}>
                      Week {n.weekNum}
                    </span>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: '1.65', fontStyle: 'italic' }}>
                      {n.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '6rem' }} />
        </div>
      </div>
    );
  }

  const renderMilestoneNode = (cp: any, i: number) => {
    const isCompleted = cp.completed;
    const allIncomplete = (localGoal.milestones || []).map((c: any, idx: number) => ({ ...c, idx })).filter((c: any) => !c.completed);
    const nextGoalIdx = allIncomplete.length > 0 ? allIncomplete[0].idx : -1;
    const isNextGoal = !isCompleted && i === nextGoalIdx;
    const isDragging = dragInfo?.idx === i;
    const isDropTarget = dragInfo !== null && dragInfo.dropIdx === i && dragInfo.idx !== i;
    const swipeOffset = swipeOffsets[i] || 0;
    const isEditing = editingIdx === i;

    return (
      <div
        id={isNextGoal ? 'next-goal-node' : undefined}
        key={`cp-${i}`}
        className="milestone-wrapper"
        style={{ position: 'relative', width: '100%' }}
      >
        {isDropTarget && (
          <div style={{ position: 'absolute', top: 0, left: '30px', right: 0, height: '2px', background: 'var(--accent-gold)', borderRadius: '2px', opacity: 0.8, zIndex: 5, pointerEvents: 'none' }} />
        )}
        <div
          onPointerDown={(e) => handleMilestonePointerDown(e, i)}
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            transform: isDragging
              ? `translateY(${dragInfo!.offsetY}px) scale(1.04)`
              : `translateX(${swipeOffset}px)`,
            transition: isDragging || Math.abs(swipeOffset) > 0 ? 'none' : 'transform 0.3s ease',
            background: Math.abs(swipeOffset) > 40
              ? `rgba(255, 91, 113, ${Math.min(0.3, (Math.abs(swipeOffset) - 40) / 140)})`
              : 'transparent',
            borderRadius: '12px',
            boxShadow: isDragging ? '0 8px 32px rgba(0,0,0,0.5)' : 'none',
            touchAction: 'none',
            userSelect: 'none',
            cursor: isDragging ? 'grabbing' : 'default',
            zIndex: isDragging ? 10 : 1,
          }}
        >
          <div style={{ flex: 1 }} />

          {/* Circular checkbox */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', flexShrink: 0 }}>
            <div
              onClick={(e) => { e.stopPropagation(); handleToggleMilestone(i); }}
              style={{
                width: isNextGoal ? '18px' : '12px',
                height: isNextGoal ? '18px' : '12px',
                borderRadius: '50%',
                background: isCompleted ? 'var(--text-secondary)' : 'var(--accent-gold)',
                boxShadow: isNextGoal ? '0 0 15px rgba(246,177,94,0.4)' : (isCompleted ? 'none' : '0 0 8px rgba(246,177,94,0.2)'),
                opacity: isCompleted ? 0.4 : 1,
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
            />
            {isNextGoal && <div style={{ position: 'absolute', width: '34px', height: '34px', borderRadius: '50%', border: '1px solid var(--accent-gold)', pointerEvents: 'none' }} />}
          </div>

          {/* Name / inline edit */}
          <div style={{ flex: 1, paddingLeft: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
            {isEditing ? (
              <input
                autoFocus
                value={editingText}
                maxLength={25}
                onChange={e => setEditingText(e.target.value)}
                onBlur={() => handleEditCommit(i)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleEditCommit(i);
                  if (e.key === 'Escape') { setEditingIdx(null); setEditingText(''); }
                }}
                onPointerDown={e => e.stopPropagation()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--accent-gold)',
                  color: 'var(--accent-gold)',
                  fontSize: isNextGoal ? '1.2rem' : '1rem',
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  outline: 'none',
                  padding: '2px 0',
                  width: '130px',
                }}
              />
            ) : (
              <span
                className="serif"
                onClick={(e) => { e.stopPropagation(); if (!isCompleted) handleEditStart(i, cp.name); }}
                style={{
                  fontSize: isNextGoal ? '1.2rem' : '1rem',
                  color: isCompleted ? 'var(--text-secondary)' : 'var(--accent-gold)',
                  textDecoration: isCompleted ? 'line-through' : 'none',
                  opacity: isCompleted ? 0.5 : 1,
                  transition: 'all 0.3s ease',
                  cursor: isCompleted ? 'default' : 'text',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                }}
              >
                {cp.name}
              </span>
            )}
            {isNextGoal && !isEditing && <span className="text-secondary" style={{ fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '5px' }}>NEXT GOAL</span>}
            {isCompleted && !isEditing && <span className="text-secondary" style={{ fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '5px', opacity: 0.4 }}>COMPLETED</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative' }}>
      {onBack && (
        <div style={{ position: 'absolute', top: '2.5rem', left: '2rem', zIndex: 100 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '5px', opacity: 0.7, transition: 'opacity 0.2s ease' }} onMouseOver={(e) => (e.currentTarget.style.opacity = '1')} onMouseOut={(e) => (e.currentTarget.style.opacity = '0.7')}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          </button>
        </div>
      )}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <p className="text-secondary" style={{ fontSize: '0.7rem', letterSpacing: '3px', margin: 0 }}>CURRENT VISION</p>
        <h1 className="serif text-gold" style={{ fontSize: '2.5rem', margin: '5px 0' }}>{localGoal.name}</h1>
        {(localGoal.weeklyStreak || 0) > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(246,177,94,0.07)', border: '1px solid rgba(246,177,94,0.2)', borderRadius: '20px', padding: '5px 16px', margin: '10px 0' }}>
            <span style={{ fontSize: '0.85rem' }}>🔥</span>
            <span style={{ color: 'var(--accent-gold)', fontSize: '0.62rem', fontWeight: 'bold', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              {localGoal.weeklyStreak} week{localGoal.weeklyStreak > 1 ? 's' : ''} streak
            </span>
            {(localGoal.bestStreak || 0) > (localGoal.weeklyStreak || 0) && (
              <span style={{ color: 'rgba(246,177,94,0.45)', fontSize: '0.55rem', letterSpacing: '1px' }}>
                · best {localGoal.bestStreak}
              </span>
            )}
          </div>
        )}
        <p className="text-secondary" style={{ fontSize: '0.9rem', lineHeight: '1.6', marginTop: '1rem' }}>The path toward {localGoal.name.toLowerCase()} is written in the stars. Every step a constellation, every breath a new beginning.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '3rem auto', position: 'relative', width: '100%', maxWidth: '450px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px', height: '350px', display: 'flex', justifyContent: 'center', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)', maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)' }}>
          <style>{`.hide-scroll::-webkit-scrollbar { display: none; } .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '140px', height: '100%', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.1)', zIndex: 1, pointerEvents: 'none' }}>
            {/* Orbiting dots */}
            <div style={{ position: 'absolute', top: '18%', right: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: '#b57aff', boxShadow: '0 0 8px rgba(181,122,255,0.7)' }} />
            <div style={{ position: 'absolute', bottom: '18%', left: '-4px', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-blue)', boxShadow: '0 0 8px rgba(113,128,255,0.6)' }} />
          </div>
          <div ref={scrollRef} onScroll={handleScroll} className="hide-scroll" style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px', width: '100%', height: '100%', overflowY: 'auto', padding: '150px 0' }}>
            {[...(localGoal.milestones || [])].map((cp: any, i: number) => ({ cp, i })).filter(({ cp }) => !cp.completed).reverse().map(({ cp, i }) => renderMilestoneNode(cp, i))}
            {(localGoal.milestones || []).map((cp: any, i: number) => cp.completed ? renderMilestoneNode(cp, i) : null)}
          </div>
        </div>
        <div style={{ position: 'absolute', left: (localGoal.milestones || []).length === 0 ? '50%' : '0', top: (localGoal.milestones || []).length === 0 ? '43%' : '175px', transform: (localGoal.milestones || []).length === 0 ? 'translate(-50%, -50%)' : 'translateY(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', transition: 'all 0.4s ease' }}>
          {isAddingMilestone ? (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
              <input autoFocus value={newMilestoneName} maxLength={25} onChange={e => setNewMilestoneName(e.target.value)} placeholder="New milestone" onKeyDown={(e) => e.key === 'Enter' && handleAddMilestone()} style={{ background: 'var(--card-bg)', border: '1px solid var(--accent-gold)', borderRadius: '15px', padding: '5px 15px', color: '#fff', outline: 'none', textAlign: 'left', width: '120px', fontSize: '0.8rem', boxShadow: '0 5px 15px rgba(0,0,0,0.5)' }} />
              <button onClick={handleAddMilestone} style={{ background: 'var(--accent-gold)', color: '#000', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', boxShadow: '0 0 10px rgba(246,177,94,0.4)' }}>✓</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {(localGoal.milestones || []).length === 0 && (
                <svg width="230" height="46" viewBox="0 0 230 46" style={{ marginBottom: '6px', pointerEvents: 'none', overflow: 'visible' }}>
                  <defs>
                    <path id="arc-invite" d="M 10,44 Q 115,-10 220,44" />
                    <linearGradient id="arc-text-glow" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%"   stopColor="rgba(246,177,94,0.15)" />
                      <stop offset="35%"  stopColor="rgba(246,177,94,0.5)" />
                      <stop offset="50%"  stopColor="rgba(246,177,94,0.95)" />
                      <stop offset="65%"  stopColor="rgba(246,177,94,0.5)" />
                      <stop offset="100%" stopColor="rgba(246,177,94,0.15)" />
                    </linearGradient>
                  </defs>
                  <text>
                    <textPath href="#arc-invite" startOffset="50%" textAnchor="middle" style={{ fill: 'url(#arc-text-glow)', fontSize: '11px', letterSpacing: '1.2px', fontFamily: 'Libre Baskerville, serif', fontStyle: 'italic' }}>
                      What's your next milestone?
                    </textPath>
                  </text>
                </svg>
              )}
              <div onClick={() => setIsAddingMilestone(true)} style={{ width: (localGoal.milestones || []).length === 0 ? '64px' : '30px', height: (localGoal.milestones || []).length === 0 ? '64px' : '30px', borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#111', background: 'var(--accent-gold)', fontSize: (localGoal.milestones || []).length === 0 ? '2rem' : '1.2rem', fontWeight: 'bold', boxShadow: (localGoal.milestones || []).length === 0 ? '0 0 25px rgba(246,177,94,0.35), 0 0 50px rgba(246,177,94,0.12)' : '0 0 12px rgba(246,177,94,0.25)', transition: 'all 0.4s ease' }}>+</div>
            </div>
          )}
        </div>
        <h2 className="serif text-primary" style={{ fontSize: '2rem', marginTop: '3rem', marginBottom: '0' }}>{calculatedProgress}% Manifested</h2>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
          <h2 className="serif text-primary" style={{ margin: 0, fontSize: '1.5rem' }}>Seeds to be<br/>Planted</h2>
          <span className="text-secondary" style={{ fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Weekly actions left</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingBottom: '50px' }}>
          {localGoal.routines && localGoal.routines.length > 0 ? (
            localGoal.routines.map((action: any, i: number) => {
              const targetCount = parseInt(action.count, 10) || 1;
              const completedCount = action.completedThisWeek || 0;
              const today = new Date().toDateString();
              const isPlantedToday = action.lastPlantedDate === today;
              const isFullyPlanted = completedCount >= targetCount;
              const isGold = isFullyPlanted || isPlantedToday;
              const isDisabled = isFullyPlanted && !isPlantedToday;
              const isDragging = seedDragInfo?.idx === i;
              const isEditing = editingSeedIdx === i;
              return (
                <div
                  key={i}
                  onPointerDown={e => { if (!isEditing) handleSeedPointerDown(e, i); }}
                  className={isGold && !isDragging ? "glow-gold" : ""}
                  style={{
                    background: isDragging ? 'rgba(246,177,94,0.2)' : isGold ? 'rgba(246, 177, 94, 0.15)' : 'var(--card-bg)',
                    borderRadius: '15px',
                    padding: '20px',
                    display: 'flex', flexDirection: 'column', gap: isEditing ? '14px' : '0',
                    transition: isDragging ? 'none' : 'all 0.3s ease',
                    transform: isDragging ? `translateY(${seedDragInfo.offsetY}px) scale(1.03)` : isGold ? 'scale(1.02)' : 'scale(1)',
                    zIndex: isDragging ? 50 : 1,
                    boxShadow: isDragging ? '0 12px 40px rgba(0,0,0,0.5)' : 'none',
                    position: 'relative',
                    touchAction: 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: isGold ? '1px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.5s ease', flexShrink: 0 }}>
                        <div style={{ width: '20px', height: '20px', background: isGold ? 'var(--accent-gold)' : 'var(--text-secondary)', borderRadius: '50%', transform: isGold ? 'scale(1.5)' : 'scale(1)', transition: 'all 0.5s ease' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h3
                          className="serif"
                          onClick={e => {
                            e.stopPropagation();
                            if (seedDragInfo) return;
                            setEditingSeedIdx(isEditing ? null : i);
                            setEditingSeedTask(action.task);
                            setEditingSeedCount(String(action.count));
                          }}
                          style={{ color: isGold ? 'var(--accent-gold)' : 'var(--text-primary)', margin: '0 0 5px 0', fontSize: '1.1rem', transition: 'all 0.5s ease', cursor: 'pointer' }}
                        >{action.task}</h3>
                        <p className="text-secondary" style={{ margin: 0, fontSize: '0.8rem' }}>completed {completedCount} of {targetCount} times per week</p>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); if (!isDisabled) handlePlant(i); }}
                      style={{ background: isPlantedToday ? 'var(--accent-gold)' : '#2a2b36', border: '1px solid rgba(246,177,94,0.3)', color: isPlantedToday ? '#000' : 'var(--accent-gold)', padding: '8px 16px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '1px', cursor: isDisabled ? 'default' : 'pointer', transition: 'all 0.3s ease', opacity: isDisabled ? 0.4 : 1, flexShrink: 0 }}
                    >{isPlantedToday ? 'PLANTED ✓' : 'PLANT'}</button>
                  </div>

                  {/* Inline edit panel */}
                  {isEditing && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          autoFocus
                          value={editingSeedTask}
                          onChange={e => setEditingSeedTask(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveSeedEdit()}
                          style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 12px', color: '#fff', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-sans)' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="text-secondary" style={{ fontSize: '0.65rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Weekly</span>
                        <input
                          value={editingSeedCount}
                          onChange={e => setEditingSeedCount(e.target.value.replace(/\D/g, ''))}
                          onKeyDown={e => e.key === 'Enter' && handleSaveSeedEdit()}
                          style={{ width: '42px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px', color: '#fff', textAlign: 'center', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-sans)' }}
                        />
                        <div style={{ flex: 1 }} />
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteSeed(i); setEditingSeedIdx(null); }}
                          style={{ background: 'transparent', border: '1px solid rgba(255,91,113,0.3)', color: 'var(--accent-red)', borderRadius: '20px', padding: '6px 14px', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px', cursor: 'pointer', textTransform: 'uppercase' }}
                        >Delete</button>
                        <button
                          onClick={e => { e.stopPropagation(); handleSaveSeedEdit(); }}
                          style={{ background: 'var(--accent-gold)', border: 'none', color: '#000', borderRadius: '20px', padding: '6px 14px', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px', cursor: 'pointer', textTransform: 'uppercase' }}
                        >Save</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : <p className="text-secondary" style={{ textAlign: 'center', fontSize: '0.9rem' }}>No seeds planted yet.</p>}

          {/* Weekly Notes + Add Seed buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
            <button
              onClick={() => { setShowWeeklyNotes(!showWeeklyNotes); setShowAddSeed(false); }}
              style={{
                flex: 1,
                background: showWeeklyNotes ? 'rgba(246, 177, 94, 0.15)' : 'var(--card-bg)',
                border: showWeeklyNotes ? '1px solid rgba(246,177,94,0.3)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '15px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={showWeeklyNotes ? 'var(--accent-gold)' : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: showWeeklyNotes ? 'var(--accent-gold)' : 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>Weekly Notes</span>
            </button>
            <button
              onClick={() => { setShowAddSeed(!showAddSeed); setShowWeeklyNotes(false); }}
              style={{
                flex: '0 0 25%',
                background: showAddSeed ? 'rgba(246, 177, 94, 0.15)' : 'var(--card-bg)',
                border: showAddSeed ? '1px solid rgba(246,177,94,0.3)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '15px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={showAddSeed ? 'var(--accent-gold)' : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* Weekly Notes panel */}
          {showWeeklyNotes && (() => {
            const currentKey = getCurrentWeekKey();
            const currentNote = weeklyNotesList.find(n => n.weekKey === currentKey);
            const currentWeekNum = currentNote?.weekNum ?? (weeklyNotesList.length > 0 ? weeklyNotesList[weeklyNotesList.length - 1].weekNum + 1 : 1);
            const currentText = currentNote?.text ?? '';
            const pastNotes = weeklyNotesList.filter(n => n.weekKey !== currentKey && n.text.trim());

            return (
              <div style={{ background: 'var(--card-bg)', borderRadius: '15px', padding: '16px', marginTop: '10px', border: '1px solid rgba(246,177,94,0.15)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Past weeks — collapsed dropdowns */}
                {pastNotes.map(n => {
                  const isOpen = expandedWeekKeys.has(n.weekKey);
                  return (
                    <div key={n.weekKey}>
                      <button
                        onClick={() => setExpandedWeekKeys(prev => {
                          const next = new Set(prev);
                          isOpen ? next.delete(n.weekKey) : next.add(n.weekKey);
                          return next;
                        })}
                        style={{ width: '100%', background: 'none', border: 'none', padding: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                      >
                        <span style={{ fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>Week {n.weekNum}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      {isOpen && (
                        <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: '1.6', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                          {n.text}
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Current week */}
                <div>
                  <label style={{ fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontFamily: 'var(--font-sans)' }}>
                    Week {currentWeekNum}
                  </label>
                  <textarea
                    value={currentText}
                    onChange={e => handleSaveWeeklyNotes(e.target.value)}
                    placeholder="How's the journey going this week..."
                    style={{
                      width: '100%', minHeight: '100px',
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '10px', padding: '12px',
                      color: '#fff', fontFamily: 'var(--font-sans)',
                      fontSize: '0.85rem', lineHeight: '1.6',
                      resize: 'vertical', outline: 'none',
                    }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Add Seed panel */}
          {showAddSeed && (
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '15px',
              padding: '16px',
              marginTop: '10px',
              border: '1px solid rgba(246,177,94,0.15)',
              display: 'flex', gap: '8px', alignItems: 'center',
            }}>
              <input
                autoFocus
                value={newSeedTask}
                onChange={e => setNewSeedTask(e.target.value)}
                placeholder="New seed name"
                onKeyDown={e => e.key === 'Enter' && handleAddSeed()}
                style={{
                  flex: 1, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px', padding: '10px 12px', color: '#fff',
                  fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-sans)',
                }}
              />
              <input
                value={newSeedCount}
                onChange={e => setNewSeedCount(e.target.value.replace(/\D/g, ''))}
                style={{
                  width: '42px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px', padding: '10px 8px', color: '#fff', textAlign: 'center',
                  fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-sans)',
                }}
                placeholder="#"
              />
              <button
                onClick={handleAddSeed}
                style={{
                  background: 'var(--accent-gold)', border: 'none', borderRadius: '50%',
                  width: '34px', height: '34px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#000', fontSize: '1.2rem', fontWeight: 'bold',
                }}
              >+</button>
            </div>
          )}
        </div>
      </div>

      {undoState && (
        <div style={{
          position: 'fixed',
          bottom: '96px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(20,21,30,0.96)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '30px',
          padding: '10px 10px 10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 300,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
          whiteSpace: 'nowrap',
        }}>
          <span className="text-secondary" style={{ fontSize: '0.78rem', letterSpacing: '0.5px' }}>Milestone removed</span>
          <button onClick={handleUndo} style={{
            background: 'var(--accent-gold)',
            border: 'none',
            color: '#000',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '0.68rem',
            fontWeight: 'bold',
            letterSpacing: '1px',
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}>Undo</button>
        </div>
      )}
    </div>
  );
};
