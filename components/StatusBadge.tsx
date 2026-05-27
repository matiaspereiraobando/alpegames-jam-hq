import { Project } from '@/lib/types';
import { statusBadgeClass } from '@/lib/utils';

export function StatusBadge({ status }: { status: Project['status'] }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${statusBadgeClass(
        status,
      )}`}
    >
      {status}
    </span>
  );
}
