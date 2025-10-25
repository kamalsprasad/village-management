# Sustainable Model Village Management System - Architecture Document

**Author:** Kamal S. Prasad  
**Date:** 2024-10-24  
**Project:** Village Management App  
**Project Level:** 3 (Complex System)  
**Version:** 1.0.0

---

## Executive Summary

This architecture document defines the technical decisions, technology stack, and implementation patterns for the Sustainable Model Village Management System. The system is built on Quasar Framework (Vue 3) with SSR, Appwrite backend, and follows a modular, offline-first architecture to support rural African villages with limited connectivity and digital literacy.

**Architecture Approach:** LAN-first web application with 2-day offline buffer, progressive enhancement, and role-based access control supporting 11 distinct user roles across 15+ functional modules.

---

## 1. Project Initialization

**First Implementation Story: Project Setup**

Execute the following commands to initialize the project:

```bash
# Step 1: Create Quasar project
yarn create quasar

# During prompts, select:
# - Project name: village-app
# - CLI type: Vite (recommended)
# - Quasar version: v2
# - Features: Pinia, ESLint, Prettier
# - CSS preprocessor: Sass with SCSS syntax

# Step 2: Navigate to project
cd village-app

# Step 3: Add SSR mode
quasar mode add ssr

# Step 4: Install additional dependencies
yarn add appwrite vue-cal@next dexie date-fns chart.js

# Step 5: Install development dependencies
yarn add -D @types/node
```

**Base Architecture Provided by Starter:**

- ✅ Vue 3 with Composition API
- ✅ Quasar Framework components (Material Design 3)
- ✅ Vite build tooling
- ✅ SSR infrastructure with Node.js server
- ✅ Pinia state management
- ✅ Vue Router
- ✅ ESLint + Prettier
- ✅ Sass/SCSS support
- ✅ Project structure: `/src/pages`, `/src/components`, `/src/layouts`, `/src/stores`, `/src-ssr`

---

## 2. Technology Stack

### 2.1 Core Technologies

| Technology           | Version           | Purpose                                                   | Verification Date |
| -------------------- | ----------------- | --------------------------------------------------------- | ----------------- |
| **Quasar Framework** | v2.18.5           | UI framework, component library, SSR                      | 2025-10-24        |
| **@quasar/app-vite** | v2.4.0            | Vite-based CLI for Quasar                                 | 2025-10-24        |
| **Vue 3**            | v3.5.22           | Frontend framework                                        | 2025-10-24        |
| **Vite**             | v5.x (via Quasar) | Build tool and dev server                                 | 2025-10-24        |
| **Pinia**            | v2.x              | State management                                          | 2025-10-24        |
| **Vue Router**       | v4.x              | Client-side routing                                       | 2025-10-24        |
| **Appwrite**         | v21.2.1           | Backend-as-a-Service (Database, Auth, Storage, Functions) | 2025-10-24        |
| **vue-cal**          | v5.x (next)       | Calendar component for events                             | 2025-10-24        |
| **Chart.js**         | v4.5.1            | Data visualization and analytics                          | 2025-10-24        |
| **Sass/SCSS**        | Latest            | CSS preprocessor                                          | 2025-10-24        |
| **ESLint**           | Latest            | Code linting                                              | 2025-10-24        |
| **Prettier**         | Latest            | Code formatting                                           | 2025-10-24        |
| **Node.js**          | >=20 LTS          | SSR server runtime                                        | 2025-10-24        |

### 2.2 Backend Services (Appwrite)

| Service                | Purpose                                                       |
| ---------------------- | ------------------------------------------------------------- |
| **Appwrite Auth**      | User authentication (email/password), session management      |
| **Appwrite Databases** | NoSQL database for all village data                           |
| **Appwrite Storage**   | File storage with role-based quotas                           |
| **Appwrite Functions** | Serverless functions for complex operations                   |
| **Appwrite Realtime**  | WebSocket connections for live updates (optional enhancement) |

### 2.3 Bulk Data Entry Components

**Approach:** Custom implementation using Quasar QTable with editable cells

**Rationale:**
- No external dependencies required (uses built-in Quasar components)
- Full control over validation and behavior
- Consistent with existing Quasar Framework choice
- Lightweight and performant for rural connectivity constraints

**Implementation Pattern:**

```vue
<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useErrorHandler } from 'composables/useErrorHandler'

const $q = useQuasar()
const { validateForm } = useErrorHandler()

// Bulk entry data structure
const rows = ref([
  { id: 1, learner_name: 'John Doe', score: null, notes: '', errors: {} },
  { id: 2, learner_name: 'Jane Smith', score: null, notes: '', errors: {} },
  // ... more rows
])

const columns = [
  { name: 'learner_name', label: 'Learner Name', field: 'learner_name', align: 'left', sortable: false },
  { name: 'score', label: 'Score (%)', field: 'score', align: 'center', sortable: false },
  { name: 'notes', label: 'Notes', field: 'notes', align: 'left', sortable: false }
]

// Inline validation
function validateScore(row) {
  if (row.score === null || row.score === '') {
    row.errors.score = null
    return true
  }
  
  const score = Number(row.score)
  if (isNaN(score) || score < 0 || score > 100) {
    row.errors.score = 'Score must be between 0 and 100'
    return false
  }
  
  row.errors.score = null
  return true
}

// Auto-save draft every 30 seconds
let autoSaveTimer = null
function startAutoSave() {
  autoSaveTimer = setInterval(() => {
    saveDraft()
  }, 30000)
}

function saveDraft() {
  localStorage.setItem('bulk_entry_draft', JSON.stringify(rows.value))
  $q.notify({ message: 'Draft saved', color: 'info', position: 'bottom-right', timeout: 1000 })
}

// Load draft on mount
function loadDraft() {
  const draft = localStorage.getItem('bulk_entry_draft')
  if (draft) {
    rows.value = JSON.parse(draft)
  }
}

// Save all entries
async function saveAll() {
  // Validate all rows
  let hasErrors = false
  rows.value.forEach(row => {
    if (!validateScore(row)) {
      hasErrors = true
    }
  })
  
  if (hasErrors) {
    $q.notify({ message: 'Please fix validation errors', color: 'negative' })
    return
  }
  
  // Filter rows with data
  const dataToSave = rows.value.filter(row => row.score !== null && row.score !== '')
  
  if (dataToSave.length === 0) {
    $q.notify({ message: 'No data to save', color: 'warning' })
    return
  }
  
  // Save to backend
  try {
    // ... save logic
    $q.notify({ message: `${dataToSave.length} scores saved successfully`, color: 'positive' })
    localStorage.removeItem('bulk_entry_draft')
  } catch (error) {
    $q.notify({ message: 'Failed to save scores', color: 'negative' })
  }
}

// Keyboard navigation
function handleKeydown(event, rowIndex, colName) {
  if (event.key === 'Tab' || event.key === 'Enter') {
    event.preventDefault()
    
    // Move to next editable cell
    if (colName === 'score') {
      // Focus notes field in same row
      const notesInput = document.querySelector(`#notes-${rowIndex}`)
      if (notesInput) notesInput.focus()
    } else if (colName === 'notes') {
      // Move to score field in next row
      if (rowIndex < rows.value.length - 1) {
        const nextScoreInput = document.querySelector(`#score-${rowIndex + 1}`)
        if (nextScoreInput) nextScoreInput.focus()
      }
    }
  }
}
</script>

<template>
  <q-table
    :rows="rows"
    :columns="columns"
    row-key="id"
    flat
    bordered
    dense
    :rows-per-page-options="[0]"
  >
    <template #body="props">
      <q-tr :props="props">
        <q-td key="learner_name" :props="props">
          {{ props.row.learner_name }}
        </q-td>
        
        <q-td key="score" :props="props">
          <q-input
            :id="`score-${props.rowIndex}`"
            v-model.number="props.row.score"
            type="number"
            min="0"
            max="100"
            dense
            borderless
            :error="!!props.row.errors.score"
            :error-message="props.row.errors.score"
            @blur="validateScore(props.row)"
            @keydown="handleKeydown($event, props.rowIndex, 'score')"
            :class="{
              'bg-red-1': props.row.score < 50,
              'bg-yellow-1': props.row.score >= 50 && props.row.score < 60,
              'bg-green-1': props.row.score >= 60
            }"
          />
        </q-td>
        
        <q-td key="notes" :props="props">
          <q-input
            :id="`notes-${props.rowIndex}`"
            v-model="props.row.notes"
            dense
            borderless
            @keydown="handleKeydown($event, props.rowIndex, 'notes')"
          />
        </q-td>
      </q-tr>
    </template>
    
    <template #bottom>
      <div class="row q-pa-md q-gutter-sm full-width justify-between">
        <div>
          <q-btn label="Save Draft" color="secondary" @click="saveDraft" />
          <q-btn label="Load Draft" color="secondary" outline @click="loadDraft" class="q-ml-sm" />
        </div>
        <q-btn label="Save All Scores" color="primary" @click="saveAll" />
      </div>
    </template>
  </q-table>
