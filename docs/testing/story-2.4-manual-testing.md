# Story 2.4 Manual Testing Guide

## Overview
This guide provides step-by-step instructions for manually testing all features implemented in Story 2.4: "Refine Transaction Funding" - Funding Source Tracking for Donor Accountability.

## Prerequisites
- [ ] Application is running (`npm run dev` or equivalent)
- [ ] User is logged in with appropriate permissions:
  - **Admin role**: Full access to funding source management
  - **Finance Manager role**: Read-only access to funding sources, can manage funding links
- [ ] Database schema has been validated (`node server/scripts/validate-schema-epic-2.js`)
- [ ] Default funding sources have been seeded (if applicable)

---

## Test Suite 1: Funding Sources Management (Admin Only)

### 1.1 Navigate to Finance Settings
**Steps:**
1. Log in as a user with Admin role
2. Navigate to **Admin** → **Finance Settings** (or `/admin/finance-settings`)

**Expected Result:**
- Page loads with two main sections:
  - Income/Expense Categories (existing functionality)
  - **Funding Sources** section (new in Story 2.4)

### 1.2 Create a New Funding Source
**Steps:**
1. In the Funding Sources section, click **"Add Funding Source"** button
2. Fill in the form:
   - **Source Name**: "Test Grant 2025"
   - **Type**: Select "Grant" from dropdown
   - **Initial Amount**: Enter `5000`
   - **Date Received**: Select today's date
   - **Status**: Select "Active"
   - **Restrictions**: Enter "For agricultural projects only"
3. Click **"Create"**

**Expected Result:**
- Dialog closes
- Success notification appears
- New funding source appears in the table with:
  - Balance: ZMW 5,000 of ZMW 5,000
  - Status: Active
  - Type: Grant

### 1.3 View Funding Sources Overview Widget
**Steps:**
1. Look at the "Funding Sources Overview" card above the table

**Expected Result:**
- Widget displays all active funding sources
- Each source shows:
  - Name with status badge
  - Type badge
  - Current balance / Total received
  - Progress bar showing utilization
- Footer shows total available across all sources

### 1.4 Edit a Funding Source
**Steps:**
1. In the funding sources table, find "Test Grant 2025"
2. Click the **Edit** (pencil) icon
3. Change the following:
   - **Name**: "Test Grant 2025 - Updated"
   - **Status**: Change to "Inactive"
4. Click **"Update"**

**Expected Result:**
- Dialog closes
- Success notification appears
- Table updates with new name and status
- Status badge color changes to grey

### 1.5 Attempt to Delete Funding Source with Transactions
**Steps:**
1. Try to delete a funding source that has linked transactions
2. Click the **Delete** (trash) icon
3. Confirm deletion in the dialog

**Expected Result:**
- Error dialog appears with message:
  > "Cannot Delete Funding Source. This funding source has X transaction(s) associated with it. Please reassign or delete those transactions first."
- Funding source remains in the table

### 1.6 Delete Funding Source Without Transactions
**Steps:**
1. Create a new funding source (see 1.2)
2. Click the **Delete** (trash) icon
3. Confirm deletion

**Expected Result:**
- Success notification appears
- Funding source is removed from the table

---

## Test Suite 2: Transaction Form with Funding Sources

### 2.1 Create Income with Funding Source
**Steps:**
1. Navigate to **Finance** → **Transactions**
2. Click **"Record Income"**
3. Fill in the form:
   - **Amount (ZMW)**: Enter `1000`
   - **Category**: Select any income category
   - **Source Module**: Select any module
   - **Payment Method**: Select any method
   - **Date**: Today's date
   - **Funding Source (Optional)**: Select an active funding source
   - **Description**: "Test income with funding source"
4. Click **"Save"**

**Expected Result:**
- Dialog closes
- Success notification appears
- Transaction appears in the list

