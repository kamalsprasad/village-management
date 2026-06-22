<!--
  BellSchedulesSettingsPage.vue (Story 4.4)

  Manage per-grade daily bell schedules: add/edit/delete/reorder period slots
  and preview the resulting day timeline.

  Features (AC1–AC5, AC7):
  - Grade level + academic year selectors
  - AC5 completeness summary table across all grades
  - Period slot list with: slot number, label, type badge, times, applies-to-days chips,
    up/down reorder buttons (auto-saves to DB on each press), edit/delete actions
  - Add/Edit dialog with: label, type, start time (q-time), end time, applies-to-days
    multi-select, notes
  - Delete confirmation dialog (simple in 4.4; Story 4.5 adds reference check)
  - Copy schedule dialog (source grade + year → current grade/year)
  - AC2 DailyScheduleTimeline preview below the slot list
  - read-only view for school:read; edit controls for school:admin
-->
<template>
  <q-page padding>
    <!-- ── Header ──────────────────────────────────────────────── -->
    <div class="row items-center q-mb-md">
      <q-btn flat dense round icon="arrow_back" to="/school/settings" class="q-mr-sm" />
      <div>
        <div class="text-h5">Bell Schedules</div>
        <div class="text-caption text-grey-7">
          Define daily period slots per grade level
        </div>
      </div>
    </div>

    <!-- ── AC5: Grade Completeness Summary ─────────────────────── -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="q-pb-sm">
        <div class="text-subtitle2 q-mb-xs">Schedule Status — {{ selectedYear }}</div>
        <div class="row q-gutter-xs flex-wrap">
          <q-chip
            v-for="grade in allGrades"
            :key="grade"
            dense
            :color="gradeStatusColor(grade)"
            text-color="white"
            :icon="gradeStatusIcon(grade)"
            :label="gradeShortLabel(grade)"
            :title="grade + ': ' + gradeStatusText(grade)"
            class="cursor-pointer"
            @click="selectGrade(grade)"
          />
        </div>
        <div class="row q-mt-xs q-gutter-md text-caption text-grey-7">
          <span><q-icon name="check_circle" color="positive" size="12px" /> Configured</span>
          <span><q-icon name="warning" color="warning" size="12px" /> No class periods</span>
          <span><q-icon name="radio_button_unchecked" color="negative" size="12px" /> Not set up</span>
        </div>
      </q-card-section>
    </q-card>

    <!-- ── Grade + Year selectors ──────────────────────────────── -->
    <div class="row items-center q-mb-md q-gutter-sm flex-wrap">
      <q-select
        v-model="selectedGrade"
        :options="GRADE_LEVELS"
        outlined
        dense
        label="Grade Level"
        style="min-width: 200px"
      />
      <div class="row items-center q-gutter-xs">
        <q-btn flat dense round icon="chevron_left" @click="changeYear(-1)" />
        <q-input
          v-model.number="selectedYear"
          type="number"
          outlined
          dense
          label="Year"
          style="width: 90px"
        />
        <q-btn flat dense round icon="chevron_right" @click="changeYear(1)" />
      </div>
      <q-space />
      <q-btn
        v-if="canAdmin"
        outline
        color="grey-7"
        icon="content_copy"
        label="Copy from…"
        @click="openCopyDialog"
      />
      <q-btn
        v-if="canAdmin"
        color="primary"
        icon="add"
        label="Add Slot"
        @click="openAddDialog"
      />
    </div>

    <!-- ── Loading ─────────────────────────────────────────────── -->
    <div v-if="isInitialLoading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="lg" />
    </div>

    <!-- ── Empty state ─────────────────────────────────────────── -->
    <div
      v-else-if="slotsForGradeYear.length === 0"
      class="text-center q-pa-xl text-grey-7 bg-grey-1 rounded-borders q-mb-md"
    >
      <q-icon name="schedule" size="48px" color="grey-5" />
      <div class="text-subtitle1 q-mt-sm">
        No bell schedule configured for {{ selectedGrade }} {{ selectedYear }}
      </div>
      <div class="text-caption">
        Add period slots to define the daily schedule for this grade,
        or use "Copy from…" to start from another grade.
      </div>
    </div>

    <!-- ── Slot list ────────────────────────────────────────────── -->
    <template v-else>
      <q-list bordered separator class="rounded-borders q-mb-md">
        <q-item
          v-for="(slot, index) in slotsForGradeYear"
          :key="slot.$id"
          class="q-py-sm"
        >
          <!-- Slot number badge -->
          <q-item-section side style="min-width: 32px">
            <q-chip dense square color="grey-4" text-color="grey-8" size="sm">
              {{ slot.slot_number }}
            </q-chip>
          </q-item-section>

          <!-- Label + type + times -->
          <q-item-section>
            <q-item-label class="row items-center q-gutter-xs">
              <span class="text-weight-medium">{{ slot.label }}</span>
              <q-chip
                dense
                square
                :color="slotTypeConfig(slot.slot_type).color"
                text-color="white"
                :icon="slotTypeConfig(slot.slot_type).icon"
                size="sm"
              >
                {{ slotTypeConfig(slot.slot_type).label }}
              </q-chip>
            </q-item-label>
            <q-item-label caption class="q-mt-xs row items-center q-gutter-xs">
              <q-icon name="schedule" size="12px" />
              {{ slot.start_time }} – {{ slot.end_time }}
              <span class="text-grey-5 q-ml-xs">({{ slotDuration(slot) }} min)</span>
              <!-- applies_to_days chips -->
              <template v-if="slot.applies_to_days && slot.applies_to_days.length > 0">
                <q-chip
                  v-for="day in slot.applies_to_days"
                  :key="day"
                  dense
                  outline
                  color="grey-7"
                  size="xs"
                >
                  {{ day.slice(0, 3) }}
                </q-chip>
              </template>
              <q-chip v-else dense outline color="grey-5" size="xs">All Days</q-chip>
            </q-item-label>
            <q-item-label v-if="slot.notes" caption class="text-grey-6 q-mt-xs">
              {{ slot.notes }}
            </q-item-label>
          </q-item-section>

          <!-- Reorder + Edit + Delete (admin only) -->
          <q-item-section v-if="canAdmin" side>
            <div class="row items-center q-gutter-xs">
              <!-- Up button — disabled for first slot -->
              <q-btn
                flat
                dense
                round
                icon="keyboard_arrow_up"
                size="sm"
                color="grey-7"
                :disable="index === 0 || isReordering"
                :loading="isReordering && reorderingId === slot.$id + 'up'"
                @click="moveSlotUp(index)"
              />
              <!-- Down button — disabled for last slot -->
              <q-btn
                flat
                dense
                round
                icon="keyboard_arrow_down"
                size="sm"
                color="grey-7"
                :disable="index === slotsForGradeYear.length - 1 || isReordering"
                :loading="isReordering && reorderingId === slot.$id + 'down'"
                @click="moveSlotDown(index)"
              />
              <q-btn
                flat
                dense
                round
                icon="edit"
                color="primary"
                size="sm"
                @click="openEditDialog(slot)"
              />
              <q-btn
                flat
                dense
                round
                icon="delete"
                color="negative"
                size="sm"
                @click="confirmDelete(slot)"
              />
            </div>
          </q-item-section>
        </q-item>
      </q-list>

      <!-- ── AC2: Daily Schedule Timeline Preview ───────────────── -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Day Preview — {{ selectedGrade }}</div>
          <DailyScheduleTimeline :slots="slotsForGradeYear" />
        </q-card-section>
      </q-card>
    </template>

    <!-- ── Add / Edit Dialog ─────────────────────────────────────── -->
    <q-dialog v-model="showDialog" persistent>
      <q-card style="min-width: 400px; max-width: 560px">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ isEditing ? 'Edit Slot' : 'Add Period Slot' }}</div>
          <q-space />
          <q-btn v-close-popup flat dense round icon="close" />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form ref="slotForm" class="q-gutter-sm">
            <!-- Label -->
            <q-input
              v-model="form.label"
              outlined
              dense
              label="Label *"
              hint='e.g. "Period 1", "Morning Break", "Lunch"'
              :rules="[(v) => !!v?.trim() || 'Label is required']"
            />

            <!-- Slot Type -->
            <q-select
              v-model="form.slot_type"
              :options="SLOT_TYPE_OPTIONS"
              emit-value
              map-options
              outlined
              dense
              label="Slot Type *"
              :rules="[(v) => !!v || 'Slot type is required']"
            >
              <template #selected-item="scope">
                <q-chip
                  v-if="scope.opt"
                  dense
                  square
                  :color="slotTypeConfig(scope.opt.value).color"
                  text-color="white"
                  :icon="slotTypeConfig(scope.opt.value).icon"
                >
                  {{ scope.opt.label }}
                </q-chip>
              </template>
            </q-select>

            <!-- Start Time + End Time -->
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model="form.start_time"
                  outlined
                  dense
                  label="Start Time *"
                  readonly
                  :rules="[
                    (v) => !!v || 'Start time is required',
                    (v) => isValidTime(v) || 'Enter a valid time (HH:mm)',
                  ]"
                >
                  <template #append>
                    <q-icon name="access_time" class="cursor-pointer">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-time
                          v-model="form.start_time"
                          format24h
                          @update:model-value="onStartTimeChange"
                        >
                          <div class="row items-center justify-end">
                            <q-btn v-close-popup label="OK" color="primary" flat />
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
                  label="End Time *"
                  readonly
                  :rules="[
                    (v) => !!v || 'End time is required',
                    (v) => isValidTime(v) || 'Enter a valid time (HH:mm)',
                    (v) => isEndAfterStart(v) || 'End time must be after start time',
                  ]"
                >
                  <template #append>
                    <q-icon name="access_time" class="cursor-pointer">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-time v-model="form.end_time" format24h>
                          <div class="row items-center justify-end">
                            <q-btn v-close-popup label="OK" color="primary" flat />
                          </div>
                        </q-time>
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>
            </div>

            <!-- Duration hint -->
            <div
              v-if="formDurationMinutes > 0"
              class="text-caption text-grey-7 q-mt-none q-ml-xs"
            >
              Duration: {{ formDurationMinutes }} minutes
            </div>

            <!-- Applies to Days (multi-select) -->
            <q-select
              v-model="form.applies_to_days"
              :options="DAYS_OF_WEEK"
              multiple
              use-chips
              outlined
              dense
              label="Applies to Days (optional)"
              hint="Leave empty for all school days (Mon–Fri)"
              clearable
            />

            <!-- Notes -->
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
            :label="isEditing ? 'Save Changes' : 'Add Slot'"
            :loading="isSaving"
            @click="submitForm"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── Delete Confirm Dialog ────────────────────────────────── -->
    <q-dialog v-model="showDeleteConfirm" persistent>
      <q-card style="min-width: 320px">
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">Delete Slot?</span>
        </q-card-section>
        <q-card-section class="q-pt-none">
          Delete <strong>{{ slotToDelete?.label }}</strong>?
          <br />
          <span class="text-caption text-grey-7">
            This cannot be undone.
          </span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancel" color="primary" />
          <q-btn
            flat
            label="Delete"
            color="negative"
            :loading="isDeleting"
            @click="deleteSlot"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── Copy Schedule Dialog ─────────────────────────────────── -->
    <q-dialog v-model="showCopyDialog" persistent>
      <q-card style="min-width: 360px; max-width: 480px">
        <q-card-section class="row items-center">
          <q-avatar icon="content_copy" color="primary" text-color="white" />
          <span class="q-ml-sm text-h6">Copy Schedule</span>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <p class="text-body2 q-mb-md">
            Copy all period slots from a source grade/year into
            <strong>{{ selectedGrade }} {{ selectedYear }}</strong>.
          </p>
          <q-form class="q-gutter-sm">
            <q-select
              v-model="copyForm.sourceGrade"
              :options="GRADE_LEVELS"
              outlined
              dense
              label="Source Grade *"
            />
            <q-input
              v-model.number="copyForm.sourceYear"
              type="number"
              outlined
              dense
              label="Source Year *"
            />
            <q-banner
              v-if="slotsForGradeYear.length > 0"
              class="bg-warning text-white rounded-borders"
              dense
            >
              <template #avatar><q-icon name="warning" /></template>
              Existing {{ slotsForGradeYear.length }} slot(s) for {{ selectedGrade }}
              {{ selectedYear }} will be replaced.
            </q-banner>
          </q-form>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn v-close-popup flat label="Cancel" color="grey-7" />
          <q-btn
            color="primary"
            label="Copy Schedule"
            :loading="isCopying"
            :disable="!copyForm.sourceGrade || !copyForm.sourceYear"
            @click="executeCopy"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { usePeriodSlotsStore, SLOT_TYPE_CONFIG, SLOT_TYPE_OPTIONS, DAYS_OF_WEEK, timeToMinutes } from '../stores/period-slots-store';
