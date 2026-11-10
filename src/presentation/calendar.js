import { localDate, fromCalendarDate } from '../domain/date.js';

const monthFormat = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' });
const fullFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const icon = '<svg class="icon" aria-hidden="true"><use href="#i-chevron"/></svg>';

/** Calendar is a UI adapter: domain dates are supplied through callbacks. */
export class Calendar {
  constructor(container, onSelect) {
    this.container = container;
    this.onSelect = onSelect;
    this.month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    this.selected = null;
    this.tasks = [];
    container.addEventListener('click', event => {
      const control = event.target.closest('button');
      if (!control) return;
      if (control.dataset.month) {
        this.moveMonth(Number(control.dataset.month));
        this.container.querySelector(`[data-month="${control.dataset.month}"]`)?.focus({ preventScroll: true });
      }
      if (control.dataset.date) this.onSelect(control.dataset.date);
    });
    container.addEventListener('keydown', event => this.onKeydown(event));
  }

  set({ tasks = this.tasks, selected = this.selected, month = this.month } = {}) {
    this.tasks = tasks;
    this.selected = selected;
    this.month = new Date(month.getFullYear(), month.getMonth(), 1);
    this.render();
  }

  moveMonth(step) {
    const next = new Date(this.month.getFullYear(), this.month.getMonth() + step, 1);
    if (next.getFullYear() < 1900 || next.getFullYear() > 9999) return;
    this.month = next;
    this.render();
  }

  render() {
    const today = localDate();
    const taskDates = new Set(this.tasks.filter(task => !task.completed).map(task => task.dueDate));
    const first = new Date(this.month);
    first.setDate(1 - (first.getDay() + 6) % 7);
    const focusedDate = this.selected && fromCalendarDate(this.selected).getMonth() === this.month.getMonth()
      && fromCalendarDate(this.selected).getFullYear() === this.month.getFullYear() ? this.selected
      : (new Date().getMonth() === this.month.getMonth() && new Date().getFullYear() === this.month.getFullYear() ? today : localDate(this.month));
    this.container.innerHTML = `<div class="calendar-month-bar"><h3 class="calendar-month-title">${monthFormat.format(this.month).replace(' г.', '')}</h3><div class="calendar-month-actions"><button type="button" class="icon-button" data-month="-1" aria-label="Предыдущий месяц" ${this.month.getFullYear() === 1900 && this.month.getMonth() === 0 ? 'disabled' : ''}>${icon}</button><button type="button" class="icon-button" data-month="1" aria-label="Следующий месяц" ${this.month.getFullYear() === 9999 && this.month.getMonth() === 11 ? 'disabled' : ''}>${icon}</button></div></div><div class="calendar-weekdays" aria-hidden="true">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(day => `<span>${day}</span>`).join('')}</div><div class="calendar-days" role="group" aria-label="Дни месяца"></div>`;
    const days = this.container.querySelector('.calendar-days');
    for (let index = 0; index < 42; index++) {
      const date = new Date(first);
      date.setDate(first.getDate() + index);
      const value = localDate(date);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'calendar-day';
      button.classList.toggle('outside', date.getMonth() !== this.month.getMonth());
      button.classList.toggle('is-today', value === today);
      button.classList.toggle('is-selected', value === this.selected);
      button.classList.toggle('has-tasks', taskDates.has(value));
      button.setAttribute('aria-label', fullFormat.format(date) + (taskDates.has(value) ? ', есть задачи' : ''));
      button.setAttribute('aria-pressed', String(value === this.selected));
      if (value === today) button.setAttribute('aria-current', 'date');
      button.dataset.date = value;
      button.tabIndex = value === focusedDate ? 0 : -1;
      button.textContent = date.getDate();
      if (date.getFullYear() < 1900 || date.getFullYear() > 9999) button.disabled = true;
      days.append(button);
    }
  }

  onKeydown(event) {
    const button = event.target.closest('[data-date]');
    if (!button) return;
    const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(event.key in offsets) && !['Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = fromCalendarDate(button.dataset.date);
    const weekday = (next.getDay() + 6) % 7;
    next.setDate(next.getDate() + (event.key === 'Home' ? -weekday : event.key === 'End' ? 6 - weekday : offsets[event.key]));
    if (next.getFullYear() < 1900 || next.getFullYear() > 9999) return;
    if (next.getMonth() !== this.month.getMonth() || next.getFullYear() !== this.month.getFullYear()) {
      this.month = new Date(next.getFullYear(), next.getMonth(), 1);
      this.render();
    }
    this.container.querySelectorAll('[data-date]').forEach(day => { day.tabIndex = -1; });
    const target = this.container.querySelector(`[data-date="${localDate(next)}"]`);
    if (target) { target.tabIndex = 0; target.focus({ preventScroll: true }); }
  }
}
