// Canned responses used when no ANTHROPIC_API_KEY is configured, so the full
// Prompt → Understand → Plan → Build → Explain → Learn flow can be demoed offline.
import type { Build, Explanation, Learning, Plan, Understanding } from '../src/types.ts';

export const understanding: Understanding = {
  appName: 'StreakUp',
  tagline: 'Tiny daily habits, unbreakable streaks.',
  summary:
    'StreakUp is a mobile habit tracker that helps people build routines through one-tap daily check-ins, visible streaks and light gamification. It focuses on speed (check in under 3 seconds) and motivation (streaks, badges, weekly progress) rather than heavy analytics. V1 is offline-first and stores everything on the device.',
  problem: 'People start new habits with enthusiasm but lose track within two weeks because nothing makes progress visible or rewarding.',
  personas: [
    { name: 'The Self-Improver', description: 'Wants 3-4 healthy routines (water, reading, stretching). Needs gentle nudges and quick wins.' },
    { name: 'The Streak Chaser', description: 'Motivated by numbers going up. Opens the app to protect an unbroken streak.' },
  ],
  features: {
    must: ['Create & delete habits', 'One-tap daily check-in', 'Streak counter', 'Persist data on device'],
    should: ['Weekly progress view', 'Badges for milestones', 'Habit colors & emojis'],
    could: ['Push reminders', 'Cloud sync', 'Share streak cards'],
  },
  risks: [
    'Users forget to open the app — reminders will matter for retention.',
    'Assumption: gamification motivates more than detailed analytics.',
    'Assumption: local-only storage is acceptable for V1 (no accounts).',
    'Streak-reset on a single missed day may feel punishing and cause churn.',
  ],
  questions: [
    { question: 'Do users need to sync habits across devices?', options: ['No, on-device storage for V1', 'Yes, cloud sync with accounts'] },
    { question: 'How should a missed day affect a streak?', options: ['Reset to 0', 'Allow one "streak freeze" per week'] },
    { question: 'What should the home screen emphasise?', options: ["Today's checklist", 'Weekly stats dashboard'] },
  ],
};

export const plan: Plan = {
  screens: [
    { name: 'Today', purpose: "Check off today's habits in one tap", components: ['Header', 'ProgressRing', 'HabitCard'] },
    { name: 'Add Habit', purpose: 'Create a habit with name, emoji and color', components: ['TextInput', 'EmojiPicker', 'ColorSwatches'] },
    { name: 'Progress', purpose: 'See the last 7 days and best streaks', components: ['WeekGrid', 'StatTile'] },
    { name: 'Badges', purpose: 'Rewards for streak milestones', components: ['BadgeGrid'] },
  ],
  flowMermaid: `graph TD
  A[Launch] --> B[Today]
  B --> C[Add Habit]
  C --> B
  B --> D[Progress]
  B --> E[Badges]
  D --> B
  E --> B`,
  dataModelMermaid: `erDiagram
  HABIT ||--o{ CHECKIN : has
  HABIT {
    string id
    string name
    string emoji
    string color
    date createdAt
  }
  CHECKIN {
    string habitId
    date day
  }`,
  techStack: [
    { name: 'Expo + React Native', why: 'One JavaScript codebase for iOS and Android, instant preview on your phone with Expo Go.' },
    { name: 'React Navigation (Tabs)', why: 'Standard bottom-tab navigation that feels native on both platforms.' },
    { name: 'AsyncStorage', why: 'Simple key-value storage on the device; enough for an offline-first V1.' },
    { name: 'Zustand', why: 'Tiny global state store so every screen sees the same habits.' },
    { name: 'expo-notifications', why: 'Daily reminders in V1.1 without writing native code.' },
  ],
  fileTree: `streakup/
  app.json
  App.tsx
  src/
    screens/
      TodayScreen.tsx
      AddHabitScreen.tsx
      ProgressScreen.tsx
      BadgesScreen.tsx
    components/
      HabitCard.tsx
      ProgressRing.tsx
    store/
      useHabits.ts
    utils/
      streak.ts`,
  milestones: [
    { title: 'Foundation', tasks: ['Create Expo project', 'Set up tab navigation', 'Define Habit & CheckIn types'] },
    { title: 'Core loop', tasks: ['Add/delete habits', 'Daily check-in', 'Streak calculation', 'Persist with AsyncStorage'] },
    { title: 'Motivation', tasks: ['Weekly progress grid', 'Badges', 'Haptics on check-in'] },
    { title: 'Ship', tasks: ['App icon & splash', 'EAS Build', 'TestFlight / Play internal testing'] },
  ],
};

