<template>
  <q-page padding>
    <div class="q-pa-md">
      <!-- Page Header -->
      <div class="row items-center q-mb-md">
        <div class="col">
          <h4 class="q-my-none">Village Settings</h4>
          <p class="text-grey-7 q-mb-none">
            Configure core village information and default settings
          </p>
        </div>
        <div v-if="!isEditMode && canEdit" class="col-auto">
          <q-btn color="primary" icon="edit" label="Edit Settings" @click="enableEditMode" />
        </div>
        <div v-if="isEditMode" class="col-auto">
          <q-btn flat color="grey-7" label="Cancel" class="q-mr-sm" @click="cancelEdit" />
          <q-btn
            color="primary"
            icon="save"
            label="Save Changes"
            :loading="settingsStore.isLoading"
            @click="saveSettings"
          />
        </div>
      </div>

      <!-- Read-only Notice for Non-Admins -->
      <q-banner v-if="!canEdit" class="bg-info text-white q-mb-md" rounded>
        <template #avatar>
          <q-icon name="info" />
        </template>
        You have read-only access to village settings. Only System Administrators can edit these
        settings.
      </q-banner>

      <!-- Loading State -->
      <div v-if="settingsStore.isLoading && !settingsStore.isLoaded" class="q-pa-md">
        <q-skeleton type="rect" height="200px" class="q-mb-md" />
        <q-skeleton type="rect" height="200px" class="q-mb-md" />
        <q-skeleton type="rect" height="200px" />
      </div>

      <!-- Settings Form -->
      <q-form v-else ref="settingsForm" @submit="saveSettings">
        <!-- Basic Information Section -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="text-h6 q-mb-md">Basic Information</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input
                  v-model="formData.village_name"
                  label="Village Name *"
                  outlined
                  :readonly="!isEditMode"
                  :rules="[(val) => !!val || 'Village name is required']"
                >
                  <template #prepend>
                    <q-icon name="location_city" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  v-model="formData.established_date"
                  label="Established Date"
                  outlined
                  type="date"
                  :readonly="!isEditMode"
                >
                  <template #prepend>
                    <q-icon name="event" />
                  </template>
                </q-input>
              </div>
              <div class="col-12">
                <q-input
                  v-model="formData.address"
                  label="Address"
                  outlined
                  type="textarea"
                  rows="3"
                  :readonly="!isEditMode"
                >
                  <template #prepend>
                    <q-icon name="place" />
                  </template>
                </q-input>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Financial Settings Section -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="text-h6 q-mb-md">Financial Settings</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <q-input
                  v-model="formData.default_currency"
                  label="Default Currency *"
                  outlined
                  :readonly="!isEditMode"
                  maxlength="3"
                  hint="ISO 4217 currency code (e.g., ZMW, USD)"
                  :rules="[(val) => !!val || 'Currency code is required']"
                >
                  <template #prepend>
                    <q-icon name="attach_money" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-md-4">
                <q-input
                  v-model="formData.currency_symbol"
                  label="Currency Symbol *"
                  outlined
                  :readonly="!isEditMode"
                  hint="Symbol displayed in reports (e.g., K, $, €)"
                  :rules="[(val) => !!val || 'Currency symbol is required']"
                >
                  <template #prepend>
                    <q-icon name="currency_exchange" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-md-4">
                <q-input
                  v-model="formData.country_code"
                  label="Country Code *"
                  outlined
                  :readonly="!isEditMode"
                  maxlength="2"
                  hint="ISO 3166-1 alpha-2 code (e.g., ZM, US)"
                  :rules="[
                    (val) => !!val || 'Country code is required',
                    (val) => val.length === 2 || 'Must be 2 characters',
                  ]"
                >
                  <template #prepend>
                    <q-icon name="flag" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-md-4">
                <q-input
                  v-model="formData.country_phone_code"
                  label="Country Phone Code *"
                  outlined
                  :readonly="!isEditMode"
                  hint="International dialing code (e.g., 260)"
                  :rules="[(val) => !!val || 'Country phone code is required']"
                >
                  <template #prepend>
                    <q-icon name="call" />
                  </template>
                  <template #append>
                    <span class="text-grey-6">+{{ formData.country_phone_code }}</span>
                  </template>
                </q-input>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- System Settings Section -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="text-h6 q-mb-md">System Settings</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-select
                  v-model="formData.timezone"
                  :options="timezoneOptions"
                  label="Timezone *"
                  outlined
                  :readonly="!isEditMode"
                  option-value="value"
                  option-label="label"
                  emit-value
                  map-options
                  :rules="[(val) => !!val || 'Timezone is required']"
                >
                  <template #prepend>
                    <q-icon name="schedule" />
                  </template>
                </q-select>
              </div>
              <div class="col-12 col-md-6">
                <q-select
                  v-model="formData.modules_enabled"
                  :options="moduleOptions"
                  label="Enabled Modules"
                  outlined
                  multiple
                  :readonly="!isEditMode"
                  option-value="value"
                  option-label="label"
                  emit-value
                  map-options
                  hint="Select which modules are active in your village"
                >
                  <template #prepend>
                    <q-icon name="apps" />
                  </template>
                </q-select>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Council Members Section -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="col">
                <div class="text-h6">Council Members</div>
              </div>
              <div v-if="isEditMode" class="col-auto">
                <q-btn
                  color="primary"
                  icon="add"
                  label="Add Member"
                  size="sm"
                  @click="addCouncilMember"
                />
              </div>
            </div>

            <!-- Council Members List -->
            <div v-if="isCouncilMembersLoading" class="flex flex-center q-pa-md">
              <q-spinner color="primary" size="32px" />
            </div>
            <q-banner v-else-if="councilMembersError" class="bg-warning text-black q-mb-md" rounded>
              {{ councilMembersError }}
            </q-banner>
            <div v-else-if="councilMembers.length === 0" class="text-grey-7 text-center q-pa-md">
              No council members found
            </div>
            <q-list v-else bordered separator>
              <q-item v-for="member in councilMembers" :key="member.id" class="q-pa-md">
                <q-item-section avatar>
                  <q-icon name="person" color="primary" size="md" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ member.name }}</q-item-label>
                  <q-item-label caption>{{ member.position }}</q-item-label>
                  <q-item-label v-if="member.contact" caption class="text-grey-6">
                    {{ member.contact }}
                  </q-item-label>
                </q-item-section>
                <q-item-section v-if="isEditMode" side>
                  <div class="row q-gutter-sm">
                    <q-btn
                      flat
                      round
                      dense
                      icon="edit"
                      color="primary"
                      @click="editCouncilMember(index)"
                    >
                      <q-tooltip>Edit</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      @click="confirmDeleteMember(index)"
                    >
                      <q-tooltip>Delete</q-tooltip>
                    </q-btn>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

        <!-- Last Updated Info -->
        <q-card v-if="settingsStore.lastUpdated" flat bordered>
          <q-card-section class="text-grey-7">
            <div class="row items-center">
              <q-icon name="update" size="sm" class="q-mr-sm" />
              <span>
                Last updated: {{ settingsStore.formatDateTime(settingsStore.lastUpdated) }}
              </span>
            </div>
          </q-card-section>
        </q-card>
      </q-form>
    </div>

    <!-- Council Member Dialog -->
    <q-dialog v-model="showMemberDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">
            {{ editingMemberIndex !== null ? 'Edit' : 'Add' }} Council Member
          </div>
        </q-card-section>

        <q-card-section>
          <ResidentSearchInput
            v-model="memberForm.residentId"
            label="Council Member *"
            outlined
            class="q-mb-md"
            :dense="true"
            :rules="[(val) => !!val || 'Please select a resident']"
            @select="handleResidentSelect"
          />
          <q-select
            v-model="memberForm.position"
            :options="councilRoles"
            label="Position *"
            outlined
            class="q-mb-md"
            :rules="[(val) => !!val || 'Position is required']"
            emit-value
            map-options
            option-label="label"
            option-value="value"
            :loading="isCouncilRolesLoading"
            use-input
            fill-input
            input-debounce="200"
            hint="Select a council role"
          />
          <q-input v-model="memberForm.contact" label="Contact" outlined hint="Phone or email" />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey-7" @click="closeMemberDialog" />
          <q-btn label="Save" color="primary" @click="saveMember" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { usePermissions } from 'src/composables/usePermissions';