</template>
```

**Key Features:**
- **Tab Navigation:** Press Tab or Enter to move between cells
- **Inline Validation:** Real-time validation with visual feedback (red for <50%, yellow for 50-60%, green for ≥60%)
- **Auto-Save Draft:** Saves to localStorage every 30 seconds to prevent data loss
- **Keyboard-Friendly:** Optimized for rapid data entry without mouse
- **Lightweight:** No external dependencies, uses native Quasar components

**Usage in Epic 4 Stories:**
- Story 4.2: Bulk test score entry for entire class
- Story 4.3: Bulk attendance recording
- Any future bulk data entry requirements

---

## 3. Decision Summary

### 3.1 Architectural Decisions

| Category                 | Decision                          | Rationale                                                                                    | Affects Epics |
| ------------------------ | --------------------------------- | -------------------------------------------------------------------------------------------- | ------------- |
| **Frontend Framework**   | Quasar Framework (Vue 3) with SSR | Comprehensive component library, SSR support, mobile-responsive, offline PWA capabilities    | All           |
| **Build Tool**           | Vite                              | Faster builds, better DX, modern tooling                                                     | All           |
| **Backend**              | Appwrite BaaS                     | Reduces backend complexity, built-in auth/storage/database, self-hostable for LAN deployment | All           |
| **Authentication**       | Appwrite Auth (email/password)    | Integrated with backend, session management, role-based access                               | Epic 1        |
| **State Management**     | Pinia                             | Official Vue 3 state management, TypeScript support, DevTools integration                    | All           |
| **Calendar Component**   | vue-cal v5                        | Vue 3 compatible, drag-and-drop events, multiple views, lightweight                          | Epic 5        |
| **Charts/Visualization** | Chart.js                          | Lightweight, flexible, extensive chart types                                                 | Epics 2, 3, 4 |
| **CSS Approach**         | Sass/SCSS + Quasar utilities      | Quasar provides utility classes, SCSS for custom styling                                     | All           |
| **Code Quality**         | ESLint + Prettier                 | Consistent code style, catch errors early                                                    | All           |
| **Language**             | JavaScript (ES2022+)              | MVP uses JS, TypeScript post-MVP per PRD                                                     | All           |
| **Deployment**           | LAN-first (local server)          | Intermittent connectivity, self-hosted, no cloud dependency                                  | All           |
| **Offline Sync**         | IndexedDB + Dexie.js              | Reliable offline storage, sync queue for 2-day buffer, conflict resolution                   | All           |
| **Database Schema**      | Normalized (relational via IDs)    | Separate collections, ID-based relationships, prevents duplication                           | All           |
| **Error Handling**       | Composable pattern (useErrorHandler) | Consistent, reusable, context-aware error handling                                         | All           |
| **Date/Time Handling**   | date-fns                           | Lightweight, tree-shakeable, simple API for formatting and manipulation                     | All           |
| **Form Validation**      | Custom (useErrorHandler.validateForm) | Built-in validation, no extra dependencies, consistent with error handling                 | All           |
| **File Upload**          | Appwrite Storage with chunking     | Automatic chunking for large files, progress tracking, quota enforcement                   | Epic 5        |
| **Component Syntax**     | Vue 3 `<script setup>`             | Composition API, no export default, cleaner syntax                                          | All           |
| **API Style**            | Hybrid REST + GraphQL              | REST for transactional writes, GraphQL for dashboard/report queries                         | All           |
| **Backend Extensions**   | Node.js Express microservice       | Handles sensitive workflows, complex business logic, secure integration with Appwrite       | Epics 2-5     |

---

## 4. Offline Architecture

### 4.1 Offline Sync Strategy

**Technology:** Dexie.js (IndexedDB wrapper) + Custom Sync Queue

**Installation:**
```bash
yarn add dexie
```

**Architecture Pattern:**

```javascript
// src/boot/offline.js
import Dexie from 'dexie'

export const db = new Dexie('VillageAppDB')

db.version(1).stores({
  syncQueue: '++id, timestamp, status, module, operation',
  cachedResidents: '$id, household_id, updated_at',
  cachedHouseholds: '$id, updated_at',
  cachedTransactions: '$id, date, updated_at',
  cachedPlots: '$id, updated_at',
  cachedLearners: '$id, resident_id, updated_at',
  // ... other cached collections
})

// Sync queue item structure
// {
//   id: auto-increment,
//   timestamp: Date,
//   status: 'pending' | 'syncing' | 'completed' | 'failed',
//   module: 'residents' | 'finance' | 'farm' | 'school',
//   operation: 'create' | 'update' | 'delete',
//   collection: 'residents',
//   documentId: string,
//   data: object,
//   retryCount: number,
//   error: string
// }
```

**Sync Flow:**

1. **Offline Detection:**
   - Monitor `navigator.onLine` events
   - Ping Appwrite server every 30 seconds
   - Update global offline state in Pinia

2. **Write Operations (Create/Update/Delete):**
   - If online: Direct Appwrite API call
   - If offline: 
     - Save to local IndexedDB cache
     - Add operation to sync queue
     - Show user confirmation with "pending sync" badge

3. **Read Operations:**
   - If online: Fetch from Appwrite, update local cache
   - If offline: Read from IndexedDB cache
   - Show "offline mode" indicator

4. **Sync Process (when connection restored):**
   - Process sync queue in FIFO order
   - For each item:
     - Execute Appwrite operation
     - On success: Mark as completed, update cache
     - On conflict: Show conflict resolution UI
     - On error: Increment retry count, mark as failed after 3 attempts
   - Show sync progress notification

**Conflict Resolution:**
- Last-write-wins for simple fields
- User prompt for complex conflicts (e.g., both online and offline edits)
- Field-level conflict highlighting with merge strategy
- Optimistic locking to prevent conflicts
- Preserve both versions in conflict log for admin review
- **See UX Specification Flow 4 (Section 3, Flow 4) for detailed conflict resolution UI patterns**

### 4.2 Offline Composable

```javascript
// src/composables/useOffline.js
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useQuasar } from 'quasar'
import { db } from 'boot/offline'
import { databases } from 'boot/appwrite'

const isOnline = ref(navigator.onLine)
const isSyncing = ref(false)
const syncProgress = ref({ total: 0, completed: 0 })
const lastPingAt = ref(null)

const CONNECTIVITY_PING_INTERVAL = 30_000

let connectivityTimer = null
let activeInstances = 0

function startConnectivityTimer(pingFn) {
  if (connectivityTimer) return
  connectivityTimer = window.setInterval(pingFn, CONNECTIVITY_PING_INTERVAL)
}

function stopConnectivityTimer() {
  if (!connectivityTimer) return
  window.clearInterval(connectivityTimer)
  connectivityTimer = null
}

export function useOffline() {
  const $q = useQuasar()

  const notifyOnce = (message, color) => {
    $q.notify({ message, color, position: 'top' })
  }

  const handleOnline = () => {
    if (!isOnline.value) {
      notifyOnce('Connection restored. Syncing pending changes…', 'positive')
    }
    isOnline.value = true
    syncPendingOperations()
  }

  const handleOffline = () => {
    if (isOnline.value) {
      notifyOnce('You are offline. Changes will sync automatically when reconnected.', 'warning')
    }
    isOnline.value = false
  }

  const pingServer = async () => {
    if (!navigator.onLine) {
      handleOffline()
      return
    }

    try {
      const healthEndpoint = `${process.env.APPWRITE_ENDPOINT || ''}/health/ping`
      await fetch(healthEndpoint, { method: 'GET', cache: 'no-store' })
      lastPingAt.value = Date.now()
      handleOnline()
    } catch (error) {
      console.warn('Connectivity ping failed', error)
      handleOffline()
    }
  }

  async function queueOperation(module, operation, collection, documentId, data) {
    await db.syncQueue.add({
      timestamp: new Date(),
      status: 'pending',
      module,
      operation,
      collection,
      documentId,
      data,
      retryCount: 0
    })
  }

  async function syncPendingOperations() {
    if (isSyncing.value || !isOnline.value) return

    isSyncing.value = true
    const pending = await db.syncQueue.where('status').equals('pending').toArray()
    syncProgress.value = { total: pending.length, completed: 0 }

    for (const item of pending) {
      try {
        await db.syncQueue.update(item.id, { status: 'syncing' })

        if (item.operation === 'create') {
          await databases.createDocument(
            process.env.APPWRITE_DATABASE_ID,
            item.collection,
            item.documentId,
            item.data
          )
        } else if (item.operation === 'update') {
          await databases.updateDocument(
            process.env.APPWRITE_DATABASE_ID,
            item.collection,
            item.documentId,
            item.data
          )
        } else if (item.operation === 'delete') {
          await databases.deleteDocument(
            process.env.APPWRITE_DATABASE_ID,
            item.collection,
            item.documentId
          )
        }

        await db.syncQueue.update(item.id, { status: 'completed' })
        syncProgress.value.completed++
      } catch (error) {
        const retryCount = item.retryCount + 1
        const nextStatus = retryCount >= 3 ? 'failed' : 'pending'

        await db.syncQueue.update(item.id, {
          status: nextStatus,
          retryCount,
          error: error.message
        })

        if (nextStatus === 'failed') {
          notifyOnce('Failed to sync an item. Please review the sync queue.', 'negative')
        }
      }
    }

    isSyncing.value = false

    if (syncProgress.value.total > 0) {
      notifyOnce('Offline changes are now in sync.', 'positive')
    }
  }

  onMounted(() => {
    activeInstances += 1
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    pingServer()
    startConnectivityTimer(pingServer)
  })

  onBeforeUnmount(() => {
    activeInstances = Math.max(activeInstances - 1, 0)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    if (activeInstances === 0) {
      stopConnectivityTimer()
    }
  })

  return {
    isOnline: computed(() => isOnline.value),
    isSyncing: computed(() => isSyncing.value),
    syncProgress: computed(() => syncProgress.value),
    lastPingAt: computed(() => lastPingAt.value),
    queueOperation,
    syncPendingOperations,
    pingServer
  }
}
```

---

## 5. Error Handling Architecture

### 5.1 Error Handler Composable

**Installation:**
```bash
# No additional packages needed - uses Quasar Notify plugin
```

**Implementation:**

```javascript
// src/composables/useErrorHandler.js
import { useQuasar } from 'quasar'

