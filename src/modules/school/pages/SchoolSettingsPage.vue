<!--
  SchoolSettingsPage.vue (Story 4.3)

  Hub page for all School Settings sub-sections.
  Accessible at /school/settings — requires school:admin permission.
  Future stories add Bell Schedules (4.4) as a third card.
-->
<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <q-btn flat dense round icon="arrow_back" to="/school/dashboard" class="q-mr-sm" />
      <div>
        <div class="text-h5">School Settings</div>
        <div class="text-caption text-grey-7">
          Configure academic calendar, terms, and schedules
        </div>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <!-- Academic Terms card -->
      <div class="col-12 col-sm-6 col-md-4">
        <q-card
          flat
          bordered
          class="cursor-pointer settings-card"
          role="button"
          tabindex="0"
          aria-label="Configure Academic Terms"
          @click="$router.push('/school/settings/terms')"
          @keydown.enter="$router.push('/school/settings/terms')"
        >
          <q-card-section class="row items-center q-gutter-md">
            <q-icon name="date_range" size="48px" color="primary" />
            <div>
              <div class="text-h6">Academic Terms</div>
              <div class="text-caption text-grey-7">
                Configure term names, count, and start/end dates per academic year
              </div>
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat color="primary" label="Configure" icon-right="chevron_right" />
          </q-card-actions>
        </q-card>
      </div>

      <!-- School Calendar / Holidays card -->
      <div class="col-12 col-sm-6 col-md-4">
        <q-card
          flat
          bordered
          class="cursor-pointer settings-card"
          role="button"
          tabindex="0"
          aria-label="Configure Holidays and Events"
          @click="$router.push('/school/settings/calendar-events')"
          @keydown.enter="$router.push('/school/settings/calendar-events')"
        >
          <q-card-section class="row items-center q-gutter-md">
            <q-icon name="event_busy" size="48px" color="orange-7" />
            <div>
              <div class="text-h6">Holidays & Events</div>
              <div class="text-caption text-grey-7">
                Mark public holidays, school closures, PD days, and exam blocks
              </div>
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat color="orange-7" label="Configure" icon-right="chevron_right" />
          </q-card-actions>
        </q-card>
      </div>

      <!-- Placeholder: Bell Schedules (Story 4.4) -->
      <div class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="settings-card bg-grey-1">
          <q-card-section class="row items-center q-gutter-md">
            <q-icon name="schedule" size="48px" color="grey-5" />
            <div>
              <div class="text-h6 text-grey-6">Bell Schedules</div>
              <div class="text-caption text-grey-5">
                Define daily period slots per grade level — coming in Story 4.4
              </div>
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-badge color="grey-5" label="Coming Soon" />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
// No logic needed — this is a pure navigation hub.
// Permission guard is handled by the router meta (school:admin).
</script>

<style scoped>
.settings-card {
  transition: box-shadow 0.2s;
  min-height: 140px;
}
.settings-card:hover,
.settings-card:focus {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  outline: 2px solid rgba(25, 118, 210, 0.5);
  outline-offset: 2px;
}
</style>
