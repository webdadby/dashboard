"use client"

import { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Employee, VacationBalance } from "@/lib/supabase/types"
import { Edit, Info } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { vacationsApi } from "@/lib/supabase/vacations"
import { calculateAccruedVacationDays } from "@/lib/utils"
import { format } from "date-fns"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface VacationBalanceTableProps {
  balances: VacationBalance[]
  employees: Employee[]
  isLoading: boolean
}

export default function VacationBalanceTable({
  balances,
  employees,
  isLoading,
}: VacationBalanceTableProps) {
  const [editingBalance, setEditingBalance] = useState<VacationBalance | null>(null)
  const [daysEntitled, setDaysEntitled] = useState<number>(0)
  const [daysUsed, setDaysUsed] = useState<number>(0)
  const [daysScheduled, setDaysScheduled] = useState<number>(0)
  const [isSaving, setIsSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [showAllEmployees, setShowAllEmployees] = useState(true) // Default to showing all employees
  const itemsPerPage = 10
  
  // Combine existing balances with employees who don't have balances yet
  const combinedData = useMemo(() => {
    const currentYear = new Date().getFullYear()
    
    // Create a map of employee IDs that already have balances
    const employeesWithBalances = new Set(balances.map(b => b.employee_id))
    
    // Get employees without balances and create calculated entries for them
    const employeesWithoutBalances = employees
      .filter(emp => !employeesWithBalances.has(emp.id))
      .map(emp => {
        const accruedDays = calculateAccruedVacationDays(emp.hire_date)
        return {
          id: -emp.id, // Temporary negative ID to distinguish from real records
          employee_id: emp.id,
          year: currentYear,
          days_entitled: Math.round(accruedDays),
          days_used: 0,
          days_scheduled: 0,
          days_remaining: Math.round(accruedDays),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_calculated: true // Flag to indicate this is a calculated record
        } as VacationBalance & { is_calculated?: boolean }
      })
    
    // Return all balances if not showing all employees, otherwise combine with calculated ones
    return showAllEmployees 
      ? [...balances, ...employeesWithoutBalances]
      : balances
  }, [balances, employees, showAllEmployees])

  // Set form values when editing balance
  const handleEditBalance = (balance: VacationBalance) => {
    setEditingBalance(balance)
    setDaysEntitled(balance.days_entitled)
    setDaysUsed(balance.days_used)
    setDaysScheduled(balance.days_scheduled)
  }

  // Save balance changes
  const handleSaveBalance = async () => {
    if (!editingBalance) return

    setIsSaving(true)
    try {
      await vacationsApi.upsertBalance({
        employee_id: editingBalance.employee_id,
        year: editingBalance.year,
        days_entitled: daysEntitled,
        days_used: daysUsed,
        days_scheduled: daysScheduled,
        days_remaining: daysEntitled - daysUsed - daysScheduled
      })

      // Close dialog and refresh data
      setEditingBalance(null)
      window.location.reload() // Simple refresh for now
    } catch (error) {
      console.error("Error saving vacation balance:", error)
      alert("Ошибка при сохранении баланса отпусков")
    } finally {
      setIsSaving(false)
    }
  }

  // Get employee name by ID
  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find((e) => e.id === employeeId)
    return employee?.name || `ID: ${employeeId}`
  }

  // Pagination logic
  const totalPages = Math.ceil(combinedData.length / itemsPerPage)
  const paginatedBalances = combinedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <label htmlFor="showAllEmployees" className="text-sm font-medium">
          Показать всех сотрудников с расчетом по дате начала работы
        </label>
        <input
          type="checkbox"
          id="showAllEmployees"
          checked={showAllEmployees}
          onChange={(e) => setShowAllEmployees(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <p>Загрузка данных...</p>
        </div>
      ) : combinedData.length === 0 ? (
        <div className="flex justify-center items-center h-40">
          <p>Нет данных о балансе отпусков</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Год</TableHead>
                  <TableHead>Дата начала работы</TableHead>
                  <TableHead>Положено дней</TableHead>
                  <TableHead>Использовано</TableHead>
                  <TableHead>Запланировано</TableHead>
                  <TableHead>Остаток</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBalances.map((balance: VacationBalance & { is_calculated?: boolean }) => {
                  const employee = employees.find(e => e.id === balance.employee_id);
                  const hireDate = employee?.hire_date ? format(new Date(employee.hire_date), 'dd.MM.yyyy') : '-';
                  
                  return (
                    <TableRow key={balance.id}>
                      <TableCell className="font-medium">
                        {getEmployeeName(balance.employee_id)}
                      </TableCell>
                      <TableCell>{balance.year}</TableCell>
                      <TableCell>{hireDate}</TableCell>
                      <TableCell>
                        {balance.days_entitled}
                        {balance.is_calculated && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 ml-1 inline-block text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Расчет на основе даты начала работы</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      <TableCell>{balance.days_used}</TableCell>
                      <TableCell>{balance.days_scheduled}</TableCell>
                      <TableCell className={balance.days_remaining > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {balance.days_remaining}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditBalance(balance)}
                          disabled={balance.is_calculated}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center mt-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Предыдущая
              </Button>
              <span className="flex items-center px-2">
                Страница {currentPage} из {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Следующая
              </Button>
            </div>
          )}
        </>
      )}

      {/* Edit Balance Dialog */}
      <Dialog open={!!editingBalance} onOpenChange={(open) => !open && setEditingBalance(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Редактировать баланс отпусков</DialogTitle>
            <DialogDescription>
              {editingBalance ? (
                <>
                  Сотрудник: {getEmployeeName(editingBalance.employee_id)}, Год: {editingBalance.year}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="daysEntitled" className="text-right">
                Положено дней
              </Label>
              <Input
                id="daysEntitled"
                type="number"
                value={daysEntitled}
                onChange={(e) => setDaysEntitled(parseInt(e.target.value) || 0)}
                className="col-span-3"
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="daysUsed" className="text-right">
                Использовано
              </Label>
              <Input
                id="daysUsed"
                type="number"
                value={daysUsed}
                onChange={(e) => setDaysUsed(parseInt(e.target.value) || 0)}
                className="col-span-3"
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="daysScheduled" className="text-right">
                Запланировано
              </Label>
              <Input
                id="daysScheduled"
                type="number"
                value={daysScheduled}
                onChange={(e) => setDaysScheduled(parseInt(e.target.value) || 0)}
                className="col-span-3"
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="daysRemaining" className="text-right">
                Остаток
              </Label>
              <div className="col-span-3 py-2 px-3 border rounded-md bg-muted">
                {daysEntitled - daysUsed - daysScheduled}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBalance(null)} disabled={isSaving}>
              Отмена
            </Button>
            <Button onClick={handleSaveBalance} disabled={isSaving}>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
