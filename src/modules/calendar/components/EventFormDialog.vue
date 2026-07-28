<!--
  EventFormDialog.vue (Story 5.2)

  Create/Edit form for user-created village calendar events
  (village_events table).

  Props:
  - modelValue       — dialog visibility (v-model)
  - event            — village_events row to edit; null = create mode
  - allowedCategories — category values the current user may use (role-scoped)
  - saving           — parent-driven loading state for the save button

  Emits:
  - update:modelValue
  - save(payload)    — raw form payload ('YYYY-MM-DD' dates, 'HH:mm' times);
                       the parent performs the store call.

  SSR-safe: the notify-users options are fetched from the users table only
  when the dialog opens (client-side click), never during SSR.
-->
<template>
  <q-dialog v-model="show" persistent>
    <q-card style="min-width: 400px; max-width: 560px">
      <q-card-section class="row items-center">
        <div class="text-h6">{{ isEditing ? 'Edit Event' : 'Create Event' }}</div>
        <q-space />
        <q-btn v-close-popup flat dense round icon="close" />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-form ref="eventForm" class="q-gutter-sm">
          <q-input
            v-model="form.title"
            outlined
            dense
            label="Event Title *"
            maxlength="255"
            :rules="[(v) => !!(v && v.trim()) || 'Title is required']"
          />

          <q-select
            v-model="form.category"
            :options="categoryOptions"
            emit-value
            map-options
            outlined
            dense
            label="Category *"
            :rules="[(v) => !!v || 'Category is required']"
          >
            <template #selected-item="scope">
              <q-chip
                v-if="scope.opt"
                dense
                square
                :color="getCalendarCategory(scope.opt.value).color"
                text-color="white"
                :icon="getCalendarCategory(scope.opt.value).icon"
              >
                {{ scope.opt.label }}
              </q-chip>
            </template>
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar>
                  <q-icon
                    :name="getCalendarCategory(scope.opt.value).icon"
                    :color="getCalendarCategory(scope.opt.value).color"
                  />
                </q-item-section>
                <q-item-section>{{ scope.opt.label }}</q-item-section>
              </q-item>
            </template>
          </q-select>

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input
                v-model="form.start_date"
                outlined
                dense
                label="Start Date *"
                readonly
                :rules="[(v) => !!v || 'Start date is required']"
              >
                <template #append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date v-model="form.start_date" mask="YYYY-MM-DD">
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
            <div class="col-6">
              <q-input
                v-model="form.end_date"
                outlined
                dense
                label="End Date"
                hint="Leave empty for a single-day event"
                readonly
                :rules="[
                  (v) =>
                    !v ||
                    !form.start_date ||
                    v >= form.start_date ||
                    'End date must be on or after start date',
                ]"
              >
                <template #append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date v-model="form.end_date" mask="YYYY-MM-DD" :options="endDateOptions">
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
          </div>

          <!-- All-day vs timed event -->
          <q-item tag="label" class="rounded-borders bg-grey-1 q-mt-xs">
            <q-item-section>
              <q-item-label>All-day event</q-item-label>
              <q-item-label caption
                >Off: the event has a start (and optional end) time.</q-item-label
              >
            </q-item-section>
            <q-item-section side>
              <q-toggle v-model="form.is_all_day" color="primary" />
            </q-item-section>
          </q-item>

          <div v-if="!form.is_all_day" class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input
                v-model="form.start_time"
                outlined
                dense
                label="Start Time *"
                readonly
                :rules="[
                  (v) => form.is_all_day || !!v || 'Start time is required for timed events',
                ]"
              >
                <template #append>
                  <q-icon name="access_time" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-time v-model="form.start_time" format24h>
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-time>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
            <div class="col-6">
              <q-input
                v-model="form.end_time"
                outlined
                dense
                label="End Time"
                hint="Defaults to 1 hour after start"
                readonly
                :rules="[
                  (v) =>
                    !v ||
                    !form.start_time ||
                    (form.end_date || form.start_date) !== form.start_date ||
                    v > form.start_time ||
                    'End time must be after start time',
                ]"
              >
                <template #append>
                  <q-icon name="access_time" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-time v-model="form.end_time" format24h>
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-time>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
          </div>

          <!-- Recurrence -->
          <q-item tag="label" class="rounded-borders bg-grey-1 q-mt-xs">
            <q-item-section>
              <q-item-label>Recurring event</q-item-label>
              <q-item-label caption>
                Repeats from the start date for the next 12 months.
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle v-model="form.is_recurring" color="primary" />
            </q-item-section>
          </q-item>

          <q-select
            v-if="form.is_recurring"
            v-model="form.recurrence_rule"
            :options="recurrenceOptions"
            emit-value
            map-options
            outlined
            dense
            label="Repeats *"
            :rules="[(v) => !form.is_recurring || !!v || 'Recurrence rule is required']"
          />

          <q-input
            v-model="form.location"
            outlined
            dense
            label="Location (optional)"
            maxlength="255"
          />

          <q-input
            v-model="form.description"
            outlined
            dense
            label="Description (optional)"
            type="textarea"
            rows="2"
            autogrow
            maxlength="1000"
          />

          <q-select
            v-model="form.notify_user_ids"
            :options="userOptions"
            emit-value
            map-options
            multiple
            use-chips
            outlined
            dense
            label="Notify users (optional)"
            hint="Selected users are stored on the event; notifications arrive in a later update."
            :loading="usersLoading"
          />
        </q-form>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn v-close-popup flat label="Cancel" color="grey-7" />
        <q-btn
          color="primary"
          :label="isEditing ? 'Save Changes' : 'Create Event'"
          :loading="saving"
          @click="submitForm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Query } from 'appwrite';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useSettingsStore } from 'src/stores/settings-store';
