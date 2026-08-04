<template>
  <div>
    <q-breadcrumbs v-if="$q.screen.gt.md" class="q-mb-md">
      <q-breadcrumbs-el
        v-for="(item, index) in items"
        :key="index"
        :label="item.label"
        :to="item.to"
      />
      <q-breadcrumbs-el :label="current" />
    </q-breadcrumbs>

    <q-breadcrumbs v-else-if="$q.screen.md" class="q-mb-md">
      <q-breadcrumbs-el
        v-for="(item, index) in tabletItems"
        :key="index"
        :label="item.label"
        :to="item.to"
      />
      <q-breadcrumbs-el :label="current" />
    </q-breadcrumbs>

    <q-btn
      v-else
      flat
      round
      dense
      icon="arrow_back"
      aria-label="Back"
      class="q-mb-md"
      @click="handleBack"
    />
  </div>
</template>

<script setup>
defineOptions({ name: 'PageBreadcrumbs' });

import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  current: {
    type: String,
    required: true,
  },
});

const router = useRouter();
const $q = useQuasar();

const tabletItems = computed(() => props.items.slice(-1));

function handleBack() {
  const target = props.items[props.items.length - 1]?.to;
  if (target) {
    router.push(target);
  } else {
    router.back();
  }
}
</script>