const CODE = `import React, { useEffect, useState } from 'react';

// 💡 Dates are stored as "YYYY-MM-DD" strings so they are easy to compare.
const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d); };

const SEED = [
  { id: '1', name: 'Drink water', emoji: '💧', color: '#3b82f6', done: [daysAgo(1), daysAgo(2), daysAgo(3)] },
  { id: '2', name: 'Read 10 pages', emoji: '📚', color: '#10b981', done: [daysAgo(1), daysAgo(2)] },
  { id: '3', name: 'Stretch', emoji: '🧘', color: '#f59e0b', done: [] },
];

// 💡 A streak = how many days in a row (ending today or yesterday) the habit was done.
function streakOf(habit) {
  let n = 0;
  let i = habit.done.includes(dayKey()) ? 0 : 1;
  while (habit.done.includes(daysAgo(i))) { n++; i++; }
  return n;
}

// 💡 Custom hook: state that saves itself. In React Native you'd use AsyncStorage instead of localStorage.
function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initial;
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue];
}

export default function App() {
  const [habits, setHabits] = usePersistentState('streakup.habits', SEED);
  const [tab, setTab] = useState('today');

  // 💡 Never mutate state directly — build a new array so React notices the change.
  const toggle = id => setHabits(hs => hs.map(h => {
    if (h.id !== id) return h;
    const today = dayKey();
    return { ...h, done: h.done.includes(today) ? h.done.filter(d => d !== today) : [...h.done, today] };
  }));
  const add = habit => { setHabits(hs => [...hs, { ...habit, id: String(Date.now()), done: [] }]); setTab('today'); };
  const remove = id => setHabits(hs => hs.filter(h => h.id !== id));

  return (
    <div style={styles.app}>
      <div style={styles.screen}>
        {tab === 'today' && <TodayScreen habits={habits} onToggle={toggle} onRemove={remove} />}
        {tab === 'add' && <AddHabitScreen onAdd={add} />}
        {tab === 'progress' && <ProgressScreen habits={habits} />}
      </div>
      <TabBar tab={tab} setTab={setTab} />
    </div>
  );
}

function TodayScreen({ habits, onToggle, onRemove }) {
  const doneCount = habits.filter(h => h.done.includes(dayKey())).length;
  const pct = habits.length ? Math.round((doneCount / habits.length) * 100) : 0;
  return (
    <div>
      <div style={styles.header}>
        <div style={styles.subtle}>{new Date().toDateString()}</div>
        <div style={styles.title}>Today</div>
      </div>
      <div style={styles.progressCard}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{pct}%</div>
          <div style={{ opacity: 0.85, fontSize: 13 }}>{doneCount} of {habits.length} habits done</div>
        </div>
        <div style={{ fontSize: 40 }}>{pct === 100 ? '🏆' : '🔥'}</div>
      </div>
      {habits.length === 0 && <div style={styles.empty}>No habits yet — add one from the + tab.</div>}
      {/* 💡 .map() turns each habit object into a card. "key" helps React track items. */}
      {habits.map(h => (
        <HabitCard key={h.id} habit={h} onToggle={() => onToggle(h.id)} onRemove={() => onRemove(h.id)} />
      ))}
    </div>
  );
}

function HabitCard({ habit, onToggle, onRemove }) {
  const done = habit.done.includes(dayKey());
  return (
    <div style={{ ...styles.card, borderLeft: '5px solid ' + habit.color }}>
      <div style={{ fontSize: 26 }}>{habit.emoji}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, textDecoration: done ? 'line-through' : 'none' }}>{habit.name}</div>
        <div style={styles.subtle}>🔥 {streakOf(habit)} day streak</div>
      </div>
      <button onClick={onRemove} style={styles.iconBtn} aria-label="Delete">✕</button>
      <button onClick={onToggle} style={{ ...styles.check, background: done ? habit.color : '#eef2f7', color: done ? '#fff' : '#94a3b8' }}>✓</button>
    </div>
  );
}

function AddHabitScreen({ onAdd }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('⭐');
  const [color, setColor] = useState('#6366f1');
  const EMOJIS = ['⭐', '💧', '📚', '🏃', '🧘', '🥗', '😴', '✍️'];
  const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
  return (
    <div>
      <div style={styles.header}><div style={styles.title}>New habit</div></div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Meditate 5 minutes" style={styles.input} />
      <div style={styles.label}>Emoji</div>
      <div style={styles.row}>{EMOJIS.map(e => (
        <button key={e} onClick={() => setEmoji(e)} style={{ ...styles.chip, outline: e === emoji ? '2px solid #6366f1' : 'none' }}>{e}</button>
      ))}</div>
      <div style={styles.label}>Color</div>
      <div style={styles.row}>{COLORS.map(c => (
        <button key={c} onClick={() => setColor(c)} style={{ ...styles.swatch, background: c, outline: c === color ? '3px solid #0f172a' : 'none' }} />
      ))}</div>
      <button disabled={!name.trim()} onClick={() => onAdd({ name: name.trim(), emoji, color })}
        style={{ ...styles.primary, opacity: name.trim() ? 1 : 0.4 }}>Add habit</button>
    </div>
  );
}

function ProgressScreen({ habits }) {
  const week = [6, 5, 4, 3, 2, 1, 0].map(daysAgo);
  const best = habits.reduce((m, h) => Math.max(m, streakOf(h)), 0);
  return (
    <div>
      <div style={styles.header}><div style={styles.title}>Progress</div></div>
      <div style={styles.row}>
        <div style={styles.stat}><div style={{ fontSize: 24, fontWeight: 800 }}>{best}</div><div style={styles.subtle}>best streak</div></div>
        <div style={styles.stat}><div style={{ fontSize: 24, fontWeight: 800 }}>{habits.reduce((n, h) => n + h.done.length, 0)}</div><div style={styles.subtle}>total check-ins</div></div>
      </div>
      <div style={styles.label}>Last 7 days</div>
      {habits.map(h => (
        <div key={h.id} style={{ ...styles.card, gap: 6 }}>
          <div style={{ width: 90, fontSize: 13 }}>{h.emoji} {h.name}</div>
          {week.map(d => (
            <div key={d} style={{ width: 22, height: 22, borderRadius: 6, background: h.done.includes(d) ? h.color : '#e2e8f0' }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function TabBar({ tab, setTab }) {
  const TABS = [['today', '🏠', 'Today'], ['add', '➕', 'Add'], ['progress', '📊', 'Progress']];
  return (
    <div style={styles.tabBar}>
      {TABS.map(([id, icon, label]) => (
        <button key={id} onClick={() => setTab(id)} style={{ ...styles.tab, color: tab === id ? '#6366f1' : '#94a3b8' }}>
          <div style={{ fontSize: 20 }}>{icon}</div>{label}
        </button>
      ))}
    </div>
  );
}

// 💡 Like StyleSheet.create in React Native: all styles in one object, referenced by name.
const styles = {
  app: { height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' },
  screen: { flex: 1, overflowY: 'auto', padding: '16px 16px 8px' },
  header: { margin: '8px 0 16px' },
  title: { fontSize: 30, fontWeight: 800 },
  subtle: { fontSize: 12, color: '#64748b' },
  progressCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 20, marginBottom: 16, color: '#fff', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  card: { display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: 14, borderRadius: 16, marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)' },
  check: { width: 40, height: 40, borderRadius: 20, border: 'none', fontSize: 18, fontWeight: 800, cursor: 'pointer' },
  iconBtn: { border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: 14 },
  empty: { textAlign: 'center', color: '#94a3b8', padding: 30 },
  input: { width: '100%', boxSizing: 'border-box', padding: 14, borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 16 },
  label: { fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '18px 0 8px' },
  row: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: { fontSize: 22, width: 44, height: 44, borderRadius: 12, border: 'none', background: '#fff', cursor: 'pointer' },
  swatch: { width: 36, height: 36, borderRadius: 18, border: 'none', cursor: 'pointer' },
  primary: { width: '100%', marginTop: 28, padding: 16, border: 'none', borderRadius: 16, background: '#6366f1', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' },
  stat: { flex: 1, background: '#fff', borderRadius: 16, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,.06)' },
  tabBar: { display: 'flex', borderTop: '1px solid #e2e8f0', background: '#fff', paddingBottom: 10 },
  tab: { flex: 1, border: 'none', background: 'transparent', padding: '8px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
};
`;

