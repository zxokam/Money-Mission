export const demoMission = {
  id: "mission_001",
  title: "Cut wasteful spending by 10%",
  sponsor: "Ahmad",
  participant: "Sarah",
  reward: 20,
  targetImprovement: 10,
  startDate: "2026-05-01",
  endDate: "2026-05-31",
  rules: "Reduce unnecessary shopping and food delivery. Track every expense.",
  daysLeft: 18,
  status: "active",
  verificationMethod: "bank",
  createdAt: "2026-05-01",
  expireDays: 15,
  expiresIn: null,
};

// Helper: days between two date strings
function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

const today = "2026-05-17";

export const demoMissionFeed = [
  {
    id: "m1", title: "No food delivery for 30 days", sponsor: "Aisha",
    reward: 15, difficulty: "Easy", category: "Food", daysLeft: 30, participants: 7,
    rules: "Zero GrabFood or Foodpanda orders for 30 days straight.",
    verificationMethod: "photo", photoSubject: "Your home-cooked meal", photoFrequency: "daily", totalPhotosRequired: 30,
    startDate: "2026-05-01", endDate: "2026-05-30",
    createdAt: "2026-05-12", expireDays: 15,
  },
  {
    id: "m2", title: "Save RM500 emergency fund", sponsor: "Danial",
    reward: 50, difficulty: "Hard", category: "Savings", daysLeft: 47, participants: 2,
    rules: "Set aside RM500 by month end. Cut non-essential subscriptions.",
    verificationMethod: "bank", startDate: "2026-05-01", endDate: "2026-05-31",
    createdAt: "2026-05-14", expireDays: 21,
  },
  {
    id: "m3", title: "Track every ringgit for 14 days", sponsor: "Mei Ling",
    reward: 10, difficulty: "Easy", category: "Tracking", daysLeft: 10, participants: 12,
    rules: "Log every single transaction. Build awareness of your spending.",
    verificationMethod: "bank", startDate: "2026-05-01", endDate: "2026-05-14",
    createdAt: "2026-05-05", expireDays: 14,
  },
  {
    id: "m4", title: "Slash subscription creep", sponsor: "Raj",
    reward: 25, difficulty: "Medium", category: "Subscriptions", daysLeft: 35, participants: 5,
    rules: "Audit subscriptions. Cancel at least 2 unused ones.",
    verificationMethod: "bank", startDate: "2026-05-01", endDate: "2026-05-31",
    createdAt: "2026-05-16", expireDays: 14,
  },
  {
    id: "m5", title: "Public transport only challenge", sponsor: "Hannah",
    reward: 30, difficulty: "Medium", category: "Transport", daysLeft: 22, participants: 4,
    rules: "No Grab, no e-hailing. Public transport or walk only.",
    verificationMethod: "photo", photoSubject: "Public transport (bus/train ticket)", photoFrequency: "per-ride", totalPhotosRequired: 60,
    startDate: "2026-05-01", endDate: "2026-05-30",
    createdAt: "2026-05-04", expireDays: 15,
  },
  {
    id: "m6", title: "Cut shopping by 50%", sponsor: "Zara",
    reward: 20, difficulty: "Medium", category: "Shopping", daysLeft: 25, participants: 6,
    rules: "Halve your shopping budget. Only buy essentials.",
    verificationMethod: "bank", startDate: "2026-05-01", endDate: "2026-05-31",
    createdAt: "2026-05-10", expireDays: 14,
  },
  {
    id: "m7", title: "No Grab for 2 weeks", sponsor: "Irfan",
    reward: 15, difficulty: "Easy", category: "Transport", daysLeft: 0, participants: 0,
    rules: "Strictly no e-hailing. Walk, cycle, or bus only.",
    verificationMethod: "photo", photoSubject: "Your mode of transport", photoFrequency: "daily", totalPhotosRequired: 14,
    startDate: "2026-05-01", endDate: "2026-05-14",
    createdAt: "2026-05-01", expireDays: 15,
  },
  {
    id: "m8", title: "RM100 weekly savings challenge", sponsor: "Nadia",
    reward: 40, difficulty: "Hard", category: "Savings", daysLeft: 40, participants: 1,
    rules: "Save RM100 every week. Skip one week and you fail.",
    verificationMethod: "bank", startDate: "2026-05-01", endDate: "2026-06-07",
    createdAt: "2026-05-15", expireDays: 14,
  },
];

// Compute expiresIn for each mission (null if already expired)
demoMissionFeed.forEach((m) => {
  const age = daysBetween(m.createdAt, today);
  const remaining = m.expireDays - age;
  m.expiresIn = remaining > 0 ? remaining : 0;
});

export const myActiveMission = {
  ...demoMission,
  participant: "You",
  sponsor: "Ahmad",
  id: "mission_001",
  description: "Bank transaction evaluation on May 31.",
};

