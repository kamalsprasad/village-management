<!--
  AcademicTermsSettingsPage.vue (Story 4.3)

  Manage configurable academic terms per academic year.
  Replaces the hard-coded TERMS constant with database-driven term records.

  Features:
  - Year selector with next/prev navigation
  - List of terms for selected year with inline edit
  - Add / Edit / Delete terms via dialog
  - "Copy from previous year" to shift dates +365 days as a starting point
  - Validation: no overlapping date ranges within a year
-->
<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn flat dense round icon="arrow_back" to="/school/settings" class="q-mr-sm" />
      <div>
        <div class="text-h5">Academic Terms</div>
        <div class="text-caption text-grey-7">Configure term names and dates per academic year</div>
      </div>
    </div>

    <!-- Year Selector Row -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <q-btn flat dense round icon="chevron_left" @click="changeYear(-1)" />
      <div class="text-h6 text-weight-medium" style="min-width: 80px; text-align: center">
        {{ selectedYear }}
      </div>
      <q-btn flat dense round icon="chevron_right" @click="changeYear(1)" />
      <q-space />
      <q-btn
        v-if="canAdmin"
        outline
        color="secondary"
        icon="content_copy"
        label="Copy from previous year"
        :loading="isCopying"
        :disable="termsForYear.length > 0"
        @click="confirmCopyFromPreviousYear"
      >
        <q-tooltip v-if="termsForYear.length > 0">
          Clear terms for {{ selectedYear }} first before copying
        </q-tooltip>
      </q-btn>
      <q-btn
        v-if="canAdmin && termsForYear.length > 0"
        outline
        color="negative"
        icon="delete_sweep"
        label="Delete all for year"
        @click="confirmDeleteAllForYear"
      />
      <q-btn v-if="canAdmin" color="primary" icon="add" label="Add Term" @click="openAddDialog" />
    </div>

    <!-- Loading state -->
    <div v-if="isInitialLoading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="lg" />
      <div class="text-caption q-mt-sm">Loading terms...</div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="termsForYear.length === 0"
      class="text-center q-pa-xl text-grey-7 bg-grey-1 rounded-borders"
    >
      <q-icon name="date_range" size="48px" />
      <div class="text-subtitle1 q-mt-sm">No terms configured for {{ selectedYear }}</div>
      <div class="text-caption">
        Add terms manually or copy from a previous year to get started.
      </div>
      <q-btn
        v-if="canAdmin && hasPreviousYearTerms"
        color="primary"
        outline
        icon="content_copy"
        :label="`Copy from ${selectedYear - 1}`"
        class="q-mt-md"
        :loading="isCopying"
        @click="confirmCopyFromPreviousYear"
      />
    </div>

    <!-- Terms list -->
    <q-list v-else bordered separator class="rounded-borders">
      <q-item v-for="term in termsForYear" :key="term.$id" class="q-py-md">
        <q-item-section avatar>
          <q-avatar color="primary" text-color="white" size="36px">
            {{ term.term_order }}
          </q-avatar>
        </q-item-section>

        <q-item-section>
          <q-item-label class="text-weight-medium text-body1">{{ term.term_name }}</q-item-label>
          <q-item-label caption>
            {{ formatDate(term.start_date) }} &ndash; {{ formatDate(term.end_date) }}
            <span class="q-ml-sm text-grey-6">({{ termDuration(term) }} days)</span>
          </q-item-label>
          <q-item-label v-if="term.notes" caption class="text-grey-7 q-mt-xs">
            {{ term.notes }}
          </q-item-label>
        </q-item-section>

        <q-item-section v-if="canAdmin" side>
          <div class="row q-gutter-xs">
            <q-btn flat dense round icon="edit" color="primary" @click="openEditDialog(term)" />
            <q-btn flat dense round icon="delete" color="negative" @click="confirmDelete(term)" />
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <!-- ── Add / Edit Dialog ─────────────────────────────────────── -->
    <q-dialog v-model="showDialog" persistent>
      <q-card style="min-width: 380px; max-width: 500px">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ isEditing ? 'Edit Term' : 'Add Term' }}</div>
          <q-space />
          <q-btn v-close-popup flat dense round icon="close" />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form ref="termForm" class="q-gutter-sm">
            <q-input
              v-model="form.term_name"
              outlined
              dense
              label="Term Name *"
              hint='e.g. "Term 1", "Semester 1", "Quarter 3"'
              :rules="[(v) => !!v || 'Term name is required']"
            />
            <q-input
              v-model.number="form.term_order"
              outlined
              dense
              type="number"
              label="Order *"
              hint="Position within the year (1, 2, 3…)"
              :rules="[(v) => v > 0 || 'Must be a positive number']"
            />
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
                <q-input v-model="form.end_date" outlined dense label="End Date *" readonly>
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
            :label="isEditing ? 'Save Changes' : 'Add Term'"
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
          <span class="q-ml-sm text-h6">Delete Term?</span>
        </q-card-section>
        <q-card-section class="q-pt-none">
          Delete <strong>{{ termToDelete?.term_name }}</strong
          >?
          <br />
          <span class="text-caption text-grey-7">
            Existing test scores that used this term name will not be affected — the name is stored
            as a literal string on each score record.
          </span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancel" color="primary" />
          <q-btn flat label="Delete" color="negative" :loading="isDeleting" @click="deleteTerm" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── Copy Confirm Dialog ────────────────────────────────────── -->
    <q-dialog v-model="showCopyConfirm" persistent>
      <q-card style="min-width: 360px">
        <q-card-section class="row items-center">
          <q-avatar icon="content_copy" color="secondary" text-color="white" />
          <span class="q-ml-sm text-h6">Copy Terms from {{ selectedYear - 1 }}?</span>
        </q-card-section>
        <q-card-section class="q-pt-none">
          This will copy all {{ previousYearTerms.length }} term(s) from
          <strong>{{ selectedYear - 1 }}</strong> into <strong>{{ selectedYear }}</strong
          >, shifting dates forward by 365 days.
          <br />
          <span class="text-caption text-grey-7"> Review and adjust the dates after copying. </span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancel" color="grey-7" />
          <q-btn color="secondary" label="Copy Terms" :loading="isCopying" @click="executeCopy" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── Delete All for Year Confirm Dialog ─────────────────────── -->
    <q-dialog v-model="showDeleteAllConfirm" persistent>
      <q-card style="min-width: 360px">
        <q-card-section class="row items-center">
          <q-avatar icon="delete_sweep" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">Delete All Terms for {{ selectedYear }}?</span>
        </q-card-section>
        <q-card-section class="q-pt-none">
          This will permanently delete <strong>{{ termsForYear.length }}</strong> term(s) for
          <strong>{{ selectedYear }}</strong
          >.
          <br />
          <span class="text-caption text-grey-7">
            Existing test scores that used these term names will not be affected — the name is
            stored as a literal string on each score record.
          </span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancel" color="primary" />
          <q-btn
            flat
            label="Delete All"
            color="negative"
            :loading="isDeletingAll"
            @click="deleteAllForYear"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useAcademicTermsStore } from '../stores/academic-terms-store';