const NATIVE = `import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useHabits } from '../store/useHabits';
import { streakOf, dayKey } from '../utils/streak';

export default function TodayScreen() {
  const { habits, toggle } = useHabits();
  const done = habits.filter(h => h.done.includes(dayKey())).length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today</Text>
      <Text style={styles.subtle}>{done} of {habits.length} done</Text>
      <FlatList
        data={habits}
        keyExtractor={h => h.id}
        renderItem={({ item }) => {
          const checked = item.done.includes(dayKey());
          return (
            <View style={[styles.card, { borderLeftColor: item.color }]}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.subtle}>🔥 {streakOf(item)} day streak</Text>
              </View>
              <Pressable
                onPress={() => toggle(item.id)}
                style={[styles.check, checked && { backgroundColor: item.color }]}
              >
                <Text style={{ color: checked ? '#fff' : '#94a3b8' }}>✓</Text>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  title: { fontSize: 30, fontWeight: '800' },
  subtle: { fontSize: 12, color: '#64748b' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff',
          padding: 14, borderRadius: 16, marginTop: 10, borderLeftWidth: 5 },
  emoji: { fontSize: 26 },
  name: { fontWeight: '600' },
  check: { width: 40, height: 40, borderRadius: 20, alignItems: 'center',
           justifyContent: 'center', backgroundColor: '#eef2f7' },
});`;

