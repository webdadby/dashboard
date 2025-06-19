"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarDays, Plus, Users, Settings as SettingsIcon } from "lucide-react"
import { employeesApi, vacationsApi, Employee, VacationRequestWithEmployee, VacationBalance } from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"
import { 
  VacationRequestDialog,
  VacationBalanceTable,
  VacationRequestsTable,
  VacationTotals,
  VacationSettings
} from "@/components/vacations"

export default function VacationsPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [vacationRequests, setVacationRequests] = useState<VacationRequestWithEmployee[]>([])
  const [vacationBalances, setVacationBalances] = useState<any[]>([])
  const [totalVacationPayouts, setTotalVacationPayouts] = useState<{
    totalAmount: number
    employeeTotals: { employeeId: number; employeeName: string; amount: number }[]
  }>({ totalAmount: 0, employeeTotals: [] })
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  // Load data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const [employeesData, requestsData, balancesData, payoutsData] = await Promise.all([
          employeesApi.getAll(),
          vacationsApi.getAllRequests(),
          vacationsApi.getAllBalances(),
          vacationsApi.getTotalVacationPayouts()
        ])

        setEmployees(employeesData)
        setVacationRequests(requestsData)
        setVacationBalances(balancesData)
        setTotalVacationPayouts(payoutsData)
      } catch (error) {
        console.error("Error loading vacation data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Refresh data after changes
  const refreshData = async () => {
    try {
      const [requestsData, balancesData, payoutsData] = await Promise.all([
        vacationsApi.getAllRequests(),
        vacationsApi.getAllBalances(),
        vacationsApi.getTotalVacationPayouts()
      ])

      setVacationRequests(requestsData)
      setVacationBalances(balancesData)
      setTotalVacationPayouts(payoutsData)
    } catch (error) {
      console.error("Error refreshing vacation data:", error)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Отпуска</h1>
          <p className="text-muted-foreground">
            Управление отпусками, расчет отпускных и баланс дней
          </p>
        </div>
        <Button onClick={() => setIsRequestDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Новый отпуск
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <CalendarDays className="mr-2 h-4 w-4" />
            Обзор
          </TabsTrigger>
          <TabsTrigger value="requests">
            <CalendarDays className="mr-2 h-4 w-4" />
            Заявки на отпуск
          </TabsTrigger>
          <TabsTrigger value="balances">
            <Users className="mr-2 h-4 w-4" />
            Баланс отпусков
          </TabsTrigger>
          <TabsTrigger value="settings">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Настройки
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <VacationTotals 
            totalVacationPayouts={totalVacationPayouts}
            isLoading={isLoading}
          />
          
          <Card>
            <CardHeader>
              <CardTitle>Последние заявки на отпуск</CardTitle>
              <CardDescription>
                Последние 5 заявок на отпуск от сотрудников
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VacationRequestsTable 
                requests={vacationRequests.slice(0, 5)} 
                employees={employees}
                isLoading={isLoading}
                refreshData={refreshData}
                showPagination={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Заявки на отпуск</CardTitle>
              <CardDescription>
                Все заявки на отпуск от сотрудников
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VacationRequestsTable 
                requests={vacationRequests} 
                employees={employees}
                isLoading={isLoading}
                refreshData={refreshData}
                showPagination={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Баланс отпусков</CardTitle>
              <CardDescription>
                Баланс отпускных дней по сотрудникам
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VacationBalanceTable 
                balances={vacationBalances} 
                employees={employees}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <VacationSettings />
        </TabsContent>
      </Tabs>

      {isRequestDialogOpen && (
        <VacationRequestDialog
          employees={employees}
          open={isRequestDialogOpen}
          onClose={() => setIsRequestDialogOpen(false)}
          onSave={refreshData}
        />
      )}
    </div>
  )
}
