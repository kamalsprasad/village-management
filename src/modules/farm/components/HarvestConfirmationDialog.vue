<!--
  HarvestConfirmationDialog.vue
  Confirmation dialog for harvest creation with review of all entered values.

  Story 3.5: Farm Module - Harvest Recording
-->
<template>
  <q-dialog
    v-model="dialogOpen"
    persistent
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="harvest-confirmation-dialog">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">
          <q-icon name="fact_check" class="q-mr-sm" />
          Confirm Harvest Details
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section class="scroll">
        <!-- Warning Banner -->
        <q-banner rounded class="bg-orange-1 text-orange-9 q-mb-md">
          <template #avatar>
            <q-icon name="warning" />
          </template>
          <div class="text-weight-bold">Important Notice</div>
          <div>
            Harvest records cannot be edited after creation. Please verify all values are correct
            before proceeding.
          </div>
        </q-banner>

        <!-- Harvest Type -->
        <div class="confirmation-section">
          <div class="text-subtitle2 text-weight-medium text-grey-7 q-mb-sm">Harvest Type</div>
          <div class="text-body1">
            {{ harvestData.harvest_type }}
          </div>
        </div>

        <!-- Date Information -->
        <div class="confirmation-section">
          <div class="text-subtitle2 text-weight-medium text-grey-7 q-mb-sm">Date Information</div>
          <div v-if="harvestData.harvest_type === 'Single Day'" class="text-body1">
            Harvest Date: {{ formatDate(harvestData.harvest_date) }}
          </div>
          <div v-else class="text-body1">
            <div>Start Date: {{ formatDate(harvestData.harvest_start_date) }}</div>
            <div v-if="harvestData.harvest_end_date">
              End Date: {{ formatDate(harvestData.harvest_end_date) }}
            </div>
            <div v-else class="text-italic text-grey-6">
              End date: Not set (will be determined by entries)
            </div>
          </div>
        </div>

        <!-- Quantity Information -->
        <div class="confirmation-section">
          <div class="text-subtitle2 text-weight-medium text-grey-7 q-mb-sm">
            Quantity Information
          </div>
          <div v-if="harvestData.harvest_type === 'Single Day'" class="text-body1">
            Quantity Harvested: {{ harvestData.total_quantity_kg }} kg
          </div>
          <div v-else class="text-body1">
            <div v-if="harvestData.expected_total_quantity">
              Expected Total: {{ harvestData.expected_total_quantity }} kg
            </div>
            <div class="text-italic text-grey-6">
              Actual quantity will be calculated from daily entries
            </div>
          </div>
        </div>

        <!-- Cost Information -->
        <div class="confirmation-section">
          <div class="text-subtitle2 text-weight-medium text-grey-7 q-mb-sm">Cost Information</div>
          <div v-if="harvestData.harvest_type === 'Single Day'" class="text-body1">
            <div v-if="harvestData.total_labor_cost">
              Labor Cost: ZMW {{ harvestData.total_labor_cost.toFixed(2) }}
            </div>
            <div v-if="harvestData.total_other_costs">
              Other Costs: ZMW {{ harvestData.total_other_costs.toFixed(2) }}
            </div>
            <div class="text-weight-bold text-primary q-mt-sm">
              Total Cost: ZMW {{ calculateTotalCost().toFixed(2) }}
            </div>
          </div>
          <div v-else class="text-body1 text-italic text-grey-6">
            Costs will be calculated from daily entries
          </div>
        </div>

        <!-- Additional Information -->
        <div v-if="hasAdditionalInfo" class="confirmation-section">
          <div class="text-subtitle2 text-weight-medium text-grey-7 q-mb-sm">
            Additional Information
          </div>
          <div v-if="harvestData.farmhands_count" class="text-body1">
            Farmhands: {{ harvestData.farmhands_count }}
          </div>
          <div v-if="harvestData.notes" class="text-body1">
            <div class="text-weight-medium">General Notes:</div>
            <div class="text-grey-8">{{ harvestData.notes }}</div>
          </div>
        </div>

        <!-- Planting Information -->
        <div class="confirmation-section">
          <div class="text-subtitle2 text-weight-medium text-grey-7 q-mb-sm">Linked Planting</div>
          <div class="text-body1">
            <div>Crop: {{ plantingInfo.cropName }}</div>
            <div>Plot: {{ plantingInfo.plotName }}</div>
            <div>Planting Date: {{ formatDate(plantingInfo.plantingDate) }}</div>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="q-pa-md">
        <q-btn label="Back to Edit" outline @click="onBack" :disable="loading" />
        <q-btn label="Confirm and Save" color="primary" @click="onConfirm" :loading="loading" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue';
import { formatDate } from 'src/utils/dateUtils';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  harvestData: {
    type: Object,
    default: null,
  },
  plantingInfo: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'confirm', 'back']);

// Dialog state
const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// Check if there's additional information to show
const hasAdditionalInfo = computed(() => {
  return props.harvestData.farmhands_count || props.harvestData.notes;
});

// Calculate total cost for single day harvests
function calculateTotalCost() {
  if (props.harvestData.harvest_type !== 'Single Day') return 0;

  const laborCost = parseFloat(props.harvestData.total_labor_cost) || 0;
  const otherCost = parseFloat(props.harvestData.total_other_costs) || 0;

  return laborCost + otherCost;
}

function onConfirm() {
  emit('confirm');
}

function onBack() {
  emit('back');
}

// Helper function
</script>

<style scoped>
.harvest-confirmation-dialog {
  min-width: 600px;
}

@media (max-width: 600px) {
  .harvest-confirmation-dialog {
    min-width: 100%;
  }
}

.confirmation-section {
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.confirmation-section:last-child {
  border-bottom: none;
}
</style>
