# Vacation Calculation Feature Documentation

## Overview

The vacation calculation feature allows for comprehensive management of employee vacations, including:

- Tracking vacation day balances per employee
- Creating and managing vacation requests
- Calculating vacation pay based on average salary
- Viewing total vacation payouts for the company and per employee
- Configuring vacation settings like calculation period and coefficients

## Database Schema

The feature uses the following database tables:

### `vacation_settings`

Stores company-wide vacation policies and parameters.

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| calculation_period_months | int | Number of months to use for average salary calculation |
| vacation_coefficient | numeric | Coefficient applied to vacation pay calculation |
| default_days_per_year | int | Default vacation days per year for employees |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

### `vacation_balances`

Tracks vacation day balances per employee per year.

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| employee_id | int | Foreign key to employees table |
| year | int | Year for this balance record |
| days_entitled | int | Total days entitled for the year |
| days_used | int | Days already used |
| days_scheduled | int | Days scheduled but not yet used |
| days_remaining | int | Calculated field (days_entitled - days_used - days_scheduled) |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

### `vacation_requests`

Stores vacation leave requests with statuses and payment info.

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| employee_id | int | Foreign key to employees table |
| start_date | date | Vacation start date |
| end_date | date | Vacation end date |
| days_count | int | Number of business days in the vacation period |
| status | text | Status: 'pending', 'approved', 'rejected', 'completed' |
| notes | text | Optional notes about the vacation |
| payment_amount | numeric | Calculated vacation pay amount |
| average_salary | numeric | Average salary used for calculation |
| calculation_period_start | date | Start of period used for average calculation |
| calculation_period_end | date | End of period used for average calculation |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

### `vacation_payments`

Tracks payments made for vacation requests.

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| vacation_request_id | int | Foreign key to vacation_requests table |
| amount | numeric | Payment amount |
| payment_date | date | Date of payment |
| notes | text | Optional payment notes |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

## API Functions

The vacation functionality is implemented in `lib/supabase.ts` through the `vacationsApi` object, which provides the following methods:

- `getSettings()`: Get vacation settings
- `updateSettings(settings)`: Update vacation settings
- `getBalance(employeeId, year)`: Get vacation balance for an employee
- `getAllBalances()`: Get all vacation balances
- `upsertBalance(balance)`: Create or update a vacation balance
- `createRequest(request)`: Create a new vacation request
- `updateRequest(id, request)`: Update an existing vacation request
- `deleteRequest(id)`: Delete a vacation request
- `getRequest(id)`: Get a specific vacation request
- `getAllRequests()`: Get all vacation requests
- `calculateVacationPay(employeeId, startDate, endDate, daysCount)`: Calculate vacation pay
- `createPayment(payment)`: Create a vacation payment
- `getPaymentsByRequest(requestId)`: Get payments for a specific request
- `getTotalVacationPayouts()`: Get total vacation payouts for the company

## UI Components

The feature includes the following UI components:

- `VacationRequestDialog`: Form for creating/editing vacation requests
- `VacationRequestsTable`: Table displaying vacation requests
- `VacationBalanceTable`: Table displaying vacation day balances
- `VacationTotals`: Summary cards showing vacation payout totals
- `VacationSettings`: Form for configuring vacation calculation settings

## Vacation Page

The vacation page is accessible via the "Отпуска" menu item in the sidebar and includes tabs for:

1. **Overview**: Summary of vacation payouts and recent requests
2. **Requests**: Full list of vacation requests with management options
3. **Balances**: Employee vacation day balances
4. **Settings**: Configuration for vacation calculations

## Deployment Instructions

To deploy the vacation feature:

1. **Database Migration**:
   - Run the SQL migration in `migrations/create_vacation_tables.sql` on your Supabase database
   - This will create all necessary tables, triggers, and functions

2. **Frontend Deployment**:
   - Deploy the updated frontend code to your hosting environment
   - Ensure all new components and API functions are included

3. **Initial Configuration**:
   - Access the Settings tab in the Vacations page
   - Configure the calculation period, vacation coefficient, and default days per year

## Testing

The feature includes the following tests:

- `tests/vacations.test.ts`: Unit tests for vacation calculation functions
- `tests/VacationTotals.test.tsx`: Component tests for the VacationTotals component

Run tests with:

```bash
npm run test
```

## Calculation Logic

Vacation pay is calculated as follows:

1. Calculate average daily salary based on the specified calculation period (default: 12 months)
2. Multiply by the number of vacation days
3. Apply the vacation coefficient (default: 1.0)

The formula is:

```
Vacation Pay = (Average Monthly Salary / 30) × Days Count × Coefficient
```

## Future Enhancements

Potential future enhancements include:

- Integration with payroll system for automatic payment
- Calendar view for vacation planning
- Email notifications for vacation approvals
- Vacation request approval workflow with multiple approvers
