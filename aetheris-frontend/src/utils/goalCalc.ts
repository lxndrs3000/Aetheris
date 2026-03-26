export const parseWeeks = (str: string) => {
  if (!str) return 12;
  const s = str.toLowerCase().trim();
  
  // Handle "a" or "an" as 1
  if (s.startsWith('a ') || s.startsWith('an ')) {
    const unit = s.split(' ')[1];
    if (unit.startsWith('year')) return 52;
    if (unit.startsWith('month')) return 4.345;
    if (unit.startsWith('week')) return 1;
    if (unit.startsWith('day')) return 1 / 7;
  }

  const numMatch = s.match(/(\d+)/);
  const num = numMatch ? parseInt(numMatch[1], 10) : 1;

  if (s.includes('year')) return num * 52;
  if (s.includes('month')) return num * 4.345;
  if (s.includes('week')) return num;
  if (s.includes('day')) return num / 7;

  return 1; // Minimum 1 week fallback
};

export const calculateGoalProgress = (goal: any) => {
  const totalWeeks = parseWeeks(goal.deadline);
  const routines = goal.routines || [];
  
  // Hybrid Scaling:
  // - If deadline is < 1 week: The 'Weekly Count' is the TOTAL goal.
  // - If deadline is >= 1 week: Scale the 'Weekly Count' by the number of weeks.
  const rawTotalRequired = routines.reduce((sum: number, r: any) => {
    const weeklyCount = parseInt(r.count || '1', 10);
    const scalingFactor = Math.max(1, totalWeeks); // If < 1 week, treat as 1 week for the total requirement
    return sum + (weeklyCount * scalingFactor);
  }, 0);

  const totalLifetimeRequired = Math.max(1, Math.ceil(rawTotalRequired));
  const totalLifetimeCompleted = routines.reduce((sum: number, r: any) => sum + (r.completedTotal || 0), 0) || 0;
  
  return Math.min(100, Math.floor((totalLifetimeCompleted / totalLifetimeRequired) * 100));
};
