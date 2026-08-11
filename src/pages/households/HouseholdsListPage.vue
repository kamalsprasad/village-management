<template>
  <q-page padding>
    <div class="q-pa-md">
      <!-- Page Header -->
      <div class="row items-center q-mb-md">
        <div class="col">
          <h4 class="text-h5 q-my-none">Households</h4>
          <p class="text-grey-7 q-mb-none">Manage village households and occupants</p>
        </div>
        <div class="col-auto">
          <q-btn
            v-if="isClient && hasPermission('households:write')"
            color="primary"
            icon="add"
            label="Add Household"
            @click="showAddDialog = true"
          >
            <q-tooltip>Create a new household record.</q-tooltip>
          </q-btn>
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="householdsStore.isLoading && householdsStore.households.length === 0"
        class="q-pa-md"
      >
        <q-skeleton type="rect" height="60px" class="q-mb-sm" />
        <q-skeleton type="rect" height="60px" class="q-mb-sm" />
        <q-skeleton type="rect" height="60px" class="q-mb-sm" />
      </div>

      <!-- Empty-State Banner (Story 5.11) -->
      <q-banner
        v-else-if="householdsStore.pagination.total === 0"
        class="bg-info text-white q-mb-md"
        rounded
      >
        <template #avatar>
          <q-icon name="info" color="white" />
        </template>
        No households yet. Add your first household.
        <template #action>
          <q-btn
            v-if="isClient && hasPermission('households:write')"
            flat
            color="white"
            label="Add Household"
            @click="showAddDialog = true"
          />
        </template>
      </q-banner>

      <!-- Households Table -->
      <q-card v-else flat bordered>
        <q-table
          :rows="householdsStore.paginatedHouseholds"
          :columns="columns"
          row-key="$id"
          flat
          :loading="householdsStore.isLoading"
          hide-pagination
          :pagination="{ rowsPerPage: 0 }"
        >
          <!-- Custom column: household_type -->
          <template #body-cell-household_type="props">
            <q-td :props="props">
              <q-chip :color="getTypeColor(props.value)" text-color="white" dense size="sm">
                {{ props.value }}
              </q-chip>
            </q-td>
          </template>

          <!-- Custom column: construction_date -->
          <template #body-cell-construction_date="props">
            <q-td :props="props">
              {{ props.value ? formatDate(props.value) : 'N/A' }}
            </q-td>
          </template>

          <!-- Custom column: occupant_count -->
          <template #body-cell-occupant_count="props">
            <q-td :props="props">
              <q-badge :color="props.value > 0 ? 'positive' : 'grey'" :label="props.value" />
            </q-td>
          </template>

          <!-- Custom column: actions -->
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                dense
                round
                icon="visibility"
                color="primary"
                size="sm"
                aria-label="View household"
                @click="viewHousehold(props.row.$id)"
              >
                <q-tooltip>View Details</q-tooltip>
              </q-btn>
              <span v-if="!props.row.occupant_count">
                <q-btn
                  v-if="isClient && hasPermission('households:write')"
                  flat
                  dense
                  round
                  icon="edit"
                  color="primary"
                  size="sm"
                  aria-label="Edit household"
                  @click="editHousehold(props.row)"
                >
                  <q-tooltip>Edit</q-tooltip>
                </q-btn>
                <q-btn
                  v-if="isClient && hasPermission('households:delete')"
                  flat
                  dense
                  round
                  icon="delete"
                  color="negative"
                  size="sm"
                  aria-label="Delete household"
                  @click="confirmDelete(props.row)"
                >
                  <q-tooltip>Delete</q-tooltip>
                </q-btn>
              </span>
            </q-td>
          </template>
        </q-table>

        <!-- Pagination Controls -->
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
              aria-label="Previous page"
              :disable="!householdsStore.hasPreviousPage"
              @click="householdsStore.previousPage()"
            />
            <q-btn
              flat
              dense
              round
              icon="chevron_right"
              aria-label="Next page"
              :disable="!householdsStore.hasNextPage"
              @click="householdsStore.nextPage()"
            />
          </div>
        </div>
      </q-card>

      <!-- Add/Edit Dialog -->
      <q-dialog v-model="showAddDialog" persistent>
        <household-form
          :household="selectedHousehold"
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
            Are you sure you want to delete <strong>{{ householdToDelete?.name }}</strong
            >?
            <div v-if="householdToDelete?.occupant_count > 0" class="text-negative q-mt-sm">
              <q-icon name="warning" />
              This household has {{ householdToDelete.occupant_count }} occupant(s).
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancel" color="primary" @click="showDeleteDialog = false" />
            <q-btn
              flat
              label="Delete"
              color="negative"
              :loading="householdsStore.isLoading"
              @click="deleteHousehold"
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
import { useHouseholdsStore } from 'src/stores/households-store';
import { usePermissions } from 'src/composables/usePermissions';
import { formatDate } from 'src/utils/dateUtils';
import HouseholdForm from 'src/components/households/HouseholdForm.vue';