### 2.2 Create Expense with Full Funding
**Steps:**
1. Click **"Record Expense"**
2. Fill in the form:
   - **Amount Funded (ZMW)**: Enter `500`
   - **Category**: Select any expense category
   - **Source Module**: Select any module
   - **Payment Method**: Select any method
   - **Date**: Today's date
   - **Funding Source**: Select a funding source with sufficient balance (e.g., "General Fund")
   - **Description**: "Test fully funded expense"
3. Verify the hint shows: "Available: ZMW X,XXX" (funding source balance)
4. Click **"Save"**

**Expected Result:**
- Dialog closes
- Success notification appears
- Funding source balance is reduced by ZMW 500

### 2.3 Create Expense with Partial Funding
**Steps:**
1. Click **"Record Expense"**
2. Fill in the form:
   - **Amount Funded (ZMW)**: Enter `1000`
   - Check **"Different amount needed (partial funding)"** checkbox
   - **Total Amount Needed (ZMW)**: Enter `2000`
   - **Category**: Select any expense category
   - **Source Module**: Select any module
   - **Payment Method**: Select any method
   - **Date**: Today's date
   - **Funding Source**: Select a funding source
   - **Description**: "Test partially funded expense"
3. Click **"Save"**

**Expected Result:**
- Dialog closes
- Success notification appears
- Transaction appears in list with:
  - Amount showing: "-ZMW 1,000"
  - Subtitle showing: "⚠️ of ZMW 2,000"
  - Row has light yellow/warning background

### 2.4 Attempt Expense Exceeding Funding Source Balance
**Steps:**
1. Click **"Record Expense"**
2. Select a funding source with low balance (e.g., ZMW 500 remaining)
3. Enter **Amount Funded**: `1000`
4. Observe the error state

**Expected Result:**
- Input field shows error state (red)
- Error message displays: "Insufficient funds. Short by ZMW 500"
- Save button remains clickable but will fail validation

### 2.5 Attempt to Save with Insufficient Funds
**Steps:**
1. With the error state from 2.4, click **"Save"**

**Expected Result:**
- Error notification appears: "Insufficient funds. Short by ZMW 500"
- Form does not submit
- Dialog remains open

---

## Test Suite 3: Add Funding to Underfunded Transactions

### 3.1 Identify Underfunded Transaction
**Steps:**
1. Navigate to **Finance** → **Transactions**
2. Look for transactions with:
   - Light yellow/warning background
   - Amount subtitle: "⚠️ of ZMW X,XXX"

**Expected Result:**
- Underfunded expenses are visually highlighted
- "Add Funding" button (plus icon) appears in actions column

### 3.2 Open Add Funding Dialog
**Steps:**
1. Find the underfunded transaction from Test 2.3
2. Click the **"Add Funding"** (plus icon) button

**Expected Result:**
- "Add Funding to Transaction" dialog opens
- Dialog shows:
  - Transaction description
  - Currently funded amount
  - Remaining needed amount
  - Funding source dropdown
  - Amount to add input

### 3.3 Add Funding to Complete Expense
**Steps:**
1. In the Add Funding dialog:
   - **Funding Source**: Select a source with sufficient balance
   - **Amount to Add**: Enter remaining needed amount (e.g., `1000`)
2. Click **"Add Funding"**

**Expected Result:**
- Dialog closes
- Success notification: "Funding added successfully"
- Transaction list refreshes
- Transaction no longer shows warning background
- Amount now shows full funding (no "of ZMW X,XXX" subtitle)

### 3.4 Add Partial Funding
**Steps:**
1. Create a new partially funded expense (see 2.3) with:
   - Amount Funded: `500`
   - Amount Needed: `2000`
2. Open Add Funding dialog
3. Enter Amount to Add: `1000` (less than remaining `1500`)
4. Click **"Add Funding"**

**Expected Result:**
- Dialog closes
- Transaction still shows warning background
- Amount subtitle updates: "⚠️ of ZMW 2,000" (but now funded is ZMW 1,500)

### 3.5 Attempt to Add Funding Exceeding Source Balance
**Steps:**
1. Open Add Funding dialog for an underfunded transaction
2. Select a funding source with low balance
3. Enter Amount to Add exceeding that balance

