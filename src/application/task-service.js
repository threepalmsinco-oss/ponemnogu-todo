import { createTask } from '../domain/task.js';

/** Use cases depend only on domain rules and an injected repository port. */
export class TaskService {
  #repository;
  #tasks = [];
  #ready = false;
  #id;
  #now;

  constructor(repository, { id = () => crypto.randomUUID(), now = () => new Date().toISOString() } = {}) {
    this.#repository = repository;
    this.#id = id;
    this.#now = now;
  }

  load() {
    this.#ready = false;
    this.#tasks = this.#repository.load();
    this.#ready = true;
    return this.list();
  }

  list() { return this.#tasks.map(task => ({ ...task })); }

  #commit(next) {
    if (!this.#ready) throw new Error('Хранилище недоступно. Обнови страницу и попробуй снова.');
    this.#repository.save(next);
    this.#tasks = next;
    return this.list();
  }

  add(title, dueDate = null) {
    const task = createTask({ id: this.#id(), title, dueDate, createdAt: this.#now() });
    this.#commit([...this.#tasks, task]);
    return { ...task };
  }

  toggle(id) {
    const task = this.#tasks.find(item => item.id === id);
    if (!task) throw new Error('Задача уже удалена.');
    const updated = { ...task, completed: !task.completed };
    this.#commit(this.#tasks.map(item => item.id === id ? updated : item));
    return { ...updated };
  }

  remove(id) {
    const task = this.#tasks.find(item => item.id === id);
    if (!task) throw new Error('Задача уже удалена.');
    this.#commit(this.#tasks.filter(item => item.id !== id));
    return { ...task };
  }

  restore(task) {
    if (this.#tasks.some(item => item.id === task.id)) return;
    createTask(task);
    this.#commit([...this.#tasks, { ...task }]);
  }
}
