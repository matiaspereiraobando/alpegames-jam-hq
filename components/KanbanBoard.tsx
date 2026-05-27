'use client';

import { useMemo, useState } from 'react';
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
  DraggableProvided,
  DroppableProvided,
} from '@hello-pangea/dnd';
import { TASK_COLUMNS } from '@/lib/constants';
import { Task, TaskColumn } from '@/lib/types';

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

export function KanbanBoard({
  initialTasks,
  projectId,
}: {
  initialTasks: Task[];
  projectId: number;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

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

  async function reload() {
    const res = await fetch(`/api/projects/${projectId}/tasks`);
    const data = (await res.json()) as Task[];
    setTasks(data);
  }

  async function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const from = source.droppableId as TaskColumn;
    const to = destination.droppableId as TaskColumn;
    if (from === to && source.index === destination.index) return;

    const next = [...tasks];
    const task = next.find((t) => t.id === Number(draggableId));
    if (!task) return;
    task.column_name = to;
    task.sort_order = destination.index;
    setTasks(next);

    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_name: to, sort_order: destination.index }),
    });

    await reload();
  }

  async function removeTask(id: number) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    await reload();
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid gap-4 xl:grid-cols-4">
        {TASK_COLUMNS.map((column) => (
          <Droppable droppableId={column.key} key={column.key}>
            {(provided: DroppableProvided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[360px] rounded border p-3 ${columnStyles[column.key]}`}
              >
                <div className="mb-3 text-[10px] text-zinc-300">{column.label}</div>

                <div className="space-y-3">
                  {grouped[column.key].map((task, index) => (
                    <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                      {(dragProvided: DraggableProvided) => (
                        <article
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className="rounded border border-border bg-card p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <h4 className="text-[10px] text-zinc-100">{task.title}</h4>
                            <button
                              type="button"
                              onClick={() => removeTask(task.id)}
                              className="text-[9px] text-zinc-500 hover:text-red-400"
                            >
                              delete
                            </button>
                          </div>
                          {task.description ? (
                            <p className="mb-2 text-[9px] text-zinc-400">{task.description}</p>
                          ) : null}
                          <div className="flex items-center justify-between">
                            <span className="rounded border border-border bg-zinc-700/30 px-2 py-1 text-[8px] text-zinc-300">
                              {task.assignee || 'unassigned'}
                            </span>
                            <span className={`rounded px-2 py-1 text-[8px] ${tagStyles[task.column_name]}`}>
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
  );
}
