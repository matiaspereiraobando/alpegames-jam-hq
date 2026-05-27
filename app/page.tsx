import Link from 'next/link';
import { ProjectCard } from '@/components/ProjectCard';
import { listProjects } from '@/lib/db';
import { getProjectStatus } from '@/lib/utils';

export default function DashboardPage() {
  const projects = listProjects();
  const statusCounts = projects.reduce(
    (acc, project) => {
      const computed = getProjectStatus(project);
      acc.total += 1;
      if (computed === 'active') acc.active += 1;
      if (computed === 'completed') acc.completed += 1;
      return acc;
    },
    { total: 0, active: 0, completed: 0 }
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded border border-border bg-card p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-xl text-zinc-100">Jam HQ</h1>
          <p className="text-[10px] text-zinc-400">Central command for Alpe Games jam projects.</p>
        </div>
        <Link
          href="/project/new"
          className="inline-flex items-center rounded border border-active bg-active/20 px-4 py-2 text-[10px] text-active transition hover:bg-active/30"
        >
          + Create New Jam
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="TOTAL JAMS" value={statusCounts.total} color="text-zinc-200" />
        <StatCard label="ACTIVE" value={statusCounts.active} color="text-active" />
        <StatCard label="COMPLETED" value={statusCounts.completed} color="text-completed" />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm text-zinc-200">All Projects</h2>
        {projects.length === 0 ? (
          <div className="rounded border border-dashed border-border bg-card p-6 text-[10px] text-zinc-400">
            No jam projects yet. Create one to get started.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded border border-border bg-card p-4">
      <p className="mb-2 text-[10px] text-zinc-500">{label}</p>
      <p className={`text-lg ${color}`}>{value}</p>
    </div>
  );
}
