"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Employee, VacationRequest } from "@/lib/supabase/types"
import { vacationsApi } from "@/lib/supabase/vacations"
import { formatCurrency } from "@/lib/formatters"
import { differenceInBusinessDays, format, parseISO } from "date-fns"
import { ru } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface VacationRequestDialogProps {
  open: boolean
  onClose: () => void
  onSave: () => void
  employees: Employee[]
  vacationRequest?: VacationRequest
}

export default function VacationRequestDialog({
  open,
  onClose,
  onSave,
  employees,
  vacationRequest,
}: VacationRequestDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [employeeId, setEmployeeId] = useState<number | null>(vacationRequest?.employee_id || null)
  const [startDate, setStartDate] = useState<Date | undefined>(
    vacationRequest?.start_date ? parseISO(vacationRequest.start_date) : undefined
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    vacationRequest?.end_date ? parseISO(vacationRequest.end_date) : undefined
  )
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'completed'>(vacationRequest?.status || "pending")
  const [notes, setNotes] = useState<string>(vacationRequest?.notes || "")
  const [daysCount, setDaysCount] = useState<number>(vacationRequest?.days_count || 0)
  const [calculationResult, setCalculationResult] = useState<{
    paymentAmount: number
    averageSalary: number
    periodStart: string
    periodEnd: string
  } | null>(null)

  // Calculate days count when dates change
  useEffect(() => {
    if (startDate && endDate) {
      // Calculate calendar days between start and end dates (inclusive)
      const diffInMs = endDate.getTime() - startDate.getTime()
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24)) + 1
      setDaysCount(diffInDays > 0 ? diffInDays : 0)
    } else {
      setDaysCount(0)
    }
  }, [startDate, endDate])

  // Calculate vacation pay when employee and days count change
  useEffect(() => {
    async function calculateVacationPay() {
      if (employeeId && startDate && endDate && daysCount > 0) {
        try {
          const result = await vacationsApi.calculateVacationPay(
            employeeId,
            format(startDate, "yyyy-MM-dd"),
            format(endDate, "yyyy-MM-dd"),
            daysCount
          )
          setCalculationResult(result)
        } catch (error) {
          console.error("Error calculating vacation pay:", error)
        }
      }
    }

    calculateVacationPay()
  }, [employeeId, startDate, endDate, daysCount])

  const handleSave = async () => {
    if (!employeeId || !startDate || !endDate || daysCount <= 0) {
      alert("Пожалуйста, заполните все обязательные поля")
      return
    }

    setIsLoading(true)

    try {
      const requestData = {
        employee_id: employeeId,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        days_count: daysCount,
        status,
        notes,
        payment_amount: calculationResult?.paymentAmount || 0,
        average_salary: calculationResult?.averageSalary || 0,
        calculation_period_start: calculationResult?.periodStart || undefined,
        calculation_period_end: calculationResult?.periodEnd || undefined,
      }

      if (vacationRequest?.id) {
        // Update existing request
        await vacationsApi.updateRequest(vacationRequest.id, requestData)
      } else {
        // Create new request
        await vacationsApi.createRequest(requestData)
      }

      onSave()
      onClose()
    } catch (error) {
      console.error("Error saving vacation request:", error)
      alert("Ошибка при сохранении заявки на отпуск")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // Only allow the dialog to be closed via the close button
      // Prevent closing when clicking outside
      if (!isOpen) {
        // This will be triggered when the X button is clicked
        onClose();
      }
    }}
    modal={true}>
      <DialogContent className="sm:max-w-[600px]" onPointerDownOutside={(e) => {
        // Prevent closing when clicking outside
        e.preventDefault();
      }}>
        <DialogHeader>
          <DialogTitle>
            {vacationRequest ? "Редактировать заявку на отпуск" : "Новая заявка на отпуск"}
          </DialogTitle>
          <DialogDescription>
            Заполните информацию о периоде отпуска и расчете отпускных
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="employee" className="text-right">
              Сотрудник
            </Label>
            <Select
              value={employeeId?.toString() || ""}
              onValueChange={(value) => setEmployeeId(parseInt(value))}
              disabled={isLoading}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Выберите сотрудника" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id.toString()}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startDate" className="text-right">
              Дата начала
            </Label>
            <div className="col-span-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, "PPP", { locale: ru })
                    ) : (
                      <span>Выберите дату</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endDate" className="text-right">
              Дата окончания
            </Label>
            <div className="col-span-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      format(endDate, "PPP", { locale: ru })
                    ) : (
                      <span>Выберите дату</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    disabled={(date) => (startDate ? date < startDate : false)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="daysCount" className="text-right">
              Календарных дней
            </Label>
            <Input
              id="daysCount"
              type="number"
              value={daysCount}
              onChange={(e) => setDaysCount(parseInt(e.target.value) || 0)}
              className="col-span-3"
              disabled={true}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Статус
            </Label>
            <Select value={status} onValueChange={(value) => setStatus(value as 'pending' | 'approved' | 'rejected' | 'completed')} disabled={isLoading}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">В ожидании</SelectItem>
                <SelectItem value="approved">Одобрено</SelectItem>
                <SelectItem value="rejected">Отклонено</SelectItem>
                <SelectItem value="completed">Завершено</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {calculationResult && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="flex flex-col">
                  <Label className="text-right">Средний заработок</Label>
                  <p className="text-xs text-muted-foreground text-right">(за месяц)</p>
                </div>
                <div className="col-span-3 font-medium">
                  {formatCurrency(calculationResult.averageSalary)}
                  <p className="text-xs text-muted-foreground mt-1">
                    Рассчитано за период: {format(parseISO(calculationResult.periodStart), "dd.MM.yyyy")} - {format(parseISO(calculationResult.periodEnd), "dd.MM.yyyy")}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="flex flex-col">
                  <Label className="text-right">Средний дневной заработок</Label>
                  <p className="text-xs text-muted-foreground text-right">(за рабочий день)</p>
                </div>
                <div className="col-span-3 font-medium">
                  {formatCurrency(calculationResult.averageSalary / 29.6)}
                  <p className="text-xs text-muted-foreground mt-1">
                    Рассчитано как: {formatCurrency(calculationResult.averageSalary)} / 29.6
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Основа расчета</Label>
                <div className="col-span-3 text-sm">
                  <p className="text-muted-foreground">
                    Начисления за отработанные месяцы: {format(parseISO(calculationResult.periodStart), "MM.yyyy")} - {format(parseISO(calculationResult.periodEnd), "MM.yyyy")}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Учитываются все начисления из ведомостей за каждый месяц
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Сумма отпускных</Label>
                <div className="col-span-3 font-medium text-primary">
                  {formatCurrency(calculationResult.paymentAmount)}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Примечания
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
