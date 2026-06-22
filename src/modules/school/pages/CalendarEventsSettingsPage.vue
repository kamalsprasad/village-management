<!--
  CalendarEventsSettingsPage.vue (Story 4.3)

  CRUD management for school calendar events: public holidays, school holidays,
  PD days, exam blocks, early dismissals, assemblies, etc.

  Features:
  - Year filter with prev/next nav
  - Table of events for selected year, sorted by start date
  - Add / Edit / Delete events via dialog
  - is_school_day toggle: false = school closed, true = school open but modified
-->
<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn flat dense round icon="arrow_back" to="/school/settings" class="q-mr-sm" />
      <div>
        <div class="text-h5">Holidays &amp; Calendar Events</div>
        <div class="text-caption text-grey-7">
          Mark school closures, public holidays, PD days, and exam blocks
        </div>
      </div>
    </div>

    <!-- Year selector + filter + Add button -->
    <div class="row items-center q-mb-md q-gutter-sm flex-wrap">
      <q-btn flat dense round icon="chevron_left" @click="changeYear(-1)" />
      <div class="text-h6 text-weight-medium" style="min-width: 80px; text-align: center">
        {{ selectedYear }}
      </div>
      <q-btn flat dense round icon="chevron_right" @click="changeYear(1)" />
      <q-select
        v-model="filterEventType"
        :options="[{ label: 'All Types', value: null }, ...eventTypeOptions]"
        emit-value
        map-options
        outlined
        dense
        label="Filter by type"
        clearable
        style="min-width: 170px"
        class="q-ml-sm"
        @clear="filterEventType = null"
      />
      <q-space />
      <q-btn
        v-if="canAdmin"
        outline
        color="grey-7"
        icon="cloud_download"
        label="Import holidays"
        disable
        class="q-mr-xs"
      >
        <q-tooltip>Coming soon — import public holidays from national calendar</q-tooltip>
      </q-btn>
      <q-btn v-if="canAdmin" color="primary" icon="add" label="Add Event" @click="openAddDialog" />
    </div>

    <!-- Loading -->
    <div v-if="isInitialLoading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="lg" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="filteredEvents.length === 0"
      class="text-center q-pa-xl text-grey-7 bg-grey-1 rounded-borders"
    >
      <q-icon name="event_busy" size="48px" />
      <div class="text-subtitle1 q-mt-sm">
        {{ filterEventType ? 'No events of this type for ' : 'No events configured for '
        }}{{ selectedYear }}
      </div>
      <div class="text-caption">
        {{
          filterEventType
            ? 'Try clearing the filter or'
            : 'Add public holidays, school closures, and PD days, or'
        }}
        <span v-if="canAdmin"> add a new event above.</span>
      </div>
    </div>

    <!-- Events table -->
    <q-table
      v-else
      :rows="filteredEvents"
      :columns="columns"
      row-key="$id"
      flat
      bordered
      :pagination="{ rowsPerPage: 20 }"
    >
      <template #body-cell-event_type="props">
        <q-td :props="props">
          <q-chip
            dense
            square
            :color="getTypeConfig(props.value).color"
            text-color="white"
            :icon="getTypeConfig(props.value).icon"
          >
            {{ getTypeConfig(props.value).label }}
          </q-chip>
        </q-td>
      </template>

      <template #body-cell-dates="props">
        <q-td :props="props">
          {{ formatDate(props.row.start_date) }}
          <template v-if="props.row.end_date?.slice(0, 10) !== props.row.start_date?.slice(0, 10)">
            &ndash; {{ formatDate(props.row.end_date) }}
          </template>
        </q-td>
      </template>

      <template #body-cell-is_school_day="props">
        <q-td :props="props">
          <q-chip
            dense
            square
            :color="props.value ? 'teal-6' : 'negative'"
            text-color="white"
            :icon="props.value ? 'schedule' : 'block'"
          >
            {{ props.value ? 'Open (Modified)' : 'School Closed' }}
          </q-chip>
        </q-td>
      </template>

      <template #body-cell-actions="props">
        <q-td :props="props">
          <div v-if="canAdmin" class="row q-gutter-xs">
            <q-btn
              flat
              dense
              round
              icon="edit"
              color="primary"
              @click="openEditDialog(props.row)"
            />
            <q-btn
              flat
              dense
              round
              icon="delete"
              color="negative"
              @click="confirmDelete(props.row)"
            />
          </div>
        </q-td>
      </template>
    </q-table>

    <!-- ── Add / Edit Dialog ─────────────────────────────────────── -->
    <q-dialog v-model="showDialog" persistent>
      <q-card style="min-width: 400px; max-width: 540px">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ isEditing ? 'Edit Event' : 'Add Calendar Event' }}</div>
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
              hint='e.g. "Independence Day", "Staff PD Day"'
              :rules="[(v) => !!v || 'Title is required']"
            />

            <q-select
              v-model="form.event_type"
              :options="eventTypeOptions"
              emit-value
              map-options
              outlined
              dense
              label="Event Type *"
              :rules="[(v) => !!v || 'Event type is required']"
            >
              <template #selected-item="scope">
                <q-chip
                  v-if="scope.opt"
                  dense
                  square
                  :color="getTypeConfig(scope.opt.value).color"
                  text-color="white"
                  :icon="getTypeConfig(scope.opt.value).icon"
                >
                  {{ scope.opt.label }}
                </q-chip>
              </template>
            </q-select>

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input v-model="form.start_date" outlined dense label="Start Date *" readonly>
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
                <q-input v-model="form.end_date" outlined dense label="End Date" readonly>
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

            <!-- School closed vs open-but-modified -->
            <q-item tag="label" class="rounded-borders bg-grey-1 q-mt-xs">
              <q-item-section>
                <q-item-label>School is open on this day</q-item-label>
                <q-item-label caption>
                  On: school runs but with modifications (e.g. early dismissal). Off: school is
                  closed (attendance not expected).
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-toggle v-model="form.is_school_day" color="teal" />
              </q-item-section>
            </q-item>

            <!-- Affected Classes: leave empty for school-wide events -->
            <q-select
              v-model="form.affected_class_ids"
              :options="classOptions"
              emit-value
              map-options
              multiple
              use-chips
              outlined
              dense
              label="Affected Classes (optional)"
              hint="Leave empty for school-wide event. Select classes to limit scope."
            />

            <q-input
              v-model="form.notes"
              outlined
              dense
              label="Notes (optional)"
              type="textarea"
              rows="2"
              autogrow
            />
          </q-form>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn v-close-popup flat label="Cancel" color="grey-7" />
          <q-btn
            color="primary"
            :label="isEditing ? 'Save Changes' : 'Add Event'"
            :loading="isSaving"
            @click="submitForm"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── Delete Confirm Dialog ──────────────────────────────────── -->
    <q-dialog v-model="showDeleteConfirm" persistent>
      <q-card style="min-width: 320px">
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">Delete Event?</span>
        </q-card-section>
        <q-card-section class="q-pt-none">
          Delete <strong>{{ eventToDelete?.title }}</strong
          >?
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancel" color="primary" />
          <q-btn flat label="Delete" color="negative" :loading="isDeleting" @click="deleteEvent" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useCalendarEventsStore } from '../stores/calendar-events-store';
