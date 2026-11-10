export const mascotSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 170" fill="none">
  <ellipse cx="122" cy="154" rx="64" ry="7" fill="#ddd2ee"/>
  <g class="buddy-star" style="transform-origin:190px 50px"><path d="m194 28 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z" fill="#ba9bdc"/><path d="m40 75 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#c7b3e2"/><circle cx="181" cy="99" r="3" fill="#c9b6e1"/></g>
  <g class="buddy-body" style="transform-origin:120px 140px">
    <ellipse cx="83" cy="145" rx="15" ry="7" fill="#b19acd" transform="rotate(-11 83 145)"/>
    <ellipse cx="153" cy="145" rx="15" ry="7" fill="#b19acd" transform="rotate(11 153 145)"/>
    <path d="M65 102c-22-9-30 3-22 17 5 8 15 9 26-1" fill="#d6bde9" stroke="#bda1d5" stroke-width="1.5"/>
    <path d="M175 102c18-16 31-12 29 0-1 8-13 16-25 17" fill="#d6bde9" stroke="#bda1d5" stroke-width="1.5"/>
    <path d="M59 109c-1-27 12-56 34-63 19-7 35-7 52 1 24 11 36 33 38 58 3 31-26 44-62 44-39 0-62-12-62-40Z" fill="#dfc8ee" stroke="#bda1d5" stroke-width="1.5"/>
    <path d="M72 89c6-21 21-32 40-35" stroke="#efdef7" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="91" cy="113" rx="11" ry="6" fill="#eab5cc" opacity=".85"/><ellipse cx="150" cy="113" rx="11" ry="6" fill="#eab5cc" opacity=".85"/>
    <g class="buddy-eyes"><ellipse cx="101" cy="100" rx="4" ry="5.5" fill="#55406e"/><ellipse cx="141" cy="100" rx="4" ry="5.5" fill="#55406e"/><circle cx="102" cy="98" r="1.1" fill="white"/><circle cx="142" cy="98" r="1.1" fill="white"/></g>
    <path class="buddy-smile" d="M114 113q7 9 14 0" stroke="#715183" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M121 48q-5-15 3-25" stroke="#75915e" stroke-width="3" stroke-linecap="round"/>
    <path d="M122 34c-19 0-20-17-20-17 15-2 24 7 20 17Z" fill="#a7bf82" stroke="#829c67" stroke-width="1.5"/>
    <path d="M122 30c1-18 20-20 20-20 1 15-7 24-20 20Z" fill="#bed29c" stroke="#829c67" stroke-width="1.5"/>
    <path d="m116 88 1-1m24 0 1 1" stroke="#b491cb" stroke-width="2" stroke-linecap="round"/>
  </g>
</svg>`;

const messages = {
  empty: ['Добавь задачу — будь молодцом! Я буду рядом и порадуюсь каждому шагу.'],
  added: ['Отличный план! Первый шаг уже сделан. Теперь можно спокойно двигаться дальше.', 'Записали! Одной мыслью в голове меньше. Ты уже молодец.', 'Дело в списке, а я на твоей стороне. Давай понемногу!'],
  completed: ['Ура, получилось! Дай пять. Даже маленькая победа — всё равно победа!', 'Вот это ты молодец! Сделай вдох и порадуйся себе. Я уже радуюсь.', 'Ещё одно дело позади. Ты справляешься — я в тебя верил!'],
  reopened: ['Можно вернуться к делу. Планы меняются — и это совершенно нормально.'],
  deleted: ['Освободили место для важного. Отпускать лишнее — тоже полезный навык.', 'Минус одно дело. Не всё нужно доводить до конца — выбирай своё.'],
  restored: ['Задача снова с нами! Всё на месте, можно продолжать.'],
  welcome: ['Рад тебя видеть! Выбери одно небольшое дело. Остальное подождёт.', 'Не нужно успевать всё сразу. Давай начнём с маленького шага.'],
  allDone: ['Все дела сделаны! Ты большой молодец. Теперь самое время отдохнуть.'],
};

export function getMessage(event, tasks, random = Math.random) {
  if (event === 'deleted' && tasks.length === 0) return 'Убрали лишнее! Добавь новую задачу — будь молодцом. Или сначала немного отдохни.';
  if (event === 'welcome' && tasks.length === 0) event = 'empty';
  if ((event === 'completed' || event === 'welcome') && tasks.length && tasks.every(task => task.completed)) event = 'allDone';
  const options = messages[event] || messages.welcome;
  return options[Math.floor(random() * options.length)];
}
