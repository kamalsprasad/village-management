<template>
  <q-page padding>
    <div class="q-pa-md">
      <!-- Page Header -->
      <div class="row items-center q-mb-md">
        <div class="col">
          <h4 class="q-my-none">Residents</h4>
          <p class="text-grey-7 q-mb-none">Manage village residents and their information</p>
        </div>
        <div class="col-auto">
          <q-btn
            v-if="isClient && hasPermission('residents:write')"
            color="primary"
            icon="add"
            label="Add Resident"
            @click="showAddDialog = true"
          />
        </div>
      </div>

      <!-- Search and Filter Toolbar (AC2) -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="searchName"
                outlined
                dense
                placeholder="Search by name..."
                clearable
                @update:model-value="debouncedSearch"
              >
                <template #prepend>
                  <q-icon name="search" />
                </template>
              </q-input>
            </div>
            <div class="col-12 col-md-4">
              <q-select
                v-model="selectedHousehold"
                :options="householdOptions"
                outlined
                dense
                clearable
                option-value="value"
                option-label="label"
                emit-value
                map-options
                placeholder="Filter by household..."
                @update:model-value="applyFilters"
              >
                <template #prepend>
                  <q-icon name="home" />
                </template>
              </q-select>
            </div>
            <div class="col-12 col-md-2">
              <q-btn
                outline
                color="primary"
                label="Clear Filters"
                icon="clear"
                @click="clearAllFilters"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Loading State -->
      <div v-if="residentsStore.isLoading && residentsStore.residents.length === 0" class="q-pa-md">
        <q-skeleton type="rect" height="60px" class="q-mb-sm" />
        <q-skeleton type="rect" height="60px" class="q-mb-sm" />
        <q-skeleton type="rect" height="60px" class="q-mb-sm" />
      </div>

      <!-- Empty-State Banner (Story 5.11) -->
      <q-banner
        v-else-if="residentsStore.pagination.total === 0 && householdsStore.pagination.total === 0"
        class="bg-info text-white q-mb-md"
        rounded
      >
        <template #avatar>
          <q-icon name="info" color="white" />
        </template>
        Please create at least one household before adding residents.
        <template #action>
          <q-btn flat color="white" label="Go to Households" to="/households" />
        </template>
      </q-banner>

      <q-banner
        v-else-if="residentsStore.pagination.total === 0"
        class="bg-info text-white q-mb-md"
        rounded
      >
        <template #avatar>
          <q-icon name="info" color="white" />
        </template>
        No residents yet. Add your first resident.
        <template #action>
          <q-btn
            v-if="isClient && hasPermission('residents:write')"
            flat
            color="white"
            label="Add Resident"
            @click="showAddDialog = true"
          />
        </template>
      </q-banner>

      <!-- Residents Table (AC1) -->
      <q-card v-else flat bordered>
        <q-table
          :rows="residentsStore.paginatedResidents"
          :columns="visibleColumns"
          row-key="$id"
          flat
          :loading="residentsStore.isLoading"
          hide-pagination
          :pagination="{ rowsPerPage: 0 }"
        >
          <!-- Custom column: full_name -->
          <template #body-cell-full_name="props">
            <q-td :props="props">
              <span class="text-weight-medium">{{ getFullName(props.row) }}</span>
            </q-td>
          </template>

          <!-- Custom column: gender -->
          <template #body-cell-gender="props">
            <q-td :props="props">
              <q-chip
                :color="props.value === 'Male' ? 'blue' : 'pink'"
                text-color="white"
                dense
                size="sm"
              >
                {{ props.value }}
              </q-chip>
            </q-td>
          </template>

          <!-- Custom column: age -->
          <template #body-cell-age="props">
            <q-td :props="props">
              <q-badge
                v-if="formatAge(props.row.dob) !== 'N/A'"
                color="primary"
                text-color="white"
                dense
                :label="formatAge(props.row.dob)"
              />
              <span v-else class="text-grey">N/A</span>
            </q-td>
          </template>

          <!-- Custom column: household -->
          <template #body-cell-household="props">
            <q-td :props="props">
              {{ props.row.household?.name || 'N/A' }}
            </q-td>
          </template>

          <!-- Custom column: contact (AC10 - mask for unauthorized) -->
          <template #body-cell-contact="props">
            <q-td :props="props">
              <div v-if="canViewContactInfo">
                <div v-if="props.row.phone" class="text-caption">
                  <q-icon name="phone" size="xs" />
                  {{ props.row.phone }}
                </div>
                <div v-if="props.row.email" class="text-caption">
                  <q-icon name="email" size="xs" />
                  {{ props.row.email }}
                </div>
                <span v-if="!props.row.phone && !props.row.email" class="text-grey">N/A</span>
              </div>
              <div v-else class="text-grey-6">
                <q-icon name="lock" size="xs" />
                Hidden
              </div>
            </q-td>
          </template>

          <!-- Custom column: actions (AC10) -->
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                dense
                round
                icon="visibility"
                color="primary"
                size="sm"
                @click="viewResident(props.row.$id)"
              >
                <q-tooltip>View Details</q-tooltip>
              </q-btn>
              <q-btn
                v-if="hasPermission('residents:write')"
                flat
                dense
                round
                icon="edit"
                color="primary"
                size="sm"
                @click="editResident(props.row)"
              >
                <q-tooltip>Edit</q-tooltip>
              </q-btn>
              <q-btn
                v-if="hasPermission('residents:delete')"
                flat
                dense
                round
                icon="delete"
                color="negative"
                size="sm"
                @click="confirmDelete(props.row)"
              >
                <q-tooltip>Delete</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>

        <!-- Pagination Controls (AC1) -->
        <q-separator />
        <div class="row items-center justify-between q-pa-md">
          <div class="col-auto">
            <div class="row items-center q-gutter-sm">
              <span class="text-caption">Rows per page:</span>
              <q-select
                v-model="itemsPerPage"
                :options="[10, 25, 50, 100]"
                dense
                outlined
                style="width: 80px"
                @update:model-value="changeItemsPerPage"
              />
            </div>
          </div>
          <div class="col-auto">
            <span class="text-caption q-mr-md">
              {{ paginationLabel }}
            </span>
            <q-btn
              flat
              dense
              round
              icon="chevron_left"
              :disable="!residentsStore.hasPreviousPage"
              @click="residentsStore.previousPage()"
            />
            <q-btn
              flat
              dense
              round
              icon="chevron_right"
              :disable="!residentsStore.hasNextPage"
              @click="residentsStore.nextPage()"
            />
          </div>
        </div>
      </q-card>

      <!-- Add/Edit Dialog -->
      <q-dialog v-model="showAddDialog" persistent>
        <resident-form
          :resident="selectedResident"
          @saved="handleSaved"
          @cancelled="handleCancelled"
        />
      </q-dialog>

      <!-- Delete Confirmation Dialog -->
      <q-dialog v-model="showDeleteDialog" persistent>
        <q-card style="min-width: 350px">
          <q-card-section>
            <div class="text-h6">Confirm Deletion</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            Are you sure you want to delete <strong>{{ getFullName(residentToDelete) }}</strong
            >?
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancel" color="primary" @click="showDeleteDialog = false" />
            <q-btn
              flat
              label="Delete"
              color="negative"
              :loading="residentsStore.isLoading"
              @click="deleteResident"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { differenceInYears } from 'date-fns';