export function useErrorHandler() {
  const $q = useQuasar()
  
  /**
   * Centralized error handler
   * @param {Error} error - The error object
   * @param {Object} context - Context information
   * @param {string} context.module - Module name (e.g., 'residents', 'finance')
   * @param {string} context.operation - Operation type (e.g., 'create', 'update', 'fetch')
   * @param {boolean} context.silent - If true, don't show notification
   * @param {string} context.customMessage - Override default error message
   */
  function handleError(error, context = {}) {
    const { module = 'app', operation = 'operation', silent = false, customMessage } = context
    
    // Log to console for debugging
    console.error(`[${module}] Error during ${operation}:`, error)
    
    // Determine user-friendly message
    let userMessage = customMessage || getErrorMessage(error, module, operation)
    
    // Show notification unless silent
    if (!silent) {
      $q.notify({
        type: 'negative',
        message: userMessage,
        caption: error.message,
        position: 'top',
        timeout: 5000,
        actions: [
          { label: 'Dismiss', color: 'white' }
        ]
      })
    }
    
    // Log to error tracking service (future enhancement)
    // logToErrorService(error, context)
    
    return { error, userMessage }
  }
  
  /**
   * Get user-friendly error message based on error type
   */
  function getErrorMessage(error, module, operation) {
    // Network errors
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return 'Network error. Please check your connection and try again.'
    }
    
    // Appwrite-specific errors
    if (error.code === 401) {
      return 'Your session has expired. Please log in again.'
    }
    if (error.code === 403) {
      return 'You do not have permission to perform this action.'
    }
    if (error.code === 404) {
      return `The requested ${module} record was not found.`
    }
    if (error.code === 409) {
      return 'This record has been modified by another user. Please refresh and try again.'
    }
    if (error.code === 500) {
      return 'Server error. Please try again later or contact support.'
    }
    
    // Validation errors
    if (error.type === 'validation') {
      return error.message || 'Please check your input and try again.'
    }
    
    // Generic fallback
    return `Failed to ${operation} ${module}. Please try again.`
  }
  
  /**
   * Handle async operations with automatic error handling
   * @param {Function} asyncFn - Async function to execute
   * @param {Object} context - Error context
   * @returns {Promise} - Result or null on error
   */
  async function withErrorHandling(asyncFn, context = {}) {
    try {
      return await asyncFn()
    } catch (error) {
      handleError(error, context)
      return null
    }
  }
  
  /**
   * Validate form data and show errors
   * @param {Object} data - Form data to validate
   * @param {Object} rules - Validation rules
   * @returns {Object} - { isValid: boolean, errors: Object }
   */
  function validateForm(data, rules) {
    const errors = {}
    let isValid = true
    
    for (const [field, fieldRules] of Object.entries(rules)) {
      const value = data[field]
      
      if (fieldRules.required && (!value || value.toString().trim() === '')) {
        errors[field] = `${fieldRules.label || field} is required`
        isValid = false
      }
      
      if (fieldRules.min && value < fieldRules.min) {
        errors[field] = `${fieldRules.label || field} must be at least ${fieldRules.min}`
        isValid = false
      }
      
      if (fieldRules.max && value > fieldRules.max) {
        errors[field] = `${fieldRules.label || field} must be at most ${fieldRules.max}`
        isValid = false
      }
      
      if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
        errors[field] = fieldRules.message || `${fieldRules.label || field} is invalid`
        isValid = false
      }
      
      if (fieldRules.custom && !fieldRules.custom(value, data)) {
        errors[field] = fieldRules.message || `${fieldRules.label || field} is invalid`
        isValid = false
      }
    }
    
    if (!isValid) {
      $q.notify({
        type: 'negative',
        message: 'Please correct the errors in the form',
        position: 'top'
      })
    }
    
    return { isValid, errors }
  }
  
  return {
    handleError,
    withErrorHandling,
    validateForm
  }
}
```

### 5.2 Usage Examples

**In a Component:**

```vue
<script setup>
import { ref } from 'vue'
import { useErrorHandler } from 'composables/useErrorHandler'
import { databases } from 'boot/appwrite'

const { handleError, withErrorHandling, validateForm } = useErrorHandler()
const resident = ref({})
const loading = ref(false)

// Example 1: Manual error handling
async function saveResident() {
  loading.value = true
  try {
    await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID,
      'residents',
      'unique()',
      resident.value
    )
    $q.notify({ message: 'Resident saved successfully', color: 'positive' })
  } catch (error) {
    handleError(error, {
      module: 'residents',
      operation: 'create',
      customMessage: 'Failed to save resident information'
    })
  } finally {
    loading.value = false
  }
}

// Example 2: Automatic error handling
async function fetchResident(id) {
  loading.value = true
  const result = await withErrorHandling(
    () => databases.getDocument(
      process.env.APPWRITE_DATABASE_ID,
      'residents',
      id
    ),
    { module: 'residents', operation: 'fetch' }
  )
  loading.value = false
  
  if (result) {
    resident.value = result
  }
}

// Example 3: Form validation
function onSubmit() {
  const { isValid, errors } = validateForm(resident.value, {
    full_name: { required: true, label: 'Full Name' },
    date_of_birth: { required: true, label: 'Date of Birth' },
    contact_phone: {
      pattern: /^\+?[0-9]{10,15}$/,
      message: 'Please enter a valid phone number'
    },
    contact_email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address'
    }
  })
  
  if (isValid) {
    saveResident()
  }
}
</script>
```

**In a Pinia Store:**

```javascript
// src/stores/residents.js
import { defineStore } from 'pinia'
import { databases } from 'boot/appwrite'
import { useErrorHandler } from 'composables/useErrorHandler'

export const useResidentsStore = defineStore('residents', {
  state: () => ({
    residents: [],
    loading: false
  }),
  
  actions: {
    async fetchResidents() {
      const { withErrorHandling } = useErrorHandler()
      
      this.loading = true
      const result = await withErrorHandling(
        () => databases.listDocuments(
          process.env.APPWRITE_DATABASE_ID,
          'residents',
          []
        ),
        { module: 'residents', operation: 'fetch list' }
      )
      this.loading = false
      
      if (result) {
        this.residents = result.documents
      }
    }
  }
})
```

---

## 6. Database Architecture

### 6.1 Schema Design Principles

**Normalized Schema Approach:**
- Each entity has its own collection
- Relationships stored as document IDs
- No data duplication across collections
- Updates propagate through ID references

**Benefits:**
- Single source of truth for each entity
- Easier to maintain data consistency
- Flexible querying with Appwrite indexes
- Smaller document sizes

**Trade-offs:**
- Multiple queries for related data (mitigated by caching and batch fetching)
- Need to manually join data in application layer

### 6.2 Collection Naming Convention

- Use lowercase with underscores: `finance_transactions`, `test_scores`
- Plural nouns for collections: `residents`, `households`, `plots`
- Descriptive names that match domain language

### 6.3 Relationship Patterns

**One-to-Many:**
```javascript
// Household (one) → Residents (many)
// residents collection
{
  $id: 'resident_123',
  household_id: 'household_456',  // Foreign key
  full_name: 'John Doe'
}

// To fetch household with residents:
const household = await databases.getDocument(dbId, 'households', householdId)
const residents = await databases.listDocuments(dbId, 'residents', [
  Query.equal('household_id', householdId)
])
```

**Many-to-Many:**
```javascript
// Residents (many) ↔ Roles (many)
// residents collection
{
  $id: 'resident_123',
  role_ids: ['role_admin', 'role_teacher'],  // Array of role IDs
  primary_role: 'role_teacher'
}

// To fetch resident with roles:
const resident = await databases.getDocument(dbId, 'residents', residentId)
const roles = await Promise.all(
  resident.role_ids.map(roleId => 
    databases.getDocument(dbId, 'roles', roleId)
  )
)
```

**Cascading References:**
```javascript
// Plot → Planting → Harvest → Sale → Finance Transaction
// Each level stores ID of parent

