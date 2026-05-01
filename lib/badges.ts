export interface BadgeDef {
  key: string;
  name: string;
  description: string;
  icon: string; // emoji
  xpReward: number;
}

export const BADGES: BadgeDef[] = [
  {
    key: "first_lesson",
    name: "First Step",
    description: "Complete your first lesson",
    icon: "🎯",
    xpReward: 25,
  },
  {
    key: "lessons_5",
    name: "Scholar",
    description: "Complete 5 lessons",
    icon: "📚",
    xpReward: 50,
  },
  {
    key: "lessons_25",
    name: "Bookworm",
    description: "Complete 25 lessons",
    icon: "🦉",
    xpReward: 150,
  },
  {
    key: "lessons_50",
    name: "Knowledge Seeker",
    description: "Complete 50 lessons",
    icon: "🔭",
    xpReward: 300,
  },
  {
    key: "quiz_first",
    name: "Quiz Taker",
    description: "Submit your first quiz",
    icon: "📝",
    xpReward: 25,
  },
  {
    key: "quiz_pass",
    name: "Passing Grade",
    description: "Pass your first quiz",
    icon: "✅",
    xpReward: 50,
  },
  {
    key: "quiz_perfect",
    name: "Perfect Score",
    description: "Score 100% on a quiz",
    icon: "⭐",
    xpReward: 100,
  },
  {
    key: "streak_3",
    name: "Hat Trick",
    description: "Maintain a 3-day learning streak",
    icon: "🔥",
    xpReward: 30,
  },
  {
    key: "streak_7",
    name: "Week Warrior",
    description: "Maintain a 7-day learning streak",
    icon: "🏃",
    xpReward: 75,
  },
  {
    key: "streak_30",
    name: "On Fire",
    description: "Maintain a 30-day learning streak",
    icon: "🌟",
    xpReward: 300,
  },
  {
    key: "level_2",
    name: "Level Up",
    description: "Reach Level 2",
    icon: "⚡",
    xpReward: 0,
  },
  {
    key: "level_5",
    name: "Elite Learner",
    description: "Reach Level 5",
    icon: "💎",
    xpReward: 0,
  },
];

export const BADGE_MAP = Object.fromEntries(BADGES.map((b) => [b.key, b]));

// ── Level thresholds ──────────────────────────────────────────────────────────

export const LEVELS = [
  { level: 1, minXp: 0,     label: "Novice",   color: "text-slate-400" },
  { level: 2, minXp: 500,   label: "Learner",  color: "text-blue-400" },
  { level: 3, minXp: 1500,  label: "Explorer", color: "text-cyan-400" },
  { level: 4, minXp: 3500,  label: "Scholar",  color: "text-emerald-400" },
  { level: 5, minXp: 7500,  label: "Expert",   color: "text-yellow-400" },
  { level: 6, minXp: 15000, label: "Master",   color: "text-[#d97757]" },
  { level: 7, minXp: 30000, label: "Legend",   color: "text-purple-400" },
];

export function getLevelForXp(xp: number) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXp) current = lvl;
    else break;
  }
  return current;
}

export function getNextLevel(currentLevel: number) {
  return LEVELS.find((l) => l.level === currentLevel + 1) ?? null;
}

export function xpToNextLevel(xp: number): { current: number; required: number; progress: number } {
  const curr = getLevelForXp(xp);
  const next = getNextLevel(curr.level);
  if (!next) return { current: xp - curr.minXp, required: 0, progress: 100 };
  const current = xp - curr.minXp;
  const required = next.minXp - curr.minXp;
  return { current, required, progress: Math.round((current / required) * 100) };
}
