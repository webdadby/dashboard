'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { WorkNorm } from '@/lib/supabase/types';

interface EditWorkNormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workNorm: WorkNorm | null;
  year: number;
  month: number;
  onSave: (normHours: number) => Promise<void>;
}

export function EditWorkNormDialog({
  open,
  onOpenChange,
  workNorm,
  year,
  month,
  onSave,
}: EditWorkNormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [normHours, setNormHours] = useState(workNorm?.norm_hours?.toString() || '');

  useEffect(() => {
    setNormHours(workNorm?.norm_hours?.toString() || '');
  }, [workNorm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!normHours) return;
    
    setIsSubmitting(true);
    try {
      await onSave(Number(normHours));
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthName = new Date(year, month - 1).toLocaleString('ru-RU', { month: 'long' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Норма рабочего времени</DialogTitle>
          <DialogDescription>
            Установите норму рабочего времени для {monthName} {year} года
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="norm-hours" className="text-right">
                Часов
              </Label>
              <Input
                id="norm-hours"
                type="number"
                min="1"
                step="0.5"
                value={normHours}
                onChange={(e) => setNormHours(e.target.value)}
                className="col-span-3"
                placeholder="Например, 168"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