import { CALENDAR_CATEGORIES, getCalendarCategory } from '../utils/calendar-categories';
import { toDateStrInTimezone } from 'src/utils/dateUtils';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  event: {
    type: Object,
    default: null,
  },
  allowedCategories: {
    type: Array,
    default: () => ['other'],
  },
  saving: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'save']);

const { notifyError } = useErrorHandler();
const settingsStore = useSettingsStore();

const show = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const isEditing = computed(() => !!props.event?.$id);

const eventForm = ref(null);

const recurrenceOptions = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

const emptyForm = () => ({
  title: '',
  category: null,
  start_date: '',
  end_date: '',
  is_all_day: true,
  start_time: '',
  end_time: '',
  is_recurring: false,
  recurrence_rule: null,
  location: '',
  description: '',
  notify_user_ids: [],
});

const form = ref(emptyForm());

// Notify-users options (fetched from the users table when the dialog opens)
const userOptions = ref([]);
const usersLoading = ref(false);

/**
 * Category dropdown options from the role-scoped allowedCategories prop.
 * When editing, the row's existing category is always offered so it can
 * never be lost even if the user's role scoping has changed.
 */
const categoryOptions = computed(() => {
  const values = [...props.allowedCategories];
  if (props.event?.category && !values.includes(props.event.category)) {
    values.push(props.event.category);
  }
  return values.map((value) => {
    const category = CALENDAR_CATEGORIES.find((c) => c.value === value);
    return { label: category?.label || value, value };
  });
});

function endDateOptions(dateStr) {
  if (!form.value.start_date) return true;
  // q-date's options callback always receives 'YYYY/MM/DD' regardless of the
  // mask prop — normalize before comparing against the 'YYYY-MM-DD' model.
  return dateStr.replaceAll('/', '-') >= form.value.start_date;
}

function initForm() {
  if (!props.event) {
    form.value = emptyForm();
    // Pre-select the category when the role only allows one (e.g. Farm Manager)
    if (props.allowedCategories.length === 1) {
      form.value.category = props.allowedCategories[0];
    }
    return;
  }
  const tz = settingsStore.timezone;
  const row = props.event;
  form.value = {
    title: row.title || '',
    category: row.category || null,
    start_date: toDateStrInTimezone(row.start_date, tz),
    end_date: toDateStrInTimezone(row.end_date, tz),
    is_all_day: row.is_all_day !== false,
    start_time: row.start_time || '',
    end_time: row.end_time || '',
    is_recurring: !!row.is_recurring,
    recurrence_rule: row.recurrence_rule || null,
    location: row.location || '',
    description: row.description || '',
    notify_user_ids: row.notify_user_ids ? [...row.notify_user_ids] : [],
  };
}

/**
 * Fetch users for the notify-users multi-select.
 * Client-side only — runs when the dialog opens from a user click.
 */
async function fetchUserOptions() {
  usersLoading.value = true;
  userOptions.value = [];
  try {
    const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const usersTableId = import.meta.env.VITE_APPWRITE_TABLE_USERS || 'users';
    const response = await tables.listRows({
      databaseId: dbId,
      tableId: usersTableId,
      // No orderAsc('name') — the users table has no name index; sort client-side.
      queries: [Query.limit(500)],
    });
    userOptions.value = response.rows
      .map((user) => ({
        label: user.name || user.email || user.$id,
        value: user.$id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    // Keep already-selected notify IDs selectable even if missing from the
    // fetched options (fetch failure on a previous open, >500 users, etc).
    (form.value.notify_user_ids || []).forEach((id) => {
      if (!userOptions.value.some((o) => o.value === id)) {
        userOptions.value.push({ label: id, value: id });
      }
    });
  } catch (error) {
    console.error('Error fetching users for notify list:', error);
    notifyError('Failed to load the user list. You can still save the event.');
  } finally {
    usersLoading.value = false;
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      initForm();
      fetchUserOptions();
    }
  },
);

async function submitForm() {
  const valid = await eventForm.value.validate();
  if (!valid) return;
  emit('save', {
    ...form.value,
    title: form.value.title.trim(),
    $id: props.event?.$id || null,
  });
}
</script>
