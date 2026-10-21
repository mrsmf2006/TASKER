import { TaskEvaluationResult, TaskNode } from '../engine/types';

export type ViewId = 'graph' | 'dashboard' | 'settings';
export type ThemeName = 'dark' | 'light';
export type DisplayStatus = 'locked' | 'ready' | 'in_progress' | 'completed';

const KIND: Record<string, string> = {
  person: 'Person',
  department: 'Department',
  project: 'Project',
  knowledge: 'Knowledge',
  resource: 'Resource',
};

export function kindLabel(slug: string, fallback: string) {
  return KIND[slug] ?? fallback;
}

export function formatSmart(value: number) {
  return value.toLocaleString('fa-IR', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });
}

export function displayStatus(task: TaskNode, blocked: boolean): DisplayStatus {
  if (task.status === 'completed') return 'completed';
  if (blocked) return 'locked';
  if (task.status === 'in_progress') return 'in_progress';
  return 'ready';
}

export function shownMetrics(task: TaskNode, evaluation: TaskEvaluationResult) {
  if (task.status === 'completed' && task.actualExecutionSnapshot) {
    return task.actualExecutionSnapshot;
  }
  return evaluation;
}

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  completed: 'done',
  in_progress: 'in progress',
  locked: 'locked',
  ready: 'ready',
};
