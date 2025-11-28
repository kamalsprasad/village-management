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
        <div v-if="isClient && !isEditMode && canEdit" class="col-auto">
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
      <q-banner v-if="isClient && !canEdit" class="bg-info text-white q-mb-md" rounded>
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
              <q-item
                v-for="(member, index) in councilMembers"
                :key="member.userId || member.residentId || index"
                class="q-pa-md"
              >
                <q-item-section avatar>
                  <q-icon name="person" color="primary" size="md" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">
                    {{ member.residentName || member.name || 'Unnamed Resident' }}
                  </q-item-label>
                  <q-item-label caption>
                    {{
                      councilRoleMap.get(member.roleId)?.name || member.position || 'Council Member'
                    }}
                  </q-item-label>
                  <q-item-label v-if="member.contact" caption class="text-grey-6">
                    {{ member.contact }}
                  </q-item-label>
                  <q-item-label v-if="member.requiresUserAccount" caption class="text-orange-8">
                    User account not found — Add User to activate role
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
            v-model="memberForm.roleId"
            :options="councilRoleOptions"
            label="Position *"
            outlined
            class="q-mb-md"
            :rules="[(val) => !!val || 'Position is required']"
            emit-value
            map-options
            option-label="label"
            option-value="value"
            :loading="isCouncilRolesLoading"
            input-debounce="200"
            hint="Select a council role"
          />
          <q-input v-model="memberForm.contact" label="Contact" outlined hint="Phone or email" />
          <q-banner
            v-if="memberForm.requiresUserAccount"
            class="bg-warning text-black q-mt-sm"
            rounded
          >
            No linked user account found for this resident. Once created, assign the council role in
            the Users module.
            <q-btn
              flat
              dense
              color="primary"
              class="q-ml-sm"
              label="Add User"
              @click="notifyAddUserPending"
            />
          </q-banner>
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

const isClient = ref(false); // Track client-side hydration for SSR

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
  council_member_ids: null,
  modules_enabled: [],
});

const emptyMemberFormState = () => ({
  residentId: null,
  residentName: '',
  userId: null,
  roleId: null,
  originalRoleId: null,
  originalUserId: null,
  name: '',
  contact: '',
  requiresUserAccount: false,
});

// Council member dialog state
const showMemberDialog = ref(false);
const editingMemberIndex = ref(null);
const memberForm = ref(emptyMemberFormState());