export const build: Build = {
  code: CODE,
  nativeSnippet: NATIVE,
  summary: 'Built StreakUp V1: a Today checklist with one-tap check-ins and streaks, an Add Habit screen, and a 7-day Progress view — all persisted on the device.',
  changes: ['3 screens + bottom tab bar', 'Streak calculation from check-in dates', 'usePersistentState hook (AsyncStorage equivalent)', 'Seeded sample habits'],
};

export function rebuild(code: string, instruction: string): Build {
  return {
    ...build,
    code: `// Change requested: ${instruction.replace(/\n/g, ' ')}\n// (Demo mode — add GEMINI_API_KEY to have the AI actually apply edits.)\n${code.replace(/^\/\/ Change requested:.*\n\/\/ \(Demo mode.*\n/, '')}`,
    summary: 'Demo mode: your request was recorded at the top of the file. With an API key, the AI rewrites the app to apply it.',
    changes: ['Recorded change request'],
  };
}

export const explanation: Explanation = {
  overview:
    'The whole app lives in one component tree. `App` owns the single source of truth — the `habits` array — and passes data plus callbacks (`onToggle`, `onAdd`) down to each screen as props. Screens never change data themselves; they ask `App` to. A tiny custom hook saves the array to storage on every change, so habits survive a restart. Navigation is just a `tab` state value deciding which screen to render.',
  sections: [
    {
      title: 'Saving data with a custom hook',
      snippet: `function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initial;
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue];
}`,
      explanation:
        "This works like `useState`, but it also **remembers** the value. On first load it reads saved data; whenever the value changes, `useEffect` writes it back. In React Native you'd swap `localStorage` for `AsyncStorage` (which is async, so you'd load in an effect).",
      concept: 'Custom hooks & side effects',
    },
    {
      title: 'Calculating a streak',
      snippet: `function streakOf(habit) {
  let n = 0;
  let i = habit.done.includes(dayKey()) ? 0 : 1;
  while (habit.done.includes(daysAgo(i))) { n++; i++; }
  return n;
}`,
      explanation:
        "We don't store the streak — we **derive** it from check-in dates. Start at today (or yesterday if today isn't done yet, so the streak isn't 'broken' in the morning) and count backwards until a day is missing.",
      concept: 'Derived state',
    },
    {
      title: 'Updating state immutably',
      snippet: `const toggle = id => setHabits(hs => hs.map(h => {
  if (h.id !== id) return h;
  const today = dayKey();
  return { ...h, done: h.done.includes(today) ? h.done.filter(d => d !== today) : [...h.done, today] };
}));`,
      explanation:
        'React only re-renders when it sees a **new** object. So instead of pushing into the existing array, we create copies with `map`, spread `...h`, and `filter`. This pattern is identical in React Native.',
      concept: 'Immutability',
    },
    {
      title: 'Rendering a list',
      snippet: `{habits.map(h => (
  <HabitCard key={h.id} habit={h} onToggle={() => onToggle(h.id)} onRemove={() => onRemove(h.id)} />
))}`,
      explanation:
        "`.map()` converts each habit into a `HabitCard`. The `key` lets React match items between renders. On mobile you'd use `<FlatList>` instead, which only renders what's on screen — important for long lists.",
      concept: 'Lists & keys',
    },
    {
      title: 'Navigation with state',
      snippet: `{tab === 'today' && <TodayScreen habits={habits} onToggle={toggle} onRemove={remove} />}
{tab === 'add' && <AddHabitScreen onAdd={add} />}
{tab === 'progress' && <ProgressScreen habits={habits} />}`,
      explanation:
        'Here a simple `tab` value picks which screen is visible. Real apps use **React Navigation** (`createBottomTabNavigator`), which adds native transitions, back gestures and deep links — but the idea is the same.',
      concept: 'Navigation',
    },
    {
      title: 'Styles as objects',
      snippet: `const styles = {
  app: { height: '100vh', display: 'flex', flexDirection: 'column', ... },
  card: { display: 'flex', alignItems: 'center', gap: 12, ... },`,
      explanation:
        "Mobile apps don't use CSS files. React Native uses `StyleSheet.create({...})` with camelCase properties and **Flexbox by default** (with `flexDirection: 'column'`). Keeping styles in one object mirrors that exactly.",
      concept: 'Styling & Flexbox',
    },
  ],
  concepts: [
    { name: 'Components', oneLiner: 'Reusable UI building blocks like HabitCard.' },
    { name: 'Props', oneLiner: 'Data passed from a parent to a child component.' },
    { name: 'State', oneLiner: "A component's memory; changing it re-renders the UI." },
    { name: 'useEffect', oneLiner: 'Run side effects (like saving) after rendering.' },
    { name: 'Derived state', oneLiner: 'Compute values (streaks) instead of storing them.' },
    { name: 'FlatList', oneLiner: "React Native's efficient scrolling list." },
    { name: 'AsyncStorage', oneLiner: 'Persistent key-value storage on the phone.' },
  ],
};