**Expected Result:**
- Input shows error state
- Message: "Selected funding source has insufficient balance"
- "Add Funding" button is disabled

---

## Test Suite 4: Funding Source Detail Page

### 4.1 Navigate to Funding Source Detail
**Steps:**
1. Navigate to **Finance** → **Transactions**
2. Click on the **Funding Sources Overview** widget (or navigate to `/finance/funding/[id]`)

**Expected Result:**
- Funding Source Detail page loads with:
  - Back button
  - "Generate Report" button
  - Three metric cards
  - Transactions table

### 4.2 View Source Information Card
**Expected Result:**
- Card displays:
  - Funding source name
  - Status badge (color-coded)
  - Type badge
  - Date received (if applicable)
  - Restrictions/notes (if applicable)

### 4.3 View Balance Card
**Expected Result:**
- Card displays:
  - Current balance (large text, color-coded)
  - Progress bar showing utilization
  - Text: "X% of ZMW X,XXX remaining"

### 4.4 View Utilization Card
**Expected Result:**
- Card displays:
  - Total funds utilized (amount)
  - Number of linked transactions
  - Breakdown: Income added / Expenses deducted

### 4.5 View Linked Transactions Table
**Expected Result:**
- Table shows all transactions linked to this funding source
- Columns: Date, Type, Description, Amount, Status
- Amount column shows:
  - Income: "+ZMW XXX" in green
  - Expense: "-ZMW XXX" in red
  - Partially funded: Shows "⚠️ of ZMW XXX" warning

### 4.6 Generate Donor Report
**Steps:**
1. On the Funding Source Detail page, click **"Generate Report"**
2. Wait for PDF generation

**Expected Result:**
- Button shows loading state
- PDF downloads automatically with filename: `Donor_Report_[SourceName]_[Date].pdf`
- PDF contains:
  - Header: "Donor Report"
  - Funding source details
  - Financial summary table
  - Transaction history table
  - Page numbers and generation date

---

## Test Suite 5: Visual Indicators and Underfunded Tracking

### 5.1 Underfunded Transaction Indicators
**Steps:**
1. Create several transactions:
   - One fully funded expense
   - One partially funded expense
   - One income transaction
2. View the transactions list

**Expected Result:**
- Fully funded expense: Normal row, amount shows "-ZMW XXX"
- Partially funded expense: Light yellow background, amount shows "-ZMW XXX ⚠️ of ZMW YYY"
- Income: Normal row, amount shows "+ZMW XXX"

### 5.2 Hover Over Warning Indicator
**Steps:**
1. Hover over the warning icon (⚠️) on a partially funded transaction

**Expected Result:**
- Tooltip or visual indication shows this transaction needs additional funding

### 5.3 Row Highlighting Persistence
**Steps:**
1. Refresh the transactions page
2. Navigate away and back

**Expected Result:**
- Underfunded transactions maintain their warning background
- Visual indicators persist across page loads

---

## Test Suite 6: Role-Based Access Control (RBAC)

### 6.1 Admin Role - Full Access
**Steps:**
1. Log in as Admin
2. Navigate to Finance Settings

**Expected Result:**
- Can create new funding sources
- Can edit existing funding sources
- Can delete funding sources (without transactions)
- Can view all funding sources

### 6.2 Finance Manager Role - Limited Access
**Steps:**
1. Log in as Finance Manager
2. Navigate to Finance Settings

**Expected Result:**
- Can view funding sources (read-only)
- CANNOT create new funding sources (no Add button)
- CANNOT edit funding sources (no Edit buttons)
- CANNOT delete funding sources (no Delete buttons)

### 6.3 Finance Manager - Add Funding Capability
**Steps:**
1. Log in as Finance Manager
2. Navigate to Transactions
3. Find an underfunded transaction

**Expected Result:**
- Can view "Add Funding" button on underfunded transactions
- Can successfully add funding to complete expenses

