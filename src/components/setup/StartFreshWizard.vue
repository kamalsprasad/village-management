<template>
  <div class="start-fresh-wizard q-pa-md" style="max-width: 900px; width: 100%">
    <div class="row items-center q-mb-md">
      <div class="col text-center">
        <q-icon name="add_home_work" size="48px" color="primary" class="q-mb-sm" />
        <h4 class="text-h5 text-weight-bold q-my-none">Start Fresh with Real Data</h4>
        <p class="text-subtitle2 text-grey-7 q-mt-sm q-mb-none">
          Set up your village management platform step by step.
        </p>
      </div>
    </div>
    <div class="text-right q-mb-md">
      <q-btn flat dense color="grey-7" label="Cancel" icon="close" @click="$emit('cancel')" />
    </div>

    <q-stepper
      v-model="currentStep"
      flat
      bordered
      animated
      vertical
      color="primary"
      done-color="positive"
      active-color="primary"
    >
      <!-- Step 1: Village Profile -->
      <q-step
        :name="1"
        title="Village Profile"
        icon="home_work"
        :caption="'Step 1 of 5'"
        :done="currentStep > 1"
      >
        <q-form ref="step1Form" class="q-gutter-md">
          <p class="text-body2 text-grey-7">
            Defaults are set for Zambia. Adjust if your village is elsewhere.
          </p>

          <q-input
            v-model="villageForm.village_name"
            label="Village Name *"
            outlined
            dense
            :rules="[(val) => (val && val.trim().length > 0) || 'Village name is required']"
            lazy-rules
          />

          <q-input v-model="villageForm.address" label="Address" outlined dense />

          <q-input
            v-model="villageForm.established_date"
            label="Established Date"
            outlined
            dense
            type="date"
          >
            <template #prepend>
              <q-icon name="event" />
            </template>
          </q-input>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-4">
              <q-input
                v-model="villageForm.default_currency"
                label="Currency Code *"
                outlined
                dense
                maxlength="3"
                hint="ISO 4217 (e.g. ZMW, USD)"
                :rules="[(val) => !!val || 'Currency code is required']"
                lazy-rules
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model="villageForm.currency_symbol"
                label="Currency Symbol *"
                outlined
                dense
                hint="e.g. K, $"
                :rules="[(val) => !!val || 'Currency symbol is required']"
                lazy-rules
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model="villageForm.country_code"
                label="Country Code *"
                outlined
                dense
                maxlength="2"
                hint="ISO 3166-1 alpha-2 (e.g. ZM)"
                :rules="[
                  (val) => !!val || 'Country code is required',
                  (val) => val.length === 2 || 'Must be 2 characters',
                ]"
                lazy-rules
              />
            </div>
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="villageForm.country_phone_code"
                label="Country Phone Code *"
                outlined
                dense
                hint="e.g. +260"
                :rules="[(val) => !!val || 'Country phone code is required']"
                lazy-rules
              />
            </div>
            <div class="col-12 col-md-6">
              <q-select
                v-model="villageForm.timezone"
                :options="timezoneOptions"
                label="Timezone *"
                outlined
                dense
                option-value="value"
                option-label="label"
                emit-value
                map-options
                :rules="[(val) => !!val || 'Timezone is required']"
                lazy-rules
              >
                <template #prepend>
                  <q-icon name="schedule" />
                </template>
              </q-select>
            </div>
          </div>
        </q-form>

        <q-stepper-navigation>
          <q-btn
            color="primary"
            label="Next"
            icon-right="chevron_right"
            :loading="stepLoading"
            @click="onStep1Next"
          />
        </q-stepper-navigation>
      </q-step>

      <!-- Step 2: Admin User -->
      <q-step
        :name="2"
        title="Admin User"
        icon="admin_panel_settings"
        :caption="'Step 2 of 5'"
        :done="currentStep > 2"
      >
        <p class="text-body2 text-grey-7">
          You are the System Administrator. This account was created during initial login.
        </p>

        <q-list bordered separator class="rounded-borders q-mb-md">
          <q-item>
            <q-item-section avatar>
              <q-icon name="person" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ adminName }}</q-item-label>
              <q-item-label caption>Name</q-item-label>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section avatar>
              <q-icon name="email" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ adminEmail }}</q-item-label>
              <q-item-label caption>Email</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <q-stepper-navigation>
          <q-btn color="primary" label="Next" icon-right="chevron_right" @click="currentStep = 3" />
          <q-btn
            flat
            color="primary"
            label="Back"
            icon="chevron_left"
            class="q-ml-sm"
            @click="currentStep = 1"
          />
        </q-stepper-navigation>
      </q-step>

      <!-- Step 3: Village Head -->
      <q-step
        :name="3"
        title="Village Head"
        icon="person_add"
        :caption="'Step 3 of 5'"
        :done="currentStep > 3"
      >
        <p class="text-body2 text-grey-7">
          Optionally create a Village Head user account, or skip if you are the Village Head.
        </p>

        <q-option-group
          v-model="villageHeadOption"
          :options="villageHeadOptions"
          color="primary"
          class="q-mb-md"
        />

        <q-form v-if="villageHeadOption === 'create'" ref="step3Form" class="q-gutter-md">
          <q-input
            v-model="villageHeadForm.name"
            label="Full Name *"
            outlined
            dense
            maxlength="255"
            :rules="[(val) => (val && val.trim().length > 0) || 'Name is required']"
            lazy-rules
          />

          <q-input
            v-model="villageHeadForm.email"
            type="email"
            label="Email *"
            outlined
            dense
            maxlength="255"
            :rules="[
              (val) => (val && val.trim().length > 0) || 'Email is required',
              (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Enter a valid email address',
            ]"
            lazy-rules
          />

          <q-input
            v-model="villageHeadForm.password"
            :type="showVHPassword ? 'text' : 'password'"
            label="Password *"
            outlined
            dense
            maxlength="265"
            :rules="[
              (val) => (val && val.length > 0) || 'Password is required',
              (val) => (val && val.length >= 8) || 'Password must be at least 8 characters',
            ]"
            lazy-rules
          >
            <template #prepend>
              <q-icon name="lock" />
            </template>
            <template #append>
              <q-icon
                :name="showVHPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showVHPassword = !showVHPassword"
              />
            </template>
          </q-input>
        </q-form>

        <q-stepper-navigation>
          <q-btn
            color="primary"
            label="Next"
            icon-right="chevron_right"
            :loading="stepLoading"
            @click="onStep3Next"
          />
          <q-btn
            flat
            color="primary"
            label="Back"
            icon="chevron_left"
            class="q-ml-sm"
            @click="currentStep = 2"
          />
        </q-stepper-navigation>
      </q-step>

      <!-- Step 4: Module Selection -->
      <q-step
        :name="4"
        title="Module Selection"
        icon="apps"
        :caption="'Step 4 of 5'"
        :done="currentStep > 4"
      >
        <p class="text-body2 text-grey-7">
          Choose which optional modules to enable. You can enable/disable modules later in Settings.
        </p>

        <ModuleSelectionGrid v-model="enabledModules" :show-warnings="false" />

        <q-stepper-navigation class="q-mt-md">
          <q-btn
            color="primary"
            label="Next"
            icon-right="chevron_right"
            :loading="stepLoading"
            @click="onStep4Next"
          />
          <q-btn
            flat
            color="primary"
            label="Back"
            icon="chevron_left"
            class="q-ml-sm"
            @click="currentStep = 3"
          />
        </q-stepper-navigation>
      </q-step>

      <!-- Step 5: First Household -->
      <q-step
        :name="5"
        title="First Household"
        icon="home"
        :caption="'Step 5 of 5'"
        :done="currentStep > 5"
      >
        <p class="text-body2 text-grey-7">Create your first household to get started.</p>

        <q-form ref="step5Form" class="q-gutter-md">
          <q-input
            v-model="householdForm.name"
            label="Household Name *"
            outlined
            dense
            :rules="[(val) => (val && val.trim().length > 0) || 'Household name is required']"
            lazy-rules
          />

          <q-select
            v-model="householdForm.household_type"
            :options="householdTypes"
            label="Household Type"
            outlined
            dense
          />

          <q-input
            v-model="householdForm.construction_date"
            label="Construction Date"
            outlined
            dense
            type="date"
          >
            <template #prepend>
              <q-icon name="event" />
            </template>
          </q-input>
        </q-form>

        <q-stepper-navigation>
          <q-btn
            color="primary"
            label="Finish"
            icon="check"
            :loading="stepLoading"
            @click="onStep5Finish"
          />
          <q-btn
            flat
            color="primary"
            label="Back"
            icon="chevron_left"
            class="q-ml-sm"
            @click="currentStep = 4"
          />
        </q-stepper-navigation>
      </q-step>
    </q-stepper>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { useUsersStore } from 'src/stores/users-store';
