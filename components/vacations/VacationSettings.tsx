"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { vacationsApi } from "@/lib/supabase/vacations"
import type { VacationSettings } from "@/lib/supabase/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

export default function VacationSettings() {
  const [settings, setSettings] = useState<VacationSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [calculationPeriod, setCalculationPeriod] = useState<number>(12)
  const [vacationCoefficient, setVacationCoefficient] = useState<number>(1)
  const [defaultDaysPerYear, setDefaultDaysPerYear] = useState<number>(24)

  // Load settings
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true)
      try {
        const settingsData = await vacationsApi.getSettings()
        setSettings(settingsData)
        
        // Initialize form values
        if (settingsData) {
          setCalculationPeriod(settingsData.calculation_period_months)
          // Use type assertion for properties that might not be defined in the type
          setVacationCoefficient((settingsData as any).vacation_coefficient || 1)
          setDefaultDaysPerYear((settingsData as any).default_days_per_year || 24)
        }
      } catch (error) {
        console.error("Error loading vacation settings:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Save settings
  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      const updatedSettings = {
        id: settings?.id || 1,
        calculation_period_months: calculationPeriod,
        vacation_coefficient: vacationCoefficient,
        default_days_per_year: defaultDaysPerYear,
      }

      await vacationsApi.updateSettings(updatedSettings)
      setSettings({ ...settings, ...updatedSettings } as VacationSettings)
      
      toast({
        title: "Настройки сохранены",
        description: "Настройки расчета отпусков успешно обновлены",
      })
    } catch (error) {
      console.error("Error saving vacation settings:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Настройки расчета отпусков</CardTitle>
        <CardDescription>
          Параметры для расчета отпускных выплат и баланса дней
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <p>Загрузка настроек...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calculationPeriod">Расчетный период (месяцев)</Label>
                <Select
                  value={calculationPeriod.toString()}
                  onValueChange={(value) => setCalculationPeriod(parseInt(value))}
                  disabled={isSaving}
                >
                  <SelectTrigger id="calculationPeriod">
                    <SelectValue placeholder="Выберите период" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 месяца</SelectItem>
                    <SelectItem value="6">6 месяцев</SelectItem>
                    <SelectItem value="12">12 месяцев</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Период для расчета среднего заработка
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vacationCoefficient">Коэффициент отпускных</Label>
                <Input
                  id="vacationCoefficient"
                  type="number"
                  step="0.01"
                  min="0"
                  value={vacationCoefficient}
                  onChange={(e) => setVacationCoefficient(parseFloat(e.target.value) || 1)}
                  disabled={isSaving}
                />
                <p className="text-sm text-muted-foreground">
                  Коэффициент для расчета отпускных (обычно 1.0)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultDaysPerYear">Дней отпуска в год по умолчанию</Label>
              <Input
                id="defaultDaysPerYear"
                type="number"
                min="0"
                value={defaultDaysPerYear}
                onChange={(e) => setDefaultDaysPerYear(parseInt(e.target.value) || 24)}
                disabled={isSaving}
              />
              <p className="text-sm text-muted-foreground">
                Количество дней отпуска, положенных сотруднику за год
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving ? "Сохранение..." : "Сохранить настройки"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
