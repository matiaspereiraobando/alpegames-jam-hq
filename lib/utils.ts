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
      return 'bg-active/20 text-active border-active/50';
    case 'completed':
      return 'bg-completed/20 text-completed border-completed/50';
    case 'upcoming':
      return 'bg-link/20 text-link border-link/50';
    default:
      return 'bg-zinc-700/40 text-zinc-300 border-zinc-500';
  }
}