import { useSettingsStore } from 'src/stores/settings-store';
import ResidentSearchInput from 'src/components/inputs/ResidentSearchInput.vue';
import { tables } from 'src/boot/appwrite';
import { Query } from 'appwrite';
//import { useAuthStore } from 'src/stores/auth-store';

const $q = useQuasar();
const settingsStore = useSettingsStore();
const { hasPermission } = usePermissions();
//const authStore = useAuthStore();

// Form state
const settingsForm = ref(null);
const isEditMode = ref(false);
const formData = ref({
  village_name: '',
  address: '',
  established_date: null,
  default_currency: '',
  currency_symbol: '',
  timezone: '',
  country_code: '',
  country_phone_code: '',
  is_using_sample_data: false,
  council_members: [],
  modules_enabled: [],
});

// Council member dialog state
const showMemberDialog = ref(false);
const editingMemberIndex = ref(null);
const memberForm = ref({
  residentId: null,
  name: '',
  position: '',
  contact: '',
});

// Permissions
const canEdit = computed(() => {
  return hasPermission('settings:write');
});

// Timezone options (common African timezones)
const timezoneOptions = [
  { label: 'Africa/Lusaka (+02:00)', value: 'Africa/Lusaka' },
  { label: 'Africa/Johannesburg (+02:00)', value: 'Africa/Johannesburg' },
  { label: 'Africa/Nairobi (+03:00)', value: 'Africa/Nairobi' },
  { label: 'Africa/Lagos (+01:00)', value: 'Africa/Lagos' },
  { label: 'Africa/Cairo (+02:00)', value: 'Africa/Cairo' },
  { label: 'UTC (+00:00)', value: 'UTC' },
];

