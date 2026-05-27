'use client';

import { FormEvent, useState } from 'react';
import { TaskColumn } from '@/lib/types';
import { TASK_COLUMNS } from '@/lib/constants';

const ASSIGNEES = ['matias', 'friend', 'unassigned'] as const;

export function TaskForm({
  projectId,
  onCreated,
}: {
  projectId: number;
  onCreated?: () => Promise<void> | void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState<(typeof ASSIGNEES)[number]>('matias');
  const [column, setColumn] = useState<TaskColumn>('backlog');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmed,
          description: description.trim() || null,
          assignee: assignee === 'unassigned' ? null : assignee,
          column_name: column,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }

      setTitle('');
      setDescription('');
      setAssignee('matias');
      setColumn('backlog');
      if (onCreated) {
        await onCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="cyber-panel space-y-4 rounded-xl p-4 md:p-5">
      <h3 className="cyber-title text-sm">Create Task</h3>

      <label className="block">
        <span className="sr-only">Task title</span>
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={500}
          required
          aria-label="Task title"
          className="w-full rounded-lg border border-border bg-bg/80 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-link"
        />
      </label>

      <label className="block">
        <span className="sr-only">Task description</span>
        <textarea
          placeholder="Task description (optional)"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          aria-label="Task description"
          className="w-full rounded-lg border border-border bg-bg/80 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-link"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="sr-only">Assignee</span>
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value as (typeof ASSIGNEES)[number])}
            aria-label="Assignee"
            className="w-full rounded-lg border border-border bg-bg/80 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-link"
          >
            {ASSIGNEES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Column</span>
          <select
            value={column}
            onChange={(e) => setColumn(e.target.value as TaskColumn)}
            aria-label="Column"
            className="w-full rounded-lg border border-border bg-bg/80 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-link"
          >
            {TASK_COLUMNS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg border border-active/80 bg-active/15 px-3 py-2.5 text-sm font-semibold text-active transition hover:bg-active/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Add Task'}
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </div>
      ) : null}
    </form>
  );
}