export const learning: Learning = {
  lessons: [
    {
      title: 'Components, Props & State',
      minutes: 15,
      summary: 'How StreakUp is assembled from small pieces.',
      content:
        "Every screen in StreakUp is a **component** — a function that returns UI.\n\n```jsx\nfunction HabitCard({ habit, onToggle }) {\n  return <View>...</View>;\n}\n```\n\n`habit` and `onToggle` are **props**: inputs from the parent. The parent (`App`) holds **state** with `useState`. When state changes, React re-runs the components and updates the screen.\n\n**Rule of thumb:** keep state in the lowest common parent of everything that needs it. That's why `habits` lives in `App` — the Today and Progress screens both need it.",
      exercise: 'Add a `note` field to each habit and show it under the name in HabitCard.',
    },
    {
      title: 'Lists that scale: map vs FlatList',
      minutes: 15,
      summary: 'Render many habits efficiently.',
      content:
        "In the web preview we use `habits.map(...)`. On a phone with 500 items this would render everything at once. React Native's `FlatList` virtualises:\n\n```jsx\n<FlatList data={habits} keyExtractor={h => h.id}\n  renderItem={({ item }) => <HabitCard habit={item} />} />\n```\n\nAlways give a stable `key` (the id, never the array index) so React doesn't mix up rows when you delete one.",
      exercise: 'Sort habits so unfinished ones appear first on the Today screen.',
    },
    {
      title: 'Persisting data with AsyncStorage',
      minutes: 20,
      summary: 'Make habits survive an app restart.',
      content:
        "`AsyncStorage` is like `localStorage`, but **asynchronous**:\n\n```js\nimport AsyncStorage from '@react-native-async-storage/async-storage';\nuseEffect(() => {\n  AsyncStorage.getItem('habits').then(s => s && setHabits(JSON.parse(s)));\n}, []);\nuseEffect(() => {\n  AsyncStorage.setItem('habits', JSON.stringify(habits));\n}, [habits]);\n```\n\nBecause loading takes a moment, show a loading state first so you don't overwrite saved data with the seed.",
      exercise: 'Add a "Reset all data" button on the Progress screen.',
    },
    {
      title: 'Navigation with React Navigation',
      minutes: 20,
      summary: 'Replace the tab state with real native tabs.',
      content:
        "```jsx\nconst Tab = createBottomTabNavigator();\n<NavigationContainer>\n  <Tab.Navigator>\n    <Tab.Screen name=\"Today\" component={TodayScreen} />\n    <Tab.Screen name=\"Progress\" component={ProgressScreen} />\n  </Tab.Navigator>\n</NavigationContainer>\n```\n\nOnce screens are separate, shared data moves into a store (Zustand or Context) instead of props.",
      exercise: 'Sketch which state would move into a `useHabits` Zustand store.',
    },
    {
      title: 'Shipping to the App Store & Play Store',
      minutes: 25,
      summary: 'From Expo Go to real testers.',
      content:
        "1. Set `name`, `icon` and `bundleIdentifier` in `app.json`.\n2. `npx eas build -p all` builds signed binaries in the cloud.\n3. `npx eas submit` uploads to TestFlight and Play Console.\n4. Invite testers, gather feedback, iterate.\n\nApple requires a developer account ($99/yr); Google charges a one-time $25.",
      exercise: 'Write the App Store description and 3 screenshot captions for StreakUp.',
    },
  ],
  quiz: [
    {
      question: 'Why does `toggle` create a new array with `.map()` instead of editing the habit directly?',
      options: ['It is faster', 'React only re-renders when it receives a new reference', 'localStorage requires it', 'To avoid syntax errors'],
      answer: 1,
      why: 'React compares references. Mutating the same array means React thinks nothing changed and the UI goes stale.',
    },
    {
      question: 'Why is the streak computed by `streakOf()` rather than stored on the habit?',
      options: ['Derived data can never get out of sync with check-ins', 'Storage is limited to 5 values', 'It makes the code shorter', 'React forbids numbers in state'],
      answer: 0,
      why: 'Storing both check-ins and a streak creates two sources of truth that can disagree. Deriving keeps one.',
    },
    {
      question: 'What should replace `habits.map()` in React Native for long lists?',
      options: ['ScrollView', 'FlatList', 'for loop', 'Array.forEach'],
      answer: 1,
      why: 'FlatList only renders visible rows, keeping memory and scroll performance under control.',
    },
    {
      question: 'What happens if you use the array index as `key` and delete the first habit?',
      options: ['Nothing', 'App crashes', 'React may reuse the wrong card state for the remaining habits', 'Styles break'],
      answer: 2,
      why: 'Indexes shift after deletion, so React matches old component state to the wrong item.',
    },
    {
      question: 'Which API persists data on the phone in React Native?',
      options: ['localStorage', 'sessionStorage', 'AsyncStorage', 'cookies'],
      answer: 2,
      why: "There's no browser on a phone; AsyncStorage is the device-level key-value store.",
    },
  ],
  challenges: [
    { title: 'Dark mode', difficulty: 'Easy', prompt: 'Add a dark mode toggle in the header that switches the whole app to a dark color scheme.' },
    { title: 'Streak freeze', difficulty: 'Medium', prompt: 'Add one "streak freeze" per week: a missed day does not break the streak if a freeze is available. Show remaining freezes.' },
    { title: 'Badges screen', difficulty: 'Hard', prompt: 'Add a Badges tab that awards badges at 3, 7, 30 and 100-day streaks, with locked/unlocked states.' },
  ],
};

export function chatReply(q: string = ''): string {
  return `*(Demo mode: add an \`ANTHROPIC_API_KEY\` for real answers.)*\n\nGood question about **"${q.slice(0, 80)}"**. In StreakUp, start from the \`habits\` state in \`App\` — every feature flows from it. Try changing something small in the Build tab and watch the preview update!`;
}
