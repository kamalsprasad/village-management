<template>
  <div class="row q-col-gutter-md">
    <div v-for="module in modules" :key="module.key" class="col-12 col-sm-6 col-lg-4">
      <q-card
        flat
        bordered
        class="module-card"
        :class="{ 'module-card--disabled': !isSelected(module.key) }"
      >
        <q-card-section class="row items-center justify-between q-pb-sm">
          <div class="row items-center q-gutter-sm">
            <q-icon :name="module.icon" size="28px" color="primary" />
            <div>
              <div class="text-subtitle1 text-weight-medium">{{ module.label }}</div>
              <q-badge v-if="module.isCore" color="grey-5" text-color="white" dense> Core </q-badge>
              <q-badge v-else-if="module.isOptional" color="primary" text-color="white" dense>
                Optional
              </q-badge>
            </div>
          </div>

          <q-toggle
            v-if="!readOnly && module.isOptional"
            :model-value="isSelected(module.key)"
            color="primary"
            @update:model-value="(val) => toggle(module.key, val)"
          />

          <q-chip v-else-if="module.isCore" color="positive" text-color="white" dense>
            Always On
          </q-chip>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <p class="text-body2 text-grey-7 q-mb-none">
            {{ module.description }}
          </p>

          <q-banner
            v-if="showWarnings && getWarning(module)"
            class="bg-warning text-black q-mt-sm"
            rounded
            dense
          >
            <template #avatar>
              <q-icon name="warning" />
            </template>
            {{ getWarning(module) }}
          </q-banner>
        </q-card-section>

        <q-card-actions v-if="module.configureRoute" align="right" class="q-pt-none">
          <q-btn
            flat
            dense
            color="primary"
            icon="settings"
            label="Configure"
            :to="module.configureRoute"
          />
        </q-card-actions>
      </q-card>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { MODULES, getModuleByKey } from 'src/utils/module-registry';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  modules: {
    type: Array,
    default: () => MODULES,
  },
  readOnly: {
    type: Boolean,
    default: false,
  },
  showWarnings: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const selectedSet = computed(() => new Set(props.modelValue || []));

function isSelected(key) {
  return selectedSet.value.has(key);
}

function toggle(key, enabled) {
  const current = [...(props.modelValue || [])];
  const index = current.indexOf(key);

  if (enabled && index === -1) {
    current.push(key);
  } else if (!enabled && index >= 0) {
    current.splice(index, 1);
  }

  emit('update:modelValue', current);
}

function getWarning(module) {
  if (!props.showWarnings || isSelected(module.key)) {
    return null;
  }

  const dependentLabels = module.requiredBy
    .filter((key) => isSelected(key))
    .map((key) => getModuleByKey(key)?.label || key);

  if (dependentLabels.length === 0) {
    return null;
  }

  return `Used by: ${dependentLabels.join(', ')}. Data is preserved when disabled.`;
}
</script>

<style scoped>
.module-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.module-card--disabled {
  opacity: 0.92;
}
</style>
