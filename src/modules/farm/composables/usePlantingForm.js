// usePlantingForm.js - Composable for planting form logic
// Story 3.3: Planting Records with Seed Inventory and Labor Tracking
//
// DB schema uses aggregated cost fields: inputs_cost, labor_cost, other_cost, notes.
// Inventory selection drives inputs_cost auto-calculation and deducts stock at submit
// time, but seed_inventory_id is not persisted (no DB column). Seed details go in notes.

import { ref, computed, watch } from 'vue';
import { useFarmStore } from '../stores/farm-store';
import { useInventoryStore } from 'src/stores/inventory-store';
import { addDays, format, parseISO } from 'date-fns';

export const SEED_SOURCES = {
  FROM_INVENTORY: 'From Inventory',
  PURCHASED_SEPARATELY: 'Purchased Separately',
  DONATED: 'Donated',
};

export function usePlantingForm(plotId = null) {
  const farmStore = useFarmStore();
  const inventoryStore = useInventoryStore();

  // Form state — maps directly to DB columns plus UI-only helpers
  const form = ref({
    // DB columns
    plot_id: plotId,
    crop_id: null,
    planting_date: format(new Date(), 'yyyy-MM-dd'),
    expected_harvest_date: null,
    area_used_hectares: null,
    quantity_planted: null,
    unit: 'kg',
    inputs_cost: null,
    labor_cost: null,
    other_cost: null,
    notes: '',
    status: 'planted',

    // UI-only helpers (not persisted)
    seed_source: SEED_SOURCES.FROM_INVENTORY,
    seed_inventory_id: null,
    seeds_used: null,
    inputs_cost_override: false,
  });

  const isSubmitting = ref(false);
  const errors = ref({});
  const selectedCrop = ref(null);
  const selectedInventory = ref(null);

  // Computed
  const availableSeedInventory = computed(() =>
    inventoryStore.items.filter(
      (item) => item.item_type === 'farm_inputs' && item.status === 'in_stock' && item.quantity > 0,
    ),
  );

  const isFromInventory = computed(() => form.value.seed_source === SEED_SOURCES.FROM_INVENTORY);
  const isPurchased = computed(() => form.value.seed_source === SEED_SOURCES.PURCHASED_SEPARATELY);
  const isDonated = computed(() => form.value.seed_source === SEED_SOURCES.DONATED);

  const calculatedInputsCost = computed(() => {
    if (!isFromInventory.value || !selectedInventory.value || !form.value.seeds_used) return 0;
    return Math.round((selectedInventory.value.unit_cost || 0) * form.value.seeds_used);
  });

  const totalPlantingInvestment = computed(
    () =>
      (form.value.inputs_cost || 0) + (form.value.labor_cost || 0) + (form.value.other_cost || 0),
  );

  // Watch crop selection → auto-calculate expected harvest date
  watch(
    () => form.value.crop_id,
    (cropId) => {
      selectedCrop.value = cropId ? farmStore.crops.find((c) => c.$id === cropId) || null : null;
      calculateExpectedHarvestDate();
    },
  );

  // Watch planting date → recalculate harvest date
  watch(() => form.value.planting_date, calculateExpectedHarvestDate);

  // Watch inventory selection → update selectedInventory ref
  watch(
    () => form.value.seed_inventory_id,
    (inventoryId) => {
      selectedInventory.value = inventoryId
        ? inventoryStore.items.find((item) => item.$id === inventoryId) || null
        : null;
    },
  );

  // Auto-populate inputs_cost from inventory calculation unless overridden
  watch(calculatedInputsCost, (newCost) => {
    if (isFromInventory.value && !form.value.inputs_cost_override) {
      form.value.inputs_cost = newCost || null;
    }
  });

  // Reset seed-specific UI state when seed source changes
  watch(
    () => form.value.seed_source,
    () => {
      form.value.seed_inventory_id = null;
      form.value.seeds_used = null;
      form.value.inputs_cost_override = false;
      if (!isFromInventory.value) {
        form.value.inputs_cost = null;
      }
      if (isDonated.value) {
        form.value.inputs_cost = 0;
      }
      selectedInventory.value = null;
    },
  );

  function calculateExpectedHarvestDate() {
    if (!form.value.planting_date || !selectedCrop.value?.maturity_days) {
      form.value.expected_harvest_date = null;
      return;
    }
    try {
      const plantingDate = parseISO(form.value.planting_date);
      const harvestDate = addDays(plantingDate, selectedCrop.value.maturity_days);
      form.value.expected_harvest_date = format(harvestDate, 'yyyy-MM-dd');
    } catch {
      form.value.expected_harvest_date = null;
    }
  }

  function formatInventoryOption(item) {
    const qty = item.quantity || 0;
    const unit = item.unit || 'units';
    const unitCost = item.unit_cost || 0;
    return `${item.item_name} - ${qty} ${unit} available @ ZMW ${unitCost.toFixed(2)}/${unit}`;
  }

  function getDaysUntilHarvest() {
    if (!form.value.expected_harvest_date) return null;
    try {
      const today = new Date();
      const harvestDate = parseISO(form.value.expected_harvest_date);
      return Math.ceil((harvestDate - today) / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  }

  function buildNotesFromForm() {
    const parts = [];
    if (form.value.seed_source === SEED_SOURCES.FROM_INVENTORY && selectedInventory.value) {
      parts.push(
        `Inputs: ${form.value.seeds_used || ''} ${selectedInventory.value.unit || 'units'} ${selectedInventory.value.item_name} from inventory.`,
      );
    } else if (form.value.seed_source === SEED_SOURCES.PURCHASED_SEPARATELY) {
      parts.push('Seeds purchased separately.');
    } else if (form.value.seed_source === SEED_SOURCES.DONATED) {
      parts.push('Seeds donated (zero inputs cost).');
    }
    if (form.value.notes?.trim()) {
      parts.push(form.value.notes.trim());
    }
    return parts.join(' ');
  }

  function validate() {
    errors.value = {};

    if (!form.value.crop_id) errors.value.crop_id = 'Crop is required';
    if (!form.value.planting_date) errors.value.planting_date = 'Planting date is required';
    if (!form.value.expected_harvest_date) {
      errors.value.expected_harvest_date = 'Expected harvest date is required';
    }

    if (form.value.planting_date && form.value.expected_harvest_date) {
      if (parseISO(form.value.expected_harvest_date) < parseISO(form.value.planting_date)) {
        errors.value.expected_harvest_date = 'Harvest date cannot be before planting date';
      }
    }

    if (isFromInventory.value) {
      if (!form.value.seed_inventory_id) {
        errors.value.seed_inventory_id = 'Please select a seed inventory item';
      }
      if (!form.value.seeds_used || form.value.seeds_used <= 0) {
        errors.value.seeds_used = 'Please enter quantity of seeds used';
      } else if (
        selectedInventory.value &&
        form.value.seeds_used > selectedInventory.value.quantity
      ) {
        errors.value.seeds_used = `Insufficient stock. Available: ${selectedInventory.value.quantity} ${selectedInventory.value.unit || 'units'}`;
      }
    }

    return Object.keys(errors.value).length === 0;
  }

  async function loadData() {
    if (!farmStore.cropsLoaded) {
      await farmStore.fetchCrops({ is_active: true });
    }
    if (inventoryStore.items.length === 0) {
      await inventoryStore.fetchItems(1, 100);
    }
  }

  async function submit() {
    if (!validate()) {
      return { success: false, errors: errors.value };
    }

    isSubmitting.value = true;

    try {
      const plantingData = {
        plot_id: form.value.plot_id,
        crop_id: form.value.crop_id,
        planting_date: form.value.planting_date,
        expected_harvest_date: form.value.expected_harvest_date,
        area_used_hectares: form.value.area_used_hectares || null,
        quantity_planted: form.value.quantity_planted || null,
        unit: form.value.unit || 'kg',
        inputs_cost: form.value.inputs_cost || 0,
        labor_cost: form.value.labor_cost || 0,
        other_cost: form.value.other_cost || 0,
        notes: buildNotesFromForm(),
        status: 'planted',
      };

      // 1. Create planting record
      const result = await farmStore.createPlanting(plantingData);
      if (!result.success) {
        return { success: false, error: result.error };
      }

      const planting = result.data;

      // 2. Decrement inventory if seeded from inventory (best-effort, with rollback)
      if (isFromInventory.value && form.value.seed_inventory_id && form.value.seeds_used) {
        try {
          await inventoryStore.adjustStock(form.value.seed_inventory_id, {
            type: 'remove',
            quantity: form.value.seeds_used,
          });
        } catch (inventoryError) {
          console.error('Inventory decrement failed, rolling back planting:', inventoryError);
          try {
            await farmStore.deletePlanting(planting.$id);
          } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
          }
          return {
            success: false,
            error:
              'Failed to update inventory. Planting creation cancelled. Please check inventory availability.',
          };
        }
      }

      // 3. Update plot status to Active (non-blocking)
      try {
        await farmStore.updatePlot(form.value.plot_id, { status: 'Active' });
      } catch (plotError) {
        console.warn('Failed to update plot status to Active:', plotError);
      }

      return { success: true, data: planting };
    } catch (error) {
      console.error('Error submitting planting form:', error);
      return { success: false, error: error.message };
    } finally {
      isSubmitting.value = false;
    }
  }

  return {
    // State
    form,
    isSubmitting,
    errors,
    selectedCrop,
    selectedInventory,

    // Computed
    availableSeedInventory,
    isFromInventory,
    isPurchased,
    isDonated,
    calculatedInputsCost,
    totalPlantingInvestment,

    // Methods
    validate,
    submit,
    loadData,
    formatInventoryOption,
    getDaysUntilHarvest,
    calculateExpectedHarvestDate,
  };
}
