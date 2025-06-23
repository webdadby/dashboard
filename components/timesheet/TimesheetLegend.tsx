'use client';

import React from 'react';
import { statusConfig } from './TimesheetUtils';

export const TimesheetLegend: React.FC = () => {
  return (
    <div className="flex items-center gap-4 mt-4 flex-wrap">
      {Object.entries(statusConfig).map(([status, { text, label, class: className }]) => (
        <div key={status} className="flex items-center">
          <div className={`w-3 h-3 rounded-sm border mr-2 ${className.split(' ')[0]} ${className.split(' ')[1] || ''}`} />
          <span className="text-muted-foreground text-sm">{text} - {label}</span>
        </div>
      ))}
    </div>
  );
};
