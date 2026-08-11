<!--
  CalendarPage.vue (Story 5.1)

  Global village calendar — aggregation of:
  - School calendar events (school_calendar_events table)
  - Farm expected-harvest auto-events (plantings table, "System Generated")
  - User-created village events (village_events table, Story 5.2)

  Four view modes (toggled by the user):
  1. Month  — vue-cal month grid
  2. Week   — vue-cal week grid
  3. Day    — vue-cal day grid
  4. Agenda — custom q-list grouped by date (vue-cal has no agenda view)

  Category filter checkboxes (Show All / Hide All) are session-scoped.
  Story 5.2: permission-gated Create Event button, plus Edit/Delete in the
  detail dialog for the creator, admins, and Events Coordinators.

  Route: /calendar (requiresAuth only — visible to every authenticated user).
-->
<template>
  <q-page padding>
    <!-- ── Header ────────────────────────────────────────────────── -->
    <div class="row items-center q-mb-md">
      <div>
        <h4 class="text-h5 q-my-none">Village Calendar</h4>
        <p class="text-grey-7 q-mb-none">
          All village events in one place — school, farm harvests, and more
        </p>
      </div>
      <q-space />
      <!-- Story 5.2: Create Event (permission-gated) -->
      <q-btn
        v-if="hasPermission('calendar:write')"
        color="primary"
        icon="add"
        label="Create Event"
        class="q-mr-md"
        @click="openCreateDialog"
      />
      <!-- View toggle -->
      <q-btn-toggle
        v-model="viewMode"
        toggle-color="primary"
        :options="[
          { label: 'Month', value: 'month', icon: 'calendar_month' },
          { label: 'Week', value: 'week', icon: 'calendar_view_week' },
          { label: 'Day', value: 'day', icon: 'calendar_view_day' },
          { label: 'Agenda', value: 'agenda', icon: 'view_agenda' },
        ]"
        dense
        outline
      />
    </div>

    <!-- ── Category Filter Panel ─────────────────────────────────── -->
    <div class="row items-center q-gutter-sm q-mb-md flex-wrap">
      <template v-for="category in CALENDAR_CATEGORIES" :key="category.value">
        <q-checkbox
          :model-value="calendarStore.activeCategories.includes(category.value)"
          dense
          @update:model-value="calendarStore.toggleCategory(category.value, $event)"
        >
          <q-chip
            dense
            square
            :color="category.color"
            text-color="white"
            :icon="category.icon"
            class="q-pa-xs q-my-none"
          >
            {{ category.label }}
          </q-chip>
        </q-checkbox>
      </template>
      <q-space />
      <q-btn
        flat
        dense
        size="sm"
        color="primary"
        label="Show All"
        @click="calendarStore.showAllCategories()"
      />
      <q-btn
        flat
        dense
        size="sm"
        color="grey-7"
        label="Hide All"
        @click="calendarStore.hideAllCategories()"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="lg" />
      <div class="text-caption q-mt-sm">Loading calendar...</div>
    </div>

    <template v-else>
      <!-- ── vue-cal: Month / Week / Day ──────────────────────────── -->
      <template v-if="viewMode !== 'agenda'">
        <!-- Empty state -->
        <div
          v-if="calendarStore.filteredEvents.length === 0"
          class="text-center q-pa-xl text-grey-7 bg-grey-1 rounded-borders q-mb-md"
        >
          <q-icon name="event_busy" size="48px" color="grey-5" />
          <div class="text-subtitle1 q-mt-sm">No events to display.</div>
          <div class="text-caption">
            Events from the school calendar and farm harvest plans will appear here.
          </div>
        </div>
        <div v-if="isClient" class="calendar-wrapper">
          <VueCal
            :events="vueCalEvents"
            :views="['month', 'week', 'day']"
            :view="viewMode"
            :views-bar="false"
            :events-on-month-view="true"
            style="height: 600px"
            @ready="onCalendarReady"
            @view-change="onViewChange"
          >
            <template #event="{ event }">
              <div
                class="cal-event"
                :class="`cal-event-cat--${event.category}`"
                @click.stop="onEventClick(event)"
              >
                <q-icon :name="event.calIcon" size="12px" class="q-mr-xs" />
                <span class="cal-event__title">{{ event.title }}</span>
              </div>
            </template>
          </VueCal>
        </div>
      </template>

      <!-- ── Agenda View ──────────────────────────────────────────── -->
      <template v-else>
        <div
          v-if="agendaGroups.length === 0"
          class="text-center q-pa-xl text-grey-7 bg-grey-1 rounded-borders"
        >
          <q-icon name="event_busy" size="48px" color="grey-5" />
          <div class="text-subtitle1 q-mt-sm">No events to display.</div>
          <div class="text-caption">Try enabling more categories above.</div>
        </div>
        <template v-else>
          <div v-for="group in agendaGroups" :key="group.date" class="q-mb-md">
            <div class="text-subtitle2 text-grey-7 q-mb-xs">{{ formatAgendaDate(group.date) }}</div>
            <q-list bordered separator class="rounded-borders">
              <q-item
                v-for="event in group.events"
                :key="event.id"
                clickable
                class="q-py-sm"
                @click="onEventClick(event)"
              >
                <q-item-section avatar>
                  <q-icon
                    :name="getCalendarCategory(event.category).icon"
                    :color="getCalendarCategory(event.category).color"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ event.title }}</q-item-label>
                  <q-item-label v-if="!event.isAllDay && event.startTime" caption>
                    {{ event.startTime
                    }}<template v-if="event.endTime"> &ndash; {{ event.endTime }}</template>
                  </q-item-label>
                  <q-item-label v-if="event.location" caption>
                    {{ event.location }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-chip
                    dense
                    square
                    :color="getCalendarCategory(event.category).color"
                    text-color="white"
                  >
                    {{ getCalendarCategory(event.category).label }}
                  </q-chip>
                </q-item-section>
                <q-item-section v-if="event.systemGenerated" side>
                  <q-chip dense square color="grey-6" text-color="white" icon="smart_toy">
                    System Generated
                  </q-chip>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </template>
      </template>
    </template>

    <!-- ── Event Detail Dialog ────────────────────────────────────── -->
    <q-dialog v-model="showEventDialog" persistent>
      <q-card style="min-width: 360px; max-width: 460px">
        <q-card-section class="row items-center">
          <q-avatar
            :icon="getCalendarCategory(selectedEvent?.category).icon"
            :color="getCalendarCategory(selectedEvent?.category).color"
            text-color="white"
          />
          <span class="q-ml-sm text-h6">{{ selectedEvent?.title }}</span>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="q-gutter-y-sm">
            <div>
              <strong>Category:</strong>
              <q-chip
                dense
                square
                :color="getCalendarCategory(selectedEvent?.category).color"
                text-color="white"
              >
                {{ getCalendarCategory(selectedEvent?.category).label }}
              </q-chip>
            </div>
            <div>
              <strong>Date:</strong>
              {{ formatDate(selectedEvent?.start) }}
              <template v-if="selectedEvent && selectedEvent.end !== selectedEvent.start">
                &ndash; {{ formatDate(selectedEvent?.end) }}
              </template>
            </div>
            <!-- Story 5.2: time row for timed user events -->
            <div v-if="selectedEvent && !selectedEvent.isAllDay && selectedEvent.startTime">
              <strong>Time:</strong> {{ selectedEvent.startTime }}
              <template v-if="selectedEvent.endTime">
                &ndash; {{ selectedEvent.endTime }}
              </template>
            </div>
            <div v-if="selectedEvent?.location">
              <strong>Location:</strong> {{ selectedEvent.location }}
            </div>
            <!-- Story 5.2: recurring chip -->
            <div v-if="selectedEvent?.isRecurring">
              <q-chip dense square color="secondary" text-color="white" icon="repeat">
                {{ recurringChipText(selectedEvent.recurrenceRule) }}
              </q-chip>
            </div>
            <div v-if="selectedEvent?.systemGenerated">
              <q-chip dense square color="grey-6" text-color="white" icon="smart_toy">
                System Generated
              </q-chip>
            </div>
            <div v-if="selectedEvent?.description" class="text-grey-8">
              <strong>Details:</strong> {{ selectedEvent.description }}
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <!-- Story 5.2: Edit/Delete gated to creator, admin, or Events Coordinator -->
          <template v-if="canManageSelectedEvent">
            <q-btn flat label="Edit" color="primary" icon="edit" @click="openEditDialog" />
            <q-btn flat label="Delete" color="negative" icon="delete" @click="confirmDelete" />
          </template>
          <q-btn v-close-popup flat label="Close" color="primary" @click="closeEventDialog" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── Story 5.2: Create/Edit Event Form Dialog ──────────────── -->
    <EventFormDialog
      v-model="showFormDialog"
      :event="editingEvent"
      :allowed-categories="userAllowedCategories"
      :saving="isSavingEvent"
      @save="onFormSave"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { VueCal } from 'vue-cal';
import 'vue-cal/style.css';
import { useCalendarStore } from '../stores/calendar-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { useAuthStore } from 'src/stores/auth-store';
import { usePermissions } from 'src/composables/usePermissions';
import { CALENDAR_CATEGORIES, getCalendarCategory } from '../utils/calendar-categories';
import { allowedCategories, canManageEvent } from '../utils/calendar-permissions';
import EventFormDialog from '../components/EventFormDialog.vue';
import { formatDateInTimezone, addDaysToDateStr } from 'src/utils/dateUtils';

const $q = useQuasar();
const calendarStore = useCalendarStore();
const settingsStore = useSettingsStore();
const authStore = useAuthStore();
const { hasPermission } = usePermissions();

const viewMode = ref('month');
const isClient = ref(false); // SSR guard — Appwrite/vue-cal only after hydration

const isLoading = computed(() => calendarStore.loading && !calendarStore.loaded);

// Story 5.2: role-scoped category options for the event form
const userAllowedCategories = computed(() => allowedCategories(authStore.userRoles));

/** Default end time for timed events without an explicit end time (+1 hour). */
function plusOneHour(timeStr) {
  const [hours, minutes] = String(timeStr).split(':').map(Number);
  return `${String((hours + 1) % 24).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}`;
}

// ── Computed: vue-cal events array ───────────────────────────────
/**
 * vue-cal v5 event format: { id, title, start, end, class, ...custom }
 * All-day events: 'YYYY-MM-DD' strings (no time); vue-cal treats all-day
 * end dates as exclusive, so add 1 day to the normalized (inclusive) end.
 * Timed events (Story 5.2): 'YYYY-MM-DD HH:mm' strings; when end_time is
 * missing the event defaults to a 1-hour duration.
 */
const vueCalEvents = computed(() =>
  calendarStore.filteredEvents.map((evt) => {
    const category = getCalendarCategory(evt.category);
    const base = {
      ...evt,
      class: `cal-event-cat--${evt.category}`,
      calIcon: category.icon,
      calColor: category.color,
    };
    if (!evt.isAllDay && evt.startTime) {
      let endDate = evt.end;
      let endTime = evt.endTime;
      if (!endTime) {
        if (evt.end !== evt.start) {
          // Multi-day timed event without an end time: end of the last day.
          endTime = '23:59';
        } else {
          endTime = plusOneHour(evt.startTime);
          if (endTime <= evt.startTime) {
            // Wrapped past midnight (e.g. 23:15 + 1h) — roll to the next day.
            endDate = addDaysToDateStr(evt.end, 1);
          }
        }
      }
      return {
        ...base,
        start: `${evt.start} ${evt.startTime}`,
        end: `${endDate} ${endTime}`,
      };
    }
    return {
      ...base,
      end: addDaysToDateStr(evt.end, 1),
    };
  }),
);

// ── Computed: agenda view data (grouped by start date) ───────────
const agendaGroups = computed(() => {
  const groups = new Map();
  calendarStore.filteredEvents.forEach((evt) => {
    if (!groups.has(evt.start)) {
      groups.set(evt.start, []);
    }
    groups.get(evt.start).push(evt);
  });
  return [...groups.keys()].sort().map((date) => ({ date, events: groups.get(date) }));
});

// ── Helpers ──────────────────────────────────────────────────────
function formatDate(dateStr) {
  return formatDateInTimezone(dateStr, settingsStore.timezone);
}

function formatAgendaDate(dateStr) {
  return formatDateInTimezone(dateStr, settingsStore.timezone, 'EEEE, d MMM yyyy');
}

// ── Event detail popup ───────────────────────────────────────────
const showEventDialog = ref(false);
const selectedEvent = ref(null);

// Story 5.2: Edit/Delete visibility (creator, admin, or Events Coordinator)
const canManageSelectedEvent = computed(() =>
  canManageEvent(selectedEvent.value, authStore.user?.$id, authStore.userRoles),
);

/**
 * Recurrence occurrences (id `user-<rowId>-<date>`) resolve to the base
 * event of the series — the earliest occurrence for the same sourceId.
 */
function resolveBaseEvent(unified) {
  if (!unified?.sourceId) return unified;
  if (unified.id === `user-${unified.sourceId}`) return unified;
  const base = calendarStore.allEvents
    .filter((e) => e.sourceId === unified.sourceId)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))[0];
  return base || unified;
}