import { usePermissions } from 'src/composables/usePermissions';
import { useSettingsStore } from 'src/stores/settings-store';
import {
  datePickerToStartOfDayISO,
  datePickerToEndOfDayISO,
  formatDateInTimezone,
} from 'src/utils/dateUtils';

const $q = useQuasar();
const termsStore = useAcademicTermsStore();
const settingsStore = useSettingsStore();
const { hasPermission } = usePermissions();

const canAdmin = computed(() => hasPermission('school:admin'));
const selectedYear = ref(new Date().getFullYear());
const isInitialLoading = computed(() => termsStore.isLoading && !termsStore.academicTermsLoaded);

const termsForYear = computed(() => termsStore.termsByYear(selectedYear.value));
const previousYearTerms = computed(() => termsStore.termsByYear(selectedYear.value - 1));
const hasPreviousYearTerms = computed(() => previousYearTerms.value.length > 0);

// Dialog state
const showDialog = ref(false);
const showDeleteConfirm = ref(false);
const showDeleteAllConfirm = ref(false);
const showCopyConfirm = ref(false);
const isEditing = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const isDeletingAll = ref(false);
const isCopying = ref(false);
const termToDelete = ref(null);
const termForm = ref(null);

const emptyForm = () => ({
  $id: null,
  term_name: '',
  term_order: (termsForYear.value.length || 0) + 1,
  start_date: '',
  end_date: '',
  notes: '',
  academic_year: selectedYear.value,
});

const form = ref(emptyForm());

function changeYear(delta) {
  selectedYear.value += delta;
}

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

// End date must be >= start date
function endDateOptions(dateStr) {
  if (!form.value.start_date) return true;
  return dateStr >= form.value.start_date;
}

function openAddDialog() {
  isEditing.value = false;
  form.value = emptyForm();
  form.value.term_order = (termsForYear.value.length || 0) + 1;
  showDialog.value = true;
}

