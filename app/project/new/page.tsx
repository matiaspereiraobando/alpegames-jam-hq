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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg text-zinc-100">Create New Jam Project</h1>
        <Link href="/" className="text-[10px] text-link">
          ← Back to Dashboard
        </Link>
      </div>

      <form action={createProject} className="space-y-4 rounded border border-border bg-card p-6">
        <Field label="Title" name="title" required />

        <div>
          <label className="mb-2 block text-[10px] text-zinc-400" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-[10px] text-zinc-200 outline-none focus:border-link"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-[10px] text-zinc-400" htmlFor="engine">
              Engine
            </label>
            <select
              id="engine"
              name="engine"
              defaultValue="Love2D"
              className="w-full rounded border border-border bg-bg px-3 py-2 text-[10px] text-zinc-200 outline-none focus:border-link"
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

        <div className="rounded border border-border bg-bg p-3 text-[10px] text-zinc-400">
          Creates default tasks: Set up project structure, Write GDD, Create art assets, Implement core
          mechanics, Add sound/music, Polish and test, Deploy.
        </div>

        <button
          type="submit"
          className="rounded border border-active bg-active/20 px-4 py-2 text-[10px] text-active transition hover:bg-active/30"
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
      <label className="mb-2 block text-[10px] text-zinc-400" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full rounded border border-border bg-bg px-3 py-2 text-[10px] text-zinc-200 outline-none focus:border-link"
      />
    </div>
  );
}
