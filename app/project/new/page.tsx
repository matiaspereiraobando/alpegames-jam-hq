import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createProjectWithDefaultTasks } from '@/lib/db';
import { ENGINES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default function NewProjectPage() {
  async function createProject(formData: FormData) {
    'use server';

    const title = String(formData.get('title') ?? '').trim();
    if (!title) {
      throw new Error('Title is required');
    }

    const project = createProjectWithDefaultTasks({
      title,
      description: String(formData.get('description') ?? '').trim() || undefined,
      engine: String(formData.get('engine') ?? 'Love2D'),
      start_date: String(formData.get('start_date') ?? '').trim() || undefined,
      end_date: String(formData.get('end_date') ?? '').trim() || undefined,
    });

    redirect(`/project/${project.id}`);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="cyber-title mb-2 text-xs text-zinc-400">New Project</p>
          <h1 className="text-3xl font-semibold text-white">Create Jam Project</h1>
        </div>
        <Link href="/" className="rounded-lg border border-border bg-cardAlt/70 px-4 py-2 text-sm text-link">
          ← Back to Dashboard
        </Link>
      </div>

      <form action={createProject} className="cyber-panel space-y-5 rounded-2xl p-6 md:p-8">
        <Field label="Title" name="title" required />

        <div>
          <label className="mb-2 block text-sm text-zinc-300" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            className="w-full rounded-lg border border-border bg-bg/80 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-link"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm text-zinc-300" htmlFor="engine">
              Engine
            </label>
            <select
              id="engine"
              name="engine"
              defaultValue="Love2D"
              className="w-full rounded-lg border border-border bg-bg/80 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-link"
            >
              {ENGINES.map((engine) => (
                <option key={engine} value={engine}>
                  {engine}
                </option>
              ))}
            </select>
          </div>

          <Field label="Start Date" name="start_date" type="date" />
          <Field label="End Date" name="end_date" type="date" />
        </div>

        <div className="rounded-xl border border-border bg-cardAlt/70 p-4 text-sm text-zinc-300">
          Default tasks will be created automatically: set up project structure, GDD, art, core mechanics,
          sound/music, polish/testing, deploy.
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg border border-active/80 bg-active/15 px-5 py-3 text-sm font-semibold text-active transition hover:bg-active/25 focus-visible:ring-2 focus-visible:ring-active/70"
        >
          Create Project
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-zinc-300" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-border bg-bg/80 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-link"
      />
    </div>
  );
}
