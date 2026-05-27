import { Project } from '@/lib/types';
import { statusBadgeClass } from '@/lib/utils';

export function StatusBadge({ status }: { status: Project['status'] }) {
  return (
    <span className={`inline-flex rounded border px-2 py-1 text-[10px] ${statusBadgeClass(status)}`}>
      {status.toUpperCase()}
    </span>
  );
}