function openEditDialog(term) {
  isEditing.value = true;
  form.value = {
    $id: term.$id,
    term_name: term.term_name,
    term_order: term.term_order,
    start_date: term.start_date ? term.start_date.slice(0, 10) : '',
    end_date: term.end_date ? term.end_date.slice(0, 10) : '',
    notes: term.notes || '',
    academic_year: term.academic_year,
  };
  showDialog.value = true;
}

async function submitForm() {
  const valid = await termForm.value.validate();
  if (!valid) return;
  if (!form.value.start_date || !form.value.end_date) {
    $q.notify({ type: 'warning', message: 'Please select start and end dates.' });
    return;
  }
  if (form.value.end_date < form.value.start_date) {
    $q.notify({ type: 'warning', message: 'End date must be on or after start date.' });
    return;
  }

  const editingId = form.value.$id;
  const nameTrimmed = form.value.term_name.trim();

  const duplicateName = termsForYear.value.some(
    (t) => t.$id !== editingId && t.term_name.trim().toLowerCase() === nameTrimmed.toLowerCase(),
  );
  if (duplicateName) {
    $q.notify({
      type: 'warning',
      message: `A term named "${form.value.term_name}" already exists in ${selectedYear.value}.`,
    });
    return;
  }

  const duplicateOrder = termsForYear.value.some(
    (t) => t.$id !== editingId && t.term_order === form.value.term_order,
  );
  if (duplicateOrder) {
    $q.notify({
      type: 'warning',
      message: `Term order ${form.value.term_order} is already used in ${selectedYear.value}.`,
    });
    return;
  }

  const overlaps = termsForYear.value.some((t) => {
    if (t.$id === editingId) return false;
    const tStart = t.start_date.slice(0, 10);
    const tEnd = t.end_date.slice(0, 10);
    return form.value.start_date <= tEnd && form.value.end_date >= tStart;
  });
  if (overlaps) {
    $q.notify({
      type: 'warning',
      message: 'The selected date range overlaps another term in this academic year.',
    });
    return;
  }

  isSaving.value = true;
  const tz = settingsStore.timezone;
  const payload = {
    ...form.value,
    term_name: nameTrimmed,
    academic_year: selectedYear.value,
    // Convert YYYY-MM-DD strings to ISO datetime anchored to the village timezone
    start_date: datePickerToStartOfDayISO(form.value.start_date, tz),
    end_date: datePickerToEndOfDayISO(form.value.end_date, tz),
  };

  const result = await termsStore.saveTerm(payload);
  isSaving.value = false;

  if (result.success) {
    $q.notify({ type: 'positive', message: isEditing.value ? 'Term updated.' : 'Term added.' });
    showDialog.value = false;
  }
}

function confirmDelete(term) {
  termToDelete.value = term;
  showDeleteConfirm.value = true;
}

async function deleteTerm() {
  if (!termToDelete.value) return;
  isDeleting.value = true;
  const result = await termsStore.deleteTerm(termToDelete.value.$id);
  isDeleting.value = false;
  if (result.success) {
    $q.notify({ type: 'positive', message: 'Term deleted.' });
    showDeleteConfirm.value = false;
    termToDelete.value = null;
  }
}

function confirmDeleteAllForYear() {
  showDeleteAllConfirm.value = true;
}

async function deleteAllForYear() {
  isDeletingAll.value = true;
  const result = await termsStore.deleteAllTermsForYear(selectedYear.value);
  isDeletingAll.value = false;
  if (result.success) {
    $q.notify({
      type: 'positive',
      message: `Deleted ${result.deleted} term(s) for ${selectedYear.value}.`,
    });
    showDeleteAllConfirm.value = false;
  }
}

function confirmCopyFromPreviousYear() {
  if (!hasPreviousYearTerms.value) {
    $q.notify({ type: 'warning', message: `No terms found for ${selectedYear.value - 1}.` });
    return;
  }
  showCopyConfirm.value = true;
}

async function executeCopy() {
  isCopying.value = true;
  const result = await termsStore.copyTermsFromYear(selectedYear.value - 1, selectedYear.value);
  isCopying.value = false;
  showCopyConfirm.value = false;
  if (result.success) {
    $q.notify({
      type: 'positive',
      message: `Copied ${result.created} term(s) from ${selectedYear.value - 1}. Review and adjust dates.`,
    });
  }
}

onMounted(() => {
  termsStore.fetchAcademicTerms();
});
</script>
