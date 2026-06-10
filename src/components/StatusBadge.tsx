import React from 'react';
import { getHealthStatusColor, getTaskStatusColor, getPriorityColor, getBatchStatusColor, getSeverityColor } from '../lib/utils';

interface Props {
  label: string;
  type?: 'health' | 'task' | 'priority' | 'batch' | 'severity' | 'custom';
  color?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ label, type = 'batch', color, size = 'sm' }: Props) {
  let colorClass = color ?? 'bg-gray-100 text-gray-600';

  if (!color) {
    switch (type) {
      case 'health': colorClass = getHealthStatusColor(label); break;
      case 'task': colorClass = getTaskStatusColor(label); break;
      case 'priority': colorClass = getPriorityColor(label); break;
      case 'batch': colorClass = getBatchStatusColor(label); break;
      case 'severity': colorClass = getSeverityColor(label); break;
    }
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${colorClass}`}>
      {label}
    </span>
  );
}
