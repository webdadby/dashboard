'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowLeft, Mail, Phone, Calendar, Briefcase, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import Layout from '@/components/kokonutui/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Employee, Payroll } from '@/lib/supabase/types';
import { employeesApi } from '@/lib/supabase/employees';
import { payrollsApi } from '@/lib/supabase/payrolls';
import { settingsApi } from '@/lib/supabase/settings';
import { formatCurrency } from '@/components/payrolls/utils';

function EmployeeDetailContent() {
  const params = useParams();
  const router = useRouter();
  const employeeId = Number(params.id);
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [minSalary, setMinSalary] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch employee data
        const employeeData = await employeesApi.getById(employeeId);
        setEmployee(employeeData);
        
        // Fetch employee's payroll history
        const payrollsData = await payrollsApi.getByEmployeeId(employeeId);
        setPayrolls(payrollsData);
        
        // Fetch settings for min salary
        const settings = await settingsApi.get();
        setMinSalary(settings.min_salary || 0);
      } catch (error) {
        console.error('Error fetching employee data:', error);
        toast.error('Не удалось загрузить данные сотрудника');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [employeeId]);

  // Format month name
  const getMonthName = (month: number) => {
    return format(new Date(2000, month - 1), 'LLLL', { locale: ru });
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Загрузка данных...</span>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold">Сотрудник не найден</h2>
        <Button 
          variant="link" 
          onClick={() => router.push('/members')}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Вернуться к списку сотрудников
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/members')}
          className="mr-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
        <h1 className="text-2xl font-bold">Карточка сотрудника</h1>
      </div>

      {/* Employee Profile Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg bg-primary/10">
                {getInitials(employee.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{employee.name}</CardTitle>
              <CardDescription>{employee.position}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>Должность: {employee.position}</span>
              </div>
              
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>
                  Дата приема: {format(new Date(employee.hire_date), 'dd.MM.yyyy', { locale: ru })}
                </span>
              </div>
              
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>
                  Оклад: {formatCurrency(employee.rate * minSalary)}
                  {employee.rate !== 1 && (
                    <span className="text-muted-foreground text-xs ml-1">
                      ({employee.rate} ставки)
                    </span>
                  )}
                </span>
              </div>
              
              {employee.email && (
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{employee.email}</span>
                </div>
              )}
              
              {employee.phone && (
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{employee.phone}</span>
                </div>
              )}
              
              {employee.tax_identifier && (
                <div className="flex items-start">
                  <span className="text-muted-foreground mr-2">ИНН:</span>
                  <span>{employee.tax_identifier}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>История начислений</CardTitle>
            <CardDescription>
              История начислений зарплаты сотруднику по месяцам
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="history">
              <TabsList className="mb-4">
                <TabsTrigger value="history">История начислений</TabsTrigger>
                <TabsTrigger value="chart">График</TabsTrigger>
              </TabsList>
              
              <TabsContent value="history">
                {payrolls.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table className="border">
                      <TableHeader className="bg-muted/30">
                        <TableRow className="border-b-2 border-primary/20 hover:bg-transparent">
                          <TableHead className="border-r">Период</TableHead>
                          <TableHead className="border-r text-center">Отработано часов</TableHead>
                          <TableHead className="border-r text-center">Начислено по окладу</TableHead>
                          <TableHead className="border-r text-center">Премия</TableHead>
                          <TableHead className="border-r text-center">Доплата</TableHead>
                          <TableHead className="border-r text-center font-bold">ВСЕГО НАЧИСЛЕНО</TableHead>
                          <TableHead className="border-r text-center">Удержания</TableHead>
                          <TableHead className="border-r text-center font-bold">К ВЫДАЧЕ</TableHead>
                          <TableHead className="border-r text-center font-bold">Всего с налогами</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payrolls.map((payroll) => (
                          <TableRow key={payroll.id} className="border-b hover:bg-muted/10">
                            <TableCell className="border-r font-medium">
                              {getMonthName(payroll.month)} {payroll.year}
                            </TableCell>
                            <TableCell className="border-r text-center">
                              {payroll.worked_hours}
                            </TableCell>
                            <TableCell className="border-r text-center">
                              {formatCurrency(payroll.salary_accrued || 0)}
                            </TableCell>
                            <TableCell className="border-r text-center">
                              {formatCurrency(payroll.bonus || 0)}
                            </TableCell>
                            <TableCell className="border-r text-center">
                              {formatCurrency(payroll.extra_pay || 0)}
                            </TableCell>
                            <TableCell className="border-r text-center font-semibold bg-muted/20">
                              {formatCurrency(payroll.total_accrued || 0)}
                            </TableCell>
                            <TableCell className="border-r text-center">
                              {formatCurrency(payroll.total_deductions || 0)}
                            </TableCell>
                            <TableCell className="text-center font-bold bg-primary/10">
                              {formatCurrency(payroll.total_payable || 0)}
                            </TableCell>
                            <TableCell className="text-center font-semibold bg-muted/20">
                              {formatCurrency(payroll.total_employee_cost || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Нет данных о начислениях зарплаты
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="chart">
                <div className="text-center py-8 text-muted-foreground">
                  График начислений будет добавлен в следующей версии
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function EmployeeDetailPage() {
  return (
    <Layout>
      <EmployeeDetailContent />
    </Layout>
  );
}
