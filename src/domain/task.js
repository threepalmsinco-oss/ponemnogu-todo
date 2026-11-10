import { isCalendarDate } from './date.js';

export const MAX_TITLE_LENGTH = 180;

/**
 * @typedef {{id: string, title: string, dueDate: string|null, startTime: string|null, endTime: string|null, completed: boolean, createdAt: string}} Task
 */

export class TaskValidationError extends Error {
  constructor(message, field = 'title') {
    super(message);
    this.name = 'TaskValidationError';
    this.field = field;
  }
}

export function isClockTime(value) {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function createTask({ id, title, dueDate = null, startTime = null, endTime = null, createdAt }) {
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  if (!cleanTitle) throw new TaskValidationError('Напиши, что хочешь сделать.');
  if (cleanTitle.length > MAX_TITLE_LENGTH) throw new TaskValidationError(`До ${MAX_TITLE_LENGTH} символов — так задачу проще прочитать.`);
  if (dueDate !== null && !isCalendarDate(dueDate)) throw new Error('Выбери существующую дату.');
  if (startTime !== null && !isClockTime(startTime)) throw new TaskValidationError('Укажи начало в формате ЧЧ:ММ.', 'startTime');
  if (endTime !== null && !isClockTime(endTime)) throw new TaskValidationError('Укажи окончание в формате ЧЧ:ММ.', 'endTime');
  if (endTime !== null && startTime === null) throw new TaskValidationError('Чтобы указать окончание, сначала выбери время начала.', 'startTime');
  if (startTime !== null && endTime !== null && endTime <= startTime) throw new TaskValidationError('Окончание должно быть позже начала в пределах одного дня.', 'endTime');
  if (typeof id !== 'string' || !id || typeof createdAt !== 'string' || Number.isNaN(Date.parse(createdAt))) {
    throw new Error('Не удалось создать задачу. Попробуй ещё раз.');
  }
  return { id, title: cleanTitle, dueDate, startTime, endTime, completed: false, createdAt };
}

export function isStoredTask(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) return false;
  try {
    const clean = createTask(task);
    return typeof task.completed === 'boolean' && task.title === clean.title;
  } catch { return false; }
}
