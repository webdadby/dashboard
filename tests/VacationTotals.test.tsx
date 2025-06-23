import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import VacationTotals from '@/components/vacations/VacationTotals';

describe('VacationTotals Component', () => {
  it('should render loading state correctly', () => {
    // Render component with loading state
    render(
      <VacationTotals
        totalVacationPayouts={{ totalAmount: 0, employeeTotals: [] }}
        isLoading={true}
      />
    );
    
    // Check if loading text is displayed
    expect(screen.getAllByText('Загрузка...').length).toBeGreaterThan(0);
  });

  it('should render vacation payout data correctly', () => {
    // Mock data
    const mockPayouts = {
      totalAmount: 5000,
      employeeTotals: [
        { employeeId: 1, employeeName: 'John Doe', amount: 3000 },
        { employeeId: 2, employeeName: 'Jane Smith', amount: 2000 }
      ]
    };
    
    // Render component with data
    render(
      <VacationTotals
        totalVacationPayouts={mockPayouts}
        isLoading={false}
      />
    );
    
    // Check if data is displayed correctly
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Number of employees
  });

  it('should render empty state correctly', () => {
    // Render component with empty data
    render(
      <VacationTotals
        totalVacationPayouts={{ totalAmount: 0, employeeTotals: [] }}
        isLoading={false}
      />
    );
    
    // Check if empty state is displayed
    expect(screen.getByText('0')).toBeInTheDocument(); // Number of employees
    expect(screen.getByText('Нет данных')).toBeInTheDocument();
  });
});
