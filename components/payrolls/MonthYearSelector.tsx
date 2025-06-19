import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { getMonths, getYears } from './utils';

interface MonthYearSelectorProps {
  selectedYear: number;
  selectedMonth: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}

export function MonthYearSelector({
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
}: MonthYearSelectorProps) {
  return (
    <Card className="space-y-6">
      <div className="flex items-center space-x-2">
        <Select
          value={selectedMonth.toString()}
          onValueChange={(value) => onMonthChange(parseInt(value))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Выберите месяц" />
          </SelectTrigger>
          <SelectContent>
            {getMonths().map((month) => (
              <SelectItem key={month.value} value={month.value.toString()}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={selectedYear.toString()}
          onValueChange={(value) => onYearChange(parseInt(value))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Выберите год" />
          </SelectTrigger>
          <SelectContent>
            {getYears().map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}
