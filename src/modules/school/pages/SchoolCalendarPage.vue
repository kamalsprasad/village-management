<!--
  SchoolCalendarPage.vue (Story 4.3)

  School calendar view showing:
  - Academic term bands (background events spanning term dates)
  - School holidays, PD days, exam blocks, and other calendar events

  Two view modes (toggled by the user):
  1. Monthly view  — vue-cal month grid, navigate month-by-month
  2. Year list view — simple agenda-style list of all events for the selected year

  Permission: school:read (read-only view for all school users)
  Admin link to Settings → Calendar Events and Academic Terms for school:admin
-->
<template>
  <q-page padding>
    <!-- ── Header ────────────────────────────────────────────────── -->
    <div class="row items-center q-mb-md">
      <q-btn flat dense round icon="arrow_back" to="/school/dashboard" class="q-mr-sm" />
      <div>
        <div class="text-h5">School Calendar</div>
        <div class="text-caption text-grey-7">
          Academic terms, school holidays, and calendar events
        </div>
      </div>
      <q-space />
      <!-- View toggle -->
      <q-btn-toggle
        v-model="viewMode"
        toggle-color="primary"
        :options="[
          { label: 'Month', value: 'month', icon: 'calendar_month' },
          { label: 'Year List', value: 'list', icon: 'view_list' },
        ]"
        class="q-mr-sm"
        dense
        outline
      />
      <!-- Admin settings links -->
      <q-btn
        v-if="canAdmin"
        flat
        dense
        icon="settings"
        label="Settings"
        color="grey-7"
        to="/school/settings"
        class="q-ml-xs"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="lg" />
      <div class="text-caption q-mt-sm">Loading calendar...</div>
    </div>

    <template v-else>
      <!-- ── Legend ─────────────────────────────────────────────── -->
      <div class="row q-gutter-xs q-mb-md flex-wrap">
        <!-- Term bands -->
        <q-chip dense square color="primary" text-color="white" icon="date_range" class="q-pa-xs">
          Academic Term
        </q-chip>
        <q-chip
          v-for="type in CALENDAR_EVENT_TYPES"
          :key="type.value"
          dense
          square
          :color="type.color"
          text-color="white"
          :icon="type.icon"
          class="q-pa-xs"
        >
          {{ type.label }}
        </q-chip>
      </div>

      <!-- ── Month View ─────────────────────────────────────────── -->
      <template v-if="viewMode === 'month'">
        <!-- Empty state: no terms or events configured -->
        <div
          v-if="calendarEvents.length === 0 && !isLoading"
          class="text-center q-pa-xl text-grey-7 bg-grey-1 rounded-borders q-mb-md"
        >
          <q-icon name="calendar_month" size="48px" color="grey-5" />
          <div class="text-subtitle1 q-mt-sm">No academic calendar has been set up yet.</div>
          <div class="text-caption">Configure terms and holidays in School Settings.</div>
          <router-link v-if="canAdmin" to="/school/settings" class="text-primary q-mt-sm block">
            Go to School Settings
          </router-link>
        </div>
        <div class="calendar-wrapper">
          <VueCal
            :events="calendarEvents"
            :views="['month']"
            view="month"
            :events-on-month-view="true"
            style="height: 600px"
            @ready="onCalendarReady"
            @view-change="onViewChange"
          >
            <template #event="{ event }">
              <div
                class="cal-event"
                :class="`cal-event--${event.calType}`"
                @click.stop="onEventClick(event)"
              >
                <q-icon v-if="event.calIcon" :name="event.calIcon" size="12px" class="q-mr-xs" />
                <span class="cal-event__title">{{ event.title }}</span>
              </div>
            </template>
          </VueCal>
        </div>
      </template>

      <!-- ── Year List View ─────────────────────────────────────── -->
      <template v-else>
        <!-- Year selector -->
        <div class="row items-center q-mb-md q-gutter-sm">
          <q-btn flat dense round icon="chevron_left" @click="listYear -= 1" />
          <div class="text-h6 text-weight-medium" style="min-width: 80px; text-align: center">
            {{ listYear }}
          </div>
          <q-btn flat dense round icon="chevron_right" @click="listYear += 1" />
        </div>

        <!-- Terms for year -->
        <div class="text-subtitle2 text-grey-7 q-mb-xs q-mt-md">Academic Terms</div>
        <div v-if="termsForListYear.length === 0" class="text-grey-6 text-caption q-mb-md">
          No terms configured for {{ listYear }}.
          <router-link v-if="canAdmin" to="/school/settings/terms" class="text-primary">
            Configure terms
          </router-link>
        </div>
        <q-list v-else bordered separator class="rounded-borders q-mb-lg">
          <q-item v-for="term in termsForListYear" :key="term.$id" class="q-py-sm">
            <q-item-section avatar>
              <q-icon name="date_range" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">{{ term.term_name }}</q-item-label>
              <q-item-label caption>
                {{ formatDate(term.start_date) }} &ndash; {{ formatDate(term.end_date) }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-chip dense square color="primary" text-color="white">
                {{ termDuration(term) }} days
              </q-chip>
            </q-item-section>
          </q-item>
        </q-list>

        <!-- Events for year grouped by month -->
        <div class="text-subtitle2 text-grey-7 q-mb-xs">Events &amp; Closures</div>
        <div v-if="eventsForListYear.length === 0" class="text-grey-6 text-caption q-mb-md">
          No calendar events for {{ listYear }}.
          <router-link v-if="canAdmin" to="/school/settings/calendar-events" class="text-primary">
            Add events
          </router-link>
        </div>
        <q-list v-else bordered separator class="rounded-borders">
          <q-item v-for="event in eventsForListYear" :key="event.$id" class="q-py-sm">
            <q-item-section avatar>
              <q-icon
                :name="getTypeConfig(event.event_type).icon"
                :color="getTypeConfig(event.event_type).color"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">{{ event.title }}</q-item-label>
              <q-item-label caption>
                {{ formatDate(event.start_date) }}
                <template v-if="event.end_date?.slice(0, 10) !== event.start_date?.slice(0, 10)">
                  &ndash; {{ formatDate(event.end_date) }}
                </template>
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-chip
                dense
                square
                :color="getTypeConfig(event.event_type).color"
                text-color="white"
              >
                {{ getTypeConfig(event.event_type).label }}
              </q-chip>
            </q-item-section>
            <q-item-section side>
              <q-chip
                dense
                square
                :color="event.is_school_day ? 'teal-6' : 'grey-5'"
                text-color="white"
                :icon="event.is_school_day ? 'schedule' : 'block'"
              >
                {{ event.is_school_day ? 'Open' : 'Closed' }}
              </q-chip>
            </q-item-section>
          </q-item>
        </q-list>
      </template>
    </template>

    <!-- ── Event / Term Detail Dialog ─────────────────────────────── -->
    <q-dialog v-model="showEventDialog" persistent>
      <q-card style="min-width: 360px; max-width: 460px">
        <q-card-section class="row items-center">
          <q-avatar
            :icon="
              selectedEvent?.calIcon ||
              (selectedEvent?.event_type && getTypeConfig(selectedEvent.event_type).icon) ||
              'event'
            "
            :color="
              selectedEvent?.calColor ||
              (selectedEvent?.event_type && getTypeConfig(selectedEvent.event_type).color) ||
              'primary'
            "
            text-color="white"
          />
          <span class="q-ml-sm text-h6">{{
            selectedEvent?.title || selectedEvent?.term_name
          }}</span>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="q-gutter-y-sm">
            <div>
              <strong>Dates:</strong>
              {{ formatDate(selectedEvent?.start_date || selectedEvent?.start) }}
              <template
                v-if="
                  (selectedEvent?.end_date || selectedEvent?.end)?.slice(0, 10) !==
                  (selectedEvent?.start_date || selectedEvent?.start)?.slice(0, 10)
                "
              >
                &ndash; {{ formatDate(selectedEvent?.end_date || selectedEvent?.end) }}
              </template>
            </div>
            <div v-if="selectedEvent?.event_type">
              <strong>Type:</strong>
              <q-chip
                dense
                square
                :color="getTypeConfig(selectedEvent.event_type).color"
                text-color="white"
              >
                {{ getTypeConfig(selectedEvent.event_type).label }}
              </q-chip>
            </div>
            <div v-if="selectedEvent?.is_school_day !== undefined">
              <strong>School Status:</strong>
              <q-chip
                dense
                square
                :color="selectedEvent.is_school_day ? 'teal-6' : 'negative'"
                text-color="white"
                :icon="selectedEvent.is_school_day ? 'schedule' : 'block'"
              >
                {{ selectedEvent.is_school_day ? 'Open (Modified)' : 'School Closed' }}
              </q-chip>
            </div>
            <div v-if="selectedEvent?.affected_class_ids?.length">
              <strong>Affected Classes:</strong>
              {{ selectedEvent.affected_class_ids.join(', ') }}
            </div>
            <div v-if="selectedEvent?.notes" class="text-grey-8">
              <strong>Notes:</strong> {{ selectedEvent.notes }}
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Close" color="primary" @click="closeEventDialog" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { VueCal } from 'vue-cal';
import 'vue-cal/style.css';
import { useAcademicTermsStore } from '../stores/academic-terms-store';
import { useCalendarEventsStore } from '../stores/calendar-events-store';
import { usePermissions } from 'src/composables/usePermissions';
import { useSettingsStore } from 'src/stores/settings-store';
import { CALENDAR_EVENT_TYPES, getCalendarEventType } from '../utils/school-constants';
import { formatDateInTimezone, addDaysToDateStr } from 'src/utils/dateUtils';

const termsStore = useAcademicTermsStore();
const eventsStore = useCalendarEventsStore();
const settingsStore = useSettingsStore();
const { hasPermission } = usePermissions();

const canAdmin = computed(() => hasPermission('school:admin'));
const viewMode = ref('month');
const listYear = ref(new Date().getFullYear());

const isLoading = computed(
  () =>
    (termsStore.isLoading && !termsStore.academicTermsLoaded) ||
    (eventsStore.isLoading && !eventsStore.calendarEventsLoaded),
);

// ── Computed: list view data ─────────────────────────────────────
const termsForListYear = computed(() => termsStore.termsByYear(listYear.value));
const eventsForListYear = computed(() => eventsStore.eventsByYear(listYear.value));

// ── Computed: vue-cal events array ───────────────────────────────
/**
 * Merges academic terms (as background/all-day bands) and calendar events
 * into a single vue-cal events array.
 *
 * vue-cal v5 event format:
 *   { id, title, start, end, class, calType, calIcon }
 * start/end: 'YYYY-MM-DD' strings (no time) for all-day events in month view.
 */
const calendarEvents = computed(() => {
  const items = [];

  // Term bands — styled as background all-day events spanning term dates.
  // vue-cal treats all-day end dates as exclusive, so add 1 day to the stored end date.
  termsStore.academicTerms.forEach((term) => {
    const start = term.start_date ? term.start_date.slice(0, 10) : '';
    const end = term.end_date ? addDaysToDateStr(term.end_date.slice(0, 10), 1) : start;
    items.push({
      id: `term-${term.$id}`,
      title: term.term_name,
      start,
      end,
      class: 'cal-term-band',
      calType: 'term',
      calIcon: 'date_range',
      background: 1,
    });
  });

  // Calendar events
  eventsStore.calendarEvents.forEach((evt) => {
    const typeConfig = getCalendarEventType(evt.event_type);
    const start = evt.start_date ? evt.start_date.slice(0, 10) : '';
    const end = evt.end_date ? addDaysToDateStr(evt.end_date.slice(0, 10), 1) : start;
    items.push({
      id: `evt-${evt.$id}`,
      title: evt.title,
      start,
      end,
      class: `cal-event-type--${evt.event_type}`,
      calType: evt.event_type,
      calIcon: typeConfig.icon,
      calColor: typeConfig.color,
    });
  });

  return items;
});

// ── Helpers ──────────────────────────────────────────────────────
function formatDate(isoString) {
  return formatDateInTimezone(isoString, settingsStore.timezone);
}

function termDuration(term) {
  if (!term.start_date || !term.end_date) return '?';
  const start = new Date(term.start_date);
  const end = new Date(term.end_date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '?';
  const diff = Math.round((end - start) / 86400000) + 1;
  return diff > 0 ? diff : '?';
}

function getTypeConfig(value) {
  return getCalendarEventType(value);
}

// Event detail popup
const showEventDialog = ref(false);
const selectedEvent = ref(null);

function onEventClick(event) {
  // vue-cal injects internal metadata; event.id is our custom id.
  const rawId = event.id || event._?.id || event.id;
  let dbEvent = null;
  if (rawId && String(rawId).startsWith('term-')) {
    const termId = String(rawId).replace('term-', '');
    dbEvent = termsStore.academicTerms.find((t) => t.$id === termId);
  } else if (rawId && String(rawId).startsWith('evt-')) {
    const eventId = String(rawId).replace('evt-', '');
    dbEvent = eventsStore.calendarEvents.find((e) => e.$id === eventId);
  }
  // Merge the display metadata (icon/color/type) from the vue-cal event object.
  selectedEvent.value = dbEvent
    ? { ...dbEvent, calIcon: event.calIcon, calColor: event.calColor, calType: event.calType }
    : event;
  showEventDialog.value = true;
}

function closeEventDialog() {
  showEventDialog.value = false;
  selectedEvent.value = null;
}

// vue-cal callbacks (no-op; calendar is read-only)
function onCalendarReady() {}
function onViewChange() {}

// ── Lifecycle ────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([termsStore.fetchAcademicTerms(), eventsStore.fetchCalendarEvents()]);
});
</script>

