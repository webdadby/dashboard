'use client';

import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Employee, isAfterTermination } from './TimesheetUtils';
import { TimesheetDayCell } from './TimesheetDayCell';
import { isSameDay } from 'date-fns';

interface TimesheetEmployeeRowProps {
  employee: Employee;
  daysInMonth: Date[];
  toggleDayStatus: (employeeId: number, date: Date, disabled?: boolean) => void;
  calculateTotals: (employee: Employee) => { workingDays: number; workingHours: number };
}

export const TimesheetEmployeeRow: React.FC<TimesheetEmployeeRowProps> = ({
  employee,
  daysInMonth,
  toggleDayStatus,
  calculateTotals
}) => {
  const { workingDays, workingHours } = calculateTotals(employee);

  return (
    <TableRow key={employee.id} className="h-8">
      <TableCell className="font-medium p-1.5">
        <div className="leading-tight">
          <div className="text-sm">{employee.name}</div>
          <div className="text-xs text-muted-foreground">
            {employee.position}
          </div>
        </div>
      </TableCell>
      
      {daysInMonth.map((date) => {
        const dayStatus = employee.days.find((d) => isSameDay(d.date, date))?.status || null;
        const isTerminated = !!(employee.termination_date && isAfterTermination(date, employee.termination_date));
        
        return (
          <TableCell
            key={date.toString()}
            className={`text-center p-0 ${
              isTerminated ? '' : 'cursor-pointer hover:bg-muted/50'
            }`}
          >
            <TimesheetDayCell
              date={date}
              status={dayStatus}
              isTerminated={isTerminated}
              onClick={() => toggleDayStatus(employee.id, date, isTerminated)}
            />
          </TableCell>
        );
      })}
      
      {/* Totals columns */}
      <TableCell className="text-center font-medium border-l-2 p-1.5">
        <div className="text-sm">{workingDays}</div>
      </TableCell>
      <TableCell className="text-center font-medium p-1.5">
        <div className="text-sm">{workingHours}</div>
      </TableCell>
    </TableRow>
  );
};
