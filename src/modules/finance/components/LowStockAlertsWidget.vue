<template>
  <q-card class="full-height">
    <q-card-section class="row items-center justify-between">
      <div>
        <div class="text-h6">
          Inventory Alerts
          <q-badge v-if="alerts.length > 0" color="negative" rounded class="q-ml-sm">
            {{ alerts.length }}
          </q-badge>
        </div>
        <div class="text-caption text-grey">Low or Out of Stock</div>
      </div>
      <q-btn flat color="primary" label="Manage" to="/inventory" />
    </q-card-section>

    <q-card-section v-if="alerts.length > 0" class="q-pt-none">
      <q-list separator>
        <q-item
          v-for="alert in alerts"
          :key="alert.$id"
          clickable
          :to="`/inventory/${alert.$id}`"
          class="q-px-none"
        >
          <q-item-section avatar>
            <q-icon :name="getIconForType(alert.item_type)" color="grey-7" />
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-weight-medium">{{ alert.item_name }}</q-item-label>
            <q-item-label caption lines="1">
              Threshold: {{ alert.reorder_threshold }} {{ alert.unit }}
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-item-label
              class="text-weight-bold"
              :class="alert.status === 'out_of_stock' ? 'text-negative' : 'text-warning'"
            >
              {{ alert.quantity }} {{ alert.unit }}
            </q-item-label>
            <q-item-label caption>
              <q-chip
                size="sm"
                :color="alert.status === 'out_of_stock' ? 'negative' : 'warning'"
                :text-color="alert.status === 'out_of_stock' ? 'white' : 'dark'"
                dense
              >
                {{ alert.status === 'out_of_stock' ? 'Out of Stock' : 'Low Stock' }}
              </q-chip>
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>

    <q-card-section v-else-if="!loading" class="text-center text-grey-6 q-pa-xl">
      <q-icon name="check_circle" size="3rem" color="positive" class="q-mb-sm" />
      <div>All inventory items are sufficiently stocked</div>
    </q-card-section>

    <!-- Loading Overlay -->
    <q-inner-loading :showing="loading">
      <q-spinner-dots size="50px" color="primary" />
    </q-inner-loading>
  </q-card>
</template>

<script setup>
defineProps({
  alerts: {
    type: Array,
    required: true,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const getIconForType = (type) => {
  switch (type) {
    case 'farm_inputs':
      return 'agriculture';
    case 'farm_produce':
      return 'eco';
    case 'school_supplies':
      return 'school';
    case 'medical_supplies':
      return 'medical_services';
    case 'kitchen_supplies':
      return 'restaurant';
    case 'equipment':
      return 'handyman';
    default:
      return 'inventory_2';
  }
};
</script>
