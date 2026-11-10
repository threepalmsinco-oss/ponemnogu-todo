/**
 * @typedef {Object} TaskRepository
 * @property {() => Array<import('./task.js').Task>} load Read persisted tasks, or throw.
 * @property {(tasks: Array) => void} save Persist atomically, or throw without changing previous data.
 *
 * The domain owns this port. Storage, DOM and networking are external adapters.
 */
export {};