### 6.4 Regular User - No Finance Access
**Steps:**
1. Log in as a regular user (no finance permissions)
2. Attempt to navigate to Finance section

**Expected Result:**
- Finance menu items are hidden
- Direct URL access to `/finance` or `/admin/finance-settings` is blocked
- Permission denied message shown

---

## Test Suite 7: Edge Cases and Error Handling

### 7.1 Zero Balance Funding Source
**Steps:**
1. Create a funding source with ZMW 0 balance
2. Try to create an expense using that source

**Expected Result:**
- Source appears in dropdown (if active)
- Insufficient funds error shown immediately

### 7.2 Depleted Funding Source
**Steps:**
1. Edit a funding source, change status to "Depleted"
2. Check if it appears in dropdown options

**Expected Result:**
- Depleted sources do NOT appear in funding source dropdowns
- Source remains visible in settings with "Depleted" status badge (red)

### 7.3 Network Error During Funding
**Steps:**
1. Open Add Funding dialog
2. Disconnect network (or simulate error)
3. Click "Add Funding"

**Expected Result:**
- Error notification appears
- Dialog remains open
- User can retry

### 7.4 Concurrent Funding Attempt
**Steps:**
1. Open two browser windows/tabs
2. In both, attempt to add funding from the same source simultaneously
3. Try to exceed the available balance

**Expected Result:**
- First transaction succeeds
- Second transaction fails with insufficient funds error
- Database consistency maintained (no negative balances)

---

## Test Suite 8: Data Integrity Verification

### 8.1 Verify Funding Source Balance Calculation
**Steps:**
1. Note a funding source's current balance
2. Create an expense of ZMW 500 using that source
3. Check the balance again

**Expected Result:**
- Balance decreased by exactly ZMW 500

### 8.2 Verify Transaction Link Creation
**Steps:**
1. Add funding to an underfunded transaction
2. Check the database or verify via API

**Expected Result:**
- A `transaction_links` record is created with:
  - `parent_transaction_id`: The expense transaction ID
  - `amount`: The added funding amount
  - `link_type`: "funding"
  - `recorded_by`: Current user ID

### 8.3 Verify Audit Trail
**Steps:**
1. Generate a donor report (see 4.6)
2. Review the transaction history

**Expected Result:**
- All linked transactions appear
- Amounts are correct
- Dates are accurate
- Status is shown for each transaction

---

## Quick Reference: Expected Behaviors

### Funding Source Types
| Type | Badge Color |
|------|-------------|
| Grant | Primary (blue) |
| Donation | Secondary (purple) |
| Income | Positive (green) |
| Loan | Warning (orange) |

### Funding Source Statuses
| Status | Badge Color |
|--------|-------------|
| Active | Positive (green) |
| Inactive | Grey |
| Depleted | Negative (red) |

### Balance Indicator Colors
| Balance % | Color |
|-----------|-------|
| > 50% remaining | Positive (green) |
| 20-50% remaining | Warning (orange) |
| < 20% remaining | Negative (red) |

---

## Troubleshooting

### Issue: Funding source not appearing in dropdown
**Check:**
- Is the source status "Active"?
- Does the source have a positive balance (for expenses)?
- Is the user role Finance Manager or Admin?

### Issue: Cannot add funding to transaction
**Check:**
- Is the transaction an expense (not income)?
- Is the transaction status not "cancelled"?
- Is `amount_funded < amount_needed`?
- Does the user have `finance:write` permission?

### Issue: Report generation fails
**Check:**
- Are jsPDF and jspdf-autotable installed? (`npm install jspdf jspdf-autotable`)
- Check browser console for errors
- Verify transactions exist for the funding source

---

## Sign-Off Checklist

- [ ] All test suites completed
- [ ] No critical bugs found
- [ ] All edge cases handled gracefully
- [ ] RBAC working correctly
- [ ] Data integrity verified
- [ ] PDF generation working
- [ ] Visual indicators displaying correctly

**Tester Name:** _________________  **Date:** _________________  **Signature:** _________________
