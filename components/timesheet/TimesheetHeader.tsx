'use client';

import React from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface TimesheetHeaderProps {
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSave: () => Promise<any>;
  isLoading: boolean;
  isSaving: boolean;
}

export const TimesheetHeader: React.FC<TimesheetHeaderProps> = ({
  currentDate,
  onPreviousMonth,
  onNextMonth,
  onSave,
  isLoading,
  isSaving
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPreviousMonth}
          disabled={isLoading}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {format(currentDate, 'LLLL yyyy', { locale: ru })}
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={onNextMonth}
          disabled={isLoading}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Button 
        onClick={onSave} 
        disabled={isLoading || isSaving}
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Сохранение...
          </>
        ) : (
          'Сохранить'
        )}
      </Button>
    </div>
  );
};