// Permissions
const canEdit = computed(() => {
  if (!isClient.value) return false; // Default to read-only during SSR
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
const councilRoleOptions = ref([]);
const isCouncilRolesLoading = ref(false);
const councilRolesError = ref(null);

const councilMembers = ref([]);
const isCouncilMembersLoading = ref(false);
const councilMembersError = ref(null);

const councilRoleMap = new Map();
const residentUserIndex = new Map();
const userIndex = new Map();

// Load settings on mount
onMounted(async () => {
  isClient.value = true; // Enable client-side rendering after hydration

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
      residentName: '',
      userId: null,
      roleId: null,
      name: '',
      position: '',
      contact: '',
      requiresUserAccount: false,
    };
  }

  const residentId = member.residentId || member.resident_id || null;
  const userId = member.userId || member.user_id || null;
  const roleId = member.roleId || member.role_id || null;
  const roleName =
    member.roleName ||
    (roleId && councilRoleMap.has(roleId) ? councilRoleMap.get(roleId)?.name : null);
  const position = roleName || member.position || '';
  const name = member.name || member.residentName || member.fullName || member.displayName || '';

  return {
    residentId,
    residentName: member.residentName || name,
    userId,
    roleId,
    roleName: roleName || null,
    name,
    position,
    contact: member.contact || '',
    requiresUserAccount: Boolean(member.requiresUserAccount),
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
      council_member_ids: settingsStore.councilMembers.map((member) =>
        normalizeCouncilMember(member),
      ),
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
    // $q.notify({
    //   type: 'positive',
    //   message: 'Village settings updated successfully',
    // });

    await fetchCouncilMembers();
  }
}
//Council Member functions
async function addCouncilMember() {
  editingMemberIndex.value = null;
  await fetchCouncilRoles();
  memberForm.value = emptyMemberFormState();
  showMemberDialog.value = true;
}

async function editCouncilMember(index) {
  await fetchCouncilRoles();
  const member = councilMembers.value[index];
  if (!member) {
    return;
  }

  editingMemberIndex.value = index;
  memberForm.value = {
    ...emptyMemberFormState(),
    ...member,
    residentName: member.residentName || member.name,
    name: member.name || member.residentName,
    originalRoleId: member.roleId || null,
    originalUserId: member.userId || null,
    requiresUserAccount: member.requiresUserAccount || !member.userId,
    contact: member.contact || '',
  };
  showMemberDialog.value = true;
}

async function saveMember() {
  if (!memberForm.value.residentId) {
    $q.notify({ type: 'warning', message: 'Please select a resident.' });
    return;
  }

  if (!memberForm.value.roleId) {
    $q.notify({ type: 'warning', message: 'Please select a council role.' });
    return;
  }

  try {
    if (!memberForm.value.requiresUserAccount && memberForm.value.userId) {
      await ensureUserHasCouncilRole(memberForm.value.userId, memberForm.value.roleId);

      if (
        memberForm.value.originalRoleId &&
        memberForm.value.originalRoleId !== memberForm.value.roleId
      ) {
        await removeCouncilRoleFromUser(memberForm.value.userId, memberForm.value.originalRoleId);
      }
    }

    const normalized = normalizeCouncilMember({ ...memberForm.value });

    if (editingMemberIndex.value === null) {
      formData.value.council_member_ids = [...formData.value.council_member_ids, normalized];
    } else {
      formData.value.council_member_ids.splice(editingMemberIndex.value, 1, normalized);
    }

    await fetchCouncilMembers();
    closeMemberDialog();
    $q.notify({ type: 'positive', message: 'Council member saved.' });
  } catch (error) {
    console.error('Failed to save council member:', error);
    $q.notify({
      type: 'negative',
      message: 'Unable to save council member. Please try again.',
    });
  }
}

function closeMemberDialog() {
  showMemberDialog.value = false;
  editingMemberIndex.value = null;
  memberForm.value = emptyMemberFormState();
}

function handleResidentSelect(option) {
  if (!option) {
    memberForm.value = {
      ...emptyMemberFormState(),
      roleId: memberForm.value.roleId,
    };
    return;
  }

  const residentId = option.id;
  const residentName = option.fullName || option.raw?.fullName || option.raw?.first_name;

  memberForm.value.residentId = residentId;
  memberForm.value.residentName = residentName;
  memberForm.value.name = residentName;

  const linkedUser = residentUserIndex.get(residentId);

  if (linkedUser) {
    const { userId, contact, roleId } = mapUserToMember(linkedUser);
    memberForm.value.userId = userId;
    memberForm.value.contact = contact;
    memberForm.value.originalRoleId = roleId;
    memberForm.value.originalUserId = userId;
    memberForm.value.requiresUserAccount = false;
    if (!memberForm.value.roleId && roleId) {
      memberForm.value.roleId = roleId;
    }
  } else {
    memberForm.value.userId = null;
    memberForm.value.contact = '';
    memberForm.value.originalRoleId = null;
    memberForm.value.originalUserId = null;
    memberForm.value.requiresUserAccount = true;
  }
}
async function fetchCouncilRoles(forceReload = false) {
  if (!forceReload && councilRoleOptions.value.length > 0) {
    return;
  }

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

    councilRoleMap.clear();
    councilRoleOptions.value = rolesResponse.rows
      .filter((role) => role?.$id && role?.name)
      .map((role) => {
        councilRoleMap.set(role.$id, role);
        return {
          label: role.name,
          value: role.$id,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
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
    //const rolesCollectionId = import.meta.env.VITE_APPWRITE_TABLE_ROLES;
    const usersTableId = import.meta.env.VITE_APPWRITE_TABLE_USERS;

    await fetchCouncilRoles();

    const usersResponse = await tables.listRows({
      databaseId: dbId,
      tableId: usersTableId,
      queries: [
        Query.select(['$id', 'name', 'email', 'resident_id.*', 'role_ids.*']),
        Query.limit(20),
      ],
    });

    const normalizedUsers = usersResponse.rows.map((user) => normalizeUser(user));

    residentUserIndex.clear();
    userIndex.clear();

    normalizedUsers.forEach((entry) => {
      if (entry.residentId) {
        residentUserIndex.set(entry.residentId, entry);
      }
      if (entry.userId) {
        userIndex.set(entry.userId, entry);
      }
    });

    const mappedMembers = normalizedUsers
      .filter((entry) => entry.roleId)
      .map((entry) => ({
        ...entry,
        contact: entry.contact,
      }));

    const storedIds = new Set(mappedMembers.map((member) => member.residentId));

    const manualMembers = (
      Array.isArray(formData.value.council_member_ids) ? formData.value.council_member_ids : []
    )
      .map((member) => normalizeCouncilMember(member))
      .filter((member) => member.residentId && !storedIds.has(member.residentId))
      .map((member) => ({ ...member, requiresUserAccount: true }));

    councilMembers.value = [...mappedMembers, ...manualMembers];
    formData.value.council_member_ids = councilMembers.value.map((member) =>
      normalizeCouncilMember(member),
    );
  } catch (error) {
    console.error('Failed to load council members:', error);
    councilMembersError.value = 'Unable to load council members. Please try again later.';
  } finally {
    isCouncilMembersLoading.value = false;
  }
}

function normalizeUser(user) {
  const userId = user.$id;
  const resident = user.resident_id;
  const residentId = typeof resident === 'string' ? resident : resident?.$id;
  const residentName =
    resident?.fullName ||
    [resident?.first_name, resident?.middle_names, resident?.last_name].filter(Boolean).join(' ');

  const roleIds = (Array.isArray(user.role_ids) ? user.role_ids : [])
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

  const councilRoleId = roleIds.find((roleId) => councilRoleMap.has(roleId)) || null;

  return {
    userId,
    residentId,
    residentName: residentName || user.name || 'Unnamed Resident',
    name: user.name || residentName || 'Unnamed Resident',
    contact: user.phone || user.email || '',
    roleId: councilRoleId,
    roleName: councilRoleId ? councilRoleMap.get(councilRoleId)?.name : null,
    roleIds,
  };
}

function mapUserToMember(entry) {
  return {
    userId: entry.userId,
    residentId: entry.residentId,
    residentName: entry.residentName,
    roleId: entry.roleId,
    roleName: entry.roleName,
    contact: entry.contact,
  };
}

async function ensureUserHasCouncilRole(userId, roleId) {
  if (!userId || !roleId) {
    return;
  }

  const user = await ensureUserEntry(userId);

  const existingRoleIds = new Set(user?.roleIds || []);
  if (existingRoleIds.has(roleId)) {
    return;
  }

  const updatedRoleIds = [...existingRoleIds, roleId];
  await updateUserRoles(userId, updatedRoleIds);
}

async function removeCouncilRoleFromUser(userId, roleId) {
  if (!userId || !roleId) {
    return;
  }

  const user = await ensureUserEntry(userId);
  const existingRoleIds = new Set(user?.roleIds || []);

  if (!existingRoleIds.has(roleId)) {
    return;
  }

  existingRoleIds.delete(roleId);
  await updateUserRoles(userId, Array.from(existingRoleIds));
}

async function updateUserRoles(userId, roleIds) {
  const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const usersCollectionId = import.meta.env.VITE_APPWRITE_TABLE_USERS;

  await tables.updateRow({
    databaseId: dbId,
    tableId: usersCollectionId,
    rowId: userId,
    data: {
      role_ids: roleIds,
    },
  });

  const entry = userIndex.get(userId) || {};
  const councilRoleId = roleIds.find((id) => councilRoleMap.has(id)) || null;
  const updatedEntry = {
    ...entry,
    roleIds,
    roleId: councilRoleId,
    roleName: councilRoleId ? councilRoleMap.get(councilRoleId)?.name : null,
  };
  userIndex.set(userId, updatedEntry);

  if (updatedEntry.residentId) {
    residentUserIndex.set(updatedEntry.residentId, updatedEntry);
  }
}

async function ensureUserEntry(userId) {
  if (!userId) {
    return null;
  }

  if (userIndex.has(userId)) {
    return userIndex.get(userId);
  }

  try {
    const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const usersCollectionId = import.meta.env.VITE_APPWRITE_TABLE_USERS;
    const user = await tables.getRow({
      databaseId: dbId,
      tableId: usersCollectionId,
      rowId: userId,
    });

    const normalized = normalizeUser(user);
    userIndex.set(userId, normalized);
    if (normalized.residentId) {
      residentUserIndex.set(normalized.residentId, normalized);
    }
    return normalized;
  } catch (error) {
    console.error('Failed to load user entry:', error);
    return null;
  }
}

function notifyAddUserPending() {
  $q.notify({
    type: 'info',
    message: 'Add User flow will be available soon. Please create the user manually for now.',
  });
}

function confirmDeleteMember(index) {
  const member = councilMembers.value[index];
  if (!member) {
    return;
  }

  $q.dialog({
    title: 'Remove Council Member',
    message: `Remove ${member.residentName || member.name || 'this member'} from the council?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      if (member.userId && member.roleId && !member.requiresUserAccount) {
        await removeCouncilRoleFromUser(member.userId, member.roleId);
      }

      formData.value.council_member_ids = formData.value.council_member_ids.filter(
        (entry) => entry.residentId !== member.residentId,
      );

      await fetchCouncilMembers();
      $q.notify({ type: 'positive', message: 'Council member removed.' });
    } catch (error) {
      console.error('Failed to remove council member:', error);
      $q.notify({
        type: 'negative',
        message: 'Unable to remove council member. Please try again.',
      });
    }
  });
}
</script>