function onEventClick(event) {
  // vue-cal injects internal metadata; look up the normalized event by id.
  const rawId = event.id || event._?.id;
  const unified = calendarStore.allEvents.find((e) => e.id === rawId);
  selectedEvent.value = resolveBaseEvent(unified || event);
  showEventDialog.value = true;
}

function closeEventDialog() {
  showEventDialog.value = false;
  selectedEvent.value = null;
}

const RECURRENCE_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

function recurringChipText(rule) {
  return RECURRENCE_LABELS[rule] ? `Recurring: ${RECURRENCE_LABELS[rule]}` : 'Recurring';
}

// ── Story 5.2: Create/Edit/Delete ────────────────────────────────
const showFormDialog = ref(false);
const editingEvent = ref(null); // village_events row; null = create mode
const isSavingEvent = ref(false);

function openCreateDialog() {
  editingEvent.value = null;
  showFormDialog.value = true;
}

function openEditDialog() {
  // Look up the full village_events row behind the normalized event.
  const row = calendarStore.userEvents.find((r) => r.$id === selectedEvent.value?.sourceId);
  if (!row) {
    $q.notify({ type: 'negative', message: 'Could not load this event for editing.' });
    return;
  }
  editingEvent.value = row;
  showEventDialog.value = false;
  showFormDialog.value = true;
}

