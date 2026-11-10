import { isCalendarDate } from './date.js';

export const MAX_TITLE_LENGTH = 180;

/**
 * @typedef {{id: string, title: string, dueDate: string|null, completed: boolean, createdAt: string}} Task
 */

export function createTask({ id, title, dueDate = null, createdAt }) {
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  if (!cleanTitle) throw new Error('Напиши, что хочешь сделать.');
  if (cleanTitle.length > MAX_TITLE_LENGTH) throw new Error(`До ${MAX_TITLE_LENGTH} символов — так задачу проще прочитать.`);
  if (dueDate !== null && !isCalendarDate(dueDate)) throw new Error('Выбери существующую дату.');
  if (typeof id !== 'string' || !id || typeof createdAt !== 'string' || Number.isNaN(Date.parse(createdAt))) {
    throw new Error('Не удалось создать задачу. Попробуй ещё раз.');
  }
  return { id, title: cleanTitle, dueDate, completed: false, createdAt };
}

export function isStoredTask(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) return false;
  try {
    const clean = createTask(task);
    return typeof task.completed === 'boolean' && task.title === clean.title;
  } catch { return false; }
}
