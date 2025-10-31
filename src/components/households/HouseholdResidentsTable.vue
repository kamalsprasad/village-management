<template>
  <q-table
    :rows="rows"
    :columns="columns"
    row-key="$id"
    flat
    dense
    separator="horizontal"
    :no-data-label="noDataLabel"
    :rows-per-page-options="[0]"
    @row-click="handleRowClick"
  >
    <template #body-cell-name="props">
      <q-td :props="props">
        <span class="text-primary cursor-pointer" @click.stop="navigateToResident(props.row.$id)">
          {{ props.row._displayName }}
        </span>
      </q-td>
    </template>

    <template #body-cell-age="props">
      <q-td :props="props">
        <q-badge
          v-if="props.row._ageDisplay !== 'N/A'"
          color="primary"
          text-color="white"
          dense
          :label="props.row._ageDisplay"
        />
        <span v-else class="text-grey">N/A</span>
      </q-td>
    </template>

    <template #body-cell-gender="props">
      <q-td :props="props">
        {{ props.row._genderDisplay }}
      </q-td>
    </template>

    <template v-if="isDormitory" #body-cell-room_number="props">
      <q-td :props="props">
        {{ props.row.room_number || 'N/A' }}
      </q-td>
    </template>

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
  </q-table>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { differenceInYears } from 'date-fns';
import { usePermissions } from 'src/composables/usePermissions';

const props = defineProps({
  residents: {
    type: Array,
    default: () => [],
  },
  householdType: {
    type: String,
    default: '',
  },
});

const router = useRouter();
const { hasPermission } = usePermissions();

const noDataLabel = 'No residents found for this household';

const isDormitory = computed(() => props.householdType === 'Dormitory');

const canViewContactInfo = computed(() => hasPermission('residents:read') && hasPermission('residents:write'));

const rows = computed(() =>
  props.residents.map((resident) => {
    const age = calculateAge(resident.dob);
    return {
      ...resident,
      _displayName: getResidentName(resident),
      _ageSort: age === null ? -1 : age,
      _ageDisplay: formatAge(age),
      _genderDisplay: resident.gender || 'Not specified',
    };
  }),
);

const columns = computed(() => {
  const baseColumns = [
    {
      name: 'name',
      label: 'Resident',
      align: 'left',
      field: '_displayName',
      sortable: true,
    },
    {
      name: 'age',
      label: 'Age',
      align: 'center',
      field: (row) => row._ageSort,
      sortable: true,
    },
    {
      name: 'gender',
      label: 'Gender',
      align: 'left',
      field: '_genderDisplay',
      sortable: true,
    },
  ];

  if (isDormitory.value) {
    baseColumns.push({
      name: 'room_number',
      label: 'Room',
      align: 'left',
      field: (row) => row.room_number || 'N/A',
      sortable: true,
    });
  }

  baseColumns.push({
    name: 'contact',
    label: 'Contact',
    align: 'left',
    field: 'contact',
  });

  return baseColumns;
});

function getResidentName(resident) {
  const parts = [resident.first_name, resident.middle_names, resident.last_name]
    .filter((part) => !!part)
    .join(' ');
  return parts || resident.name || 'Unknown Resident';
}

function calculateAge(dob) {
  if (!dob) {
    return null;
  }

  try {
    const age = differenceInYears(new Date(), new Date(dob));
    return Number.isNaN(age) || age < 0 ? null : age;
  } catch (error) {
    console.error('Error calculating resident age:', error);
    return null;
  }
}

function formatAge(age) {
  return age === null ? 'N/A' : age;
}

function handleRowClick(_evt, row) {
  navigateToResident(row.$id);
}

function navigateToResident(residentId) {
  router.push(`/residents/${residentId}`);
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
