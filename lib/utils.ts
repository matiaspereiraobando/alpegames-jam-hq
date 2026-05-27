import { Project } from './types';

export function getProjectStatus(project: Project): Project['status'] {
  if (project.status === 'archived') {
    return 'archived';
  }

  const now = new Date();
  const start = project.start_date ? new Date(project.start_date) : null;
  const end = project.end_date ? new Date(project.end_date) : null;

  if (start && now < start) return 'upcoming';
  if (end && now > end) return 'completed';
  return 'active';
}

export function statusBadgeClass(status: Project['status']): string {
  switch (status) {
    case 'active':
      return 'border-emerald-400/60 bg-emerald-400/15 text-emerald-300';
    case 'completed':
      return 'border-fuchsia-400/60 bg-fuchsia-400/15 text-fuchsia-200';
    case 'upcoming':
      return 'border-sky-400/60 bg-sky-400/15 text-sky-200';
    default:
      return 'border-zinc-500/70 bg-zinc-700/40 text-zinc-200';
  }
}