// planting
{
  $id: 'planting_123',
  plot_id: 'plot_456',
  crop_id: 'crop_789'
}

// harvest
{
  $id: 'harvest_111',
  planting_id: 'planting_123'  // References parent
}

// farm_sales
{
  $id: 'sale_222',
  harvest_id: 'harvest_111',
  finance_transaction_id: 'txn_333'  // Auto-created link
}
```

### 6.4 Index Strategy

**Primary Indexes (for all collections):**
- `$id` (automatic)
- `created_at` (for sorting)
- `updated_at` (for sync)

**Foreign Key Indexes:**
- Index all `*_id` fields used in queries
- Examples: `household_id`, `resident_id`, `plot_id`, `learner_id`

**Query Optimization Indexes:**
- `status` fields (for filtering active/inactive records)
- `date` fields (for date range queries)
- `type` or `category` fields (for grouping)

**Compound Indexes (for common queries):**
- `learner_id + test_date` (for student performance over time)
- `plot_id + status` (for active plantings on a plot)
- `transaction_type + date` (for financial reports)

---

## 7. Date/Time Handling

### 7.1 date-fns Integration

**Installation:**
```bash
yarn add date-fns
```

**Usage Pattern:**

```javascript
// src/utils/dateHelpers.js
import { format, parseISO, isAfter, isBefore, differenceInDays, addDays } from 'date-fns'

/**
 * Format date for display
 * @param {Date|string} date - Date object or ISO string
 * @param {string} formatStr - Format pattern (default: 'dd MMM yyyy')
 */
export function formatDate(date, formatStr = 'dd MMM yyyy') {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr)
}

/**
 * Format datetime for display
 */
export function formatDateTime(date, formatStr = 'dd MMM yyyy HH:mm') {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr)
}

/**
 * Format date for Appwrite (ISO 8601)
 */
export function toISOString(date) {
  if (!date) return null
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return dateObj.toISOString()
}

/**
 * Calculate days between dates
 */
export function daysBetween(startDate, endDate) {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate
  return differenceInDays(end, start)
}

/**
 * Check if date is in the past
 */
export function isPast(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return isBefore(dateObj, new Date())
}

/**
 * Add days to a date
 */
export function addDaysToDate(date, days) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return addDays(dateObj, days)
}

/**
 * Get relative time (e.g., "2 days ago", "in 3 days")
 */
export function getRelativeTime(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const days = differenceInDays(new Date(), dateObj)
  
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days === -1) return 'Tomorrow'
  if (days > 0) return `${days} days ago`
  return `in ${Math.abs(days)} days`
}
```

**Usage in Components:**

```vue
<script setup>
import { ref } from 'vue'
import { formatDate, formatDateTime, toISOString } from 'src/utils/dateHelpers'

const planting = ref({
  planting_date: new Date(),
  expected_harvest_date: null
})

// Display formatted date
const displayDate = formatDate(planting.value.planting_date) // "24 Oct 2025"

// Save to Appwrite
async function savePlanting() {
  const data = {
    ...planting.value,
    planting_date: toISOString(planting.value.planting_date)
  }
  // ... save to Appwrite
}
</script>

<template>
  <div>
    <p>Planting Date: {{ formatDate(planting.planting_date) }}</p>
    <p>Created: {{ formatDateTime(planting.created_at) }}</p>
  </div>
</template>
```

---

## 8. File Upload Architecture

### 8.1 Appwrite Storage Integration

**Storage Buckets:**
- `resident_files` - Personal documents (ID cards, certificates)
- `school_files` - Educational materials, reports
- `farm_files` - Farm photos, harvest records
- `village_files` - General village documents

**Quota Enforcement:**
- Configured per role in `roles` collection
- Checked before upload
- Enforced by Appwrite permissions

### 8.2 File Upload Composable

```javascript
// src/composables/useFileUpload.js
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { storage } from 'boot/appwrite'
import { useAuthStore } from 'stores/auth'
import { ID } from 'appwrite'

export function useFileUpload(bucketId) {
  const $q = useQuasar()
  const authStore = useAuthStore()
  
  const uploading = ref(false)
  const uploadProgress = ref(0)
  const uploadedFiles = ref([])
  
  /**
   * Upload file with progress tracking
   * @param {File} file - File object from input
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Uploaded file metadata
   */
  async function uploadFile(file, options = {}) {
    const {
      permissions = [],
      onProgress = null,
      metadata = {}
    } = options
    
    // Check file size against quota
    const userQuota = authStore.user?.storage_quota_gb || 1
    const maxSizeBytes = userQuota * 1024 * 1024 * 1024
    
    if (file.size > maxSizeBytes) {
      $q.notify({
        type: 'negative',
        message: `File size exceeds your quota of ${userQuota}GB`,
        position: 'top'
      })
      throw new Error('File size exceeds quota')
    }
    
    uploading.value = true
    uploadProgress.value = 0
    
    try {
      // Create file in Appwrite Storage
      const fileId = ID.unique()
      const result = await storage.createFile(
        bucketId,
        fileId,
        file,
        permissions,
        // Progress callback
        (progress) => {
          uploadProgress.value = Math.round((progress.chunksUploaded / progress.chunksTotal) * 100)
          if (onProgress) {
            onProgress(uploadProgress.value)
          }
        }
      )
      
      // Store metadata
      const fileMetadata = {
        $id: result.$id,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        bucketId,
        uploadedBy: authStore.user.$id,
        uploadedAt: new Date().toISOString(),
        ...metadata
      }
      
      uploadedFiles.value.push(fileMetadata)
      
      $q.notify({
        type: 'positive',
        message: `${file.name} uploaded successfully`,
        position: 'top'
      })
      
      return fileMetadata
      
    } catch (error) {
      console.error('Upload error:', error)
      $q.notify({
        type: 'negative',
        message: `Failed to upload ${file.name}`,
        caption: error.message,
        position: 'top'
      })
      throw error
      
    } finally {
      uploading.value = false
      uploadProgress.value = 0
    }
  }
  
  /**
   * Upload multiple files
   */
  async function uploadMultipleFiles(files, options = {}) {
    const results = []
    
    for (const file of files) {
      try {
        const result = await uploadFile(file, options)
        results.push(result)
      } catch (error) {
        // Continue with next file even if one fails
        console.error(`Failed to upload ${file.name}:`, error)
      }
    }
    
    return results
  }
  
  /**
   * Delete file
   */
  async function deleteFile(fileId) {
    try {
      await storage.deleteFile(bucketId, fileId)
      uploadedFiles.value = uploadedFiles.value.filter(f => f.$id !== fileId)
      
      $q.notify({
        type: 'positive',
        message: 'File deleted successfully',
        position: 'top'
      })
      
    } catch (error) {
      console.error('Delete error:', error)
      $q.notify({
        type: 'negative',
        message: 'Failed to delete file',
        caption: error.message,
        position: 'top'
      })
      throw error
    }
  }
  
  /**
   * Get file preview URL
   */
  function getFilePreview(fileId, width = 400, height = 400) {
    return storage.getFilePreview(bucketId, fileId, width, height)
  }
  
  /**
   * Get file download URL
   */
  function getFileDownload(fileId) {
    return storage.getFileDownload(bucketId, fileId)
  }
  
  /**
   * Get file view URL
   */
  function getFileView(fileId) {
    return storage.getFileView(bucketId, fileId)
  }
  
  return {
    uploading: computed(() => uploading.value),
    uploadProgress: computed(() => uploadProgress.value),
    uploadedFiles: computed(() => uploadedFiles.value),
    uploadFile,
    uploadMultipleFiles,
    deleteFile,
    getFilePreview,
    getFileDownload,
    getFileView
  }
}
```

### 8.3 File Upload Component Example

```vue
<script setup>
import { ref } from 'vue'
import { useFileUpload } from 'composables/useFileUpload'

const props = defineProps({
  bucketId: {
    type: String,
    required: true
  },
  maxFiles: {
    type: Number,
    default: 5
  }
})

const emit = defineEmits(['uploaded'])

const { 
  uploading, 
  uploadProgress, 
  uploadedFiles,
  uploadFile,
  deleteFile,
  getFilePreview 
} = useFileUpload(props.bucketId)

const fileInput = ref(null)

async function onFileSelected(files) {
  if (!files || files.length === 0) return
  
  for (const file of files) {
    try {
      const result = await uploadFile(file, {
        metadata: {
          category: 'general'
        }
      })
      emit('uploaded', result)
    } catch (error) {
      // Error already handled in composable
    }
  }
}

function onRemoveFile(fileId) {
  deleteFile(fileId)
}
</script>

