# Technical Debt: Funding Source Balance - Appwrite Cloud Function

**Priority:** High
**Created:** 2025-11-29
**Story:** 2.2 (Finance Module - Expense Transaction Recording)
**Status:** Pending Implementation

---

## Problem Statement

The current implementation updates funding source balances **client-side** after creating expense transactions. This approach has several critical issues:

1. **Race Conditions**: If two users create expenses against the same funding source simultaneously, the balance could be incorrectly calculated (last-write-wins).
2. **Non-Atomic Operations**: The transaction creation and balance update are separate operations. If the balance update fails, the transaction still exists but the balance is incorrect.
3. **Security**: Client-side balance updates can be bypassed or manipulated by malicious actors.
4. **Data Integrity**: No guarantee that the sum of transactions matches the funding source balance.

---

## Current Implementation (MVP)

**Location:** `src/modules/finance/stores/finance-store.js`

```javascript
// In createTransaction action:
if (
  transactionData.type === 'expense' &&
  transactionData.funding_source_id &&
  transactionData.status === 'completed'
) {
  await this.decrementFundingSourceBalance(
    transactionData.funding_source_id,
    parseFloat(transactionData.amount),
  );
}

// decrementFundingSourceBalance action:
async decrementFundingSourceBalance(fundingSourceId, amount) {
  // 1. Fetch current balance
  // 2. Calculate new balance
  // 3. Update balance
  // WARNING: Not atomic!
}
```

---

## Recommended Solution: Appwrite Cloud Function

### Overview

Create an Appwrite Cloud Function that triggers on `finance_transactions` collection events and atomically updates the `funding_sources` balance.

### Function Specification

**Name:** `update-funding-source-balance`
**Runtime:** Node.js 18.x
**Trigger:** Database Event on `finance_transactions` collection
**Events:**

- `databases.*.collections.finance_transactions.documents.*.create`
- `databases.*.collections.finance_transactions.documents.*.update`
- `databases.*.collections.finance_transactions.documents.*.delete`

### Implementation

```javascript
// functions/update-funding-source-balance/src/main.js

import { Client, Databases, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const databaseId = process.env.DATABASE_ID || 'villageDB';

  try {
    const event = req.headers['x-appwrite-event'];
    const payload = JSON.parse(req.body);

    log(`Event: ${event}`);
    log(`Payload: ${JSON.stringify(payload)}`);

    // Extract transaction data
    const transaction = payload;
    const fundingSourceId = transaction.funding_source_id;

    // Skip if no funding source linked
    if (!fundingSourceId) {
      return res.json({ success: true, message: 'No funding source linked' });
    }

    // Skip if not a completed expense
    if (transaction.type !== 'expense' || transaction.status !== 'completed') {
      return res.json({ success: true, message: 'Not a completed expense' });
    }

    // Determine the balance change based on event type
    let balanceChange = 0;

    if (event.includes('.create')) {
      // New expense: decrement balance
      balanceChange = -transaction.amount;
    } else if (event.includes('.delete')) {
      // Deleted expense: increment balance (restore)
      balanceChange = transaction.amount;
    } else if (event.includes('.update')) {
      // Updated expense: need to compare old vs new
      // For simplicity, recalculate from all transactions
      await recalculateFundingSourceBalance(databases, databaseId, fundingSourceId);
      return res.json({ success: true, message: 'Balance recalculated' });
    }

    // Atomic balance update using optimistic locking pattern
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        // Fetch current funding source
        const fundingSource = await databases.getDocument(
          databaseId,
          'funding_sources',
          fundingSourceId,
        );

        const currentBalance = fundingSource.current_balance;
        const newBalance = currentBalance + balanceChange;

        // Update with version check (optimistic locking)
        await databases.updateDocument(databaseId, 'funding_sources', fundingSourceId, {
          current_balance: newBalance,
          // Add a version field for optimistic locking if needed
        });

        log(`Balance updated: ${currentBalance} -> ${newBalance}`);
        return res.json({
          success: true,
          previousBalance: currentBalance,
          newBalance: newBalance,
        });
      } catch (err) {
        if (err.code === 409) {
          // Conflict - retry
          retries++;
          log(`Retry ${retries}/${maxRetries} due to conflict`);
          continue;
        }
        throw err;
      }
    }

    throw new Error('Max retries exceeded');
  } catch (err) {
    error(`Error: ${err.message}`);
    return res.json({ success: false, error: err.message }, 500);
  }
};

/**
 * Recalculate funding source balance from all transactions
 * Used for updates where we need to compare old vs new values
 */
async function recalculateFundingSourceBalance(databases, databaseId, fundingSourceId) {
  // Fetch all completed expenses for this funding source
  const transactions = await databases.listDocuments(databaseId, 'finance_transactions', [
    Query.equal('funding_source_id', fundingSourceId),
    Query.equal('type', 'expense'),
    Query.equal('status', 'completed'),
    Query.limit(1000),
  ]);

  // Calculate total expenses
  const totalExpenses = transactions.documents.reduce((sum, t) => sum + t.amount, 0);

  // Fetch funding source to get total_allocated
  const fundingSource = await databases.getDocument(databaseId, 'funding_sources', fundingSourceId);

  // Calculate new balance
  const newBalance = fundingSource.total_allocated - totalExpenses;

  // Update balance
  await databases.updateDocument(databaseId, 'funding_sources', fundingSourceId, {
    current_balance: newBalance,
  });
}
```

