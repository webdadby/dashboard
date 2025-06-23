'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar } from "@/components/ui/calendar";
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '@/lib/supabase/client';
import { employeesApi } from '@/lib/supabase/employees';
import { toast } from "sonner";
import { Calendar as CalendarIcon, Plus, Edit, Trash2, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useState } from "react";
import Layout from "@/components/kokonutui/layout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Схема для валидации формы
const employeeSchema = z.object({
  name: z.string().min(2, { message: "Имя должно содержать минимум 2 символа" }),
  position: z.string().min(2, { message: "Должность должна содержать минимум 2 символа" }),
  email: z.string().email({ message: "Неверный формат email" }).optional().nullable(),
  hire_date: z.date({ required_error: "Дата приема обязательна" }),
  termination_date: z.date().optional().nullable(),
  rate: z.number().min(0.25, { message: "Ставка не может быть меньше 0.25" }),
  base_salary: z.number().min(0, { message: "Оклад не может быть отрицательным" }),
  phone: z.string().optional().nullable(),
  tax_identifier: z.string().optional().nullable(),
}).refine(data => !data.termination_date || data.hire_date <= data.termination_date, {
  message: "Дата увольнения не может быть раньше даты приема",
  path: ["termination_date"],
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

// Тип для сотрудника из API
type EmployeeFromAPI = {
  id: number;
  name: string;
  position: string;
  hire_date: string;
  termination_date: string | null;
  rate: number;
  base_salary: number | null;
  email: string | null;
  phone: string | null;
  tax_identifier: string | null;
  created_at: string;
  updated_at: string;
};

// Тип для сотрудника в UI
type EmployeeUI = Omit<EmployeeFromAPI, 'hire_date' | 'termination_date'> & {
  hire_date: Date;
  termination_date: Date | null;
};

function EmployeesPageContent() {
  const router = useRouter();
  
  // Employee data state
  const [employees, setEmployees] = useState<EmployeeUI[]>([]);
  
  // UI state
  const [showTerminated, setShowTerminated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSalaryManuallyModified, setIsSalaryManuallyModified] = useState(false);
  const [minSalary, setMinSalary] = useState<number>(735);
  const [date, setDate] = useState<Date>(new Date());
  const [configError, setConfigError] = useState<string | null>(null);
  
  // Derived state
  const activeEmployees = employees.filter(emp => !emp.termination_date);
  const terminatedEmployees = employees.filter(emp => emp.termination_date);
  const displayedEmployees = showTerminated ? terminatedEmployees : activeEmployees;
  
  // Fetch employees function with proper typing
  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const response = await employeesApi.getAll();
      
      if (!response) {
        throw new Error('No response from server');
      }
      
      if ('error' in response) {
        const errorMessage = response.error && typeof response.error === 'object' && 'message' in response.error
          ? String(response.error.message)
          : 'Failed to fetch employees';
        throw new Error(errorMessage);
      }
      
      const employeesData = Array.isArray(response) ? response : [];
      
      if (employeesData.length === 0) {
        setEmployees([]);
        setActiveEmployees([]);
        setTerminatedEmployees([]);
        return;
      }
      
      // Преобразуем строковые даты в объекты Date
      const employeesWithDates = employeesData.map((emp) => {
        try {
          return {
            ...emp,
            hire_date: new Date(emp.hire_date),
            termination_date: emp.termination_date ? new Date(emp.termination_date) : null,
            base_salary: emp.base_salary || 0,
          } as EmployeeUI;
        } catch (error) {
          console.error('Error processing employee data:', emp, error);
          return null;
        }
      }).filter(Boolean) as EmployeeUI[];
      
      setEmployees(employeesWithDates);
    } catch (error) {
      console.error('Ошибка при загрузке сотрудников:', error);
      toast.error('Не удалось загрузить список сотрудников');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Загрузка сотрудников и настроек при монтировании компонента
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Загружаем сотрудников
        const employeesData = await employeesApi.getAll();
        
        // Преобразуем строковые даты в объекты Date для UI
        const formattedData = employeesData.map(emp => ({
          ...emp,
          hire_date: new Date(emp.hire_date)
        }));
        
        setEmployees(formattedData);
        
        // Загружаем минимальный оклад из настроек
        try {
          const { data: settingsData } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'min_salary')
            .single();
          
          if (settingsData) {
            setMinSalary(settingsData.value);
          }
        } catch (settingsError) {
          console.error('Ошибка при загрузке настроек:', settingsError);
          // Используем значение по умолчанию, которое уже установлено
        }
      } catch (error) {
        console.error('Ошибка при загрузке сотрудников:', error);
        toast.error('Не удалось загрузить список сотрудников');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Инициализируем форму с валидацией Zod
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      position: "",
      email: "",
      hire_date: new Date(),
      termination_date: null,
      rate: 1,
      base_salary: 0,
      phone: "",
      tax_identifier: "",
    },
  });
  
  // Get form values with proper typing
  const { register, handleSubmit, formState, reset, watch, setValue } = form;

  const onSubmit = async (data: EmployeeFormValues) => {
    try {
      setIsSubmitting(true);

      // Prepare data for API
      const employeeData = {
        ...data,
        hire_date: data.hire_date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        termination_date: data.termination_date ? data.termination_date.toISOString().split('T')[0] : null,
        base_salary: Number(data.base_salary) || 0,
        rate: Number(data.rate) || 1,
      };

      if (editingId !== null) {
        // Update existing employee
        const response = await employeesApi.update(editingId, employeeData);
        if (response && 'error' in response && response.error) {
          const errorMessage = typeof response.error === 'object' && 'message' in response.error
            ? String(response.error.message)
            : 'Failed to update employee';
          throw new Error(errorMessage);
        }
        toast.success("Сотрудник успешно обновлен");
      } else {
        // Create new employee
        const response = await employeesApi.create(employeeData);
        if (response && 'error' in response && response.error) {
          const errorMessage = typeof response.error === 'object' && 'message' in response.error
            ? String(response.error.message)
            : 'Failed to create employee';
          throw new Error(errorMessage);
        }
        toast.success("Сотрудник успешно добавлен");
      }

      // Close modal and refresh list
      setIsFormOpen(false);
      await fetchEmployees();
    } catch (error) {
      console.error("Ошибка при сохранении сотрудника:", error);
      toast.error(error instanceof Error ? error.message : "Не удалось сохранить сотрудника");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update base salary when rate changes (if not manually modified)
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'rate' && !isSalaryManuallyModified) {
        const calculatedSalary = Math.round(minSalary * (value.rate || 1) * 100) / 100;
        form.setValue('base_salary', calculatedSalary, { shouldValidate: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, minSalary, isSalaryManuallyModified]);

  const handleEdit = (employee: EmployeeUI) => {
    if (employee.id === undefined) return;
    
    setEditingId(employee.id);
    reset({
      ...employee,
      hire_date: employee.hire_date,
      termination_date: employee.termination_date || null,
      tax_identifier: employee.tax_identifier || "",
      base_salary: employee.base_salary || 0,
      rate: employee.rate || 1,
      email: employee.email || "",
      phone: employee.phone || ""
    });
    setDate(employee.hire_date);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Вы уверены, что хотите удалить этого сотрудника?")) {
      try {
        await employeesApi.delete(id);
        setEmployees(employees.filter(emp => emp.id !== id));
        toast.success('Сотрудник удален');
      } catch (error) {
        console.error('Ошибка при удалении сотрудника:', error);
        toast.error('Не удалось удалить сотрудника');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Сотрудники</h1>
          <p className="text-muted-foreground">
            Управление данными сотрудников компании
          </p>
        </div>
        <Button onClick={() => {
          form.reset({
            name: "",
            position: "",
            email: "",
            hire_date: new Date(),
            rate: 1,
            base_salary: minSalary, // Default to full rate salary
            phone: "",
            tax_identifier: ""
          });
          setIsSalaryManuallyModified(false);
          setDate(new Date());
          setEditingId(null);
          setIsFormOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить сотрудника
        </Button>
      </div>

      {/* Форма добавления/редактирования сотрудника */}
      {isFormOpen && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {editingId ? 'Редактировать сотрудника' : 'Добавить нового сотрудника'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">ФИО</Label>
                  <Input
                    id="name"
                    placeholder="Иванов Иван Иванович"
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Должность</Label>
                  <Input
                    id="position"
                    placeholder="Менеджер"
                    {...form.register("position")}
                  />
                  {form.formState.errors.position && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.position.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ivanov@example.com"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    placeholder="+7 (999) 123-45-67"
                    {...register("phone")}
                  />
                  {formState.errors.phone && (
                    <p className="text-sm text-red-500">
                      {formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hire_date">Дата приема на работу</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? (
                          format(date, "PPP", { locale: ru })
                        ) : (
                          <span>Выберите дату</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(newDate) => {
                          setDate(newDate || new Date());
                          form.setValue("hire_date", newDate || new Date());
                        }}
                        initialFocus
                        locale={ru}
                      />
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.hire_date && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.hire_date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="termination_date">Дата увольнения (если уволен)</Label>
                  <Controller
                    name="termination_date"
                    control={form.control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(new Date(field.value), "PPP", { locale: ru })
                            ) : (
                              <span>Выберите дату</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date)}
                            initialFocus
                            locale={ru}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => form.setValue("termination_date", null)}
                    className="text-xs"
                  >
                    Очистить дату увольнения
                  </Button>
                  {form.formState.errors.termination_date && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.termination_date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate">Ставка</Label>
                  <select
                    id="rate"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...form.register("rate", {
                      setValueAs: (value) => {
                        if (!value) return 1;
                        const num = parseFloat(value);
                        return isNaN(num) ? 1 : num;
                      }
                    })}
                  >
                    <option value="0.25">0.25 ставки</option>
                    <option value="0.5">0.5 ставки</option>
                    <option value="1">1 ставка</option>
                  </select>
                  {form.formState.errors.rate && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.rate.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base_salary">Оклад</Label>
                  <Input
                    id="base_salary"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Введите оклад"
                    {...form.register("base_salary", {
                      valueAsNumber: true,
                      onChange: (e) => {
                        // Mark as manually modified when user types
                        if (!isSalaryManuallyModified && e.target.value) {
                          setIsSalaryManuallyModified(true);
                        }
                      }
                    })}
                    onKeyDown={() => {
                      // Mark as manually modified on key down (for immediate feedback)
                      if (!isSalaryManuallyModified) {
                        setIsSalaryManuallyModified(true);
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isSalaryManuallyModified
                      ? "Значение изменено вручную"
                      : `Рассчитано: ${minSalary} × ${form.watch("rate") || 1} = ${Math.round(
                          minSalary * (form.watch("rate") || 1) * 100
                        ) / 100} BYN`}
                  </p>
                  {form.formState.errors.base_salary && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.base_salary.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                >
                  Отмена
                </Button>
                <Button type="submit">
                  {editingId ? "Сохранить изменения" : "Добавить сотрудника"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Таблица сотрудников */}
      <Card>
        <CardHeader>
          <CardTitle>Список сотрудников</CardTitle>
          <CardDescription>
            Все сотрудники вашей компании
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Загрузка данных...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-4">
                <Tabs 
                  value={showTerminated ? "terminated" : "active"} 
                  onValueChange={(val) => setShowTerminated(val === "terminated")}
                  className="w-full"
                >
                  <div className="flex justify-between items-center w-full">
                    <TabsList>
                      <TabsTrigger value="active">Активные ({activeEmployees.length})</TabsTrigger>
                      <TabsTrigger value="terminated">Уволенные ({terminatedEmployees.length})</TabsTrigger>
                    </TabsList>
                    <Button 
                      onClick={() => setShowTerminated(!showTerminated)} 
                      variant="outline"
                      className="ml-4"
                    >
                      {showTerminated ? 'Показать активных' : 'Показать уволенных'}
                    </Button>
                  </div>
                </Tabs>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ФИО</TableHead>
                      <TableHead>Должность</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Дата приема</TableHead>
                      <TableHead>Дата увольнения</TableHead>
                      <TableHead>Оклад</TableHead>
                      <TableHead className="w-[150px]">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(showTerminated ? terminatedEmployees : activeEmployees).map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>{employee.email || '-'}</TableCell>
                        <TableCell>
                          {format(employee.hire_date, 'dd.MM.yyyy', { locale: ru })}
                        </TableCell>
                        <TableCell>
                          {employee.termination_date 
                            ? format(employee.termination_date, 'dd.MM.yyyy', { locale: ru })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">
                            {(employee.base_salary || (employee.rate * minSalary)).toLocaleString('ru-RU', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })} ₽
                          </span>
                          {employee.rate !== 1 && (
                            <span className="text-muted-foreground text-xs ml-1">
                            ({employee.rate} ставки)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/members/${employee.id}`)}
                            title="Просмотр карточки сотрудника"
                          >
                            <User className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(employee)}
                            title="Редактировать"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => employee.id !== undefined && handleDelete(employee.id)}
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <Layout>
      <EmployeesPageContent />
    </Layout>
  );
}
