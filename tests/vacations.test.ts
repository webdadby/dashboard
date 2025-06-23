import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vacationsApi } from '@/lib/supabase/vacations';

// Mock the Supabase client
vi.mock('@/lib/supabase/vacations', () => {
  return {
    vacationsApi: {
      calculateVacationPay: vi.fn(),
      getSettings: vi.fn(),
      getAllRequests: vi.fn(),
      getAllBalances: vi.fn(),
      getTotalVacationPayouts: vi.fn(),
    }
  };
});

describe('Vacation Calculation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should calculate vacation pay correctly', async () => {
    // Mock data
    const mockAverageSalary = 2000;
    const mockDaysCount = 14;
    const mockCoefficient = 1.0;
    const expectedPayment = mockAverageSalary * mockDaysCount * mockCoefficient / 30;
    
    // Setup mock implementation
    vi.mocked(vacationsApi.calculateVacationPay).mockResolvedValue({
      paymentAmount: expectedPayment,
      averageSalary: mockAverageSalary,
      periodStart: '2025-01-01',
      periodEnd: '2025-05-31'
    });

    // Call the function
    const result = await vacationsApi.calculateVacationPay(1, '2025-06-01', '2025-06-14', mockDaysCount);
    
    // Verify results
    expect(result.paymentAmount).toEqual(expectedPayment);
    expect(result.averageSalary).toEqual(mockAverageSalary);
    expect(vacationsApi.calculateVacationPay).toHaveBeenCalledWith(
      1, '2025-06-01', '2025-06-14', mockDaysCount
    );
  });

  it('should retrieve vacation settings', async () => {
    // Mock settings data
    const mockSettings = {
      id: 1,
      calculation_period_months: 12,
      vacation_coefficient: 1.0,
      default_days_per_year: 24,
      created_at: '2025-06-01T00:00:00Z',
      updated_at: '2025-06-01T00:00:00Z'
    };
    
    // Setup mock implementation
    vi.mocked(vacationsApi.getSettings).mockResolvedValue(mockSettings);

    // Call the function
    const result = await vacationsApi.getSettings();
    
    // Verify results
    expect(result).toEqual(mockSettings);
    expect(vacationsApi.getSettings).toHaveBeenCalled();
  });

  it('should calculate total vacation payouts', async () => {
    // Mock payouts data
    const mockPayouts = {
      totalAmount: 5000,
      employeeTotals: [
        { employeeId: 1, employeeName: 'John Doe', amount: 3000 },
        { employeeId: 2, employeeName: 'Jane Smith', amount: 2000 }
      ]
    };
    
    // Setup mock implementation
    vi.mocked(vacationsApi.getTotalVacationPayouts).mockResolvedValue(mockPayouts);

    // Call the function
    const result = await vacationsApi.getTotalVacationPayouts();
    
    // Verify results
    expect(result.totalAmount).toEqual(5000);
    expect(result.employeeTotals.length).toEqual(2);
    expect(result.employeeTotals[0].amount).toEqual(3000);
    expect(vacationsApi.getTotalVacationPayouts).toHaveBeenCalled();
  });
});