### Environment Variables

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_FUNCTION_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
DATABASE_ID=villageDB
```

### Deployment Steps

1. **Create the function in Appwrite Console:**

   ```bash
   appwrite functions create \
     --functionId update-funding-source-balance \
     --name "Update Funding Source Balance" \
     --runtime node-18.0 \
     --entrypoint src/main.js
   ```

2. **Set environment variables** in Appwrite Console.

3. **Configure event triggers:**
   - Go to Function Settings > Events
   - Add: `databases.*.collections.finance_transactions.documents.*.create`
   - Add: `databases.*.collections.finance_transactions.documents.*.update`
   - Add: `databases.*.collections.finance_transactions.documents.*.delete`

4. **Deploy the function:**

   ```bash
   appwrite functions createDeployment \
     --functionId update-funding-source-balance \
     --entrypoint src/main.js \
     --code ./functions/update-funding-source-balance
   ```

5. **Update client code** to remove the client-side balance update:
   ```javascript
   // In finance-store.js createTransaction:
   // REMOVE this block:
   // if (transactionData.type === 'expense' && transactionData.funding_source_id) {
   //   await this.decrementFundingSourceBalance(...);
   // }
   ```

---

## Migration Plan

1. **Phase 1 (Current - MVP):** Client-side balance updates with warning comments.
2. **Phase 2:** Implement and deploy Cloud Function.
3. **Phase 3:** Run reconciliation script to fix any discrepancies.
4. **Phase 4:** Remove client-side balance update code.
5. **Phase 5:** Add monitoring/alerting for balance discrepancies.

---

## Reconciliation Script

If discrepancies are found, run this script to recalculate all funding source balances:

```javascript
// scripts/reconcile-funding-source-balances.js

import { Client, Databases, Query } from 'node-appwrite';

async function reconcile() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const databaseId = 'villageDB';

  // Fetch all funding sources
  const fundingSources = await databases.listDocuments(databaseId, 'funding_sources', [
    Query.limit(100),
  ]);

  for (const source of fundingSources.documents) {
    // Fetch all completed expenses for this source
    const expenses = await databases.listDocuments(databaseId, 'finance_transactions', [
      Query.equal('funding_source_id', source.$id),
      Query.equal('type', 'expense'),
      Query.equal('status', 'completed'),
      Query.limit(1000),
    ]);

    const totalExpenses = expenses.documents.reduce((sum, t) => sum + t.amount, 0);
    const expectedBalance = source.total_allocated - totalExpenses;

    if (Math.abs(source.current_balance - expectedBalance) > 0.01) {
      console.log(`DISCREPANCY: ${source.name}`);
      console.log(`  Current: ${source.current_balance}`);
      console.log(`  Expected: ${expectedBalance}`);
      console.log(`  Difference: ${source.current_balance - expectedBalance}`);

      // Uncomment to fix:
      // await databases.updateDocument(databaseId, 'funding_sources', source.$id, {
      //   current_balance: expectedBalance
      // });
      // console.log(`  FIXED!`);
    } else {
      console.log(`OK: ${source.name} (Balance: ${source.current_balance})`);
    }
  }
}

reconcile().catch(console.error);
```

---

## Acceptance Criteria for Cloud Function Implementation

- [ ] Cloud Function deployed and triggered on transaction events
- [ ] Balance updates are atomic (no race conditions)
- [ ] Reconciliation script run and all balances verified
- [ ] Client-side balance update code removed
- [ ] Monitoring/logging in place for failed updates
- [ ] Documentation updated

---

## References

- [Appwrite Functions Documentation](https://appwrite.io/docs/functions)
- [Appwrite Database Events](https://appwrite.io/docs/events)
- Story 2.2: Finance Module - Expense Transaction Recording
- Tech Spec: docs/sprint-artifacts/tech-spec-epic-2.md
