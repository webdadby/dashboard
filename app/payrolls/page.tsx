'use client';

import { PayrollsContent } from '@/components/payrolls/PayrollsContent';

// Главный компонент страницы зарплат
export default function PayrollsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">
        <PayrollsContent />
      </div>
    </div>
  );
}
