'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useState } from "react";
import Layout from "@/components/kokonutui/layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase, employeesApi, Employee as SupabaseEmployee } from "@/lib/supabase";
import { toast } from "sonner";

// Схема для валидации формы
const employeeSchema = z.object({
  name: z.string().min(2, { message: "Имя должно содержать минимум 2 символа" }),
  position: z.string().min(2, { message: "Должность должна содержать минимум 2 символа" }),
  email: z.string().email({ message: "Неверный формат email" }).optional().nullable(),
  hire_date: z.date({ required_error: "Дата приема обязательна" }),
  rate: z.number().min(0.25, { message: "Ставка не может быть меньше 0.25" }),
  phone: z.string().optional().nullable(),
  tax_identifier: z.string().optional().nullable(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

// Тип для сотрудника в UI
type EmployeeUI = {
  id?: number;
  name: string;
  position: string;
  hire_date: Date;
  rate: number;
  email?: string | null;
  phone?: string | null;
  tax_identifier?: string | null;
};

function EmployeesPageContent() {
  const [employees, setEmployees] = useState<EmployeeUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [minSalary, setMinSalary] = useState<number>(735); // Значение по умолчанию
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

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
      rate: 1,
      phone: "",
      tax_identifier: "",
    },
  });

  const onSubmit = async (data: EmployeeFormValues) => {
    try {
      setIsSubmitting(true);
      
      if (editingId) {
        // Редактирование существующего сотрудника
        const updatedEmployee = await employeesApi.update(editingId, {
          ...data,
          // Преобразуем дату в строку ISO для API
          hire_date: data.hire_date.toISOString().split('T')[0]
        });
        
        // Обновляем локальное состояние
        setEmployees(employees.map(emp => 
          emp.id === editingId ? { ...updatedEmployee, hire_date: data.hire_date } : emp
        ));
        toast.success('Данные сотрудника обновлены');
      } else {
        // Добавление нового сотрудника
        const newEmployee = await employeesApi.create({
          ...data,
          // Преобразуем дату в строку ISO для API
          hire_date: data.hire_date.toISOString().split('T')[0]
        });
        
        // Добавляем в локальное состояние
        setEmployees([...employees, { ...newEmployee, hire_date: data.hire_date }]);
        toast.success('Сотрудник успешно добавлен');
      }
      
      form.reset();
      setIsFormOpen(false);
      setEditingId(null);
    } catch (error) {
      console.error('Ошибка при сохранении данных:', error);
      toast.error('Не удалось сохранить данные сотрудника');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (employee: EmployeeUI) => {
    if (employee.id === undefined) return;
    
    form.reset({
      name: employee.name,
      position: employee.position,
      email: employee.email || "",
      hire_date: employee.hire_date,
      rate: employee.rate,
      phone: employee.phone || "",
      tax_identifier: employee.tax_identifier || ""
    });
    setDate(employee.hire_date);
    setEditingId(employee.id);
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
            phone: "",
            tax_identifier: ""
          });
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
                    {...form.register("phone")}
                  />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Дата приема на работу</Label>
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
                        {date ? format(date, "PPP", { locale: ru }) : <span>Выберите дату</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(selectedDate) => {
                          if (selectedDate) {
                            setDate(selectedDate);
                            form.setValue('hire_date', selectedDate, { shouldValidate: true });
                          }
                        }}
                        initialFocus
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
                  <Label htmlFor="tax_identifier">ИНН</Label>
                  <Input
                    id="tax_identifier"
                    placeholder="123456789012"
                    {...form.register("tax_identifier")}
                  />
                  {form.formState.errors.tax_identifier && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.tax_identifier.message}
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
                  {editingId ? 'Сохранить изменения' : 'Добавить сотрудника'}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ФИО</TableHead>
                  <TableHead>Должность</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Дата приема</TableHead>
                  <TableHead>Оклад</TableHead>
                  <TableHead className="w-[100px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length > 0 ? (
                  employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell>{employee.email || '-'}</TableCell>
                      <TableCell>
                        {format(employee.hire_date, 'dd.MM.yyyy', { locale: ru })}
                      </TableCell>
                      <TableCell>
                        {(employee.rate * minSalary).toLocaleString('ru-RU', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })} ₽
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
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => employee.id !== undefined && handleDelete(employee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {isLoading ? 'Загрузка данных...' : 'Нет данных о сотрудниках'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
