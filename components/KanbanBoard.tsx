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
  backlog: 'border-zinc-600 bg-zinc-700/10',
  todo: 'border-link/60 bg-link/10',
  in_progress: 'border-active/60 bg-active/10',
  done: 'border-completed/60 bg-completed/10',
};

const tagStyles: Record<TaskColumn, string> = {
  backlog: 'bg-zinc-700 text-zinc-300',
  todo: 'bg-link/30 text-link',
  in_progress: 'bg-active/30 text-active',
  done: 'bg-completed/30 text-completed',
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
    // Each column is already ordered because `tasks` is pre-sorted.
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

    // --- Optimistic update: re-pack indexes in the affected columns ---
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
      // Roll back on failure
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
    <div className="space-y-3">
      <TaskForm projectId={projectId} onCreated={reload} />

      {error ? (
        <div
          role="alert"
          className="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-[10px] text-red-300"
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
                  className={`min-h-[360px] rounded border p-3 transition-colors ${columnStyles[column.key]} ${
                    dropSnap.isDraggingOver ? 'ring-1 ring-link/60' : ''
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between text-[10px] text-zinc-300">
                    <span>{column.label}</span>
                    <span className="text-zinc-500">{grouped[column.key].length}</span>
                  </div>

                  <div className="space-y-3">
                    {grouped[column.key].length === 0 ? (
                      <div className="rounded border border-dashed border-border/60 px-2 py-4 text-center text-[9px] text-zinc-600">
                        drop tasks here
                      </div>
                    ) : null}

                    {grouped[column.key].map((task, index) => (
                      <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                        {(dragProvided: DraggableProvided, dragSnap: DraggableStateSnapshot) => (
                          <article
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`rounded border border-border bg-card p-3 ${
                              dragSnap.isDragging ? 'shadow-lg ring-1 ring-link/60' : ''
                            }`}
                          >
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <h4 className="break-words text-[10px] text-zinc-100">{task.title}</h4>
                              <button
                                type="button"
                                onClick={() => removeTask(task.id)}
                                aria-label={`Delete task: ${task.title}`}
                                className="shrink-0 text-[9px] text-zinc-500 hover:text-red-400"
                              >
                                delete
                              </button>
                            </div>
                            {task.description ? (
                              <p className="mb-2 whitespace-pre-wrap break-words text-[9px] leading-relaxed text-zinc-400">
                                {task.description}
                              </p>
                            ) : null}
                            <div className="flex items-center justify-between gap-2">
                              <span className="rounded border border-border bg-zinc-700/30 px-2 py-1 text-[8px] text-zinc-300">
                                {task.assignee || 'unassigned'}
                              </span>
                              <span
                                className={`rounded px-2 py-1 text-[8px] ${tagStyles[task.column_name]}`}
                              >
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
