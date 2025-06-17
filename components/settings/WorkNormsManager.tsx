"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { workNormsApi } from "@/lib/supabase";

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

export const WorkNormsManager = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [workNorms, setWorkNorms] = useState<Record<number, number>>({});
  const years = generateYears();

  // Load work norms when the year changes
  useEffect(() => {
    const fetchWorkNorms = async () => {
      setIsLoading(true);
      try {
        const data = await workNormsApi.getAll();
        
        // Filter norms by selected year and transform into { month: hours } object
        const yearNorms = (Array.isArray(data) ? data : [])
          .filter((norm) => norm.year === selectedYear)
          .reduce((acc: Record<number, number>, norm) => {
            acc[norm.month] = norm.norm_hours;
            return acc;
          }, {});
        
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

  // Handle month input change
  const handleMonthChange = (month: number, value: string) => {
    const hours = parseFloat(value) || 0;
    setWorkNorms(prev => ({
      ...prev,
      [month]: hours
    }));
  };

  // Save work norms
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Create or update each month's norm
      const promises = Object.entries(workNorms).map(([month, hours]) => {
        return workNormsApi.upsert({
          year: selectedYear,
          month: parseInt(month, 10),
          norm_hours: hours
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Work Norms Management</h3>
        <div className="flex items-center space-x-4">
          <div>
            <Label htmlFor="year" className="mr-2">Year:</Label>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MONTHS.map((month) => (
          <div key={month.value} className="space-y-2">
            <Label htmlFor={`month-${month.value}`}>
              {month.label}:
            </Label>
            <Input
              id={`month-${month.value}`}
              type="number"
              min="0"
              step="0.5"
              value={workNorms[month.value] || ''}
              onChange={(e) => handleMonthChange(month.value, e.target.value)}
              placeholder="Hours"
              className="w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
