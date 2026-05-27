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
        <h1 className="break-words text-lg text-zinc-100">{project.title}</h1>
        <Link
          href="/"
          className="rounded border border-border bg-card px-3 py-1 text-[10px] text-link hover:border-link"
        >
          ← Dashboard
        </Link>
      </div>

      <section className="rounded border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm text-zinc-200">Project Info</h2>
          <StatusBadge status={status} />
        </div>
        <p className="mb-4 whitespace-pre-wrap break-words text-[10px] leading-relaxed text-zinc-400">
          {project.description || 'No description provided.'}
        </p>

        <div className="grid gap-3 text-[10px] text-zinc-300 md:grid-cols-3">
          <Info label="Engine" value={project.engine} />
          <Info label="Start" value={project.start_date || 'TBD'} />
          <Info label="End" value={project.end_date || 'TBD'} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm text-zinc-200">Task Board</h2>
        <KanbanBoard initialTasks={tasks} projectId={id} />
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-bg p-3">
      <div className="mb-1 text-[9px] text-zinc-500">{label}</div>
      <div className="break-words text-[10px] text-zinc-200">{value}</div>
    </div>
  );
}
