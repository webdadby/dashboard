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
      <Table className="border">
        <TableHeader className="bg-muted/30">
          <TableRow className="border-b-2 border-primary/20 hover:bg-transparent">
            <TableHead className="border-r">ФИО</TableHead>
            <TableHead className="border-r">Норма раб. времени</TableHead>
            <TableHead className="border-r">Отраб</TableHead>
            <TableHead className="border-r">Оклад</TableHead>
            <TableHead className="border-r">Начислено по окладу</TableHead>
            <TableHead className="border-r">Премия</TableHead>
            <TableHead className="border-r">Доплата</TableHead>
            <TableHead className="border-r font-bold">ВСЕГО НАЧИС</TableHead>
            <TableHead className="border-r">Подоходный</TableHead>
            <TableHead className="border-r">Пенсионный</TableHead>
            <TableHead className="border-r">Аванс</TableHead>
            <TableHead className="border-r">Пр. удерж</TableHead>
            <TableHead className="border-r font-bold">ВСЕГО УДЕРЖАНО</TableHead>
            <TableHead className="border-r font-bold">К ВЫДАЧЕ</TableHead>
            <TableHead className="border-r font-bold">К ВЫДАЧЕ БЕЗ АВАНСА</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...employees]
            .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
            .map((employee) => {
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
