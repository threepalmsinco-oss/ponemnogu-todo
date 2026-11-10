import test from 'node:test';
import assert from 'node:assert/strict';
import { createTask, isClockTime } from '../src/domain/task.js';
import { isCalendarDate, localDate, selectTasks } from '../src/domain/date.js';
import { TaskService } from '../src/application/task-service.js';
import { LocalStorageTaskRepository, STORAGE_KEY } from '../src/infrastructure/local-storage-task-repository.js';
import { getMessage } from '../src/presentation/mascot.js';

function setup() {
  const data = new Map();
  let serial = 0;
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const repository = new LocalStorageTaskRepository(storage);
  const service = new TaskService(repository, { id: () => `task-${++serial}`, now: () => '2026-11-10T09:00:00.000Z' });
  service.load();
  return { service, repository, storage, data };
}

test('add, complete, reopen and delete persist through a fresh service', () => {
  const { service, repository } = setup();
  const task = service.add('  Прочитать книгу  ', '2026-11-11');
  assert.equal(task.title, 'Прочитать книгу');
  assert.equal(service.toggle(task.id).completed, true);
  const reopened = new TaskService(repository);
  assert.equal(reopened.load()[0].completed, true);
  assert.equal(reopened.toggle(task.id).completed, false);
  reopened.remove(task.id);
  assert.deepEqual(repository.load(), []);
});

test('empty, too long and invalid dates never modify persisted tasks', () => {
  const { service, data } = setup();
  service.add('Сохранённая задача');
  const before = data.get(STORAGE_KEY);
  assert.throws(() => service.add('   '), /Напиши/);
  assert.throws(() => service.add('а'.repeat(181)), /180/);
  assert.throws(() => service.add('Дело', '2026-02-30'), /дату/);
  assert.equal(data.get(STORAGE_KEY), before);
});

test('calendar validation covers leap years and rejects normalized invalid dates', () => {
  assert.equal(isCalendarDate('2028-02-29'), true);
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-01-00', '2026-1-1', '1899-12-31', null]) assert.equal(isCalendarDate(date), false, String(date));
  assert.equal(isCalendarDate('1900-01-01'), true);
  assert.equal(isCalendarDate('9999-12-31'), true);
});

test('calendar day is built from local fields rather than UTC', () => {
  assert.equal(localDate(new Date(2026, 0, 2, 0, 1)), '2026-01-02');
});

test('today, future, completed and exact-date views have distinct semantics', () => {
  const { service } = setup();
  const today = service.add('Сегодня', '2026-11-10');
  const future = service.add('Завтра', '2026-11-11');
  service.add('Вчера', '2026-11-09');
  service.add('Без даты');
  service.toggle(today.id);
  const tasks = service.list();
  assert.deepEqual(selectTasks(tasks, { view: 'today', today: '2026-11-10' }), []);
  assert.deepEqual(selectTasks(tasks, { view: 'upcoming', today: '2026-11-10' }).map(t => t.id), [future.id]);
  assert.deepEqual(selectTasks(tasks, { view: 'completed' }).map(t => t.id), [today.id]);
  assert.equal(selectTasks(tasks, { view: 'date', date: '2026-11-10' })[0].completed, true);
  assert.equal(selectTasks(tasks).at(-1).id, today.id);
});

test('undo restores a completed task with its original identity and date', () => {
  const { service, repository } = setup();
  const task = service.add('Задача', '2026-11-11');
  service.toggle(task.id);
  const removed = service.remove(task.id);
  service.restore(removed);
  service.restore(removed);
  assert.deepEqual(repository.load(), [{ ...task, completed: true }]);
});

test('failed storage writes roll back every use case in memory', () => {
  const { service, storage, data } = setup();
  const task = service.add('Важное дело');
  const before = data.get(STORAGE_KEY);
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.throws(() => service.toggle(task.id), /сохранить/);
  assert.equal(service.list()[0].completed, false);
  assert.throws(() => service.remove(task.id), /сохранить/);
  assert.throws(() => service.add('Новое дело'), /сохранить/);
  assert.equal(service.list().length, 1);
  assert.equal(data.get(STORAGE_KEY), before);
});

test('corrupted or unsupported storage is preserved and blocks mutations', () => {
  const { service, data } = setup();
  for (const raw of ['not JSON', 'null', '{"version":3,"tasks":[]}', '{"version":1,"tasks":[{}]}']) {
    data.set(STORAGE_KEY, raw);
    assert.throws(() => service.load(), /перезаписывать/);
    assert.throws(() => service.add('Новая'), /Хранилище/);
    assert.equal(data.get(STORAGE_KEY), raw);
  }
});

