// usePlantingForm.js - Composable for planting form logic
// Story 3.3: Planting Records with Seed Inventory and Labor Tracking

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

  // Form state
  const form = ref({
    // Core fields
    plot_id: plotId,
    crop_id: null,
    planting_date: format(new Date(), 'yyyy-MM-dd'),
    expected_harvest_date: null,
    notes: '',

    // Seed tracking
    seed_source: SEED_SOURCES.FROM_INVENTORY,
    seed_inventory_id: null,
    seeds_used: null,
    seed_cost: null,
    seed_cost_override: false,
    seed_vendor: '',
    seed_donor: '',
    seed_notes: '',

    // Labor tracking
    planting_labor_farmhands: null,
    planting_labor_cost: null,
    planting_labor_notes: '',

    // Other costs
    planting_other_costs: null,
    planting_other_costs_notes: '',
  });

  const isSubmitting = ref(false);
  const errors = ref({});
  const selectedCrop = ref(null);
  const selectedInventory = ref(null);

  // Computed
  const availableSeedInventory = computed(() => {
    return inventoryStore.items.filter(
      (item) => item.item_type === 'farm_inputs' && item.status === 'in_stock' && item.quantity > 0,
    );
  });

  const isFromInventory = computed(() => form.value.seed_source === SEED_SOURCES.FROM_INVENTORY);
  const isPurchased = computed(() => form.value.seed_source === SEED_SOURCES.PURCHASED_SEPARATELY);
  const isDonated = computed(() => form.value.seed_source === SEED_SOURCES.DONATED);

  const calculatedSeedCost = computed(() => {
    if (!isFromInventory.value || !selectedInventory.value || !form.value.seeds_used) {
      return 0;
    }
    const unitCost = selectedInventory.value.unit_cost || 0;
    return unitCost * form.value.seeds_used;
  });

  const finalSeedCost = computed(() => {
    if (form.value.seed_cost_override && form.value.seed_cost !== null) {
      return form.value.seed_cost;
    }
    if (isDonated.value) return 0;
    if (isFromInventory.value) return calculatedSeedCost.value;
    return form.value.seed_cost || 0;
  });

  const totalPlantingInvestment = computed(() => {
    return (
      finalSeedCost.value +
      (form.value.planting_labor_cost || 0) +
      (form.value.planting_other_costs || 0)
    );
  });

  const hasLaborWithoutCost = computed(() => {
    return (
      form.value.planting_labor_farmhands > 0 &&
      (!form.value.planting_labor_cost || form.value.planting_labor_cost === 0)
    );
  });

  // Watch for crop selection to calculate expected harvest date
  watch(
    () => form.value.crop_id,
    (cropId) => {
      if (!cropId) {
        selectedCrop.value = null;
        return;
      }
      selectedCrop.value = farmStore.crops.find((c) => c.$id === cropId) || null;
      calculateExpectedHarvestDate();
    },
  );

  // Watch for planting date changes to recalculate
  watch(() => form.value.planting_date, calculateExpectedHarvestDate);

  // Watch for inventory selection
  watch(
    () => form.value.seed_inventory_id,
    (inventoryId) => {
      if (!inventoryId) {
        selectedInventory.value = null;
        return;
      }
      selectedInventory.value =
        inventoryStore.items.find((item) => item.$id === inventoryId) || null;
    },
  );

  // Auto-update seed cost when calculated changes (unless overridden)
  watch(calculatedSeedCost, (newCost) => {
    if (isFromInventory.value && !form.value.seed_cost_override) {
      form.value.seed_cost = newCost;
    }
  });

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
      const diffTime = harvestDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  }

  function validate() {
    errors.value = {};

    // Required fields
    if (!form.value.crop_id) {
      errors.value.crop_id = 'Crop is required';
    }
    if (!form.value.planting_date) {
      errors.value.planting_date = 'Planting date is required';
    }
    if (!form.value.expected_harvest_date) {
      errors.value.expected_harvest_date = 'Expected harvest date is required';
    }

    // Date validation
    if (form.value.planting_date && form.value.expected_harvest_date) {
      const planting = parseISO(form.value.planting_date);
      const harvest = parseISO(form.value.expected_harvest_date);
      if (harvest < planting) {
        errors.value.expected_harvest_date = 'Harvest date cannot be before planting date';
      }
    }

    // Seed source validation
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
        errors.value.seeds_used = `Insufficient inventory. Available: ${selectedInventory.value.quantity} ${selectedInventory.value.unit || 'units'}`;
      }
    }

    if (isPurchased.value && (!form.value.seed_cost || form.value.seed_cost < 0)) {
      errors.value.seed_cost = 'Please enter seed cost';
    }

    // Labor validation (warning only)
    if (hasLaborWithoutCost.value) {
      errors.value.laborWarning =
        'You entered farmhands but no labor cost. Add labor cost for accurate profitability tracking.';
    }

    return Object.keys(errors.value).filter((k) => !k.includes('Warning')).length === 0;
  }

  async function loadData() {
    // Load crops if not loaded
    if (!farmStore.cropsLoaded) {
      await farmStore.fetchCrops({ is_active: true });
    }
    // Load seed inventory
    if (inventoryStore.items.length === 0) {
      await inventoryStore.fetchItems(1, 100);
    }
  }

  function resetForm() {
    form.value = {
      plot_id: plotId,
      crop_id: null,
      planting_date: format(new Date(), 'yyyy-MM-dd'),
      expected_harvest_date: null,
      notes: '',
      seed_source: SEED_SOURCES.FROM_INVENTORY,
      seed_inventory_id: null,
      seeds_used: null,
      seed_cost: null,
      seed_cost_override: false,
      seed_vendor: '',
      seed_donor: '',
      seed_notes: '',
      planting_labor_farmhands: null,
      planting_labor_cost: null,
      planting_labor_notes: '',
      planting_other_costs: null,
      planting_other_costs_notes: '',
    };
    selectedCrop.value = null;
    selectedInventory.value = null;
    errors.value = {};
  }

  async function submit() {
    if (!validate()) {
      return { success: false, errors: errors.value };
    }

    isSubmitting.value = true;

    try {
      // Prepare planting data
      const plantingData = {
        plot_id: form.value.plot_id,
        crop_id: form.value.crop_id,
        planting_date: form.value.planting_date,
        expected_harvest_date: form.value.expected_harvest_date,
        notes: form.value.notes,
        seed_source: form.value.seed_source,
        seed_cost: finalSeedCost.value,
        planting_labor_farmhands: form.value.planting_labor_farmhands,
        planting_labor_cost: form.value.planting_labor_cost,
        planting_labor_notes: form.value.planting_labor_notes,
        planting_other_costs: form.value.planting_other_costs,
        planting_other_costs_notes: form.value.planting_other_costs_notes,
      };

      // Add inventory-specific fields
      if (isFromInventory.value) {
        plantingData.seed_inventory_id = form.value.seed_inventory_id;
        plantingData.seeds_used = form.value.seeds_used;
      }

      // 1. Create planting
      const result = await farmStore.createPlanting(plantingData);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const planting = result.data;

      // 2. Decrement inventory if applicable
      if (isFromInventory.value && form.value.seed_inventory_id) {
        try {
          await inventoryStore.adjustStock(form.value.seed_inventory_id, {
            type: 'remove',
            quantity: form.value.seeds_used,
            reason: `Used in planting ${planting.$id} (${selectedCrop.value?.crop_name || 'Unknown Crop'})`,
          });
        } catch (inventoryError) {
          // 3. Rollback: Delete planting if inventory fails
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

      // 4. Update plot status to Active
      try {
        await farmStore.updatePlot(form.value.plot_id, { status: 'Active' });
      } catch (plotError) {
        console.warn('Failed to update plot status to Active:', plotError);
        // Non-blocking - planting was successful
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

    // Constants
    SEED_SOURCES,

    // Computed
    availableSeedInventory,
    isFromInventory,
    isPurchased,
    isDonated,
    calculatedSeedCost,
    finalSeedCost,
    totalPlantingInvestment,
    hasLaborWithoutCost,

    // Methods
    validate,
    submit,
    resetForm,
    loadData,
    formatInventoryOption,
    getDaysUntilHarvest,
    calculateExpectedHarvestDate,
  };
}