import { useHouseholdsStore } from 'src/stores/households-store';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { CORE_MODULE_KEYS } from 'src/utils/module-registry';
import ModuleSelectionGrid from 'src/components/admin/ModuleSelectionGrid.vue';

defineEmits(['cancel']);

const router = useRouter();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const householdsStore = useHouseholdsStore();
const { notifyError } = useErrorHandler();

const currentStep = ref(1);
const stepLoading = ref(false);

// Refs for q-form validation
const step1Form = ref(null);
const step3Form = ref(null);
const step5Form = ref(null);

// Step 1: Village Profile form
const villageForm = ref({
  village_name: '',
  address: '',
  established_date: '',
  default_currency: 'ZMW',
  currency_symbol: 'K',
  timezone: 'Africa/Lusaka',
  country_code: 'ZM',
  country_phone_code: '+260',
});

const timezoneOptions = [
  { label: 'Africa/Lusaka (+02:00)', value: 'Africa/Lusaka' },
  { label: 'Africa/Johannesburg (+02:00)', value: 'Africa/Johannesburg' },
  { label: 'Africa/Nairobi (+03:00)', value: 'Africa/Nairobi' },
  { label: 'Africa/Lagos (+01:00)', value: 'Africa/Lagos' },
  { label: 'Africa/Cairo (+02:00)', value: 'Africa/Cairo' },
  { label: 'UTC (+00:00)', value: 'UTC' },
];

