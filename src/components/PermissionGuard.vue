<template>
  <slot v-if="hasAccess" />
</template>

<script setup>
import { computed } from 'vue';
import { usePermissions } from 'src/composables/usePermissions';

const props = defineProps({
  /**
   * Single permission required
   */
  permission: {
    type: String,
    default: null,
  },
  /**
   * Array of permissions - user needs ANY of these
   */
  anyOf: {
    type: Array,
    default: null,
  },
  /**
   * Array of permissions - user needs ALL of these
   */
  allOf: {
    type: Array,
    default: null,
  },
});

const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

const hasAccess = computed(() => {
  // Check single permission
  if (props.permission) {
    return hasPermission(props.permission);
  }

  // Check any of permissions
  if (props.anyOf && props.anyOf.length > 0) {
    return hasAnyPermission(props.anyOf);
  }

  // Check all of permissions
  if (props.allOf && props.allOf.length > 0) {
    return hasAllPermissions(props.allOf);
  }

  // No permission specified, deny by default
  return false;
});
</script>