// Module options
const moduleOptions = [
  { label: 'Dashboard', value: 'dashboard' },
  { label: 'Residents', value: 'residents' },
  { label: 'Households', value: 'households' },
  { label: 'Finance', value: 'finance' },
  { label: 'Farm Management', value: 'farm' },
  { label: 'School', value: 'school' },
  { label: 'Calendar', value: 'calendar' },
  { label: 'Storage', value: 'storage' },
];

// Council roles
const councilRoles = ref([]);
const isCouncilRolesLoading = ref(false);
const councilRolesError = ref(null);

const councilMembers = ref([]);
const isCouncilMembersLoading = ref(false);
const councilMembersError = ref(null);

// Load settings on mount
onMounted(async () => {
  if (!settingsStore.isLoaded) {
    await settingsStore.loadSettings();
  }
  loadFormData();
  await fetchCouncilMembers();
});

// Load form data from store
function normalizeCouncilMember(member) {
  if (!member) {
    return {
      residentId: null,
      name: '',
      position: '',
      contact: '',
    };
  }

  return {
    residentId: member.residentId || null,
    name: member.name || member.fullName || member.displayName || '',
    position: member.position || '',
    contact: member.contact || '',
  };
}

function loadFormData() {
  if (settingsStore.settings) {
    formData.value = {
      village_name: settingsStore.settings.village_name || '',
      address: settingsStore.settings.address || '',
      established_date: settingsStore.settings.established_date
        ? settingsStore.settings.established_date.slice(0, 10)
        : null,
      default_currency: settingsStore.settings.default_currency || 'ZMW',
      currency_symbol: settingsStore.settings.currency_symbol || 'K',
      timezone: settingsStore.settings.timezone || 'Africa/Lusaka',
      country_code: settingsStore.settings.country_code || 'ZM',
      country_phone_code: settingsStore.settings.country_phone_code || '',
      is_using_sample_data: settingsStore.settings.is_using_sample_data || false,
      council_members: settingsStore.councilMembers.map((member) => normalizeCouncilMember(member)),
      modules_enabled: [...(settingsStore.settings.modules_enabled || [])],
    };
  }
}

// Enable edit mode
function enableEditMode() {
  if (!canEdit.value) {
    $q.notify({
      type: 'warning',
      message: 'You do not have permission to edit settings',
    });
    return;
  }
  isEditMode.value = true;
}

// Cancel edit
function cancelEdit() {
  isEditMode.value = false;
  loadFormData(); // Reset form to original values
}

// Save settings
async function saveSettings() {
  // Validate form
  const isValid = await settingsForm.value.validate();
  if (!isValid) {
    $q.notify({
      type: 'warning',
      message: 'Please fix validation errors before saving',
    });
    return;
  }

  // Save to store
  const result = await settingsStore.updateSettings(formData.value);

  if (result.success) {
    isEditMode.value = false;
    $q.notify({
      type: 'positive',
      message: 'Village settings updated successfully',
    });
  }
}
//Council Member functions
function addCouncilMember() {
  editingMemberIndex.value = null;
  fetchCouncilRoles();
  memberForm.value = {
    residentId: null,
    name: '',
    position: '',
    contact: '',
  };
  showMemberDialog.value = true;
}

