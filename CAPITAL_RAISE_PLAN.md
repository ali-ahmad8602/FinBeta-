# Capital Raise Feature Implementation

## Overview
Add ability to raise additional capital for existing funds with automatic weighted average cost of capital (WACC) calculation.

## Formula
When adding new capital:
- **New Total Capital** = Existing Capital + New Capital
- **Weighted Average Cost of Capital** = (Existing Capital × Existing Rate + New Capital × New Rate) / New Total Capital

## Implementation

### 1. API Endpoint
**PATCH /api/funds/[id]/raise-capital**
- Input: `{ amount: number, costOfCapitalRate: number }`
- Calculate new total and WACC
- Update fund in database

### 2. UI Component
**Add Capital Modal in FundCard**
- Button: "Raise Capital"
- Form fields:
  - Additional Capital Amount ($)
  - Cost of Capital Rate (%)
- Preview of new totals before confirmation

### 3. Database Update
Update fund document with:
- New `totalRaised`
- New `costOfCapitalRate` (WACC)

## Example Calculation
- Existing: $1,000,000 @ 14%
- New Raise: $500,000 @ 16%
- Result: $1,500,000 @ 14.67%
  - WACC = (1,000,000 × 0.14 + 500,000 × 0.16) / 1,500,000 = 0.1467 = 14.67%
