import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProject, listTasks } from '@/lib/db';
import { getProjectStatus } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { KanbanBoard } from '@/components/KanbanBoard';

export const dynamic = 'force-dynamic';

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const project = getProject(id);
  if (!project) {
    notFound();
  }

  const tasks = listTasks(id);
  const status = getProjectStatus(project);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="cyber-kicker mb-2">Project Console</p>
          <h1 className="break-words text-3xl font-semibold text-white">{project.title}</h1>
        </div>
        <Link href="/" className="cyber-btn cyber-btn-ghost">
          ← Dashboard
        </Link>
      </div>

      <section className="cyber-panel rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="cyber-title text-sm">Project Info</h2>
          <StatusBadge status={status} />
        </div>
        <p className="mb-5 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300">
          {project.description || 'No description provided.'}
        </p>

        <div className="grid gap-3 md:grid-cols-3">
          <Info label="Engine" value={project.engine} />
          <Info label="Start" value={project.start_date || 'TBD'} />
          <Info label="End" value={project.end_date || 'TBD'} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="cyber-title text-sm">Task Board</h2>
        <KanbanBoard initialTasks={tasks} projectId={id} />
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-gradient-to-b from-cardAlt/95 to-card/85 p-4">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.11em] text-zinc-400">{label}</div>
      <div className="break-words text-sm text-zinc-100">{value}</div>
    </div>
  );
}
