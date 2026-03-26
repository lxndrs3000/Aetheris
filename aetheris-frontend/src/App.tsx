import { useState, useEffect, useRef } from 'react';
import { BottomNav } from './components/BottomNav';
import { Wizard } from './components/Wizard';
import { Dashboard } from './components/Dashboard';
import { CurrentVision } from './components/CurrentVision';
import { Statistics } from './components/Statistics';
import { LegacyVault } from './components/LegacyVault';
import { Auth } from './components/Auth';
import { apiFetch } from './utils/api';
import './index.css';

interface User {
  id: string;
  username: string;
  avatarId: number;
}

const LOCAL_GOALS_KEY = 'aetheris_goals';

function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'tree' | 'stats' | 'add'>('home');
  const [isDailyOverview, setIsDailyOverview] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const [goals, setGoals] = useState<any[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [showGoalDetail, setShowGoalDetail] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [homeResetCount, setHomeResetCount] = useState(0);
  const weekResetChecked = useRef(false);

  const isLoggedIn = !!currentUser;

  // --- Helper: persist goals to localStorage (anonymous mode) ---
  const saveGoalsLocal = (g: any[]) => {
    localStorage.setItem(LOCAL_GOALS_KEY, JSON.stringify(g));
  };

  // --- Auth bootstrap ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('aetheris_token', urlToken);
      window.history.replaceState({}, '', window.location.pathname);
    }
    const token = localStorage.getItem('aetheris_token');
    if (!token) {
      // Anonymous — load from localStorage
      const stored = localStorage.getItem(LOCAL_GOALS_KEY);
      setGoals(stored ? JSON.parse(stored) : []);
      setAuthChecked(true);
      return;
    }
    apiFetch('/auth/me')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((user: User) => setCurrentUser(user))
      .catch(() => {
        localStorage.removeItem('aetheris_token');
        const stored = localStorage.getItem(LOCAL_GOALS_KEY);
        setGoals(stored ? JSON.parse(stored) : []);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  // --- Load goals from API when user logs in ---
  useEffect(() => {
    if (!currentUser) return;
    weekResetChecked.current = false;
    apiFetch('/api/goals')
      .then(res => res.json())
      .then(data => setGoals(data))
      .catch(err => console.error('Failed to load goals:', err));
  }, [currentUser]);

  // --- Weekly reset ---
  useEffect(() => {
    if (goals.length === 0 || weekResetChecked.current) return;
    weekResetChecked.current = true;

    const weekStartPref = localStorage.getItem('aetheris_weekStart') || 'Monday';
    const now = new Date();
    const day = now.getDay();
    const targetDay = weekStartPref === 'Monday' ? 1 : 0;
    let diff = day - targetDay;
    if (diff < 0) diff += 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toDateString();

    const lastReset = localStorage.getItem('aetheris_lastResetWeek');
    if (lastReset === weekStartStr) return;

    const resetGoals = goals.map(goal => {
      const routines = goal.routines || [];
      let newStreak = goal.weeklyStreak || 0;
      let newBestStreak = goal.bestStreak || 0;
      if (routines.length > 0) {
        const allCompleted = routines.every((r: any) =>
          (r.completedThisWeek || 0) >= parseInt(r.count || '1', 10)
        );
        newStreak = allCompleted ? newStreak + 1 : 0;
        newBestStreak = Math.max(newBestStreak, newStreak);
      }
      return {
        ...goal,
        weeklyStreak: newStreak,
        bestStreak: newBestStreak,
        routines: routines.map((r: any) => ({
          ...r,
          completedThisWeek: 0,
          lastPlantedDate: undefined,
        })),
      };
    });

    setGoals(resetGoals);
    if (isLoggedIn) {
      resetGoals.forEach(goal => {
        apiFetch(`/api/goals/${goal.id}`, {
          method: 'PUT',
          body: JSON.stringify(goal),
        }).catch(err => console.error('Failed to sync weekly reset:', err));
      });
    } else {
      saveGoalsLocal(resetGoals);
    }
    localStorage.setItem('aetheris_lastResetWeek', weekStartStr);
  }, [goals]);

  const handleTabChange = (tab: 'home' | 'tree' | 'stats' | 'add') => {
    if (tab === 'home') {
      setIsDailyOverview(false);
      setShowGoalDetail(false);
      setShowLegacy(false);
      setHomeResetCount(c => c + 1);
    }
    setShowAuth(false);
    setCurrentTab(tab);
  };

  const handleWizardComplete = (goalInfo: any) => {
    const newGoalPayload = {
      name: goalInfo.name,
      type: goalInfo.type || 'PHYSICAL',
      deadline: goalInfo.deadline,
      routines: goalInfo.routines,
    };
    if (isLoggedIn) {
      apiFetch('/api/goals', {
        method: 'POST',
        body: JSON.stringify(newGoalPayload),
      })
        .then(res => res.json())
        .then(data => { setGoals(prev => [...prev, data]); handleTabChange('home'); })
        .catch(err => console.error('Failed to create goal:', err));
    } else {
      const newGoal = { id: Date.now().toString(), ...newGoalPayload, progress: 0 };
      const updated = [...goals, newGoal];
      setGoals(updated);
      saveGoalsLocal(updated);
      handleTabChange('home');
    }
  };

  const handleGoalClick = (goal: any) => {
    setSelectedGoal(goal);
    setShowGoalDetail(true);
  };

  const handleUpdateGoal = (updatedGoal: any) => {
    const updated = goals.map(g => g.id === updatedGoal.id ? updatedGoal : g);
    setGoals(updated);
    if (selectedGoal?.id === updatedGoal.id) setSelectedGoal(updatedGoal);
    if (isLoggedIn) {
      apiFetch(`/api/goals/${updatedGoal.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedGoal),
      }).catch(err => console.error('Failed to update goal:', err));
    } else {
      saveGoalsLocal(updated);
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    const updated = goals.filter(g => g.id !== goalId);
    setGoals(updated);
    if (selectedGoal?.id === goalId) { setSelectedGoal(null); handleTabChange('home'); }
    if (isLoggedIn) {
      apiFetch(`/api/goals/${goalId}`, { method: 'DELETE' })
        .catch(err => console.error('Failed to delete goal', err));
    } else {
      saveGoalsLocal(updated);
    }
  };

  const handleUpdateAvatar = (avatarId: number) => {
    if (!isLoggedIn) return;
    apiFetch('/auth/me/avatar', {
      method: 'PUT',
      body: JSON.stringify({ avatarId }),
    })
      .then(r => r.json())
      .then(user => setCurrentUser(user))
      .catch(console.error);
  };

  const handleLogout = () => {
    localStorage.removeItem('aetheris_token');
    setCurrentUser(null);
    // Load whatever's in local storage (might be empty)
    const stored = localStorage.getItem(LOCAL_GOALS_KEY);
    setGoals(stored ? JSON.parse(stored) : []);
    setCurrentTab('home');
    setShowGoalDetail(false);
    setShowLegacy(false);
  };

  // --- On sign-in: migrate localStorage goals to backend, then fetch all ---
  const handleAuth = async (user: User) => {
    setCurrentUser(user);
    setShowAuth(false);

    // Migrate local goals to account
    const localGoals: any[] = JSON.parse(localStorage.getItem(LOCAL_GOALS_KEY) || '[]');
    if (localGoals.length > 0) {
      for (const goal of localGoals) {
        // Strip the old id so the backend assigns a new one
        const { id, ...payload } = goal;
        try {
          await apiFetch('/api/goals', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        } catch { /* best effort */ }
      }
      localStorage.removeItem(LOCAL_GOALS_KEY);
    }

    // Fetch the full goal list from the server
    try {
      const res = await apiFetch('/api/goals');
      setGoals(await res.json());
    } catch (err) {
      console.error('Failed to load goals after login:', err);
    }
  };

  // Not yet checked auth
  if (!authChecked) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0e14' }}>
        <span style={{ color: 'var(--accent-gold)', fontSize: '1.5rem' }}>✨</span>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {currentTab === 'add' && <Wizard onComplete={handleWizardComplete} />}

      {currentTab === 'home' && !showGoalDetail && !showLegacy && (
        <Dashboard
          goals={goals}
          isDailyOverview={isDailyOverview}
          setIsDailyOverview={setIsDailyOverview}
          onGoalClick={handleGoalClick}
          onDeleteGoal={handleDeleteGoal}
          onUpdateGoal={handleUpdateGoal}
          onViewLegacy={() => setShowLegacy(true)}
          homeResetCount={homeResetCount}
          currentUser={currentUser}
          onUpdateAvatar={handleUpdateAvatar}
          onLogout={handleLogout}
          onOpenAuth={() => setShowAuth(true)}
        />
      )}

      {currentTab === 'home' && !showGoalDetail && showLegacy && (
        <LegacyVault
          goals={goals.filter(g => (g.progress ?? 0) >= 100)}
          onBack={() => setShowLegacy(false)}
          onGoalClick={handleGoalClick}
        />
      )}

      {currentTab === 'stats' && !showGoalDetail && <Statistics goals={goals} />}

      {showGoalDetail && selectedGoal && (
        <CurrentVision
          goal={selectedGoal}
          onUpdateGoal={handleUpdateGoal}
          onBack={() => { setShowGoalDetail(false); setIsDailyOverview(false); }}
        />
      )}

      <BottomNav currentTab={currentTab} onTabChange={handleTabChange} />

      {showAuth && (
        <Auth onAuth={handleAuth} onClose={() => setShowAuth(false)} />
      )}
    </div>
  );
}

export default App;
