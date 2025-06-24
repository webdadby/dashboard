import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface PayrollDialogActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  className?: string;
}

export const PayrollDialogActions = ({
  isSubmitting,
  onCancel,
  submitLabel = 'Сохранить',
  cancelLabel = 'Отмена',
  className = '',
}: PayrollDialogActionsProps) => {
  return (
    <div className={`sticky bottom-0 bg-background pt-4 pb-1 -mx-6 px-6 border-t ${className}`}>
      <div className="flex w-full flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-2 sm:space-y-0">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {cancelLabel}
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Сохранение...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </div>
  );
};