const router = useRouter();
const householdsStore = useHouseholdsStore();
const { hasPermission } = usePermissions();

const isClient = ref(false); // Track client-side hydration for SSR

const showAddDialog = ref(false);
const showDeleteDialog = ref(false);
const selectedHousehold = ref(null);
const householdToDelete = ref(null);
const itemsPerPage = ref(10);

const columns = [
  {
    name: 'name',
    required: true,
    label: 'Household Name',
    align: 'left',
    field: 'name',
    sortable: true,
  },
  {
    name: 'household_type',
    label: 'Type',
    align: 'left',
    field: 'household_type',
    sortable: true,
  },
  {
    name: 'occupant_count',
    label: 'Occupants',
    align: 'center',
    field: 'occupant_count',
    sortable: true,
  },
  {
    name: 'construction_date',
    label: 'Construction Date',
    align: 'left',
    field: 'construction_date',
    sortable: true,
  },
  {
    name: 'bedrooms',
    label: 'Bedrooms',
    align: 'center',
    field: 'bedrooms',
    sortable: true,
  },
  {
    name: 'bathrooms',
    label: 'Bathrooms',
    align: 'center',
    field: 'bathrooms',
    sortable: true,
  },
  {
    name: 'actions',
    label: 'Actions',
    align: 'center',
    field: 'actions',
  },
];

const paginationLabel = computed(() => {
  const start =
    (householdsStore.pagination.currentPage - 1) * householdsStore.pagination.itemsPerPage + 1;
  const end = Math.min(
    householdsStore.pagination.currentPage * householdsStore.pagination.itemsPerPage,
    householdsStore.pagination.total,
  );
  return `${start}-${end} of ${householdsStore.pagination.total}`;
});

function getTypeColor(type) {
  const colors = {
    'Single Family': 'primary',
    'Multi-Family': 'secondary',
    Dormitory: 'accent',
    'Guest House': 'positive',
    'Admin Building': 'info',
    Other: 'grey',
  };
  return colors[type] || 'grey';
}

function viewHousehold(householdId) {
  router.push(`/households/${householdId}`);
}

function editHousehold(household) {
  selectedHousehold.value = { ...household };
  showAddDialog.value = true;
}

function confirmDelete(household) {
  householdToDelete.value = household;
  showDeleteDialog.value = true;
}

async function deleteHousehold() {
  if (!householdToDelete.value) return;

  const result = await householdsStore.deleteHousehold(householdToDelete.value.$id);

  if (result.success) {
    showDeleteDialog.value = false;
    householdToDelete.value = null;
  }
}

function handleSaved() {
  showAddDialog.value = false;
  selectedHousehold.value = null;
}

function handleCancelled() {
  showAddDialog.value = false;
  selectedHousehold.value = null;
}

function changeItemsPerPage(newValue) {
  householdsStore.changeItemsPerPage(newValue);
}

onMounted(async () => {
  isClient.value = true; // Enable client-side rendering after hydration
  await householdsStore.fetchHouseholds(1, itemsPerPage.value);
});
</script>