<template>
  <div class="file-upload-component">
    <q-file
      v-model="fileInput"
      multiple
      :max-files="maxFiles"
      label="Upload files"
      outlined
      @update:model-value="onFileSelected"
      :disable="uploading"
    >
      <template v-slot:prepend>
        <q-icon name="attach_file" />
      </template>
    </q-file>
    
    <!-- Upload Progress -->
    <q-linear-progress
      v-if="uploading"
      :value="uploadProgress / 100"
      color="primary"
      class="q-mt-md"
    />
    
    <!-- Uploaded Files List -->
    <q-list v-if="uploadedFiles.length > 0" class="q-mt-md">
      <q-item v-for="file in uploadedFiles" :key="file.$id">
        <q-item-section avatar>
          <q-avatar>
            <img 
              v-if="file.mimeType.startsWith('image/')"
              :src="getFilePreview(file.$id, 100, 100)" 
              alt="preview"
            />
            <q-icon v-else name="insert_drive_file" />
          </q-avatar>
        </q-item-section>
        
        <q-item-section>
          <q-item-label>{{ file.name }}</q-item-label>
          <q-item-label caption>
            {{ (file.size / 1024).toFixed(2) }} KB
          </q-item-label>
        </q-item-section>
        
        <q-item-section side>
          <q-btn
            flat
            round
            dense
            icon="delete"
            color="negative"
            @click="onRemoveFile(file.$id)"
          />
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>
```

---

## 9. Component Coding Standards

### 9.1 Vue 3 Script Setup Syntax

**ALWAYS use `<script setup>` - NEVER use `export default`**

**✅ CORRECT:**
```vue
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  residentId: String
})

const emit = defineEmits(['saved'])

const resident = ref({})
const loading = ref(false)

const fullName = computed(() => resident.value.full_name)

onMounted(() => {
  fetchResident()
})

async function fetchResident() {
  // implementation
}
</script>
```

**❌ INCORRECT:**
```vue
<script>
export default {
  name: 'ResidentDetail',
  props: {
    residentId: String
  },
  data() {
    return {
      resident: {},
      loading: false
    }
  },
  computed: {
    fullName() {
      return this.resident.full_name
    }
  }
}
</script>
```

### 9.2 Component Structure Template

```vue
<script setup>
// 1. Imports
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useErrorHandler } from 'composables/useErrorHandler'
import { databases } from 'boot/appwrite'

// 2. Props
const props = defineProps({
  itemId: {
    type: String,
    required: true
  }
})

// 3. Emits
const emit = defineEmits(['saved', 'cancelled'])

// 4. Composables
const router = useRouter()
const $q = useQuasar()
const { handleError, validateForm } = useErrorHandler()

// 5. Reactive State
const item = ref({})
const loading = ref(false)
const errors = ref({})

// 6. Computed Properties
const isValid = computed(() => {
  return item.value.name && item.value.name.length > 0
})

// 7. Lifecycle Hooks
onMounted(() => {
  fetchItem()
})

// 8. Methods
async function fetchItem() {
  // implementation
}

async function saveItem() {
  // implementation
}

function cancel() {
  emit('cancelled')
  router.back()
}
</script>

<template>
  <!-- Template content -->
</template>

<style scoped lang="scss">
/* Component-specific styles */
</style>
```

### 9.3 Naming Conventions

**Files:**
- Components: PascalCase (e.g., `ResidentCard.vue`, `PlotDetailPage.vue`)
- Composables: camelCase with `use` prefix (e.g., `useAuth.js`, `useOffline.js`)
- Utilities: camelCase (e.g., `dateHelpers.js`, `permissions.js`)
- Stores: camelCase (e.g., `residents.js`, `finance.js`)

**Variables:**
- Reactive refs: camelCase (e.g., `const loading = ref(false)`)
- Constants: UPPER_SNAKE_CASE (e.g., `const MAX_FILE_SIZE = 5242880`)
- Functions: camelCase (e.g., `async function fetchResidents()`)

**Components:**
- Props: camelCase in script, kebab-case in template
- Events: kebab-case (e.g., `@resident-saved`, `@form-submitted`)

---

## 10. API Architecture

### 10.1 Hybrid Strategy Overview

- **Transactional Mutations (REST):**
  - All create/update/delete operations use Appwrite's REST/SDK interface.
  - Ensures strong consistency, leverages Appwrite permissions, and aligns with offline sync queue format.
  - REST endpoints called directly from Pinia actions and boot files via Appwrite SDK.

- **Read-Heavy Aggregations (GraphQL):**
  - A dedicated Apollo GraphQL server (running alongside the Express microservice) exposes optimized queries for dashboards, reports, and cross-module analytics.
  - GraphQL resolvers compose data from Appwrite databases, cache layers, and the offline queue to reduce round-trips.
  - Supports flexible filtering/sorting for UX widgets without multiple REST calls.

### 10.2 Usage Guidelines

| Scenario | Interface | Notes |
|----------|-----------|-------|
| Residents CRUD | Appwrite REST (SDK) | Go through Pinia stores; participates in offline queue |
| Financial transaction creation | REST | Guarantees atomic write + audit log |
| Dashboard widgets (multi-module) | GraphQL | Single query returns stitched data (e.g., farm yield + finance revenue) |
| Reporting / export | GraphQL | Allows complex filters, pagination, server-side aggregation |
| Mobile field updates | REST | Simpler payloads, resilient offline sync |

### 10.3 Example GraphQL Resolver Flow

1. Client requests `villageOverview` query (plots, harvest totals, learner attendance).
2. Apollo resolver authenticates via Appwrite JWT and checks RBAC role.
3. Resolver fetches required documents via Appwrite SDK, applies business rules, merges results.
4. Response cached (5 min) to reduce load; invalidated when related REST mutation succeeds.

### 10.4 Authentication & Authorization

- REST path relies on Appwrite sessions/tokens.
- GraphQL server validates Appwrite JWT (passed via headers) before resolving.
- Role-based permissions reused inside resolvers using `permissions.js` helpers.
- Support for service-level API keys for scheduled jobs and reporting tools.

### 10.5 GraphQL Schema Design

**Installation:**
```bash
yarn add graphql graphql-http apollo-server-express
```

**Schema Definition (schema.graphql):**

```graphql
# Village Overview Dashboard Query
type Query {
  villageOverview: VillageOverview!
  farmDashboard(dateRange: DateRangeInput): FarmDashboard!
  schoolDashboard(term: String): SchoolDashboard!
  financeDashboard(dateRange: DateRangeInput): FinanceDashboard!
}

# Village Overview Types
type VillageOverview {
  residents: ResidentsSummary!
  households: HouseholdsSummary!
  recentActivity: [ActivityItem!]!
}

type ResidentsSummary {
  total: Int!
  byRole: [RoleCount!]!
  recentAdditions: [Resident!]!
}

type RoleCount {
  role: String!
  count: Int!
}

type Resident {
  id: ID!
  fullName: String!
  roles: [String!]!
  householdName: String
}

type HouseholdsSummary {
  total: Int!
  byType: [TypeCount!]!
}

type TypeCount {
  type: String!
  count: Int!
}

type ActivityItem {
  id: ID!
  type: String!
  description: String!
  timestamp: String!
  module: String!
}

# Farm Dashboard Types
type FarmDashboard {
  plots: PlotsSummary!
  upcomingHarvests: [UpcomingHarvest!]!
  recentSales: [FarmSale!]!
  profitSummary: ProfitSummary!
  inventoryAlerts: [InventoryAlert!]!
}

type PlotsSummary {
  total: Int!
  active: Int!
  fallow: Int!
  plots: [PlotOverview!]!
}

type PlotOverview {
  id: ID!
  name: String!
  size: Float!
  status: String!
  currentCrop: String
  cropManager: String
}

type UpcomingHarvest {
  id: ID!
  plotName: String!
  cropName: String!
  expectedDate: String!
  daysUntil: Int!
}

type FarmSale {
  id: ID!
  cropName: String!
  quantity: Float!
  revenue: Float!
  profit: Float!
  date: String!
}

type ProfitSummary {
  totalRevenue: Float!
  totalCosts: Float!
  netProfit: Float!
  topCrops: [CropProfit!]!
}

type CropProfit {
  cropName: String!
  profit: Float!
}

type InventoryAlert {
  id: ID!
  itemName: String!
  currentQuantity: Float!
  reorderThreshold: Float!
  severity: String!
}

# School Dashboard Types
type SchoolDashboard {
  atRiskLearners: [AtRiskLearner!]!
  classPerformance: [ClassPerformance!]!
  attendanceSummary: AttendanceSummary!
  activeInterventions: Int!
}

type AtRiskLearner {
  id: ID!
  fullName: String!
  grade: String!
  subjectsBelowThreshold: [SubjectScore!]!
  attendancePercentage: Float!
}

type SubjectScore {
  subject: String!
  score: Float!
}

type ClassPerformance {
  grade: String!
  averageScore: Float!
  totalLearners: Int!
}

type AttendanceSummary {
  thisWeek: Float!
  lastWeek: Float!
  trend: String!
}

# Finance Dashboard Types
type FinanceDashboard {
  cashBalance: Float!
  incomeThisMonth: IncomeSummary!
  expensesThisMonth: ExpenseSummary!
  pendingLoans: LoansSummary!
  budgetVsActual: [BudgetItem!]!
}

type IncomeSummary {
  total: Float!
  bySource: [SourceAmount!]!
}

type ExpenseSummary {
  total: Float!
  byCategory: [CategoryAmount!]!
}

type SourceAmount {
  source: String!
  amount: Float!
}

type CategoryAmount {
  category: String!
  amount: Float!
}

