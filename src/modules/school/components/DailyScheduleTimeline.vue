<!--
  DailyScheduleTimeline.vue (Story 4.4)

  Read-only visual timeline of a single school day.
  Renders each period slot as a proportionally-sized horizontal block
  based on its duration in minutes, color-coded by slot_type.

  Props:
    slots      — array of school_period_slots rows, sorted by slot_number
    loading    — optional boolean to show a skeleton state

  Used by:
    - BellSchedulesSettingsPage.vue (preview below the slot list)
    - Future Story 4.5 timetable page (per-class daily view)

  Design notes:
    - Timeline shows ALL slots passed in, regardless of applies_to_days.
      The parent is responsible for filtering if needed.
    - Blocks are proportional: a 60-min period is twice as wide as a 30-min break.
    - A minimum flex-basis is applied so very short slots (< 10 min) are still readable.
    - Scrolls horizontally on mobile if the total day exceeds the viewport.
    - No store dependency — purely presentational.
-->
<template>
  <div class="timeline-wrapper">
    <!-- Loading skeleton -->
    <div v-if="loading" class="timeline-scroll">
      <div class="timeline-track">
        <q-skeleton v-for="i in 8" :key="i" class="timeline-skeleton-block" />
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!slots || slots.length === 0" class="timeline-empty text-grey-6">
      <q-icon name="schedule" size="32px" />
      <span class="q-ml-sm text-caption">No slots to display.</span>
    </div>

    <!-- Timeline -->
    <div v-else class="timeline-scroll">
      <!-- Time axis labels -->
      <div class="timeline-axis">
        <div
          v-for="slot in slots"
          :key="'axis-' + slot.$id"
          class="timeline-axis-label"
          :style="slotFlexStyle(slot)"
        >
          {{ slot.start_time }}
        </div>
        <!-- Final end-time label -->
        <div class="timeline-axis-label timeline-axis-end" style="flex: 0 0 auto; min-width: 0">
          {{ lastEndTime }}
        </div>
      </div>

      <!-- Slot blocks -->
      <div class="timeline-track">
        <div
          v-for="slot in slots"
          :key="slot.$id"
          class="timeline-block"
          :style="slotBlockStyle(slot)"
          :title="slotTooltip(slot)"
        >
          <!-- Type icon -->
          <q-icon
            :name="typeConfig(slot.slot_type).icon"
            size="14px"
            class="timeline-block-icon"
          />

          <!-- Label + time range -->
          <div class="timeline-block-content">
            <div class="timeline-block-label" :title="slot.label">{{ slot.label }}</div>
            <div class="timeline-block-time">
              {{ slot.start_time }}–{{ slot.end_time }}
            </div>
          </div>

          <!-- Duration badge (only shown on wider blocks) -->
          <div
            v-if="durationMinutes(slot) >= 30"
            class="timeline-block-duration"
          >
            {{ durationMinutes(slot) }}m
          </div>

          <!-- Applies-to-days indicator (shown when not all days) -->
          <div
            v-if="slot.applies_to_days && slot.applies_to_days.length > 0"
            class="timeline-block-days"
            :title="'Only on: ' + slot.applies_to_days.join(', ')"
          >
            <q-icon name="event_repeat" size="10px" />
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="timeline-legend q-mt-sm">
        <div
          v-for="type in presentTypes"
          :key="type"
          class="timeline-legend-item"
        >
          <span
            class="timeline-legend-dot"
            :style="{ background: typeConfig(type).bgHex }"
          />
          <span class="text-caption text-grey-7">{{ typeConfig(type).label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { SLOT_TYPE_CONFIG, timeToMinutes } from '../stores/period-slots-store';

const props = defineProps({
  /** Array of school_period_slots rows sorted by slot_number */
  slots: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

/** Total school day duration in minutes (sum of all slot durations). */
const totalMinutes = computed(() => {
  if (!props.slots?.length) return 0;
  return props.slots.reduce((sum, s) => sum + durationMinutes(s), 0);
});

/** The end time of the last slot, for the axis trailing label. */
const lastEndTime = computed(() => {
  if (!props.slots?.length) return '';
  return props.slots[props.slots.length - 1]?.end_time || '';
});

/** Unique slot types present in the current slot list (for legend). */
const presentTypes = computed(() => {
  const seen = new Set(props.slots.map((s) => s.slot_type));
  return Object.keys(SLOT_TYPE_CONFIG).filter((t) => seen.has(t));
});

/**
 * Duration of a slot in minutes.
 * @param {object} slot
 * @returns {number}
 */
function durationMinutes(slot) {
  if (!slot?.start_time || !slot?.end_time) return 0;
  const start = timeToMinutes(slot.start_time);
  const end = timeToMinutes(slot.end_time);
  if (start < 0 || end < 0 || end <= start) return 0;
  return end - start;
}

/**
 * Flex style for a slot block: proportional width based on duration.
 * Minimum flex-basis of 60px so very short slots stay readable.
 * @param {object} slot
 * @returns {object} Vue style binding
 */
function slotFlexStyle(slot) {
  const total = totalMinutes.value || 1;
  const dur = durationMinutes(slot);
  const pct = (dur / total) * 100;
  return {
    flex: `${dur} ${dur} 0`,
    minWidth: `${Math.max(pct, 5)}%`,
  };
}

/**
 * Full style for a slot block — includes background color.
 */
function slotBlockStyle(slot) {
  const cfg = typeConfig(slot.slot_type);
  return {
    ...slotFlexStyle(slot),
    background: cfg.bgHex,
    opacity: slot.slot_type === 'free' ? '0.7' : '1',
  };
}

/**
 * Get display config for a slot type. Falls back to 'free' for unknown types.
 */
function typeConfig(slotType) {
  return SLOT_TYPE_CONFIG[slotType] || SLOT_TYPE_CONFIG.free;
}

/**
 * Tooltip text for a slot block (shown on hover).
 */
function slotTooltip(slot) {
  const dur = durationMinutes(slot);
  const days =
    slot.applies_to_days?.length > 0
      ? ` · Only on: ${slot.applies_to_days.join(', ')}`
      : ' · All days';
  return `${slot.label} · ${slot.start_time}–${slot.end_time} (${dur} min)${days}`;
}
</script>

<style scoped>
.timeline-wrapper {
  width: 100%;
}

/* Horizontal scroll container for mobile */
.timeline-scroll {
  overflow-x: auto;
  overflow-y: visible;
  padding-bottom: 4px;
}

/* Time axis row */
.timeline-axis {
  display: flex;
  align-items: flex-end;
  margin-bottom: 2px;
  min-width: max-content;
}

.timeline-axis-label {
  font-size: 10px;
  color: #9e9e9e;
  white-space: nowrap;
  text-align: left;
  padding-left: 2px;
  line-height: 1;
}

/* Main slot track */
.timeline-track {
  display: flex;
  align-items: stretch;
  border-radius: 6px;
  overflow: hidden;
  min-width: max-content;
  min-height: 52px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

/* Individual slot block */
.timeline-block {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 5px 7px 5px 6px;
  color: white;
  cursor: default;
  overflow: hidden;
  transition: filter 0.15s ease;
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  box-sizing: border-box;
}

.timeline-block:last-child {
  border-right: none;
}

.timeline-block:hover {
  filter: brightness(1.1);
}

.timeline-block-icon {
  opacity: 0.85;
  margin-bottom: 2px;
  flex-shrink: 0;
}

.timeline-block-content {
  min-width: 0;
  width: 100%;
}

.timeline-block-label {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timeline-block-time {
  font-size: 9px;
  opacity: 0.85;
  white-space: nowrap;
  margin-top: 1px;
}

.timeline-block-duration {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 9px;
  opacity: 0.75;
  white-space: nowrap;
}

.timeline-block-days {
  position: absolute;
  bottom: 3px;
  right: 4px;
  opacity: 0.8;
}

/* Skeleton blocks */
.timeline-skeleton-block {
  flex: 1 1 80px;
  min-width: 60px;
  height: 52px;
  border-radius: 0;
}

/* Empty state */
.timeline-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 6px;
}

/* Legend */
.timeline-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.timeline-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.timeline-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}
</style>
