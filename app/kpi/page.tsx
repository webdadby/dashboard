'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetricsList } from '@/components/kpi/MetricsList';
import { ResultsDashboard } from '@/components/kpi/ResultsDashboard';
import { useKpiData } from '@/components/kpi/useKpiData';
import { Loader2 } from 'lucide-react';

export default function KpiPage() {
  const {
    metrics,
    employees,
    loadData,
    saveEmployeeResults,
    isSaving,
    isLoading,
    error,
  } = useKpiData();

  const handleSaveEmployeeResults = async (
    employeeId: number,
    results: Array<{ metricId: number; value: number }>
  ) => {
    await saveEmployeeResults(employeeId, results);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        <p className="font-medium">Ошибка загрузки</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Система KPI</h1>
      </div>

      <Tabs defaultValue="results" className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="results">Результаты сотрудников</TabsTrigger>
            <TabsTrigger value="metrics">Управление метриками</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="results" className="space-y-6">
          <ResultsDashboard
            employees={employees}
            metrics={metrics}
            onSave={handleSaveEmployeeResults}
            isSaving={isSaving}
          />
        </TabsContent>

        <TabsContent value="metrics">
          <div className="space-y-6">
            <MetricsList 
              metrics={metrics} 
              onRefresh={loadData} 
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
