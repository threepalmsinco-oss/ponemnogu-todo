import { isStoredTask } from '../domain/task.js';

export const STORAGE_KEY = 'ponemnogu.tasks.v1';

export class LocalStorageTaskRepository {
  constructor(storage) { this.storage = storage; }

  load() {
    let raw;
    try { raw = this.storage.getItem(STORAGE_KEY); }
    catch { throw new Error('Браузер не разрешает читать задачи. Разреши хранение данных для этого сайта и обнови страницу.'); }
    if (raw === null) return [];
    try {
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Array.isArray(data.tasks)
        || !data.tasks.every(isStoredTask)
        || new Set(data.tasks.map(task => task.id)).size !== data.tasks.length) throw new Error();
      return data.tasks.map(({ id, title, dueDate, completed, createdAt }) => ({ id, title, dueDate, completed, createdAt }));
    } catch {
      throw new Error('Не удалось прочитать сохранённые задачи. Исходные данные сохранены: мы не будем их перезаписывать.');
    }
  }

  save(tasks) {
    try { this.storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, tasks })); }
    catch { throw new Error('Не получилось сохранить изменение. Возможно, память браузера заполнена. Предыдущие задачи сохранены.'); }
  }
}
