import Link from 'next/link';
import { Project } from '@/lib/types';
import { getProjectStatus } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';

export function ProjectCard({ project }: { project: Project }) {
  const computedStatus = getProjectStatus(project);

  return (
    <Link
      href={`/project/${project.id}`}
      className="cyber-panel block rounded-xl bg-gradient-to-b from-card to-cardAlt/80 p-5 transition hover:-translate-y-0.5 hover:border-link/80 hover:shadow-glow"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-zinc-100">{project.title}</h3>
        <StatusBadge status={computedStatus} />
      </div>

      <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-zinc-300">
        {project.description || 'No description provided yet.'}
      </p>

      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        <span className="cyber-chip">{project.engine}</span>
        <span>•</span>
        <span>{project.start_date || 'TBD'}</span>
        <span>→</span>
        <span>{project.end_date || 'TBD'}</span>
      </div>
    </Link>
  );
}