export const myPhotoMission = {
  id: "mission_photo_001",
  title: "No food delivery for 30 days",
  sponsor: "Aisha",
  participant: "You",
  reward: 15,
  startDate: "2026-05-01",
  endDate: "2026-05-30",
  rules: "Zero GrabFood or Foodpanda orders for 30 days straight.",
  daysLeft: 13,
  status: "active",
  verificationMethod: "photo",
  photoSubject: "Your home-cooked meal",
  photoFrequency: "daily",
  totalPhotosRequired: 30,
  description: "Take a photo of every home-cooked meal for 30 days.",
};

export const demoPhotoDiary = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 4, i + 1);
  const dayStr = date.toISOString().slice(0, 10);
  const hasPhoto = i < 17;
  return {
    day: i + 1,
    date: dayStr,
    uploaded: hasPhoto,
    photoUrl: hasPhoto ? `https://picsum.photos/seed/meal${i + 1}/400/400` : null,
    note: hasPhoto ? "Home-cooked nasi goreng!" : "",
  };
});

export const demoBaseline = {
  income: 2800,
  requiredExpenses: 2120,
  expectedLeftover: 680,
  safeDailyLimit: 22,
  healthScore: 62,
};

export const demoTransactions = [
  { id: "t1", name: "Grocery run", amount: 85, category: "Food", date: "2026-05-02" },
  { id: "t2", name: "Netflix", amount: 45, category: "Subscription", date: "2026-05-03" },
  { id: "t3", name: "Grab to campus", amount: 8, category: "Transport", date: "2026-05-04" },
  { id: "t4", name: "Mamak dinner", amount: 12, category: "Food", date: "2026-05-05" },
  { id: "t5", name: "Shopee impulse", amount: 35, category: "Shopping", date: "2026-05-06" },
  { id: "t6", name: "TnG top-up", amount: 50, category: "Transport", date: "2026-05-07" },
];

export const demoEvaluation = {
  aiVerdict: "accepted",
  status: "completed",
  improvementPercent: 13.5,
  targetPercent: 10,
  expectedLeftover: 680,
  actualLeftover: 148,
  rewardUnlocked: true,
  reward: 20,
  verdictReason: "Bank transactions show a 13.5% reduction in wasteful spending. Shopping and food delivery dropped significantly. Target of 10% was exceeded.",
  passedChecks: [
    { label: "Spending within daily limit", result: true },
    { label: "No unexplained large transactions", result: true },
    { label: "Expenses match declared budget", result: true },
    { label: "Improvement target met", result: true },
  ],
  explanation: "You cut shopping by RM45 and reduced food delivery by RM32. Leftover grew from RM80 to RM148. Health score jumped from 62 to 76.",
  categoryBreakdown: [
    { category: "Food", amount: 380, color: "#10b981" },
    { category: "Transport", amount: 180, color: "#3b82f6" },
    { category: "Bills", amount: 320, color: "#f59e0b" },
    { category: "Subscription", amount: 60, color: "#8b5cf6" },
    { category: "Shopping", amount: 94, color: "#ef4444" },
    { category: "Other", amount: 95, color: "#6b7280" },
  ],
  healthHistory: [
    { month: "Jan", score: 58 },
    { month: "Feb", score: 55 },
    { month: "Mar", score: 60 },
    { month: "Apr", score: 62 },
    { month: "May", score: 76 },
  ],
};

export const demoRejectedEvaluation = {
  aiVerdict: "rejected",
  status: "completed",
  improvementPercent: 4.2,
  targetPercent: 10,
  expectedLeftover: 680,
  actualLeftover: 82,
  rewardUnlocked: false,
  reward: 30,
  verdictReason: "AI detected 3 GrabFood orders and 2 Foodpanda orders during the mission period. The public transport only rule was violated multiple times.",
  passedChecks: [
    { label: "No e-hailing rides", result: false },
    { label: "All transport photos submitted", result: true },
    { label: "Photos match transport types", result: false },
    { label: "Mission rules followed", result: false },
  ],
  explanation: "While you submitted photos for most rides, AI cross-referenced your bank transactions and found Grab payments on May 4, 12, and 19. Additionally, 3 photos showed car dashboards instead of bus/train tickets.",
  categoryBreakdown: [
    { category: "Food", amount: 420, color: "#10b981" },
    { category: "Transport", amount: 350, color: "#ef4444" },
    { category: "Bills", amount: 300, color: "#f59e0b" },
    { category: "Subscription", amount: 60, color: "#8b5cf6" },
    { category: "Shopping", amount: 110, color: "#ef4444" },
    { category: "Other", amount: 80, color: "#6b7280" },
  ],
  healthHistory: [
    { month: "Jan", score: 58 },
    { month: "Feb", score: 55 },
    { month: "Mar", score: 60 },
    { month: "Apr", score: 62 },
    { month: "May", score: 63 },
  ],
};
