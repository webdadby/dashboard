'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TimesheetTable } from '@/components/timesheet/TimesheetTable';

const tabs = [
  { name: 'Табель', href: '/timesheets' },
  { name: 'Отчеты', href: '/timesheets/reports' },
  { name: 'Настройки', href: '/timesheets/settings' },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function TimesheetPage() {
  const pathname = usePathname();
  const [currentTab, setCurrentTab] = useState(pathname);

  return (
    <div className="flex flex-col h-full w-full px-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-bold">Табель учета рабочего времени</h1>
        <div className="w-full border-b border-border">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto no-scrollbar" aria-label="Вкладки">
            {tabs.map((tab) => (
              <Link
                key={tab.name}
                href={tab.href}
                onClick={() => setCurrentTab(tab.href)}
                className={classNames(
                  currentTab === tab.href
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50',
                  'whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors duration-200 ease-in-out min-w-max'
                )}
                aria-current={currentTab === tab.href ? 'page' : undefined}
              >
                {tab.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 w-full overflow-hidden -mx-4">
        <div className="h-full w-full overflow-auto px-4">
          {pathname === '/timesheets' && <TimesheetTable />}
          {pathname === '/timesheets/reports' && (
            <div className="py-4">
              <h2 className="text-lg font-medium mb-4">Отчеты по учету рабочего времени</h2>
              <p className="text-muted-foreground">Раздел отчетов в разработке</p>
            </div>
          )}
          {pathname === '/timesheets/settings' && (
            <div className="py-4">
              <h2 className="text-lg font-medium mb-4">Настройки табеля учета</h2>
              <p className="text-muted-foreground">Раздел настроек в разработке</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