// Step 2: Admin User (read-only)
const adminName = computed(() => authStore.user?.name || 'System Administrator');
const adminEmail = computed(() => authStore.user?.email || '');

// Step 3: Village Head
const villageHeadOption = ref('self');
const villageHeadOptions = [
  { label: 'I am the Village Head', value: 'self' },
  { label: 'Create a different Village Head user', value: 'create' },
];
const villageHeadForm = ref({
  name: '',
  email: '',
  password: '',
});
const showVHPassword = ref(false);
const villageHeadRoleId = ref(null);

// Step 4: Module Selection
const enabledModules = ref([...CORE_MODULE_KEYS]);

// Step 5: First Household
const householdForm = ref({
  name: '',
  household_type: '',
  construction_date: '',
});
const householdTypes = [
  'Single Family',
  'Multi-Family',
  'Dormitory',
  'Guest House',
  'Admin Building',
  'Other',
];

onMounted(async () => {
  // Fetch roles to resolve Village Head role id
  await usersStore.fetchRoles();
  const villageHeadRole = usersStore.roles.find((r) => r.name === 'Village Head');
  villageHeadRoleId.value = villageHeadRole?.$id || null;

  // Seed enabledModules from settingsStore if available
  if (settingsStore.modulesEnabled && settingsStore.modulesEnabled.length > 0) {
    enabledModules.value = [...settingsStore.modulesEnabled];
  }
});

// Step 1: Save village profile
async function onStep1Next() {
  const valid = await step1Form.value.validate();
  if (!valid) return;

  stepLoading.value = true;
  try {
    // Determine create vs update
    await settingsStore.loadSettings();

    if (!settingsStore.settings) {
      // No settings row exists — create
      const result = await settingsStore.createSettings({
        village_name: villageForm.value.village_name,
        address: villageForm.value.address,
        established_date: villageForm.value.established_date || null,
        default_currency: villageForm.value.default_currency,
        currency_symbol: villageForm.value.currency_symbol,
        timezone: villageForm.value.timezone,
        country_code: villageForm.value.country_code,
        country_phone_code: villageForm.value.country_phone_code,
        council_members: [],
        modules_enabled: [...CORE_MODULE_KEYS],
        vendors_enabled: true,
        yield_unit: 'kg_per_hectare',
        is_using_sample_data: false,
        lending_enabled: false,
      });
      if (!result.success) return;
    } else {
      // Settings row exists — update
      const result = await settingsStore.updateSettings({
        village_name: villageForm.value.village_name,
        address: villageForm.value.address,
        established_date: villageForm.value.established_date || null,
        default_currency: villageForm.value.default_currency,
        currency_symbol: villageForm.value.currency_symbol,
        timezone: villageForm.value.timezone,
        country_code: villageForm.value.country_code,
        country_phone_code: villageForm.value.country_phone_code,
        is_using_sample_data: false,
      });
      if (!result.success) return;
    }

    currentStep.value = 2;
  } finally {
    stepLoading.value = false;
  }
}

// Step 3: Create Village Head or skip
async function onStep3Next() {
  if (villageHeadOption.value === 'self') {
    // Skip — no user creation needed
    currentStep.value = 4;
    return;
  }

  const valid = await step3Form.value.validate();
  if (!valid) return;

  if (!villageHeadRoleId.value) {
    notifyError(
      'Could not find the Village Head role. Please try again or contact your administrator.',
    );
    return;
  }

  stepLoading.value = true;
  try {
    const result = await usersStore.createUser({
      name: villageHeadForm.value.name,
      email: villageHeadForm.value.email,
      password: villageHeadForm.value.password,
      role_ids: [villageHeadRoleId.value],
    });

    if (!result.success) {
      notifyError(result.error || 'Failed to create Village Head user');
      return;
    }

    currentStep.value = 4;
  } finally {
    stepLoading.value = false;
  }
}

// Step 4: Save module selection
async function onStep4Next() {
  stepLoading.value = true;
  try {
    const result = await settingsStore.updateModulesEnabled(enabledModules.value);
    if (!result.success) return;

    currentStep.value = 5;
  } finally {
    stepLoading.value = false;
  }
}

// Step 5: Create household and finish
async function onStep5Finish() {
  const valid = await step5Form.value.validate();
  if (!valid) return;

  stepLoading.value = true;
  try {
    const householdData = {
      name: householdForm.value.name,
      household_type: householdForm.value.household_type || null,
      construction_date: householdForm.value.construction_date
        ? new Date(householdForm.value.construction_date).toISOString()
        : null,
    };

    const result = await householdsStore.createHousehold(householdData);
    if (!result.success) return;

    // Refresh settings so isUsingSampleData is false on dashboard
    await settingsStore.loadSettings();

    // Redirect to dashboard
    router.push('/');
  } finally {
    stepLoading.value = false;
  }
}
</script>

<style scoped>
.start-fresh-wizard {
  max-width: 900px;
  margin: 0 auto;
}
</style>
