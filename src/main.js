import { TaskService } from './application/task-service.js';
import { LocalStorageTaskRepository } from './infrastructure/local-storage-task-repository.js';
import { TodoApp } from './presentation/app.js';

// Composition root: this is the only layer that selects concrete dependencies.
const storage = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};
// getRandomValues also works on an HTTP preview; randomUUID requires HTTPS.
const id = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID()
  : Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
new TodoApp(new TaskService(new LocalStorageTaskRepository(storage), { id }));