type LoansSummary {
  count: Int!
  totalAmountDue: Float!
}

type BudgetItem {
  category: String!
  budgeted: Float!
  actual: Float!
  variance: Float!
}

# Input Types
input DateRangeInput {
  startDate: String!
  endDate: String!
}
```

### 10.6 GraphQL Server Implementation

**Server Setup (src-ssr/graphql/server.js):**

```javascript
import express from 'express'
import { createHandler } from 'graphql-http/lib/use/express'
import { buildSchema } from 'graphql'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Client, Databases, Query } from 'node-appwrite'

// Load schema
const schemaSDL = readFileSync(join(__dirname, 'schema.graphql'), 'utf-8')
const schema = buildSchema(schemaSDL)

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY)

const databases = new Databases(client)
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID

// Root resolver
const root = {
  villageOverview: async (args, context) => {
    // Verify authentication
    if (!context.user) {
      throw new Error('Unauthorized')
    }

    // Fetch residents summary
    const residentsResponse = await databases.listDocuments(
      DATABASE_ID,
      'residents',
      [Query.limit(100)]
    )

    const residents = residentsResponse.documents
    const totalResidents = residentsResponse.total

    // Count by role
    const roleCount = {}
    residents.forEach(resident => {
      resident.role_ids.forEach(roleId => {
        roleCount[roleId] = (roleCount[roleId] || 0) + 1
      })
    })

    const byRole = Object.entries(roleCount).map(([role, count]) => ({
      role,
      count
    }))

    // Get recent additions (last 5)
    const recentAdditions = residents
      .sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt))
      .slice(0, 5)
      .map(r => ({
        id: r.$id,
        fullName: r.full_name,
        roles: r.role_ids,
        householdName: r.household_name
      }))

    // Fetch households summary
    const householdsResponse = await databases.listDocuments(
      DATABASE_ID,
      'households',
      [Query.limit(100)]
    )

    const households = householdsResponse.documents
    const totalHouseholds = householdsResponse.total

    // Count by type
    const typeCount = {}
    households.forEach(household => {
      const type = household.household_type || 'Other'
      typeCount[type] = (typeCount[type] || 0) + 1
    })

    const byType = Object.entries(typeCount).map(([type, count]) => ({
      type,
      count
    }))

    // Fetch recent activity (simplified - would need activity log collection)
    const recentActivity = []

    return {
      residents: {
        total: totalResidents,
        byRole,
        recentAdditions
      },
      households: {
        total: totalHouseholds,
        byType
      },
      recentActivity
    }
  },

  farmDashboard: async ({ dateRange }, context) => {
    if (!context.user) {
      throw new Error('Unauthorized')
    }

    // Check if user has farm access
    const hasFarmAccess = context.user.role_ids.some(role => 
      ['role_admin', 'role_farm_manager', 'role_crop_manager'].includes(role)
    )

    if (!hasFarmAccess) {
      throw new Error('Forbidden: No farm access')
    }

    // Fetch plots
    const plotsResponse = await databases.listDocuments(
      DATABASE_ID,
      'plots',
      [Query.limit(50)]
    )

    const plots = plotsResponse.documents
    const totalPlots = plots.length
    const activePlots = plots.filter(p => p.status === 'Active').length
    const fallowPlots = plots.filter(p => p.status === 'Fallow').length

    const plotsOverview = plots.map(p => ({
      id: p.$id,
      name: p.plot_name,
      size: p.size_hectares,
      status: p.status,
      currentCrop: p.current_crop_name,
      cropManager: p.crop_manager_name
    }))

    // Fetch upcoming harvests
    const plantingsResponse = await databases.listDocuments(
      DATABASE_ID,
      'plantings',
      [
        Query.equal('status', 'Growing'),
        Query.limit(10),
        Query.orderAsc('expected_harvest_date')
      ]
    )

    const upcomingHarvests = plantingsResponse.documents.map(p => {
      const expectedDate = new Date(p.expected_harvest_date)
      const today = new Date()
      const daysUntil = Math.ceil((expectedDate - today) / (1000 * 60 * 60 * 24))

      return {
        id: p.$id,
        plotName: p.plot_name,
        cropName: p.crop_name,
        expectedDate: p.expected_harvest_date,
        daysUntil
      }
    })

    // Fetch recent sales (last 5)
    const salesResponse = await databases.listDocuments(
      DATABASE_ID,
      'farm_sales',
      [
        Query.limit(5),
        Query.orderDesc('sale_date')
      ]
    )

    const recentSales = salesResponse.documents.map(s => ({
      id: s.$id,
      cropName: s.crop_name,
      quantity: s.quantity_sold,
      revenue: s.total_amount,
      profit: s.profit,
      date: s.sale_date
    }))

    // Calculate profit summary
    const allSalesResponse = await databases.listDocuments(
      DATABASE_ID,
      'farm_sales',
      dateRange ? [
        Query.greaterThanEqual('sale_date', dateRange.startDate),
        Query.lessThanEqual('sale_date', dateRange.endDate)
      ] : []
    )

    const totalRevenue = allSalesResponse.documents.reduce((sum, s) => sum + s.total_amount, 0)
    const totalCosts = allSalesResponse.documents.reduce((sum, s) => sum + s.total_costs, 0)
    const netProfit = totalRevenue - totalCosts

    // Top crops by profit
    const cropProfits = {}
    allSalesResponse.documents.forEach(s => {
      if (!cropProfits[s.crop_name]) {
        cropProfits[s.crop_name] = 0
      }
      cropProfits[s.crop_name] += s.profit
    })

    const topCrops = Object.entries(cropProfits)
      .map(([cropName, profit]) => ({ cropName, profit }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)

    // Fetch inventory alerts
    const inventoryResponse = await databases.listDocuments(
      DATABASE_ID,
      'inventory',
      [
        Query.equal('item_type', 'Farm Inputs'),
        Query.limit(50)
      ]
    )

    const inventoryAlerts = inventoryResponse.documents
      .filter(item => item.quantity <= item.reorder_threshold)
      .map(item => ({
        id: item.$id,
        itemName: item.item_name,
        currentQuantity: item.quantity,
        reorderThreshold: item.reorder_threshold,
        severity: item.quantity === 0 ? 'critical' : 'warning'
      }))

    return {
      plots: {
        total: totalPlots,
        active: activePlots,
        fallow: fallowPlots,
        plots: plotsOverview
      },
      upcomingHarvests,
      recentSales,
      profitSummary: {
        totalRevenue,
        totalCosts,
        netProfit,
        topCrops
      },
      inventoryAlerts
    }
  },

  // Additional resolvers for schoolDashboard and financeDashboard...
}

// Middleware to extract user from JWT
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    req.user = null
    return next()
  }

  try {
    const token = authHeader.replace('Bearer ', '')
    // Verify JWT with Appwrite
    // In production, validate token with Appwrite Auth API
    // For now, decode and trust (implement proper validation)
    req.user = { role_ids: ['role_admin'] } // Placeholder
    next()
  } catch (error) {
    req.user = null
    next()
  }
}

// Setup Express app
export function setupGraphQL(app) {
  app.use('/graphql', authMiddleware)
  
  app.all(
    '/graphql',
    createHandler({
      schema,
      rootValue: root,
      context: (req) => ({
        user: req.user
      })
    })
  )
}
```

### 10.7 Client-Side GraphQL Queries

**Frontend Query Example (src/composables/useDashboardData.js):**

```javascript
import { ref } from 'vue'
import { useAuthStore } from 'stores/auth'

export function useDashboardData() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref(null)
  const data = ref(null)

  async function fetchVillageOverview() {
    loading.value = true
    error.value = null

    const query = `
      query VillageOverview {
        villageOverview {
          residents {
            total
            byRole {
              role
              count
            }
            recentAdditions {
              id
              fullName
              roles
              householdName
            }
          }
          households {
            total
            byType {
              type
              count
            }
          }
        }
      }
    `

    try {
      const response = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.session.jwt}`
        },
        body: JSON.stringify({ query })
      })

      const result = await response.json()

      if (result.errors) {
        throw new Error(result.errors[0].message)
      }

      data.value = result.data.villageOverview
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function fetchFarmDashboard(dateRange = null) {
    loading.value = true
    error.value = null

    const query = `
      query FarmDashboard($dateRange: DateRangeInput) {
        farmDashboard(dateRange: $dateRange) {
          plots {
            total
            active
            fallow
            plots {
              id
              name
              size
              status
              currentCrop
              cropManager
            }
          }
          upcomingHarvests {
            id
            plotName
            cropName
            expectedDate
            daysUntil
          }
          recentSales {
            id
            cropName
            quantity
            revenue
            profit
            date
          }
          profitSummary {
            totalRevenue
            totalCosts
            netProfit
            topCrops {
              cropName
              profit
            }
          }
          inventoryAlerts {
            id
            itemName
            currentQuantity
            reorderThreshold
            severity
          }
        }
      }
    `

    try {
      const response = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.session.jwt}`
        },
        body: JSON.stringify({
          query,
          variables: { dateRange }
        })
      })

      const result = await response.json()

      if (result.errors) {
        throw new Error(result.errors[0].message)
      }

      data.value = result.data.farmDashboard
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    data,
    fetchVillageOverview,
    fetchFarmDashboard
  }
}
```

**Usage in Dashboard Component:**

```vue
<script setup>
import { onMounted } from 'vue'
import { useDashboardData } from 'composables/useDashboardData'