import { usePermissions } from 'src/composables/usePermissions';
import { GRADE_LEVELS } from '../utils/school-constants';
import DailyScheduleTimeline from '../components/DailyScheduleTimeline.vue';

const $q = useQuasar();
const slotsStore = usePeriodSlotsStore();
const { hasPermission } = usePermissions();

// ── Auth ────────────────────────────────────────────────────────
const canAdmin = computed(() => hasPermission('school:admin'));

// ── Grade / Year selectors ──────────────────────────────────────
const selectedGrade = ref(GRADE_LEVELS[0]);
const selectedYear = ref(new Date().getFullYear());

const isInitialLoading = computed(
  () => slotsStore.isLoading && !slotsStore.periodSlotsLoaded,
);

const slotsForGradeYear = computed(() =>
  slotsStore.slotsByGradeYear(selectedGrade.value, selectedYear.value),
);

function changeYear(delta) {
  selectedYear.value += delta;
}

function selectGrade(grade) {
  selectedGrade.value = grade;
}

// ── AC5: Grade completeness ─────────────────────────────────────
const allGrades = GRADE_LEVELS;

function gradesSlots(grade) {
  return slotsStore.slotsByGradeYear(grade, selectedYear.value);
}

function gradeStatusColor(grade) {
  const slots = gradesSlots(grade);
  if (slots.length === 0) return 'negative';
  if (slots.some((s) => s.slot_type === 'class')) return 'positive';
  return 'warning';
}