async function onFormSave(payload) {
  isSavingEvent.value = true;
  const result = payload.$id
    ? await calendarStore.updateEvent(payload.$id, payload)
    : await calendarStore.createEvent(payload);
  isSavingEvent.value = false;
  if (result.success) {
    // Store refetches user events on success — just close the dialogs.
    showFormDialog.value = false;
    editingEvent.value = null;
    showEventDialog.value = false;
    selectedEvent.value = null;
  }
}

function confirmDelete() {
  const event = selectedEvent.value;
  if (!event?.sourceId) return;
  $q.dialog({
    title: 'Delete Event?',
    message: `Delete "${event.title}"?${
      event.isRecurring ? ' This removes the whole recurring series.' : ''
    }`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    const result = await calendarStore.deleteEvent(event.sourceId);
    if (result.success) {
      // Store refetches user events on success — just close the dialog.
      closeEventDialog();
    }
  });
}

// vue-cal callbacks (no-op; calendar is read-only, view is driven by q-btn-toggle)
function onCalendarReady() {}
function onViewChange() {}

// ── Lifecycle ────────────────────────────────────────────────────
onMounted(async () => {
  isClient.value = true;
  await calendarStore.fetchAllEvents();
});
</script>

<style scoped>
.calendar-wrapper {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

/* Category-colored events (colors match CALENDAR_CATEGORIES) */
:deep(.cal-event-cat--school) {
  background-color: rgba(25, 118, 210, 0.85) !important; /* blue-7 */
  color: white !important;
}

:deep(.cal-event-cat--farm) {
  background-color: rgba(56, 142, 60, 0.85) !important; /* green-7 */
  color: white !important;
}

:deep(.cal-event-cat--village) {
  background-color: rgba(93, 64, 55, 0.85) !important; /* brown-7 */
  color: white !important;
}

:deep(.cal-event-cat--guests) {
  background-color: rgba(142, 36, 170, 0.85) !important; /* purple-6 */
  color: white !important;
}

:deep(.cal-event-cat--equipment) {
  background-color: rgba(245, 124, 0, 0.85) !important; /* orange-7 */
  color: white !important;
}

:deep(.cal-event-cat--energy) {
  background-color: rgba(255, 160, 0, 0.85) !important; /* amber-7 */
  color: white !important;
}

:deep(.cal-event-cat--other) {
  background-color: rgba(117, 117, 117, 0.85) !important; /* grey-6 */
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
