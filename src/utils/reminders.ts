import { Reminder } from '../types';

const DAY_MS = 86400000;

export const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const fromDateKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const addDays = (key: string, days: number): string => {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

export const daysUntil = (dueDate: string, todayKey: string): number =>
  Math.round((fromDateKey(dueDate).getTime() - fromDateKey(todayKey).getTime()) / DAY_MS);

export const formatDueDate = (dueDate: string): string => {
  const date = fromDateKey(dueDate);
  if (Number.isNaN(date.getTime())) return dueDate;
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  }).format(date);
};

export const getDueLabel = (days: number): string => {
  if (days === 0) return 'Bugün';
  if (days === 1) return 'Yarın';
  if (days > 1) return `${days} gün kaldı`;
  return `${Math.abs(days)} gün gecikti`;
};

export const isDue = (reminder: Reminder, todayKey: string): boolean => reminder.dueDate <= todayKey;

export const getPendingReminders = (reminders: Reminder[]): Reminder[] =>
  reminders
    .filter((reminder) => reminder.status === 'pending')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.createdAt.localeCompare(b.createdAt));
