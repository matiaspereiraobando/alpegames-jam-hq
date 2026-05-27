'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
  DraggableProvided,
  DroppableProvided,
  DroppableStateSnapshot,
  DraggableStateSnapshot,
} from '@hello-pangea/dnd';
import { TASK_COLUMNS } from '@/lib/constants';
import { Task, TaskColumn } from '@/lib/types';
import { TaskForm } from './TaskForm';

const columnStyles: Record<TaskColumn, string> = {
  backlog: 'border-zinc-500/60 bg-zinc-900/35',
  todo: 'border-sky-400/50 bg-sky-500/10',
  in_progress: 'border-emerald-400/50 bg-emerald-500/10',
  done: 'border-fuchsia-400/55 bg-fuchsia-500/12',
};

const tagStyles: Record<TaskColumn, string> = {
  backlog: 'border-zinc-500/60 bg-zinc-700/35 text-zinc-200',
  todo: 'border-sky-400/70 bg-sky-500/20 text-sky-100',
  in_progress: 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100',
  done: 'border-fuchsia-400/70 bg-fuchsia-500/20 text-fuchsia-100',
};

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.column_name !== b.column_name) return a.column_name.localeCompare(b.column_name);
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.id - b.id;
  });
}

export function KanbanBoard({
  initialTasks,
  projectId,
}: {
  initialTasks: Task[];
  projectId: number;
}) {
  const [tasks, setTasks] = useState<Task[]>(() => sortTasks(initialTasks));
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const base: Record<TaskColumn, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const task of tasks) {
      base[task.column_name].push(task);
    }
    return base;
  }, [tasks]);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to reload tasks (${res.status})`);
      const data = (await res.json()) as Task[];
      setTasks(sortTasks(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reload tasks');
    }
  }, [projectId]);

  async function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const from = source.droppableId as TaskColumn;
    const to = destination.droppableId as TaskColumn;
    if (from === to && source.index === destination.index) return;

    const taskId = Number(draggableId);
    const snapshot = tasks;

    const next = [...tasks];
    const task = next.find((t) => t.id === taskId);
    if (!task) return;

    const moved: Task = { ...task, column_name: to };
    const others = next.filter((t) => t.id !== taskId);

    const fromCol = others.filter((t) => t.column_name === from);
    const toCol = others.filter((t) => t.column_name === to);
    const untouched = others.filter((t) => t.column_name !== from && t.column_name !== to);

    const clampedIndex = Math.min(destination.index, toCol.length);
    toCol.splice(clampedIndex, 0, moved);

    const repacked = [
      ...untouched,
      ...fromCol.map((t, i) => ({ ...t, sort_order: i })),
      ...toCol.map((t, i) => ({ ...t, sort_order: i })),
    ];

    setTasks(sortTasks(repacked));
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column_name: to, to_index: destination.index }),
      });
      if (!res.ok) throw new Error(`Move failed (${res.status})`);
      const data = (await res.json()) as { tasks: Task[] };
      setTasks(sortTasks(data.tasks));
    } catch (err) {
      setTasks(snapshot);
      setError(err instanceof Error ? err.message : 'Failed to move task');
    }
  }

  async function removeTask(id: number) {
    if (typeof window !== 'undefined' && !window.confirm('Delete this task?')) return;
    const snapshot = tasks;
    setTasks(tasks.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      await reload();
    } catch (err) {
      setTasks(snapshot);
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  }

  return (
    <div className="space-y-4">
      <TaskForm projectId={projectId} onCreated={reload} />

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </div>
      ) : null}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TASK_COLUMNS.map((column) => (
            <Droppable droppableId={column.key} key={column.key}>
              {(provided: DroppableProvided, dropSnap: DroppableStateSnapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[380px] rounded-xl border bg-gradient-to-b p-3 transition-all ${columnStyles[column.key]} ${
                    dropSnap.isDraggingOver ? 'ring-2 ring-link/70 shadow-glow' : ''
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between text-xs text-zinc-200">
                    <span className="font-mono uppercase tracking-[0.1em]">{column.label}</span>
                    <span className="cyber-chip px-2 py-0.5 text-zinc-300">
                      {grouped[column.key].length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {grouped[column.key].length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/60 px-2 py-5 text-center text-xs text-zinc-400">
                        Drop tasks here
                      </div>
                    ) : null}

                    {grouped[column.key].map((task, index) => (
                      <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                        {(dragProvided: DraggableProvided, dragSnap: DraggableStateSnapshot) => (
                          <article
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`rounded-lg border border-border bg-cardAlt/90 p-3 shadow-sm transition ${
                              dragSnap.isDragging ? 'ring-2 ring-link/70 shadow-glow' : 'hover:border-link/55'
                            }`}
                          >
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <h4 className="break-words text-sm font-medium text-zinc-100">{task.title}</h4>
                              <button
                                type="button"
                                onClick={() => removeTask(task.id)}
                                aria-label={`Delete task: ${task.title}`}
                                className="shrink-0 text-xs text-zinc-400 transition hover:text-red-300"
                              >
                                delete
                              </button>
                            </div>
                            {task.description ? (
                              <p className="mb-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-300">
                                {task.description}
                              </p>
                            ) : null}
                            <div className="flex items-center justify-between gap-2">
                              <span className="cyber-chip bg-bg/80 text-zinc-200">
                                {task.assignee || 'unassigned'}
                              </span>
                              <span className={`rounded-full border px-2.5 py-1 text-[11px] ${tagStyles[task.column_name]}`}>
                                {task.column_name}
                              </span>
                            </div>
                          </article>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
