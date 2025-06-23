"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/formatters"

interface VacationTotalsProps {
  totalVacationPayouts: {
    totalAmount: number
    employeeTotals: { employeeId: number; employeeName: string; amount: number }[]
  }
  isLoading: boolean
}

export default function VacationTotals({
  totalVacationPayouts,
  isLoading,
}: VacationTotalsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium">
              Общая сумма отпускных
            </CardTitle>
            <CardDescription>
              Сумма всех отпускных выплат
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? (
              "Загрузка..."
            ) : (
              formatCurrency(totalVacationPayouts.totalAmount)
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium">
              Количество сотрудников с отпусками
            </CardTitle>
            <CardDescription>
              Сотрудники, имеющие отпуска
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? (
              "Загрузка..."
            ) : (
              totalVacationPayouts.employeeTotals.length
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Топ сотрудников по отпускным
          </CardTitle>
          <CardDescription>
            Сотрудники с наибольшими суммами отпускных
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Загрузка...</div>
          ) : totalVacationPayouts.employeeTotals.length === 0 ? (
            <div className="text-sm text-muted-foreground">Нет данных</div>
          ) : (
            <div className="space-y-2">
              {totalVacationPayouts.employeeTotals
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
                .map((employee) => (
                  <div
                    key={employee.employeeId}
                    className="flex items-center justify-between"
                  >
                    <div className="text-sm font-medium">
                      {employee.employeeName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(employee.amount)}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
