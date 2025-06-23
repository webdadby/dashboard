'use client';

import React from 'react';
import { TableBody } from '@/components/ui/table';
import { Employee } from './TimesheetUtils';
import { TimesheetEmployeeRow } from './TimesheetEmployeeRow';

interface TimesheetBodyProps {
  employees: Employee[];
  daysInMonth: Date[];
  toggleDayStatus: (employeeId: number, date: Date, disabled?: boolean) => void;
  calculateTotals: (employee: Employee) => { workingDays: number; workingHours: number };
}

export const TimesheetBody: React.FC<TimesheetBodyProps> = ({
  employees,
  daysInMonth,
  toggleDayStatus,
  calculateTotals
}) => {
  return (
    <TableBody>
      {employees.map((employee) => (
        <TimesheetEmployeeRow
          key={employee.id}
          employee={employee}
          daysInMonth={daysInMonth}
          toggleDayStatus={toggleDayStatus}
          calculateTotals={calculateTotals}
        />
      ))}
    </TableBody>
  );
};
