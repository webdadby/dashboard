'use client';

import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TimesheetTableHeaderProps {
  daysInMonth: Date[];
}

export const TimesheetTableHeader: React.FC<TimesheetTableHeaderProps> = ({
  daysInMonth
}) => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-64">Сотрудник</TableHead>
        {daysInMonth.map((day) => (
          <TableHead key={day.toString()} className="text-center p-0">
            <div className="flex flex-col items-center justify-center p-0.5">
              <div className="text-xs font-medium">
                {format(day, 'd', { locale: ru })}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {format(day, 'EE', { locale: ru }).charAt(0).toUpperCase()}
              </div>
            </div>
          </TableHead>
        ))}
        <TableHead className="text-center font-medium p-1.5 text-sm">Дней</TableHead>
        <TableHead className="text-center font-medium p-1.5 text-sm">Часов</TableHead>
      </TableRow>
    </TableHeader>
  );
};
