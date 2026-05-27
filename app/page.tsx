import Link from 'next/link';
import { ProjectCard } from '@/components/ProjectCard';
import { listProjects } from '@/lib/db';
import { getProjectStatus } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const projects = listProjects();
  const statusCounts = projects.reduce(
    (acc, project) => {
      const computed = getProjectStatus(project);
      acc.total += 1;
      if (computed === 'active') acc.active += 1;
      if (computed === 'completed') acc.completed += 1;
      if (computed === 'upcoming') acc.upcoming += 1;
      return acc;
    },
    { total: 0, active: 0, completed: 0, upcoming: 0 }
  );

  return (
    <div className="space-y-7">
      <header className="cyber-panel relative overflow-hidden rounded-2xl p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-blue-500/5 to-purple-400/10" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="cyber-kicker">Operations Dashboard</p>
            <h1 className="text-3xl font-semibold leading-tight text-white md:text-4xl">Jam HQ</h1>
            <p className="max-w-2xl cyber-muted">
              Retro-cyber control room for Alpe Games jams. Track momentum, keep priorities visible, and ship on
              time.
            </p>
          </div>
          <Link href="/project/new" className="cyber-btn cyber-btn-primary px-5 py-3">
            + Create New Jam
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Projects" value={statusCounts.total} tone="text-zinc-100" />
        <StatCard label="Active" value={statusCounts.active} tone="text-active" />
        <StatCard label="Upcoming" value={statusCounts.upcoming} tone="text-link" />
        <StatCard label="Completed" value={statusCounts.completed} tone="text-completed" />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="cyber-title text-sm">Projects Registry</h2>
          <p className="text-sm text-zinc-400">{projects.length} tracked</p>
        </div>

        {projects.length === 0 ? (
          <div className="cyber-panel rounded-xl border-dashed p-8 text-center text-zinc-300">
            No jam projects yet. Create your first jam to initialize the board.
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

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <article className="cyber-panel rounded-xl bg-gradient-to-b from-card to-cardAlt/80 p-4">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-zinc-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${tone}`}>{value}</p>
    </article>
  );
}