function editCouncilMember(index) {
  editingMemberIndex.value = index;
  memberForm.value = { ...formData.value.council_members[index] };
  showMemberDialog.value = true;
}
function saveMember() {
  if (editingMemberIndex.value === null) {
    formData.value.council_members.push(memberForm.value);
  } else {
    formData.value.council_members[editingMemberIndex.value] = memberForm.value;
  }
  showMemberDialog.value = false;
  editingMemberIndex.value = null;
  memberForm.value = {
    residentId: null,
    name: '',
    position: '',
    contact: '',
  };
}

function closeMemberDialog() {
  showMemberDialog.value = false;
  editingMemberIndex.value = null;
  memberForm.value = {
    residentId: null,
    name: '',
    position: '',
    contact: '',
  };
}
function handleResidentSelect(option) {
  if (option) {
    memberForm.value.residentId = option.id;
    memberForm.value.name = option.fullName;
  } else {
    memberForm.value.residentId = null;
    memberForm.value.name = '';
  }
}
async function fetchCouncilRoles() {
  isCouncilRolesLoading.value = true;
  councilRolesError.value = null;

  try {
    const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const rolesCollectionId = import.meta.env.VITE_APPWRITE_TABLE_ROLES;

    const rolesResponse = await tables.listRows({
      databaseId: dbId,
      tableId: rolesCollectionId,
      queries: [Query.equal('category', 'council'), Query.select(['$id', 'name'])],
    });
    console.log(rolesResponse.rows);
    councilRoles.value = rolesResponse.rows
      .filter((role) => role?.name)
      .map((role) => ({ label: role.name, value: role.name }));
  } catch (error) {
    console.error('Error fetching council roles:', error);
    councilRolesError.value = error.message;
  } finally {
    isCouncilRolesLoading.value = false;
  }
}

async function fetchCouncilMembers() {
  isCouncilMembersLoading.value = true;
  councilMembersError.value = null;

  try {
    const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const rolesCollectionId = import.meta.env.VITE_APPWRITE_TABLE_ROLES;
    const usersCollectionId = import.meta.env.VITE_APPWRITE_TABLE_USERS;

    const rolesResponse = await tables.listRows({
      databaseId: dbId,
      tableId: rolesCollectionId,
      queries: [Query.equal('category', 'council'), Query.select(['$id', 'name'])],
    });

    const councilRoleIds = rolesResponse.rows.map((role) => role.$id);

    if (councilRoleIds.length === 0) {
      councilMembers.value = [];
      return;
    }

    const usersResponse = await tables.listRows({
      databaseId: dbId,
      tableId: usersCollectionId,
      queries: [Query.select(['$id', 'name', 'email', 'role_ids.*']), Query.limit(10)],
    });

    const rolesMap = new Map(rolesResponse.rows.map((role) => [role.$id, role]));

    const filteredUsers = usersResponse.rows.filter((user) => {
      const matchedRoleIds = (Array.isArray(user.role_ids) ? user.role_ids : [])
        .map((roleEntry) => {
          if (typeof roleEntry === 'string') {
            return roleEntry;
          }

          if (roleEntry?.$id) {
            return roleEntry.$id;
          }

          if (roleEntry?.role) {
            return roleEntry.role?.$id;
          }

          if (roleEntry?.related) {
            return roleEntry.related?.$id;
          }

          return null;
        })
        .filter((id) => typeof id === 'string');

      return matchedRoleIds.some((roleId) => councilRoleIds.includes(roleId));
    });

    councilMembers.value = filteredUsers.map((user) => {
      const matchedRoles = (Array.isArray(user.role_ids) ? user.role_ids : []).map((roleEntry) => {
        if (typeof roleEntry === 'string') {
          return rolesMap.get(roleEntry);
        }

        if (roleEntry?.$id) {
          return roleEntry;
        }

        if (roleEntry?.role) {
          return roleEntry.role;
        }

        if (roleEntry?.related) {
          return roleEntry.related;
        }

        return null;
      });

      const councilRole = matchedRoles.find((role) => role && councilRoleIds.includes(role.$id));

      return {
        id: user.$id,
        name: user.name || 'Unnamed Resident',
        position: councilRole?.name || 'Council Member',
        contact: user.phone || user.email || null,
      };
    });
  } catch (error) {
    console.error('Failed to load council members:', error);
    councilMembersError.value = 'Unable to load council members. Please try again later.';
  } finally {
    isCouncilMembersLoading.value = false;
  }
}
</script>