function gradeStatusIcon(grade) {
  const slots = gradesSlots(grade);
  if (slots.length === 0) return 'radio_button_unchecked';
  if (slots.some((s) => s.slot_type === 'class')) return 'check_circle';
  return 'warning';
}

function gradeStatusText(grade) {
  const slots = gradesSlots(grade);
  if (slots.length === 0) return 'Not configured';
  if (slots.some((s) => s.slot_type === 'class')) return 'Configured';
  return 'No class periods';
}

function gradeShortLabel(grade) {
  // "Early Childhood" → "EC", "Grade 5" → "G5"
  if (grade === 'Early Childhood') return 'EC';
  const n = grade.replace('Grade ', '');
  return `G${n}`;
}

// ── Slot helpers ────────────────────────────────────────────────
function slotTypeConfig(slotType) {
  return SLOT_TYPE_CONFIG[slotType] || SLOT_TYPE_CONFIG.free;
}

function slotDuration(slot) {
  return slotsStore.slotDurationMinutes(slot);
}

// ── Reorder ─────────────────────────────────────────────────────
const isReordering = ref(false);
const reorderingId = ref('');

async function moveSlotUp(index) {
  if (index === 0) return;
  const newOrder = [...slotsForGradeYear.value];
  [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
  reorderingId.value = newOrder[index].$id + 'up';
  await saveReorder(newOrder);
}

async function moveSlotDown(index) {
  const slots = slotsForGradeYear.value;
  if (index === slots.length - 1) return;
  const newOrder = [...slots];
  [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
  reorderingId.value = newOrder[index].$id + 'down';
  await saveReorder(newOrder);
}

async function saveReorder(newOrder) {
  isReordering.value = true;
  const result = await slotsStore.reorderSlots(
    selectedGrade.value,
    selectedYear.value,
    newOrder.map((s) => s.$id),
  );
  isReordering.value = false;
  reorderingId.value = '';
  if (!result.success) {
    $q.notify({ type: 'negative', message: result.error || 'Failed to save order.' });
  }
}

// ── Add / Edit dialog ────────────────────────────────────────────
const showDialog = ref(false);
const isEditing = ref(false);
const isSaving = ref(false);
const slotForm = ref(null);

const emptyForm = () => ({
  $id: null,
  label: '',
  slot_type: 'class',
  start_time: '',
  end_time: '',
  applies_to_days: [],
  notes: '',
});

const form = ref(emptyForm());

const formDurationMinutes = computed(() => {
  if (!form.value.start_time || !form.value.end_time) return 0;
  const start = timeToMinutes(form.value.start_time);
  const end = timeToMinutes(form.value.end_time);
  if (start < 0 || end < 0 || end <= start) return 0;
  return end - start;
});

function isValidTime(val) {
  return !val || timeToMinutes(val) >= 0;
}

function isEndAfterStart(endVal) {
  if (!endVal || !form.value.start_time) return true;
  return timeToMinutes(endVal) > timeToMinutes(form.value.start_time);
}

function onStartTimeChange(newStart) {
  // If end time is now invalid (before start), clear it
  if (form.value.end_time && timeToMinutes(form.value.end_time) <= timeToMinutes(newStart)) {
    form.value.end_time = '';
  }
}

function openAddDialog() {
  isEditing.value = false;
  form.value = emptyForm();
  showDialog.value = true;
}

function openEditDialog(slot) {
  isEditing.value = true;
  form.value = {
    $id: slot.$id,
    label: slot.label,
    slot_type: slot.slot_type,
    start_time: slot.start_time,
    end_time: slot.end_time,
    applies_to_days: slot.applies_to_days ? [...slot.applies_to_days] : [],
    notes: slot.notes || '',
  };
  showDialog.value = true;
}

async function submitForm() {
  const valid = await slotForm.value.validate();
  if (!valid) return;
  if (!form.value.start_time || !form.value.end_time) {
    $q.notify({ type: 'warning', message: 'Please select start and end times.' });
    return;
  }
  if (timeToMinutes(form.value.end_time) <= timeToMinutes(form.value.start_time)) {
    $q.notify({ type: 'warning', message: 'End time must be after start time.' });
    return;
  }

  // Warn (but don't block) if a slot with the same start time already exists for this grade/year
  const editingId = form.value.$id;
  const duplicate = slotsForGradeYear.value.find(
    (s) => s.$id !== editingId && s.start_time === form.value.start_time,
  );
  if (duplicate) {
    $q.notify({
      type: 'warning',
      message: `Another slot already starts at ${form.value.start_time}. Unusual schedules are allowed, but please verify.`,
      timeout: 4000,
    });
  }

  // Auto-assign slot_number for new slots
  const nextSlotNumber = slotsForGradeYear.value.length
    ? Math.max(...slotsForGradeYear.value.map((s) => s.slot_number)) + 1
    : 1;

  isSaving.value = true;
  const payload = {
    ...form.value,
    label: form.value.label.trim(),
    grade_level: selectedGrade.value,
    academic_year: selectedYear.value,
    slot_number: form.value.$id
      ? slotsForGradeYear.value.find((s) => s.$id === form.value.$id)?.slot_number ?? nextSlotNumber
      : nextSlotNumber,
  };

  const result = await slotsStore.savePeriodSlot(payload);
  isSaving.value = false;

  if (result.success) {
    $q.notify({ type: 'positive', message: isEditing.value ? 'Slot updated.' : 'Slot added.' });
    showDialog.value = false;
  } else {
    $q.notify({ type: 'negative', message: result.error || 'Failed to save slot. Please try again.' });
  }
}

// ── Delete ───────────────────────────────────────────────────────
const showDeleteConfirm = ref(false);
const isDeleting = ref(false);
const slotToDelete = ref(null);

function confirmDelete(slot) {
  slotToDelete.value = slot;
  showDeleteConfirm.value = true;
}

async function deleteSlot() {
  if (!slotToDelete.value) return;
  isDeleting.value = true;
  const result = await slotsStore.deletePeriodSlot(slotToDelete.value.$id);
  isDeleting.value = false;
  if (result.success) {
    $q.notify({ type: 'positive', message: 'Slot deleted.' });
    showDeleteConfirm.value = false;
    slotToDelete.value = null;
  } else {
    $q.notify({ type: 'negative', message: result.error || 'Failed to delete slot. Please try again.' });
  }
}

// ── Copy schedule dialog ─────────────────────────────────────────
const showCopyDialog = ref(false);
const isCopying = ref(false);
const copyForm = ref({ sourceGrade: '', sourceYear: new Date().getFullYear() - 1 });

function openCopyDialog() {
  copyForm.value = {
    sourceGrade: selectedGrade.value === GRADE_LEVELS[0] ? GRADE_LEVELS[1] : GRADE_LEVELS[0],
    sourceYear: selectedYear.value,
  };
  showCopyDialog.value = true;
}

async function executeCopy() {
  if (!copyForm.value.sourceGrade || !copyForm.value.sourceYear) return;
  isCopying.value = true;
  const result = await slotsStore.copySchedule(
    copyForm.value.sourceGrade,
    copyForm.value.sourceYear,
    selectedGrade.value,
    selectedYear.value,
  );
  isCopying.value = false;
  showCopyDialog.value = false;
  if (result.success) {
    $q.notify({
      type: 'positive',
      message: `Copied ${result.created} slot(s) from ${copyForm.value.sourceGrade} ${copyForm.value.sourceYear}. Review and adjust as needed.`,
    });
  } else {
    $q.notify({ type: 'negative', message: result.error || 'Failed to copy schedule.' });
  }
}

// ── Lifecycle ────────────────────────────────────────────────────
onMounted(() => {
  slotsStore.fetchPeriodSlots();
});

// When grade or year changes, ensure slots are loaded if not already present
watch([selectedGrade, selectedYear], ([grade, year]) => {
  // If we already have all slots loaded, no additional fetch needed.
  // If only a targeted fetch was done before, merge for the new grade/year.
  if (!slotsStore.periodSlotsLoaded) {
    slotsStore.fetchPeriodSlotsForGradeYear(grade, year);
  }
});
</script>
