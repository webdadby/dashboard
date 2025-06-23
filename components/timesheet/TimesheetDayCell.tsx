'use client';

import React from 'react';
import { getStatusClass, getStatusLabel, getStatusSymbol, isWeekend, DayStatus } from './TimesheetUtils';

interface TimesheetDayCellProps {
  date: Date;
  status: DayStatus;
  isTerminated: boolean;
  onClick: () => void;
}

export const TimesheetDayCell: React.FC<TimesheetDayCellProps> = ({
  date,
  status,
  isTerminated,
  onClick
}) => {
  const statusClass = getStatusClass(status, date, isTerminated);
  const statusLabel = isTerminated 
    ? 'После увольнения' 
    : getStatusLabel(status, date) || (isWeekend(date) ? 'Выходной' : '');
  const statusSymbol = isTerminated ? 'X' : getStatusSymbol(status, date);
  
  return (
    <div
      className={`w-full h-full flex items-center justify-center p-0.5 border text-sm ${statusClass} ${
        !status && isWeekend(date) && !isTerminated ? 'text-muted-foreground/50' : ''
      }`}
      onClick={onClick}
      title={statusLabel}
    >
      {statusSymbol}
    </div>
  );
};
