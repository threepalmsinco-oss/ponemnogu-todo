/** Calendar dates remain YYYY-MM-DD strings, never UTC timestamps. */
export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 9999) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function fromCalendarDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function selectTasks(tasks, { view = 'all', date = null, today = localDate() } = {}) {
  return tasks.filter(task => {
    if (view === 'completed') return task.completed;
    if (view === 'today') return !task.completed && task.dueDate === today;
    if (view === 'upcoming') return !task.completed && task.dueDate !== null && task.dueDate > today;
    if (view === 'date') return task.dueDate === date;
    return true;
  }).sort((a, b) => Number(a.completed) - Number(b.completed)
    || (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31')
    || (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99')
    || b.createdAt.localeCompare(a.createdAt));
}
