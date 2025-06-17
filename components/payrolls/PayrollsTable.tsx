import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PayrollsTableProps } from './types';
import { PayrollRow } from './PayrollRow';

export function PayrollsTable({
  employees,
  payrolls,
  workNorm,
  minSalary,
  incomeTaxRate,
  onEditPayroll,
}: PayrollsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ФИО</TableHead>
            <TableHead>Норма раб. времени</TableHead>
            <TableHead>Отраб</TableHead>
            <TableHead>Оклад</TableHead>
            <TableHead>Начислено по окладу</TableHead>
            <TableHead>Премия</TableHead>
            <TableHead>Доплата</TableHead>
            <TableHead>ВСЕГО НАЧИС</TableHead>
            <TableHead>Подоходный</TableHead>
            <TableHead>Пенсионный</TableHead>
            <TableHead>Аванс</TableHead>
            <TableHead>Пр. удерж</TableHead>
            <TableHead>ВСЕГО УДЕРЖАНО</TableHead>
            <TableHead>К ВЫДАЧЕ</TableHead>
            <TableHead>К ВЫДАЧЕ БЕЗ АВАНСА</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => {
            const payroll = payrolls.find(p => p.employee_id === employee.id);
            
            return (
              <PayrollRow
                key={employee.id}
                employee={employee}
                payroll={payroll}
                workNorm={workNorm}
                minSalary={minSalary}
                incomeTaxRate={incomeTaxRate}
                onEdit={onEditPayroll}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