import { useResidentsStore } from 'src/stores/residents-store';
import { useHouseholdsStore } from 'src/stores/households-store';
import { usePermissions } from 'src/composables/usePermissions';
import ResidentForm from 'src/components/residents/ResidentForm.vue';

const router = useRouter();
const residentsStore = useResidentsStore();
const householdsStore = useHouseholdsStore();
const { hasPermission } = usePermissions();

const isClient = ref(false); // Track client-side hydration for SSR

const showAddDialog = ref(false);
const showDeleteDialog = ref(false);
const selectedResident = ref(null);
const residentToDelete = ref(null);
const itemsPerPage = ref(10);
const searchName = ref('');
const selectedHousehold = ref(null);

function calculateAge(dob) {
  if (!dob) {
    return null;
  }

  try {
    return differenceInYears(new Date(), new Date(dob));
  } catch (error) {
    console.error('Error calculating age for resident:', error);
    return null;
  }
}

function formatAge(dob) {
  const age = calculateAge(dob);
  return age === null || Number.isNaN(age) ? 'N/A' : age;
}

// All columns definition
const allColumns = [
  {
    name: 'full_name',
    required: true,
    label: 'Full Name',
    align: 'left',
    field: (row) => `${row.first_name} ${row.last_name}`,
    sortable: true,
  },
  {
    name: 'gender',
    label: 'Gender',
    align: 'left',
    field: 'gender',
    sortable: true,
  },
  {
    name: 'age',
    label: 'Age',
    align: 'center',
    field: (row) => {
      const age = calculateAge(row.dob);
      return age === null ? -1 : age;
    },
    sortable: true,
  },
  {
    name: 'household',
    label: 'Household',
    align: 'left',
    field: (row) => row.household?.name || 'N/A',
    sortable: true,
  },
  {
    name: 'contact',
    label: 'Contact',
    align: 'left',
    field: 'contact',
  },
  {
    name: 'actions',
    label: 'Actions',
    align: 'center',
    field: 'actions',
  },
];