const { loading, error, data, fetchVillageOverview } = useDashboardData()

onMounted(() => {
  fetchVillageOverview()
})
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">Error: {{ error }}</div>
  <div v-else-if="data">
    <h2>Village Overview</h2>
    <p>Total Residents: {{ data.residents.total }}</p>
    <p>Total Households: {{ data.households.total }}</p>
    <!-- ... more dashboard content -->
  </div>
</template>
```

### 10.8 GraphQL Caching Strategy

**Cache Implementation:**
- Use in-memory cache (Node.js Map) for GraphQL responses
- Cache TTL: 5 minutes for dashboard queries
- Cache invalidation: On relevant REST mutations (e.g., new resident → clear villageOverview cache)
- Cache key: `${queryName}:${userId}:${JSON.stringify(variables)}`

**Example Cache Middleware:**

```javascript
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCacheKey(queryName, userId, variables) {
  return `${queryName}:${userId}:${JSON.stringify(variables)}`
}

function getCachedResult(key) {
  const cached = cache.get(key)
  if (!cached) return null
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  
  return cached.data
}

function setCachedResult(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  })
}

function invalidateCache(pattern) {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key)
    }
  }
}

// Export for use in REST mutation handlers
export { invalidateCache }
```

---

## 11. Secure Backend Extension Service

### 11.1 Rationale

While Appwrite covers most CRUD operations, certain workflows require additional safeguards, orchestration, or integrations:

- Multi-step financial reconciliation (loans, grants, revenue sharing).
- Bulk academic analytics (trend detection, at-risk learner predictions).
- Conflict resolution for offline sync failures.
- Integration with future external services (SMS, accounting exports).

### 11.2 Service Blueprint

- **Runtime:** Node.js 20 LTS
- **Framework:** Express.js + Apollo Server (GraphQL layer)
- **Location:** Deployed on same LAN server, behind reverse proxy with HTTPS
- **Communication:** Uses Appwrite Server SDK with scoped API keys (least privilege)
- **Data Storage:** No direct database—reads/writes flow through Appwrite; may use Redis (optional) for caching queue metrics.

### 11.3 Responsibilities

| Capability | Description |
|------------|-------------|
| Sensitive Financial Operations | Validate multi-source transactions, enforce double-entry accounting, write to Appwrite within transactions. |
| Workflow Orchestration | Manage long-running jobs (e.g., bulk harvest imports, yearly audit reports) with retries and logging. |
| GraphQL Gateway | Host Apollo server that aggregates Appwrite data and exposes read models. |
| Sync Conflict Handler | Inspect `syncQueue` failures, merge data, and notify admins. |
| Audit & Compliance | Persist audit trails to dedicated Appwrite collection accessible only to administrators. |

### 11.4 Security Controls

- Mutual TLS or shared secret between frontend and Express layer (via reverse proxy).
- API Gateway enforces rate limiting and logs all access.
- Environment variables managed via `.env.production`, loaded with `dotenv` (never checked into VCS).
- All service-to-Appwrite requests use API keys with module-specific permissions.
- Detailed audit logs stored in `audit_logs` collection with write-only access for service.

### 11.5 Deployment & Maintenance

- Packaged as Docker container: `node:20-alpine`, health checks expose `/healthz`.
- Systemd or PM2 monitors process in on-prem LAN setup.
- CI pipeline runs unit tests (Jest) and integration tests (Supertest + mocked Appwrite).
- Metrics exported via Prometheus endpoint for future monitoring dashboard.

---

## 12. Internationalization (i18n) Architecture

### 12.1 Rationale

While the MVP is English-only (per PRD NFR-4), the architecture must support future internationalization for Nyanja (primary language in Eastern Province), Bemba, and other Zambian languages. Early preparation prevents costly refactoring later.

### 12.2 Vue I18n Integration

**Installation:**
```bash
yarn add vue-i18n@9
```

**Setup (src/boot/i18n.js):**

```javascript
import { boot } from 'quasar/wrappers'
import { createI18n } from 'vue-i18n'
import messages from 'src/i18n'

export default boot(({ app }) => {
  const i18n = createI18n({
    locale: 'en-US',
    fallbackLocale: 'en-US',
    messages,
    legacy: false, // Use Composition API mode
    globalInjection: true
  })

  app.use(i18n)
})
```

### 12.3 Translation File Structure

**Directory Structure:**
```
src/i18n/
├── index.js              # Exports all locales
├── en-US/
│   ├── index.js          # Aggregates all English translations
│   ├── common.js         # Common UI strings
│   ├── auth.js           # Authentication strings
│   ├── residents.js      # Residents module strings
│   ├── households.js     # Households module strings
│   ├── finance.js        # Finance module strings
│   ├── farm.js           # Farm module strings
│   ├── school.js         # School module strings
│   └── errors.js         # Error messages
├── ny/                   # Nyanja (future)
│   └── index.js
└── bem/                  # Bemba (future)
    └── index.js
```

**Example Translation Files:**

**src/i18n/en-US/common.js:**
```javascript
export default {
  app: {
    name: 'Village Management System',
    tagline: 'Sustainable Model Village Management'
  },
  actions: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    refresh: 'Refresh',
    back: 'Back',
    next: 'Next',
    finish: 'Finish',
    close: 'Close'
  },
  labels: {
    name: 'Name',
    description: 'Description',
    date: 'Date',
    status: 'Status',
    type: 'Type',
    amount: 'Amount',
    quantity: 'Quantity',
    notes: 'Notes'
  },
  messages: {
    loading: 'Loading...',
    saving: 'Saving...',
    saved: 'Saved successfully',
    deleted: 'Deleted successfully',
    error: 'An error occurred',
    noData: 'No data available',
    confirmDelete: 'Are you sure you want to delete this item?'
  },
  navigation: {
    dashboard: 'Dashboard',
    residents: 'Residents',
    households: 'Households',
    finance: 'Finance',
    inventory: 'Inventory',
    calendar: 'Calendar',
    storage: 'Storage',
    farm: 'Farm',
    school: 'School',
    guests: 'Guests',
    equipment: 'Equipment',
    vendors: 'Vendors',
    energy: 'Energy',
    reports: 'Reports',
    settings: 'Settings'
  }
}
```

**src/i18n/en-US/residents.js:**
```javascript
export default {
  title: 'Residents',
  addResident: 'Add Resident',
  editResident: 'Edit Resident',
  residentProfile: 'Resident Profile',
  fields: {
    fullName: 'Full Name',
    dateOfBirth: 'Date of Birth',
    gender: 'Gender',
    contactPhone: 'Contact Phone',
    contactEmail: 'Contact Email',
    household: 'Household',
    roles: 'Roles',
    primaryRole: 'Primary Role'
  },
  genders: {
    male: 'Male',
    female: 'Female',
    other: 'Other'
  },
  messages: {
    residentAdded: 'Resident added successfully',
    residentUpdated: 'Resident updated successfully',
    residentDeleted: 'Resident deleted successfully',
    noHouseholds: 'Please create at least one household before adding residents'
  }
}
```

**src/i18n/en-US/index.js:**
```javascript
import common from './common'
import auth from './auth'
import residents from './residents'
import households from './households'
import finance from './finance'
import farm from './farm'
import school from './school'
import errors from './errors'

export default {
  common,
  auth,
  residents,
  households,
  finance,
  farm,
  school,
  errors
}
```

**src/i18n/index.js:**
```javascript
import enUS from './en-US'

export default {
  'en-US': enUS
  // Future locales:
  // 'ny': nyanja,
  // 'bem': bemba
}
```

### 12.4 Usage in Components

**Template Usage:**

```vue
<template>
  <div>
    <h1>{{ $t('residents.title') }}</h1>
    <q-btn :label="$t('residents.addResident')" @click="addResident" />
    
    <q-input
      v-model="resident.full_name"
      :label="$t('residents.fields.fullName')"
      :hint="$t('common.labels.name')"
    />
    
    <p>{{ $t('residents.messages.residentAdded') }}</p>
  </div>
</template>
```

**Script Usage (Composition API):**

```vue
<script setup>
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

function showSuccessMessage() {
  $q.notify({
    message: t('residents.messages.residentAdded'),
    color: 'positive'
  })
}

// Dynamic translation with parameters
const welcomeMessage = t('common.messages.welcome', { name: 'John' })

// Pluralization
const itemCount = t('common.messages.items', { count: 5 })