import { useClassStore } from '../stores/class-store';
import { usePermissions } from 'src/composables/usePermissions';
import { useSettingsStore } from 'src/stores/settings-store';
import { CALENDAR_EVENT_TYPES, getCalendarEventType } from '../utils/school-constants';
import {
  datePickerToStartOfDayISO,
  datePickerToEndOfDayISO,
  formatDateInTimezone,
} from 'src/utils/dateUtils';

const $q = useQuasar();
const eventsStore = useCalendarEventsStore();
const classStore = useClassStore();
const settingsStore = useSettingsStore();
const { hasPermission } = usePermissions();

const canAdmin = computed(() => hasPermission('school:admin'));
const selectedYear = ref(new Date().getFullYear());
const filterEventType = ref(null);
const isInitialLoading = computed(() => eventsStore.isLoading && !eventsStore.calendarEventsLoaded);

const eventsForYear = computed(() => eventsStore.eventsByYear(selectedYear.value));
const filteredEvents = computed(() =>
  filterEventType.value
    ? eventsForYear.value.filter((e) => e.event_type === filterEventType.value)
    : eventsForYear.value,
);

const eventTypeOptions = CALENDAR_EVENT_TYPES.map((t) => ({ label: t.label, value: t.value }));

const classOptions = computed(() =>
  classStore.classes.map((c) => ({ label: c.name, value: c.$id })),
);

