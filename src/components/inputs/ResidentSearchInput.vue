<template>
  <q-select
    v-model="internalValue"
    :label="label"
    :hint="hint"
    :rules="rules"
    :dense="dense"
    :outlined="outlined"
    :clearable="clearable"
    :disable="disable"
    use-input
    fill-input
    hide-selected
    emit-value
    map-options
    option-value="id"
    option-label="fullName"
    input-debounce="300"
    :loading="isLoading"
    :options="options"
    @filter="onFilter"
    @clear="handleClear"
    @update:model-value="handleUpdate"
  >
    <template #no-option>
      <q-item>
        <q-item-section class="text-grey">
          <span v-if="searchTerm.length < minSearchLength">
            Type at least {{ minSearchLength }} characters to search
          </span>
          <span v-else>No residents found</span>
        </q-item-section>
      </q-item>
    </template>
  </q-select>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { Query } from 'appwrite';
import { tables } from 'src/boot/appwrite';

const MIN_SEARCH_LENGTH = 3;
const MAX_RESULTS = 10;

const props = defineProps({
  modelValue: {
    type: String,
    default: null,
  },
  label: {
    type: String,
    default: 'Select Resident',
  },
  hint: {
    type: String,
    default: '',
  },
  dense: {
    type: Boolean,
    default: false,
  },
  outlined: {
    type: Boolean,
    default: true,
  },
  clearable: {
    type: Boolean,
    default: true,
  },
  disable: {
    type: Boolean,
    default: false,
  },
  rules: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:modelValue', 'select']);

const options = ref([]);
const selectedOption = ref(null);
const searchTerm = ref('');
const isLoading = ref(false);
let activeSearchToken = 0;

const internalValue = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value || null);
  },
});

const minSearchLength = MIN_SEARCH_LENGTH;

watch(
  () => props.modelValue,
  async (value) => {
    if (!value) {
      selectedOption.value = null;
      return;
    }

    const existingOption = options.value.find((option) => option.id === value);
    if (existingOption) {
      selectedOption.value = existingOption;
      return;
    }

    await loadResidentById(value);
  },
  { immediate: true },
);

function buildOption(row) {
  const parts = [row.first_name, row.middle_names, row.last_name].filter(Boolean);
  return {
    id: row.$id,
    fullName: parts.join(' '),
    raw: row,
  };
}

async function loadResidentById(residentId) {
  try {
    const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const tableId = import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS;

    const resident = await tables.getRow({
      databaseId: dbId,
      tableId,
      rowId: residentId,
    });

    const option = buildOption(resident);
    selectedOption.value = option;
    ensureOption(option);
    emit('select', option);
  } catch (error) {
    console.error('ResidentSearchInput: failed to load resident by id', error);
  }
}

function ensureOption(option) {
  if (!option) {
    return;
  }
  const exists = options.value.some((opt) => opt.id === option.id);
  if (!exists) {
    options.value = [option, ...options.value].slice(0, MAX_RESULTS);
  }
}

async function fetchResidents(term) {
  const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const tableId = import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS;

  const queriesForField = (field) => [Query.search(field, term), Query.limit(MAX_RESULTS)];

  const results = await Promise.allSettled([
    tables.listRows({ databaseId: dbId, tableId, queries: queriesForField('first_name') }),
    tables.listRows({ databaseId: dbId, tableId, queries: queriesForField('last_name') }),
  ]);

  const map = new Map();

  const appendRows = (rows, weight) => {
    rows.forEach((row) => {
      if (!map.has(row.$id)) {
        map.set(row.$id, {
          option: buildOption(row),
          weight,
        });
      }
    });
  };

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      appendRows(result.value.rows || [], index);
    }
  });

  let merged = Array.from(map.values())
    .sort((a, b) => a.weight - b.weight)
    .map((entry) => entry.option)
    .slice(0, MAX_RESULTS);

  // Client-side match on middle names when not already captured
  if (merged.length < MAX_RESULTS) {
    const lowerTerm = term.toLowerCase();
    merged = merged
      .concat(
        Array.from(map.values())
          .map((entry) => entry.option)
          .filter((option) =>
            option.raw?.middle_names ? option.raw.middle_names.toLowerCase().includes(lowerTerm) : false,
          ),
      )
      .filter((option, index, array) => array.findIndex((o) => o.id === option.id) === index)
      .slice(0, MAX_RESULTS);
  }

  return merged;
}

function onFilter(val, update) {
  searchTerm.value = val;
  const trimmed = val ? val.trim() : '';

  const token = ++activeSearchToken;

  if (!trimmed || trimmed.length < MIN_SEARCH_LENGTH) {
    isLoading.value = false;
    update(() => {
      if (token === activeSearchToken) {
        options.value = selectedOption.value ? [selectedOption.value] : [];
      }
    });
    return;
  }

  isLoading.value = true;
  fetchResidents(trimmed)
    .then((fetched) => {
      if (token !== activeSearchToken) {
        return;
      }
      update(() => {
        options.value = fetched;
        ensureOption(selectedOption.value);
      });
    })
    .catch((error) => {
      console.error('ResidentSearchInput: search failed', error);
      if (token !== activeSearchToken) {
        return;
      }
      update(() => {
        options.value = selectedOption.value ? [selectedOption.value] : [];
      });
    })
    .finally(() => {
      if (token === activeSearchToken) {
        isLoading.value = false;
      }
    });
}

function handleUpdate(value) {
  const option = options.value.find((opt) => opt.id === value) || selectedOption.value;
  selectedOption.value = option || null;
  if (option) {
    emit('select', option);
  } else {
    emit('select', null);
  }
}

function handleClear() {
  selectedOption.value = null;
  emit('select', null);
}
</script>
