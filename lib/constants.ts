import { TaskColumn } from './types';

export const TASK_COLUMNS: Array<{ key: TaskColumn; label: string }> = [
  { key: 'backlog', label: 'BACKLOG' },
  { key: 'todo', label: 'TODO' },
  { key: 'in_progress', label: 'IN PROGRESS' },
  { key: 'done', label: 'DONE' },
];

export const DEFAULT_TASK_TEMPLATES = [
  'Set up project structure',
  'Write GDD',
  'Create art assets',
  'Implement core mechanics',
  'Add sound/music',
  'Polish and test',
  'Deploy',
];

export const ENGINES = ['Love2D', 'PICO-8', 'Godot', 'GDevelop', 'Other'];