<style scoped>
.calendar-wrapper {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

/* Term band events — semi-transparent primary strip */
:deep(.cal-term-band) {
  background-color: rgba(25, 118, 210, 0.15) !important;
  border-left: 3px solid #1976d2 !important;
  color: #1565c0 !important;
  font-weight: 500;
}

/* Holiday / closure events */
:deep(.cal-event-type--public_holiday),
:deep(.cal-event-type--school_holiday) {
  background-color: rgba(198, 40, 40, 0.85) !important;
  color: white !important;
}

:deep(.cal-event-type--pd_day) {
  background-color: rgba(123, 31, 162, 0.85) !important;
  color: white !important;
}

:deep(.cal-event-type--exam_block) {
  background-color: rgba(21, 101, 192, 0.85) !important;
  color: white !important;
}

:deep(.cal-event-type--early_dismissal) {
  background-color: rgba(245, 124, 0, 0.85) !important; /* amber-7 */
  color: white !important;
}

:deep(.cal-event-type--assembly) {
  background-color: rgba(0, 121, 107, 0.85) !important; /* teal-6 */
  color: white !important;
}

:deep(.cal-event-type--other) {
  background-color: rgba(97, 97, 97, 0.85) !important;
  color: white !important;
}

.cal-event {
  display: flex;
  align-items: center;
  padding: 1px 4px;
  font-size: 12px;
  overflow: hidden;
  white-space: nowrap;
}

.cal-event__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
