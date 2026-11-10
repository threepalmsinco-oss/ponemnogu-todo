import { localDate, fromCalendarDate, isCalendarDate, selectTasks } from '../domain/date.js';
import { Calendar } from './calendar.js';
import { mascotSvg, getMessage } from './mascot.js';

const $ = selector => document.querySelector(selector);
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const fullDateFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
const svg = name => `<svg class="${name === 'calendar' ? 'small-icon' : 'icon'}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const viewTitles = { all: 'Все задачи', today: 'На сегодня', upcoming: 'Предстоящие', completed: 'Маленькие победы' };
const plural = new Intl.PluralRules('ru');
const noun = count => ({ one: 'задача', few: 'задачи', many: 'задач', other: 'задачи' })[plural.select(count)];

export class TodoApp {
  constructor(service) {
    this.service = service;
    this.tasks = [];
    this.view = 'all';
    this.filterDate = null;
    this.draftDate = null;
    this.deletedTask = null;
    this.toastTimer = null;
    this.toastCanExpire = true;
    this.today = localDate();
    this.ready = false;
    $('#buddy-art').innerHTML = mascotSvg;
    this.calendar = new Calendar($('#main-calendar'), date => this.navigate('date', date));
    this.picker = new Calendar($('#picker-calendar'), date => this.setDraftDate(date));
    this.bindEvents();
    this.load();
    this.applyHash();
    this.motivate('welcome');
  }

  bindEvents() {
    $('#task-form').addEventListener('submit', event => { event.preventDefault(); this.addTask(); });
    $('#task-title').addEventListener('input', () => { $('#task-error').hidden = true; $('#task-title').removeAttribute('aria-invalid'); });
    document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => this.navigate(button.dataset.view)));
    $('#clear-filter').addEventListener('click', () => this.navigate('all'));
    $('#empty-action').addEventListener('click', () => {
      if (this.view === 'completed') this.navigate('all');
      $('#task-title').focus();
    });
    $('#task-list').addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const id = button.dataset.id;
      const controls = [...document.querySelectorAll('.task-checkbox')];
      const index = controls.findIndex(control => control.dataset.id === id);
      this.run(() => {
        if (button.dataset.action === 'toggle') {
          const task = this.service.toggle(id);
          this.sync();
          this.motivate(task.completed ? 'completed' : 'reopened');
          this.showToast(task.completed ? 'Ещё одна маленькая победа!' : 'Задача снова в планах');
        } else {
          const removed = this.service.remove(id);
          this.sync();
          this.deletedTask = removed;
          this.motivate('deleted');
          this.showToast('Задача удалена', true);
        }
        const target = document.querySelector(`.task-checkbox[data-id="${CSS.escape(id)}"]`) || [...document.querySelectorAll('.task-checkbox')][Math.min(index, document.querySelectorAll('.task-checkbox').length - 1)] || $('#task-title');
        target.focus({ preventScroll: true });
      });
    });
    $('#date-trigger').addEventListener('click', () => {
      this.picker.set({ tasks: this.tasks, selected: this.draftDate, month: this.draftDate ? fromCalendarDate(this.draftDate) : new Date() });
      $('#date-dialog').showModal();
    });
    $('#close-date').addEventListener('click', () => $('#date-dialog').close());
    $('#date-dialog').addEventListener('click', event => {
      if (event.target !== $('#date-dialog')) return;
      const rect = $('#date-dialog').getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('#date-dialog').close();
    });
    document.querySelectorAll('[data-shortcut]').forEach(button => button.addEventListener('click', () => {
      const next = new Date();
      if (button.dataset.shortcut === 'tomorrow') next.setDate(next.getDate() + 1);
      this.setDraftDate(button.dataset.shortcut === 'none' ? null : localDate(next));
    }));
    $('#calendar-today').addEventListener('click', () => this.navigate('date', localDate()));
    $('#undo-button').addEventListener('click', () => this.run(() => {
      if (!this.deletedTask) return;
      const restored = this.deletedTask;
      this.service.restore(restored);
      this.sync();
      if (!selectTasks([restored], this.selection()).length) this.navigate('all');
      this.motivate('restored');
      this.showToast('Задача возвращена');
    }));
    $('#dismiss-toast').addEventListener('click', () => this.hideToast());
    $('#toast').addEventListener('focusin', () => { this.toastCanExpire = false; clearTimeout(this.toastTimer); });
    $('#toast').addEventListener('focusout', event => {
      if (!$('#toast').contains(event.relatedTarget)) { this.toastCanExpire = true; this.scheduleToast(); }
    });
    window.addEventListener('hashchange', () => this.applyHash());
    window.addEventListener('popstate', () => this.applyHash());
    window.addEventListener('storage', event => { if (event.key === 'ponemnogu.tasks.v1' || event.key === null) this.load(); });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { this.checkDay(); this.load(); }
    });
    this.dayTimer = setInterval(() => this.checkDay(), 30000);
  }

  checkDay() {
    if (localDate() !== this.today) { this.today = localDate(); this.render(); }
  }

  load() {
    try {
      this.tasks = this.service.load();
      this.ready = true;
      $('#storage-error').hidden = true;
      $('#add-button').disabled = false;
      $('.storage-status span').textContent = 'Сохранено на устройстве';
    } catch (error) {
      this.ready = false;
      $('#storage-error').textContent = error.message;
      $('#storage-error').hidden = false;
      $('#add-button').disabled = true;
      $('.storage-status span').textContent = 'Хранилище недоступно';
    }
    this.render();
  }

  sync() { this.tasks = this.service.list(); this.render(); }

  run(action) {
    try { action(); }
    catch (error) { this.showToast(error.message, false, true); }
  }

  addTask() {
    try {
      const added = this.service.add($('#task-title').value, this.draftDate);
      $('#task-title').value = '';
      $('#task-title').removeAttribute('aria-invalid');
      $('#task-error').hidden = true;
      this.sync();
      if (!selectTasks([added], this.selection()).length) this.navigate('all');
      this.motivate('added');
      this.showToast('Задача добавлена. Отличное начало!');
      $('#task-title').focus();
    } catch (error) {
      $('#task-error').textContent = error.message;
      $('#task-error').hidden = false;
      $('#task-title').setAttribute('aria-invalid', 'true');
      $('#task-title').focus();
    }
  }

  navigate(view, date = null) {
    const calendarHadFocus = $('#main-calendar').contains(document.activeElement);
    const hash = view === 'date' ? `#date=${date}` : `#${view}`;
    if (location.hash !== hash) history.pushState(null, '', hash);
    this.applyHash();
    if (calendarHadFocus && date) $('#main-calendar').querySelector(`[data-date="${date}"]`)?.focus({ preventScroll: true });
  }

  applyHash() {
    const value = location.hash.slice(1);
    this.filterDate = value.startsWith('date=') && isCalendarDate(value.slice(5)) ? value.slice(5) : null;
    this.view = this.filterDate ? 'date' : Object.hasOwn(viewTitles, value) ? value : 'all';
    if (this.view === 'today') this.setDraftDate(localDate(), false);
    if (this.view === 'date') {
      this.setDraftDate(this.filterDate, false);
      this.calendar.month = fromCalendarDate(this.filterDate);
    }
    if (this.view === 'upcoming') {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      this.setDraftDate(localDate(tomorrow), false);
    }
    this.render();
  }

  selection() { return { view: this.view, date: this.filterDate, today: this.today }; }

  setDraftDate(date, close = true) {
    this.draftDate = date;
    $('#date-label').textContent = date ? (date === localDate() ? 'Сегодня' : dateFormat.format(fromCalendarDate(date))) : 'Когда-нибудь';
    $('#date-trigger').classList.toggle('has-date', !!date);
    if (close) $('#date-dialog').close();
  }

  render() {
    $('#today-label').textContent = fullDateFormat.format(new Date());
    const completed = this.tasks.filter(task => task.completed).length;
    const percent = this.tasks.length ? Math.round(completed / this.tasks.length * 100) : 0;
    $('#progress-number').innerHTML = `${percent}<span>%</span>`;
    $('#progress-bar').setAttribute('aria-valuenow', String(percent));
    $('#progress-bar span').style.transform = `scaleX(${percent / 100})`;
    $('#progress-caption').textContent = this.tasks.length ? `Готово ${completed} из ${this.tasks.length}. ${percent === 100 ? 'Время выдохнуть — ты справился!' : 'Каждый шаг считается.'}` : 'Начнём с чего-нибудь хорошего?';
    for (const view of Object.keys(viewTitles)) {
      const count = view === 'all' ? this.tasks.filter(task => !task.completed).length : selectTasks(this.tasks, { view, today: this.today }).length;
      $(`[data-count="${view}"]`).textContent = count;
      const button = $(`[data-view="${view}"]`);
      button.classList.toggle('active', view === this.view);
      if (view === this.view) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
    const visible = selectTasks(this.tasks, this.selection());
    $('#list-title').textContent = this.view === 'date' ? dateFormat.format(fromCalendarDate(this.filterDate)) : viewTitles[this.view];
    $('#list-count').textContent = visible.length;
    $('#list-hint').hidden = this.view === 'date';
    $('#clear-filter').hidden = this.view !== 'date';
    $('#task-list').replaceChildren(...visible.map(task => this.taskElement(task)));
    $('#empty-state').hidden = visible.length > 0;
    $('#empty-action').hidden = !this.ready;
    const empty = {
      all: ['Здесь начинается что-то хорошее', 'Добавь первое дело — пусть сегодня станет на одну маленькую победу больше.', 'Запланировать первое дело'],
      today: ['Сегодня можно не спешить', 'Пока нет задач на сегодня. Добавь одну небольшую — или позволь себе отдохнуть.', 'Добавить дело на сегодня'],
      upcoming: ['Впереди — место для хорошего', 'Здесь появятся задачи на будущие дни. Начни с небольшого плана на завтра.', 'Запланировать дело'],
      completed: ['Маленькие победы ещё впереди', 'Отметь выполненную задачу — и она появится здесь. Я буду тобой гордиться!', 'Перейти к своим задачам'],
      date: ['Этот день пока свободен', 'Хороший момент запланировать что-то важное. Или что-то приятное.', 'Добавить дело на этот день'],
    }[this.view];
    $('#empty-title').textContent = this.ready ? empty[0] : 'Твоим задачам нужно безопасное место';
    $('#empty-copy').textContent = this.ready ? empty[1] : 'Проверь сообщение о хранилище выше. Мы не будем менять сохранённые данные.';
    $('#empty-action').firstChild.textContent = `${empty[2]} `;
    this.calendar.set({ tasks: this.tasks, selected: this.view === 'date' ? this.filterDate : null });
  }

  taskElement(task) {
    const row = document.createElement('li');
    row.className = `task-row${task.completed ? ' is-completed' : ''}`;
    row.dataset.taskId = task.id;
    const toggle = document.createElement('button');
    toggle.type = 'button'; toggle.className = 'task-checkbox'; toggle.dataset.action = 'toggle'; toggle.dataset.id = task.id;
    toggle.setAttribute('aria-label', `${task.completed ? 'Вернуть в работу' : 'Выполнить'}: ${task.title}`);
    toggle.setAttribute('aria-pressed', String(task.completed));
    toggle.innerHTML = `<span class="checkbox-box">${svg('check')}</span>`;
    toggle.disabled = !this.ready;
    const content = document.createElement('div'); content.className = 'task-content';
    const title = document.createElement('p'); title.className = 'task-title'; title.textContent = task.title;
    content.append(title);
    const meta = document.createElement('span'); meta.className = 'task-meta';
    if (task.dueDate) {
      const date = document.createElement('time'); date.dateTime = task.dueDate;
      const overdue = !task.completed && task.dueDate < this.today;
      date.textContent = (task.dueDate === this.today ? 'Сегодня' : dateFormat.format(fromCalendarDate(task.dueDate))) + (overdue ? ' · просрочено' : '') + (task.completed ? ' · выполнено' : '');
      meta.classList.add(overdue ? 'due-overdue' : task.dueDate === this.today ? 'due-today' : 'due-upcoming');
      meta.innerHTML = svg('calendar'); meta.append(date);
    } else { meta.textContent = task.completed ? 'Выполнено · без даты' : 'Без даты · когда будет удобно'; }
    content.append(meta);
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'icon-button task-delete'; remove.dataset.action = 'delete'; remove.dataset.id = task.id;
    remove.setAttribute('aria-label', `Удалить: ${task.title}`); remove.innerHTML = svg('trash'); remove.disabled = !this.ready;
    row.append(toggle, content, remove);
    return row;
  }

  motivate(event) {
    $('#buddy-message').textContent = getMessage(event, this.tasks);
    const art = $('#buddy-art');
    art.classList.remove('celebrate');
    if (event !== 'welcome') requestAnimationFrame(() => { art.classList.add('celebrate'); });
  }

  showToast(message, undo = false, error = false) {
    clearTimeout(this.toastTimer);
    if (!undo) this.deletedTask = null;
    $('#toast-text').textContent = message;
    $('#undo-button').hidden = !undo;
    $('#toast').classList.toggle('is-error', error);
    $('#toast').hidden = false;
    this.scheduleToast();
  }

  scheduleToast() {
    clearTimeout(this.toastTimer);
    if (!this.toastCanExpire) return;
    this.toastTimer = setTimeout(() => this.hideToast(), 5000);
  }

  hideToast() {
    clearTimeout(this.toastTimer);
    if ($('#toast').contains(document.activeElement)) $('#task-title').focus({ preventScroll: true });
    $('#toast').hidden = true;
    this.deletedTask = null;
  }
}
