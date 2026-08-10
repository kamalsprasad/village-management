<template>
  <q-list>
    <q-item clickable v-close-popup @click="onNavigate('/help')">
      <q-item-section avatar>
        <q-icon name="menu_book" />
      </q-item-section>
      <q-item-section>
        <q-item-label>User Guide</q-item-label>
      </q-item-section>
    </q-item>
    <q-item clickable v-close-popup @click="onNavigate({ path: '/help', query: { tab: 'faq' } })">
      <q-item-section avatar>
        <q-icon name="quiz" />
      </q-item-section>
      <q-item-section>
        <q-item-label>FAQ</q-item-label>
      </q-item-section>
    </q-item>
    <q-separator />
    <q-item>
      <q-item-section>
        <q-item-label caption> {{ settingsStore.villageName }} · v{{ version }} </q-item-label>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup>
import { useSettingsStore } from 'src/stores/settings-store';
import { version } from '../../../package.json';

const settingsStore = useSettingsStore();

const emit = defineEmits(['navigate']);

function onNavigate(to) {
  emit('navigate', to);
}
</script>
