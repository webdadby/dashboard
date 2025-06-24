'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, parseISO, isBefore } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { Employee, Payroll, WorkNorm } from '@/lib/supabase/types';
import { employeesApi } from '@/lib/supabase/employees';
import { payrollsApi } from '@/lib/supabase/payrolls';
import { workNormsApi } from '@/lib/supabase/workNorms';
import { settingsApi } from '@/lib/supabase/settings';
import { vacationsApi } from '@/lib/supabase/vacations';

import { PayrollsTable } from './PayrollsTable';
import { EditWorkNormDialog } from './EditWorkNormDialog';
import { PayrollDialog } from './PayrollDialog';
import { MonthYearSelector } from './MonthYearSelector';
import { formatCurrency, roundToTwoDecimals } from './utils';

export function PayrollsContent() {
  // State for selected month/year
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  // Data loading states
  const [isLoading, setIsLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [workNorm, setWorkNorm] = useState<WorkNorm | null>(null);
  const [minSalary, setMinSalary] = useState(0);
  const [incomeTaxRate, setIncomeTaxRate] = useState(13);
  const [fsznRate, setFsznRate] = useState(34);
  const [insuranceRate, setInsuranceRate] = useState(0.6);
  const [benefitAmount, setBenefitAmount] = useState(0);
  const [taxDeduction, setTaxDeduction] = useState(0);
  
  // UI state
  const [showRemoteEmployees, setShowRemoteEmployees] = useState(false);
  const [isEditWorkNormOpen, setIsEditWorkNormOpen] = useState(false);
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | undefined>();

  // Filter employees based on remote status
  const filteredEmployees = employees.filter(employee => 
    showRemoteEmployees ? true : !employee.is_remote
  );

  // Fetch all necessary data when month/year changes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch employees
        console.log('Fetching employees...');
        const employeesData = await employeesApi.getAll();
        console.log('Employees fetched successfully:', employeesData.length);
        setEmployees(employeesData);
      } catch (error) {
        console.error('Error fetching employees:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error('Ошибка при загрузке сотрудников');
        setIsLoading(false);
        return; // Stop execution if employees fetch fails
      }
      
      try {
        // Fetch payrolls for selected month/year
        console.log(`Fetching payrolls for ${selectedYear}/${selectedMonth}...`);
        const payrollsData = await payrollsApi.getByYearMonth(selectedYear, selectedMonth);
        console.log('Payrolls fetched successfully:', payrollsData.length);
        setPayrolls(payrollsData);
      } catch (error) {
        console.error(`Error fetching payrolls for ${selectedYear}/${selectedMonth}:`, error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error('Ошибка при загрузке начислений');
        setIsLoading(false);
        return; // Stop execution if payrolls fetch fails
      }
      
      try {
        // Fetch work norm for selected month/year
        console.log(`Fetching work norm for ${selectedYear}/${selectedMonth}...`);
        let workNormData = await workNormsApi.getByYearMonth(selectedYear, selectedMonth);
        
        // If no work norm exists for this month, create a default one
        if (!workNormData) {
          console.log('No work norm found, creating default...');
          try {
            workNormData = await workNormsApi.upsert({
              year: selectedYear,
              month: selectedMonth,
              norm_hours: 168, // Default to 40 hours/week * 4.2 weeks
              working_days: 20, // Default working days in a month
              holiday_days: 0,  // Default to no holidays
            });
            console.log('Default work norm created:', workNormData);
          } catch (error) {
            console.error('Error creating default work norm:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            toast.error('Ошибка при создании нормы рабочего времени');
          }
        } else {
          console.log('Work norm found:', workNormData);
        }
        
        setWorkNorm(workNormData);
      } catch (error) {
        console.error(`Error fetching work norm for ${selectedYear}/${selectedMonth}:`, error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error('Ошибка при загрузке нормы рабочего времени');
        setIsLoading(false);
        return; // Stop execution if work norm fetch fails
      }
      
      try {
        // Fetch settings
        console.log('Fetching settings...');
        const settings = await settingsApi.get();
        console.log('Settings fetched successfully:', settings);
        setMinSalary(settings.min_salary || 0);
        setIncomeTaxRate(settings.income_tax || 13);
        setFsznRate(settings.fszn_rate || 34);
        setInsuranceRate(settings.insurance_rate || 0.6);
        setBenefitAmount(settings.benefit_amount || 0);
        setTaxDeduction(settings.tax_deduction || 0);
      } catch (error) {
        console.error('Error fetching settings:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error('Ошибка при загрузке настроек');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedYear, selectedMonth]);

  // Handle saving work norm
  const handleSaveWorkNorm = async (normHours: number): Promise<void> => {
    try {
      const updatedWorkNorm = await workNormsApi.upsert({
        year: selectedYear,
        month: selectedMonth,
        norm_hours: normHours,
        working_days: 20, // Default working days in a month
        holiday_days: 0,  // Default to no holidays
      });
      
      setWorkNorm(updatedWorkNorm);
      toast.success('Норма рабочего времени сохранена');
    } catch (error) {
      console.error('Error saving work norm:', error);
      toast.error('Ошибка при сохранении нормы рабочего времени');
      throw error; // Re-throw to let the dialog handle the error
    }
  };

  // Calculate vacation pay for an employee
  const calculateVacationPay = async (employeeId: number, year: number, month: number) => {
    try {
      // Get all approved vacations for the employee
      const allVacations = await vacationsApi.getAllRequests();
      
      // Filter for this employee and approved status
      const filteredVacations = allVacations.filter((v: { employee_id: number; status: string }) => 
        v.employee_id === employeeId && v.status === 'approved'
      );
      
      console.log(`Found ${filteredVacations.length} approved vacations for employee ${employeeId}`);
      
      // Get salary payment day from settings
      const settings = await settingsApi.get();
      const salaryPaymentDay = settings.salary_payment_date || 5; // Default to 5th if not set
      
      let currentMonthPay = 0;
      let nextMonthPay = 0;
      
      // Process each vacation
      for (const vacation of filteredVacations) {
        try {
          const vacationStart = parseISO(vacation.start_date);
          const vacationMonth = vacationStart.getMonth() + 1; // 1-12
          const vacationYear = vacationStart.getFullYear();
          
          // Check if vacation is in the current month we're processing
          if (vacationMonth === month && vacationYear === year) {
            // Check if vacation starts before salary payment day
            const paymentDate = new Date(year, month - 1, salaryPaymentDay);
            
            if (isBefore(vacationStart, paymentDate) || 
                vacationStart.toDateString() === paymentDate.toDateString()) {
              // Add to next month's pay (current month in payroll)
              nextMonthPay += vacation.payment_amount || 0;
            } else {
              // Add to current month's pay
              currentMonthPay += vacation.payment_amount || 0;
            }
            
            console.log(`Vacation from ${vacation.start_date} to ${vacation.end_date}: ` +
              `amount=${vacation.payment_amount}, ` +
              `currentMonth=${currentMonthPay}, nextMonth=${nextMonthPay}`);
          }
        } catch (error) {
          console.error('Error processing vacation:', error);
        }
      }
      
      return { currentMonth: currentMonthPay, nextMonth: nextMonthPay };
    } catch (error) {
      console.error('Error calculating vacation pay:', error);
      return { currentMonth: 0, nextMonth: 0 };
    }
  };

  // Handle saving payroll
  const handleSavePayroll = async (payrollData: any) => {
    if (!selectedEmployee) return;
    
    try {
      setIsLoading(true);
      
      // Get vacation pay for the employee
      const { currentMonth, nextMonth } = await calculateVacationPay(
        selectedEmployee.id,
        selectedYear,
        selectedMonth
      );
      
      // Сохраняем все данные, переданные из диалога
      // Все расчеты уже выполнены в диалоге и переданы в payrollData
      const payrollToSave = {
        ...payrollData,
        employee_id: selectedEmployee.id,
        year: selectedYear,
        month: selectedMonth,
        vacation_pay_current: currentMonth,
        vacation_pay_next: nextMonth,
      };
      
      // Проверяем, что все необходимые поля присутствуют
      console.log('Saving payroll data:', payrollToSave);
      
      // Убедимся, что все числовые поля округлены до 2 знаков после запятой
      const numericFields = [
        'worked_hours', 'salary', 'salary_accrued', 'bonus', 'extra_pay', 
        'income_tax', 'pension_tax', 'advance_payment', 'other_deductions',
        'total_accrued', 'total_deductions', 'total_payable', 'payable_without_salary',
        'fszn_tax', 'insurance_tax', 'total_employee_cost'
      ];
      
      numericFields.forEach(field => {
        if (payrollToSave[field] !== undefined) {
          payrollToSave[field] = roundToTwoDecimals(Number(payrollToSave[field]));
        }
      });

      // Save or update payroll
      const savedPayroll = await payrollsApi.upsert(payrollToSave);
      
      // Используем сохраненные данные
      const enhancedPayroll = {
        ...savedPayroll
      };
      
      // Update local state
      setPayrolls(prev => {
        const existingIndex = prev.findIndex(p => p.employee_id === selectedEmployee.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = enhancedPayroll;
          return updated;
        } else {
          return [...prev, enhancedPayroll];
        }
      });
      
      toast.success('Зарплата успешно сохранена');
      return savedPayroll;
    } catch (error) {
      console.error('Error saving payroll:', error);
      toast.error('Ошибка при сохранении зарплаты');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit payroll click
  const handleEditPayroll = async (employee: Employee) => {
    const employeePayroll = payrolls.find(p => p.employee_id === employee.id);
    
    // Calculate vacation pay for the employee
    const { currentMonth, nextMonth } = await calculateVacationPay(
      employee.id,
      selectedYear,
      selectedMonth
    );
    
    console.log('Calculated vacation pay:', { currentMonth, nextMonth });
    
    // Get current date for created_at and updated_at
    const now = new Date().toISOString();
    
    // Create base payroll object with all required fields
    const basePayroll = {
      id: 0,
      created_at: now,
      updated_at: now,
      employee_id: employee.id,
      year: selectedYear,
      month: selectedMonth,
      worked_days: workNorm?.working_days || 0,
      bonus: 0,
      extra_pay: 0,
      income_tax: 0,
      pension_tax: 0,
      advance_payment: Math.round((employee.base_salary || 0) * 0.4),
      other_deductions: 0,
      vacation_pay_current: 0,
      vacation_pay_next: 0,
      sick_leave_payment: 0,
      salary: employee.base_salary || 0,
      salary_accrued: 0,
      total_accrued: 0,
      total_deductions: 0,
      total_payable: 0,
      total_employee_cost: 0,
      payable_without_salary: 0,
      fszn_tax: 0,
      insurance_tax: 0,
      is_tax_benefit_applied: false,
      payment_date: null
    };
    
    // If we have an existing payroll, merge it with the base
    const updatedPayroll = employeePayroll 
      ? { 
          ...basePayroll,
          ...employeePayroll, // This will override any matching fields from basePayroll
          vacation_pay_current: currentMonth, // Ensure we use the calculated values
          vacation_pay_next: nextMonth,
          updated_at: now
        }
      : {
          ...basePayroll,
          vacation_pay_current: currentMonth,
          vacation_pay_next: nextMonth
        };
    
    console.log('Updated payroll data:', updatedPayroll);
    
    setSelectedEmployee(employee);
    setSelectedPayroll(updatedPayroll);
    setIsPayrollDialogOpen(true);
  };

  // Format month name for display
  const monthName = format(new Date(selectedYear, selectedMonth - 1), 'LLLL', { locale: ru });
  const formattedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6 p-4 bg-card">
        <h1 className="text-2xl font-bold">Зарплаты</h1>
        <div className="flex items-center space-x-4">
          <MonthYearSelector
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onYearChange={setSelectedYear}
            onMonthChange={setMonth => {
              setSelectedMonth(setMonth);
            }}
          />
          <div className="flex items-center space-x-2">
            <Switch
              id="show-remote"
              checked={showRemoteEmployees}
              onCheckedChange={setShowRemoteEmployees}
            />
            <Label htmlFor="show-remote">Показать удаленных сотрудников</Label>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-8 mb-4">
        <div className="p-4 border rounded-md">
          <div className="text-sm font-medium">Норма рабочего времени</div>
          <div className="text-2xl font-bold">{workNorm?.norm_hours}</div>
        </div>
        <div className="p-4 border rounded-md">
          <div className="text-sm font-medium">ВСЕГО НАЧИСЛЕНО</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(payrolls.reduce((sum, payroll) => sum + (payroll.total_accrued || 0), 0))}
          </div>
        </div>
        <div className="p-4 border rounded-md">
          <div className="text-sm font-medium">ФОТ</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(payrolls.reduce((sum, payroll) => sum + (payroll.total_employee_cost || 0), 0))}
          </div>
        </div>
        <div className="p-4 border rounded-md">
          <div className="text-sm font-medium">ФОТ БЕЗ АВАНСА</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(payrolls.reduce((sum, payroll) => sum + ((payroll.total_employee_cost || 0) - (payroll.advance_payment || 0)), 0))}
          </div>
        </div>
      </div>

      {/* Payrolls Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">
              Начисления за {formattedMonthName} {selectedYear} года
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <PayrollsTable
            employees={filteredEmployees}
            payrolls={payrolls.map(p => ({
              ...p,
              employee: employees.find(e => e.id === p.employee_id)!,
              vacation_pay_current: p.vacation_pay_current || 0,
              vacation_pay_next: p.vacation_pay_next || 0
            }))}
            workNorm={workNorm}
            minSalary={minSalary}
            incomeTaxRate={incomeTaxRate}
            onEditPayroll={handleEditPayroll}
          />
        </CardContent>
      </Card>

      {/* Edit Work Norm Dialog */}
      <EditWorkNormDialog
        open={isEditWorkNormOpen}
        onOpenChange={setIsEditWorkNormOpen}
        workNorm={workNorm}
        year={selectedYear}
        month={selectedMonth}
        onSave={handleSaveWorkNorm}
      />

      {/* Payroll Dialog */}
      {selectedEmployee && (
        <PayrollDialog
          open={isPayrollDialogOpen}
          onOpenChange={setIsPayrollDialogOpen}
          employee={selectedEmployee}
          payroll={selectedPayroll}
          workNorm={workNorm}
          year={selectedYear}
          month={selectedMonth}
          minSalary={minSalary}
          incomeTaxRate={incomeTaxRate}
          fsznRate={fsznRate}
          insuranceRate={insuranceRate}
          benefitAmount={benefitAmount}
          taxDeduction={taxDeduction}
          onSave={handleSavePayroll}
        />
      )}
    </div>
  );
}
