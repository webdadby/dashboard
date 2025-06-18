"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import Layout from "@/components/kokonutui/layout";
import { WorkNormsManager } from "@/components/settings/WorkNormsManager";

// Define the settings schema
const settingsSchema = z.object({
  min_salary: z.number().min(0, "Minimum salary cannot be negative"),
  income_tax: z.number().min(0, "Tax rate cannot be negative").max(100, "Tax rate cannot be more than 100%"),
  fszn_rate: z.number().min(0, "FSZN rate cannot be negative").max(100, "FSZN rate cannot be more than 100%"),
  insurance_rate: z.number().min(0, "Insurance rate cannot be negative").max(100, "Insurance rate cannot be more than 100%"),
  benefit_amount: z.number().min(0, "Benefit amount cannot be negative"),
  tax_deduction: z.number().min(0, "Tax deduction cannot be negative"),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

// Type for settings from the database
interface Setting {
  id: number;
  key: string;
  value: number;
  description: string;
}

// Settings page content component
function SettingsPageContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      min_salary: 735,
      income_tax: 13,
      fszn_rate: 34,
      insurance_rate: 0.6,
      benefit_amount: 0,
      tax_deduction: 0,
    },
  });

  // Load settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from("settings").select("*");

        if (error) throw error;

        if (data && data.length > 0) {
          // Convert settings array to form object
          const settingsObj: Partial<SettingsFormValues> = {};
          data.forEach((setting: Setting) => {
            if (setting.key === 'min_salary' || setting.key === 'income_tax' || 
                setting.key === 'fszn_rate' || setting.key === 'insurance_rate' ||
                setting.key === 'benefit_amount' || setting.key === 'tax_deduction') {
              settingsObj[setting.key as keyof SettingsFormValues] = setting.value;
            }
          });
          
          form.reset(settingsObj as SettingsFormValues);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [form]);

  // Form submission handler
  const onSubmit = async (data: SettingsFormValues) => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      
      // Update or insert min salary
      const { error: minSalaryError } = await supabase
        .from("settings")
        .upsert({ key: "min_salary", value: data.min_salary })
        .select();

      if (minSalaryError) throw minSalaryError;

      // Update or insert income tax
      const { error: incomeTaxError } = await supabase
        .from("settings")
        .upsert({ key: "income_tax", value: data.income_tax })
        .select();

      if (incomeTaxError) throw incomeTaxError;

      // Update or insert FSZN rate
      const { error: fsznRateError } = await supabase
        .from("settings")
        .upsert({ key: "fszn_rate", value: data.fszn_rate })
        .select();

      if (fsznRateError) throw fsznRateError;

      // Update or insert insurance rate
      const { error: insuranceRateError } = await supabase
        .from("settings")
        .upsert({ key: "insurance_rate", value: data.insurance_rate })
        .select();

      if (insuranceRateError) throw insuranceRateError;
      
      // Update or insert benefit amount
      const { error: benefitAmountError } = await supabase
        .from("settings")
        .upsert({ key: "benefit_amount", value: data.benefit_amount })
        .select();

      if (benefitAmountError) throw benefitAmountError;
      
      // Update or insert tax deduction
      const { error: taxDeductionError } = await supabase
        .from("settings")
        .upsert({ key: "tax_deduction", value: data.tax_deduction })
        .select();

      if (taxDeductionError) throw taxDeductionError;

      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle number input changes
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof SettingsFormValues) => {
    // Allow only numbers and comma
    const value = e.target.value.replace(/[^0-9,]/g, '');
    // Allow only one comma
    const parts = value.split(',');
    if (parts.length > 2) return;
    
    // Update input value
    e.target.value = value;
    
    // Convert string with comma to number
    const numValue = parseFloat(value.replace(',', '.'));
    form.setValue(field, isNaN(numValue) ? 0 : numValue, { shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payroll Settings</CardTitle>
          <CardDescription>
            Configure global payroll calculation parameters
          </CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_salary">Minimum Salary (RUB)</Label>
                <Input
                  id="min_salary"
                  type="text"
                  inputMode="decimal"
                  placeholder="735"
                  {...form.register("min_salary", {
                    setValueAs: (value) => {
                      if (!value) return 0;
                      const num = parseFloat(value.toString().replace(',', '.'));
                      return isNaN(num) ? 0 : num;
                    }
                  })}
                  onChange={(e) => handleNumberChange(e, 'min_salary')}
                />
                {form.formState.errors.min_salary && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.min_salary.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="income_tax">Income Tax (%)</Label>
                <Input
                  id="income_tax"
                  type="text"
                  inputMode="decimal"
                  placeholder="13"
                  {...form.register("income_tax", {
                    setValueAs: (value) => {
                      if (!value) return 0;
                      const num = parseFloat(value.toString().replace(',', '.'));
                      return isNaN(num) ? 0 : num;
                    }
                  })}
                  onChange={(e) => handleNumberChange(e, 'income_tax')}
                />
                {form.formState.errors.income_tax && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.income_tax.message}
                  </p>
                )}
              </div>
            </div>
            
            <div className="mt-4 text-lg font-medium">Employer Taxes</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fszn_rate">ФСЗН Rate (%)</Label>
                <Input
                  id="fszn_rate"
                  type="text"
                  inputMode="decimal"
                  placeholder="34"
                  {...form.register("fszn_rate", {
                    setValueAs: (value) => {
                      if (!value) return 0;
                      const num = parseFloat(value.toString().replace(',', '.'));
                      return isNaN(num) ? 0 : num;
                    }
                  })}
                  onChange={(e) => handleNumberChange(e, 'fszn_rate')}
                />
                {form.formState.errors.fszn_rate && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.fszn_rate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="insurance_rate">Insurance Rate (%)</Label>
                <Input
                  id="insurance_rate"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.6"
                  {...form.register("insurance_rate", {
                    setValueAs: (value) => {
                      if (!value) return 0;
                      const num = parseFloat(value.toString().replace(',', '.'));
                      return isNaN(num) ? 0 : num;
                    }
                  })}
                  onChange={(e) => handleNumberChange(e, 'insurance_rate')}
                />
                {form.formState.errors.insurance_rate && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.insurance_rate.message}
                  </p>
                )}
              </div>
            </div>
            
            <div className="mt-4 text-lg font-medium">Tax Benefits</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="benefit_amount">Сумма для льготы (RUB)</Label>
                <Input
                  id="benefit_amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  {...form.register("benefit_amount", {
                    setValueAs: (value) => {
                      if (!value) return 0;
                      const num = parseFloat(value.toString().replace(',', '.'));
                      return isNaN(num) ? 0 : num;
                    }
                  })}
                  onChange={(e) => handleNumberChange(e, 'benefit_amount')}
                />
                {form.formState.errors.benefit_amount && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.benefit_amount.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_deduction">Налоговый вычет (RUB)</Label>
                <Input
                  id="tax_deduction"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  {...form.register("tax_deduction", {
                    setValueAs: (value) => {
                      if (!value) return 0;
                      const num = parseFloat(value.toString().replace(',', '.'));
                      return isNaN(num) ? 0 : num;
                    }
                  })}
                  onChange={(e) => handleNumberChange(e, 'tax_deduction')}
                />
                {form.formState.errors.tax_deduction && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.tax_deduction.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      {/* Work Norms Management Section */}
      <WorkNormsManager />
    </div>
  );
}

// Main Settings Page Component
export default function SettingsPage() {
  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Manage global system parameters
            </p>
          </div>
        </div>
        <SettingsPageContent />
      </div>
    </Layout>
  );
}
