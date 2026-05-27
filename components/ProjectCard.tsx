import Link from 'next/link';
import { Project } from '@/lib/types';
import { getProjectStatus } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';

export function ProjectCard({ project }: { project: Project }) {
  const computedStatus = getProjectStatus(project);

  return (
    <Link
      href={`/project/${project.id}`}
      className="block rounded border border-border bg-card p-4 transition hover:border-link"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm text-zinc-100">{project.title}</h3>
        <StatusBadge status={computedStatus} />
      </div>
      <p className="mb-3 line-clamp-2 text-[10px] text-zinc-400">
        {project.description || 'No description'}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
        <span>{project.engine}</span>
        <span>•</span>
        <span>{project.start_date || 'TBD'}</span>
        <span>→</span>
        <span>{project.end_date || 'TBD'}</span>
      </div>
    </Link>
  );
}