// Check if user can view contact info (AC10)
const canViewContactInfo = computed(() => {
  if (!isClient.value) return false; // Default to hidden during SSR
  return hasPermission('residents:read') && hasPermission('residents:write');
});

// Filter columns based on permissions (AC10)
const visibleColumns = computed(() => {
  if (!canViewContactInfo.value) {
    // Hide contact column for read-only users
    return allColumns.filter((col) => col.name !== 'contact');
  }
  return allColumns;
});

const paginationLabel = computed(() => {
  const start =
    (residentsStore.pagination.currentPage - 1) * residentsStore.pagination.itemsPerPage + 1;
  const end = Math.min(
    residentsStore.pagination.currentPage * residentsStore.pagination.itemsPerPage,
    residentsStore.pagination.total,
  );
  return `${start}-${end} of ${residentsStore.pagination.total}`;
});

// Household options for filter dropdown
const householdOptions = computed(() => {
  return householdsStore.households.map((h) => ({
    label: h.name,
    value: h.$id,
  }));
});

function getFullName(resident) {
  if (!resident) return '';
  const parts = [resident.first_name];
  if (resident.middle_names) {
    parts.push(resident.middle_names);
  }
  parts.push(resident.last_name);
  return parts.join(' ');
}

function viewResident(residentId) {
  router.push(`/residents/${residentId}`);
}

function editResident(resident) {
  selectedResident.value = { ...resident };
  showAddDialog.value = true;
}

function confirmDelete(resident) {
  residentToDelete.value = resident;
  showDeleteDialog.value = true;
}

async function deleteResident() {
  if (!residentToDelete.value) return;

  const result = await residentsStore.deleteResident(residentToDelete.value.$id);

  if (result.success) {
    showDeleteDialog.value = false;
    residentToDelete.value = null;
  }
}

function handleSaved() {
  showAddDialog.value = false;
  selectedResident.value = null;
}

function handleCancelled() {
  showAddDialog.value = false;
  selectedResident.value = null;
}

function changeItemsPerPage(newValue) {
  residentsStore.changeItemsPerPage(newValue);
}

// Debounced search to avoid excessive API calls (AC2)
let searchTimeout = null;
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    applyFilters();
  }, 500);
}

// Apply filters and refresh list (AC2)
async function applyFilters() {
  residentsStore.setSearchFilter(searchName.value);
  residentsStore.setHouseholdFilter(selectedHousehold.value);
  await residentsStore.applyFilters();
}

// Clear all filters (AC2)
async function clearAllFilters() {
  searchName.value = '';
  selectedHousehold.value = null;
  residentsStore.clearFilters();
  await residentsStore.fetchResidents(1, itemsPerPage.value);
}

onMounted(async () => {
  isClient.value = true; // Enable client-side rendering after hydration
  // Load households for filter dropdown
  await householdsStore.fetchHouseholds(1, 100);
  // Load residents
  await residentsStore.fetchResidents(1, itemsPerPage.value);
});
</script>