// Change locale
function switchLanguage(newLocale) {
  locale.value = newLocale
  localStorage.setItem('user-locale', newLocale)
}
</script>
```

### 12.5 String Externalization Guidelines

**✅ DO:**
- Externalize ALL user-facing text (labels, buttons, messages, errors)
- Use semantic keys: `module.context.specificString` (e.g., `residents.fields.fullName`)
- Group related strings by module and context
- Use parameters for dynamic content: `$t('message', { name: userName })`

**❌ DON'T:**
- Hard-code English strings in components: ~~`<q-btn label="Save" />`~~
- Use generic keys: ~~`$t('string1')`~~
- Duplicate strings across modules (use `common` for shared strings)
- Concatenate translated strings (use parameters instead)

### 12.6 Translation Workflow (Future)

**When adding new languages:**

1. Create new locale folder: `src/i18n/ny/` (Nyanja)
2. Copy `en-US/` structure to new locale
3. Translate all strings in each file
4. Add locale to `src/i18n/index.js`
5. Add language selector to Settings page
6. Test all modules in new language

**Translation Management:**
- Use translation management platform (e.g., Lokalise, Crowdin) for community translations
- Export/import JSON files for translator workflow
- Maintain English as source of truth
- Version control all translation files

### 12.7 Locale Persistence

**Store user's language preference:**

```javascript
// src/stores/settings.js
import { defineStore } from 'pinia'
import { useI18n } from 'vue-i18n'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    locale: localStorage.getItem('user-locale') || 'en-US'
  }),
  
  actions: {
    setLocale(newLocale) {
      this.locale = newLocale
      localStorage.setItem('user-locale', newLocale)
      
      // Update i18n
      const { locale } = useI18n()
      locale.value = newLocale
    }
  }
})
```

---

## Appendix A: Post-MVP TypeScript Migration Strategy

### A.1 Migration Rationale

The MVP uses JavaScript (ES2022+) per PRD requirements to lower the barrier to entry for community developers. Post-MVP, TypeScript adoption will provide:

- **Type Safety:** Catch errors at compile-time instead of runtime
- **Better IDE Support:** Enhanced autocomplete, refactoring, and navigation
- **Documentation:** Types serve as inline documentation
- **Maintainability:** Easier to refactor large codebase with confidence

### A.2 Gradual Migration Approach

**Phase 1: Infrastructure Setup (Week 1)**

1. Install TypeScript and type definitions:
```bash
yarn add -D typescript @types/node
yarn add -D @quasar/app-vite typescript
```

2. Create `tsconfig.json`:
```json
{
  "extends": "@quasar/app-vite/tsconfig-preset",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "src/*": ["src/*"],
      "app/*": ["*"],
      "components/*": ["src/components/*"],
      "layouts/*": ["src/layouts/*"],
      "pages/*": ["src/pages/*"],
      "assets/*": ["src/assets/*"],
      "boot/*": ["src/boot/*"],
      "stores/*": ["src/stores/*"]
    },
    "strict": false, // Start lenient, tighten gradually
    "noImplicitAny": false,
    "strictNullChecks": false
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "exclude": ["dist", "node_modules"]
}
```

3. Enable TypeScript in Quasar config:
```javascript
// quasar.config.js
module.exports = function () {
  return {
    supportTS: {
      tsCheckerConfig: {
        eslint: {
          enabled: true,
          files: './src/**/*.{ts,tsx,js,jsx,vue}'
        }
      }
    }
  }
}
```

**Phase 2: Type Definitions (Week 2-3)**

1. Create type definition files for domain models:

```typescript
// src/types/residents.ts
export interface Resident {
  $id: string
  full_name: string
  date_of_birth: string
  gender: 'Male' | 'Female' | 'Other'
  contact_phone?: string
  contact_email?: string
  household_id: string
  household_name?: string
  role_ids: string[]
  primary_role: string
  storage_quota_gb: number
  $createdAt: string
  $updatedAt: string
}

export interface CreateResidentInput {
  full_name: string
  date_of_birth: string
  gender: 'Male' | 'Female' | 'Other'
  contact_phone?: string
  contact_email?: string
  household_id: string
  role_ids: string[]
  primary_role: string
}
```

```typescript
// src/types/farm.ts
export interface Plot {
  $id: string
  plot_name: string
  size_hectares: number
  location_description?: string
  soil_type?: string
  status: 'Active' | 'Fallow' | 'Retired'
  crop_manager_id?: string
  crop_manager_name?: string
  $createdAt: string
  $updatedAt: string
}

export interface Planting {
  $id: string
  plot_id: string
  plot_name: string
  crop_id: string
  crop_name: string
  planting_date: string
  expected_harvest_date: string
  status: 'Planted' | 'Growing' | 'Harvesting' | 'Completed' | 'Failed'
  seed_quantity: number
  seed_unit: string
  seed_cost: number
  planting_labor_farmhands: number
  planting_labor_cost: number
  planting_labor_notes?: string
  planting_other_costs?: number
  planting_other_costs_notes?: string
  $createdAt: string
  $updatedAt: string
}
```

**Phase 3: Migrate Utilities and Composables (Week 4-5)**

Start with pure functions and composables (no Vue components yet):

```typescript
// src/utils/dateHelpers.ts
import { format, parseISO, differenceInDays, addDays } from 'date-fns'

export function formatDate(date: Date | string, formatStr: string = 'dd MMM yyyy'): string {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr)
}

export function daysBetween(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate
  return differenceInDays(end, start)
}
```

```typescript
// src/composables/useErrorHandler.ts
import { useQuasar } from 'quasar'

interface ErrorContext {
  module?: string
  operation?: string
  silent?: boolean
  customMessage?: string
}

interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any, data: any) => boolean
  label?: string
  message?: string
}

interface ValidationRules {
  [field: string]: ValidationRule
}

interface ValidationResult {
  isValid: boolean
  errors: { [field: string]: string }
}

export function useErrorHandler() {
  const $q = useQuasar()
  
  function handleError(error: Error, context: ErrorContext = {}): { error: Error; userMessage: string } {
    // ... implementation
  }
  
  function validateForm(data: any, rules: ValidationRules): ValidationResult {
    // ... implementation
  }
  
  return {
    handleError,
    validateForm
  }
}
```

**Phase 4: Migrate Pinia Stores (Week 6-7)**

```typescript
// src/stores/residents.ts
import { defineStore } from 'pinia'
import { databases } from 'boot/appwrite'
import type { Resident, CreateResidentInput } from 'src/types/residents'

interface ResidentsState {
  residents: Resident[]
  loading: boolean
  error: string | null
}

export const useResidentsStore = defineStore('residents', {
  state: (): ResidentsState => ({
    residents: [],
    loading: false,
    error: null
  }),
  
  getters: {
    getResidentById: (state) => (id: string): Resident | undefined => {
      return state.residents.find(r => r.$id === id)
    },
    
    residentsByHousehold: (state) => (householdId: string): Resident[] => {
      return state.residents.filter(r => r.household_id === householdId)
    }
  },
  
  actions: {
    async fetchResidents(): Promise<void> {
      this.loading = true
      this.error = null
      
      try {
        const response = await databases.listDocuments<Resident>(
          process.env.APPWRITE_DATABASE_ID!,
          'residents'
        )
        this.residents = response.documents
      } catch (error) {
        this.error = (error as Error).message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async createResident(input: CreateResidentInput): Promise<Resident> {
      // ... implementation
    }
  }
})
```

**Phase 5: Migrate Vue Components (Week 8-12)**

Convert `.vue` files to use `<script setup lang="ts">`:

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useResidentsStore } from 'stores/residents'
import type { Resident } from 'src/types/residents'

interface Props {
  residentId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'saved', resident: Resident): void
  (e: 'cancelled'): void
}>()

const residentsStore = useResidentsStore()
const resident = ref<Resident | null>(null)
const loading = ref<boolean>(false)

const fullName = computed<string>(() => resident.value?.full_name || '')

onMounted(async () => {
  await fetchResident()
})

async function fetchResident(): Promise<void> {
  loading.value = true
  try {
    resident.value = residentsStore.getResidentById(props.residentId) || null
  } finally {
    loading.value = false
  }
}

function handleSave(): void {
  if (resident.value) {
    emit('saved', resident.value)
  }
}
</script>
```

**Phase 6: Tighten Type Checking (Week 13-14)**

Gradually enable stricter TypeScript options:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

Fix type errors module by module, starting with utilities and working up to components.

### A.3 Migration Priorities

**High Priority (Migrate First):**
1. Type definitions for all domain models
2. Utility functions (dateHelpers, validators, formatters)
3. Composables (useErrorHandler, useOffline, useFileUpload)
4. Pinia stores (state management benefits most from types)

**Medium Priority:**
5. Core components (ResidentCard, PlotCard, TransactionRow)
6. Page components (Dashboard, Lists, Detail views)
7. Form components

**Low Priority:**
8. Layout components (already simple)
9. Boot files (minimal logic)

### A.4 Coexistence Strategy

- JavaScript and TypeScript files coexist during migration
- Use `.ts` extension for new files
- Gradually convert `.js` to `.ts` as files are touched
- No "big bang" rewrite—incremental migration over 3-4 months
- Maintain full test coverage throughout migration

### A.5 Team Training

- Provide TypeScript training sessions for community contributors
- Create TypeScript style guide specific to project
- Document common patterns and type definitions
- Set up pre-commit hooks to catch type errors early

---

_Document continues with detailed sections on project structure, security, and deployment patterns..._