const columns = [
  { name: 'title', label: 'Event', field: 'title', align: 'left', sortable: true },
  { name: 'event_type', label: 'Type', field: 'event_type', align: 'left', sortable: true },
  { name: 'dates', label: 'Dates', field: 'start_date', align: 'left', sortable: true },
  { name: 'is_school_day', label: 'Status', field: 'is_school_day', align: 'left' },
  { name: 'actions', label: '', field: '$id', align: 'right' },
];

// Dialog state
const showDialog = ref(false);
const showDeleteConfirm = ref(false);
const isEditing = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const eventToDelete = ref(null);
const eventForm = ref(null);

const emptyForm = () => ({
  $id: null,
  title: '',
  event_type: 'school_holiday',
  start_date: '',
  end_date: '',
  is_school_day: false,
  affected_class_ids: [],
  notes: '',
});

const form = ref(emptyForm());

function changeYear(delta) {
  selectedYear.value += delta;
}

function formatDate(isoString) {
  return formatDateInTimezone(isoString, settingsStore.timezone);
}

function getTypeConfig(value) {
  return getCalendarEventType(value);
}

function endDateOptions(dateStr) {
  if (!form.value.start_date) return true;
  return dateStr >= form.value.start_date;
}

function openAddDialog() {
  isEditing.value = false;
  form.value = emptyForm();
  showDialog.value = true;
}

function openEditDialog(event) {
  isEditing.value = true;
  form.value = {
    $id: event.$id,
    title: event.title,
    event_type: event.event_type,
    start_date: event.start_date ? event.start_date.slice(0, 10) : '',
    end_date: event.end_date ? event.end_date.slice(0, 10) : '',
    is_school_day: event.is_school_day ?? false,
    affected_class_ids: event.affected_class_ids ? [...event.affected_class_ids] : [],
    notes: event.notes || '',
  };
  showDialog.value = true;
}

async function submitForm() {
  const valid = await eventForm.value.validate();
  if (!valid) return;
  if (!form.value.start_date) {
    $q.notify({ type: 'warning', message: 'Please select a start date.' });
    return;
  }

  const endDate = form.value.end_date || form.value.start_date;
  if (endDate < form.value.start_date) {
    $q.notify({ type: 'warning', message: 'End date must be on or after start date.' });
    return;
  }

  isSaving.value = true;
  const tz = settingsStore.timezone;
  const payload = {
    ...form.value,
    title: form.value.title.trim(),
    start_date: datePickerToStartOfDayISO(form.value.start_date, tz),
    end_date: datePickerToEndOfDayISO(endDate, tz),
  };

  const result = await eventsStore.saveEvent(payload);
  isSaving.value = false;

  if (result.success) {
    $q.notify({
      type: 'positive',
      message: isEditing.value ? 'Event updated.' : 'Event added.',
    });
    showDialog.value = false;
  } else {
    $q.notify({
      type: 'negative',
      message: result.error || 'Failed to save event. Please try again.',
    });
  }
}

function confirmDelete(event) {
  eventToDelete.value = event;
  showDeleteConfirm.value = true;
}

async function deleteEvent() {
  if (!eventToDelete.value) return;
  isDeleting.value = true;
  const result = await eventsStore.deleteEvent(eventToDelete.value.$id);
  isDeleting.value = false;
  if (result.success) {
    $q.notify({ type: 'positive', message: 'Event deleted.' });
    showDeleteConfirm.value = false;
    eventToDelete.value = null;
  } else {
    $q.notify({
      type: 'negative',
      message: result.error || 'Failed to delete event. Please try again.',
    });
  }
}

onMounted(() => {
  eventsStore.fetchCalendarEvents();
  classStore.fetchClasses();
});
</script>