test('duplicate IDs in stored records are rejected', () => {
  const { service, data } = setup();
  const task = service.add('Задача');
  data.set(STORAGE_KEY, JSON.stringify({ version: 1, tasks: [task, task] }));
  assert.throws(() => service.load(), /перезаписывать/);
});

test('blocked storage provides a readable error without overwriting data', () => {
  const repository = new LocalStorageTaskRepository({ getItem() { throw new Error('SecurityError'); } });
  assert.throws(() => repository.load(), /не разрешает/);
});

test('task snapshots cannot mutate service state or storage', () => {
  const { service, repository } = setup();
  const task = service.add('Исходная');
  task.title = 'Изменено';
  service.list()[0].completed = true;
  assert.equal(service.list()[0].title, 'Исходная');
  assert.equal(repository.load()[0].completed, false);
});

test('unknown task actions do not change other tasks', () => {
  const { service } = setup();
  service.add('Моя задача');
  assert.throws(() => service.remove('missing'), /удалена/);
  assert.throws(() => service.toggle('missing'), /удалена/);
  assert.equal(service.list().length, 1);
});

test('mascot encourages an empty list and celebrates completing all tasks', () => {
  const { service } = setup();
  assert.match(getMessage('welcome', []), /Добавь задачу/);
  assert.match(getMessage('deleted', []), /Добавь новую задачу/);
  const task = service.add('Маленький шаг');
  service.toggle(task.id);
  assert.match(getMessage('completed', service.list()), /Все дела сделаны/);
});

test('user HTML remains plain task data rather than executable markup', () => {
  const { service, repository } = setup();
  const title = '<img src=x onerror=alert(1)>';
  service.add(title);
  assert.equal(repository.load()[0].title, title);
});

test('an optional time range survives reload, completion and deletion undo', () => {
  const { service, repository } = setup();
  const task = service.add('Прочитать книгу', '2026-11-10', { startTime: '10:00', endTime: '12:00' });
  const reloaded = new TaskService(repository);
  assert.deepEqual(reloaded.load(), [task]);
  reloaded.toggle(task.id);
  const removed = reloaded.remove(task.id);
  reloaded.restore(removed);
  assert.deepEqual(repository.load(), [{ ...task, completed: true }]);
});

test('time is optional with or without a calendar date; start-only is supported', () => {
  const { service } = setup();
  const noTime = service.add('В своём темпе');
  assert.equal(noTime.startTime, null);
  assert.equal(noTime.endTime, null);
  const startOnly = service.add('Разобрать почту', null, { startTime: '00:00' });
  assert.equal(startOnly.startTime, '00:00');
  assert.equal(startOnly.endTime, null);
});

test('invalid or reversed time intervals never alter stored tasks', () => {
  const { service, data } = setup();
  service.add('Существующая задача');
  const before = data.get(STORAGE_KEY);
  for (const times of [
    { startTime: '9:00' }, { startTime: '24:00' }, { startTime: '10:60' },
    { startTime: 1000 }, { endTime: '12:00' }, { startTime: '10:00', endTime: 'invalid' },
    { startTime: '12:00', endTime: '10:00' }, { startTime: '10:00', endTime: '10:00' },
  ]) {
    assert.throws(() => service.add('Новое дело', null, times));
    assert.equal(data.get(STORAGE_KEY), before);
    assert.equal(service.list().length, 1);
  }
  assert.equal(isClockTime('23:59'), true);
});

test('legacy v1 tasks load without loss and migrate only on a successful write', () => {
  const { service, data, repository } = setup();
  const legacy = { id: 'old-1', title: 'Старая задача', completed: true, dueDate: '2026-11-10', createdAt: '2026-11-10T09:00:00.000Z' };
  const raw = JSON.stringify({ version: 1, tasks: [legacy] });
  data.set(STORAGE_KEY, raw);
  assert.deepEqual(service.load(), [{ ...legacy, startTime: null, endTime: null }]);
  assert.equal(data.get(STORAGE_KEY), raw);
  service.add('Новая задача', '2026-11-11', { startTime: '10:00', endTime: '12:00' });
  assert.equal(JSON.parse(data.get(STORAGE_KEY)).version, 2);
  assert.equal(repository.load()[0].title, legacy.title);
  assert.equal(repository.load()[0].completed, true);
});

test('tasks on the same day sort by start time, with untimed tasks afterwards', () => {
  const { service } = setup();
  service.add('Без времени', '2026-11-10');
  service.add('После обеда', '2026-11-10', { startTime: '14:00' });
  service.add('Утром', '2026-11-10', { startTime: '09:00', endTime: '10:00' });
  assert.deepEqual(selectTasks(service.list()).map(task => task.title), ['Утром', 'После обеда', 'Без времени']);
});
