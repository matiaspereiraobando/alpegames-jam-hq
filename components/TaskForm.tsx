'use client';

import { FormEvent, useState } from 'react';
import { TaskColumn } from '@/lib/types';
import { TASK_COLUMNS } from '@/lib/constants';

export function TaskForm({
  projectId,
  onCreated,
}: {
  projectId: number;
  onCreated?: () => Promise<void> | void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('matias');
  const [column, setColumn] = useState<TaskColumn>('backlog');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          assignee,
          column_name: column,
        }),
      });
      setTitle('');
      setDescription('');
      setAssignee('matias');
      setColumn('backlog');
      if (onCreated) {
        await onCreated();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded border border-border bg-card p-4">
      <h3 className="text-sm text-zinc-200">Create Task</h3>

      <input
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded border border-border bg-bg px-3 py-2 text-[10px] text-zinc-200 outline-none focus:border-link"
      />

      <textarea
        placeholder="Task description"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded border border-border bg-bg px-3 py-2 text-[10px] text-zinc-200 outline-none focus:border-link"
      />

      <div className="grid gap-3 md:grid-cols-3">
        <select
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="rounded border border-border bg-bg px-3 py-2 text-[10px] text-zinc-200 outline-none focus:border-link"
        >
          <option value="matias">matias</option>
          <option value="friend">friend</option>
        </select>

        <select
          value={column}
          onChange={(e) => setColumn(e.target.value as TaskColumn)}
          className="rounded border border-border bg-bg px-3 py-2 text-[10px] text-zinc-200 outline-none focus:border-link"
        >
          {TASK_COLUMNS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={loading}
          className="rounded border border-active bg-active/20 px-3 py-2 text-[10px] text-active transition hover:bg-active/30 disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Add Task'}
        </button>
      </div>
    </form>
  );
}
