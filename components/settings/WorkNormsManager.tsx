"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { workNormsApi, WorkNorm } from "@/lib/supabase";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Months for display
const MONTHS = [
  { value: 1, label: 'Январь' },
  { value: 2, label: 'Февраль' },
  { value: 3, label: 'Март' },
  { value: 4, label: 'Апрель' },
  { value: 5, label: 'Май' },
  { value: 6, label: 'Июнь' },
  { value: 7, label: 'Июль' },
  { value: 8, label: 'Август' },
  { value: 9, label: 'Сентябрь' },
  { value: 10, label: 'Октябрь' },
  { value: 11, label: 'Ноябрь' },
  { value: 12, label: 'Декабрь' },
];

// Generate years for the dropdown (current year -/+ 5 years)
const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    years.push(i);
  }
  return years;
};

interface WorkNormData {
  hours: number;
  workingDays: number;
  preHolidayDays: number;
}

export const WorkNormsManager = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [workNorms, setWorkNorms] = useState<Record<number, WorkNormData>>({});
  const defaultWorkingDays = 20; // Default working days in a month
  const hoursPerDay = 8; // Standard working hours per day
  const preHolidayHoursPerDay = 7; // Working hours on pre-holiday days
  const years = generateYears();

  // Load work norms when the year changes
  useEffect(() => {
    const fetchWorkNorms = async () => {
      setIsLoading(true);
      try {
        const data = await workNormsApi.getAll();
        
        // Filter norms by selected year and transform into { month: { hours, workingDays, holidayDays } } object
        const yearNorms = (Array.isArray(data) ? data : [])
          .filter((norm) => norm.year === selectedYear)
          .reduce((acc: Record<number, WorkNormData>, norm) => {
            acc[norm.month] = {
              hours: norm.norm_hours,
              workingDays: norm.working_days || defaultWorkingDays,
              preHolidayDays: norm.holiday_days || 0 // Keeping the same field name in the database
            };
            return acc;
          }, {});
        
        // Initialize missing months with default values
        for (let month = 1; month <= 12; month++) {
          if (!yearNorms[month]) {
            yearNorms[month] = {
              hours: 0,
              workingDays: defaultWorkingDays,
              preHolidayDays: 0
            };
          }
        }
        
        setWorkNorms(yearNorms);
      } catch (error) {
        console.error("Error loading work norms:", error);
        toast.error("Failed to load work norms");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkNorms();
  }, [selectedYear]);

  // Handle input changes
  const handleHoursChange = (month: number, value: string) => {
    const hours = parseFloat(value) || 0;
    setWorkNorms(prev => ({
      ...prev,
      [month]: {
        ...(prev[month] || { workingDays: defaultWorkingDays, preHolidayDays: 0 }),
        hours: value ? parseFloat(value) : 0
      }
    }));
  };

  const handleWorkingDaysChange = (month: number, value: string) => {
    const workingDays = parseInt(value, 10) || 0;
    setWorkNorms(prev => ({
      ...prev,
      [month]: {
        ...(prev[month] || { hours: 0, preHolidayDays: 0 }),
        workingDays,
        // Recalculate hours when working days change
        hours: (workingDays * hoursPerDay) + ((prev[month]?.preHolidayDays || 0) * (hoursPerDay - 1))
      }
    }));
  };

  const handlePreHolidayDaysChange = (month: number, value: string) => {
    const preHolidayDays = parseInt(value, 10) || 0;
    setWorkNorms(prev => ({
      ...prev,
      [month]: {
        ...(prev[month] || { hours: 0, workingDays: defaultWorkingDays }),
        preHolidayDays,
        // Recalculate hours: (working days * 8h) + (pre-holiday days * 7h)
        hours: ((prev[month]?.workingDays || defaultWorkingDays) * hoursPerDay) + (preHolidayDays * preHolidayHoursPerDay)
      }
    }));
  };

  // Save work norms
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Create or update each month's norm
      const promises = Object.entries(workNorms).map(([month, data]) => {
        return workNormsApi.upsert({
          year: selectedYear,
          month: parseInt(month, 10),
          norm_hours: data.hours,
          working_days: data.workingDays,
          holiday_days: data.preHolidayDays // Still using holiday_days in DB but it means pre-holiday now
        });
      });

      await Promise.all(promises);
      toast.success("Work norms saved successfully");
    } catch (error) {
      console.error("Error saving work norms:", error);
      toast.error("Failed to save work norms");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading work norms...</div>;
  }

  return (
    <div className="space-y-4 border rounded-lg">
      <div className="flex items-center justify-between p-6">
        <h3 className="text-lg font-medium">Work Norms Management</h3>
        <div className="flex items-center space-x-4">
          <div>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value, 10))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Norms
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          {MONTHS.map((month) => {
            const monthData = workNorms[month.value] || { hours: 0, workingDays: defaultWorkingDays, preHolidayDays: 0 };
            return (
              <div key={month.value} className="p-4 border rounded-lg bg-card">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{month.label}</h4>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor={`hours-${month.value}`} className="text-sm">
                        Часов в месяце
                      </Label>
                    </div>
                    <Input
                      id={`hours-${month.value}`}
                      type="number"
                      min="0"
                      step="0.5"
                      value={monthData.hours || ''}
                      onChange={(e) => handleHoursChange(month.value, e.target.value)}
                      placeholder="Часы"
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <Label htmlFor={`working-days-${month.value}`} className="text-sm">
                          Рабочих дней
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[300px]">
                              <p>Количество рабочих дней в месяце (исключая выходные и праздники)</p>
                              <p className="mt-1 text-muted-foreground text-xs">Предпраздничные дни считаются как рабочие, но с сокращенным временем</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <Input
                      id={`working-days-${month.value}`}
                      type="number"
                      min="0"
                      max="31"
                      value={monthData.workingDays || ''}
                      onChange={(e) => handleWorkingDaysChange(month.value, e.target.value)}
                      placeholder="Рабочих дней"
                      className="w-full mb-2"
                    />
                    
                    <div className="flex items-center justify-between mb-1 mt-4">
                      <div className="flex items-center gap-1">
                        <Label htmlFor={`preholiday-days-${month.value}`} className="text-sm">
                          Предпразд. дни
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[300px]">
                              <p>Дни, сокращенные на 1 час (7 часов вместо 8)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <Input
                      id={`preholiday-days-${month.value}`}
                      type="number"
                      min="0"
                      max={monthData.workingDays || 0}
                      value={monthData.preHolidayDays || ''}
                      onChange={(e) => handlePreHolidayDaysChange(month.value, e.target.value)}
                      placeholder=""
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
