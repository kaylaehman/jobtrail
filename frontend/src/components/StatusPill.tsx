import clsx from 'clsx';
import { STATUS_COLOR, STATUS_LABEL } from '../lib/format';
import type { JobStatus } from '../api/types';

export function StatusPill({ status }: { status: JobStatus }) {
  return (
    <span className={clsx('pill', STATUS_COLOR[status])} title={STATUS_LABEL[status]}>
      {STATUS_LABEL[status]}
    </span>
  );
}
