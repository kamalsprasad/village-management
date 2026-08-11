<template>
  <q-page padding class="shared-storage-page">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h4 class="text-h5 q-my-none">Shared Folders</h4>
        <p class="text-grey-7 q-mb-none">
          Module-based folders shared with your role. Files uploaded here count against your
          personal storage quota.
        </p>
      </div>
    </div>

    <div v-if="!isClient" class="text-center text-grey-7 q-py-lg">
      <q-spinner size="32px" color="primary" />
    </div>

    <div v-else-if="visibleFolders.length === 0" class="text-center text-grey-7 q-py-lg">
      <q-icon name="folder_off" size="48px" />
      <div class="q-mt-sm">You don't have access to any shared folders yet.</div>
    </div>

    <template v-else>
      <q-tabs v-model="activeTab" dense class="text-grey" active-color="primary" align="left">
        <q-tab
          v-for="folder in visibleFolders"
          :key="folder.id"
          :name="folder.id"
          :label="folder.label"
        />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="activeTab" animated>
        <q-tab-panel v-for="folder in visibleFolders" :key="folder.id" :name="folder.id">
          <p class="text-grey-7">{{ folder.description }}</p>

          <!-- Upload area (only when the user has write access to this folder) -->
          <q-card
            v-if="canWriteFolder(folder)"
            flat
            bordered
            class="q-mb-md upload-drop-zone"
            :class="{ 'upload-drop-zone--active': isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
          >
            <q-card-section class="text-center">
              <q-icon name="cloud_upload" size="48px" color="primary" />
              <div class="text-body1 q-mt-sm">Drag and drop files here, or</div>
              <q-file
                v-model="pendingFiles"
                multiple
                use-chips
                label="Choose files"
                class="q-mt-sm upload-file-input"
              />
              <q-btn
                color="primary"
                label="Upload"
                class="q-mt-sm"
                :disable="!pendingFiles || pendingFiles.length === 0"
                @click="startUpload(folder.id)"
              />
            </q-card-section>

            <q-card-section v-if="uploadQueue.length > 0">
              <div v-for="item in uploadQueue" :key="item.name" class="q-mb-sm">
                <div class="row items-center justify-between">
                  <span class="text-body2">{{ item.name }}</span>
                  <span class="text-caption text-grey-7">{{ formatPercent(item.progress) }}</span>
                </div>
                <q-linear-progress :value="item.progress" color="primary" rounded />
              </div>
            </q-card-section>
          </q-card>

          <!-- File list -->
          <q-card flat bordered>
            <q-list v-if="folderFiles(folder.id).length > 0" separator>
              <q-item v-for="file in folderFiles(folder.id)" :key="file.$id">
                <q-item-section avatar>
                  <q-icon name="insert_drive_file" color="grey-7" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ file.name }}</q-item-label>
                  <q-item-label caption>
                    {{ formatBytes(file.size) }} &middot; {{ formatDate(file.uploaded_at) }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="row q-gutter-xs">
                    <q-btn flat round dense icon="download" @click="onDownload(file, folder.id)">
                      <q-tooltip>Download</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="canWriteFolder(folder)"
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      @click="confirmDelete(file, folder.id)"
                    >
                      <q-tooltip>Delete</q-tooltip>
                    </q-btn>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>

            <div v-else class="text-center text-grey-7 q-py-lg">
              <q-icon name="folder_open" size="48px" />
              <div class="q-mt-sm">No files in this folder yet.</div>
            </div>
          </q-card>
        </q-tab-panel>
      </q-tab-panels>
    </template>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useSharedFilesStore } from '../stores/shared-files-store';
import { usePermissions } from 'src/composables/usePermissions';
import { formatBytes, formatPercent } from '../utils/format-storage';
import { formatDate } from 'src/utils/dateUtils';
import { SHARED_FOLDERS } from '../constants/shared-folders';

const $q = useQuasar();
const store = useSharedFilesStore();
const { hasPermission } = usePermissions();

const isClient = ref(false);
const activeTab = ref(null);
const pendingFiles = ref([]);
const isDragging = ref(false);
const uploadQueue = ref([]);

const visibleFolders = computed(() =>
  SHARED_FOLDERS.filter((f) => hasPermission(f.readPermission)),
);

function canWriteFolder(folder) {
  return hasPermission(folder.writePermission);
}

function folderFiles(folderId) {
  return store.filesByFolder[folderId] || [];
}

onMounted(() => {
  isClient.value = true;
  if (visibleFolders.value.length > 0) {
    activeTab.value = visibleFolders.value[0].id;
    store.fetchFolderFiles(activeTab.value);
  }
});

// Guarded per-tab activation, per Story 5.4 spec (fetch when a tab becomes active).
watch(activeTab, (folderId) => {
  if (isClient.value && folderId && !store.filesByFolder[folderId]) {
    store.fetchFolderFiles(folderId);
  }
});

function onDrop(event) {
  isDragging.value = false;
  const dropped = Array.from(event.dataTransfer?.files || []);
  if (dropped.length === 0) return;
  pendingFiles.value = [...pendingFiles.value, ...dropped];
}

async function startUpload(folderId) {
  const files = pendingFiles.value;
  if (!files || files.length === 0) return;

  uploadQueue.value = files.map((file) => ({ name: file.name, progress: 0 }));
  pendingFiles.value = [];

  await store.uploadFiles(folderId, files, {
    onProgress: (index, progress) => {
      const item = uploadQueue.value[index];
      if (item) {
        item.progress = progress;
      }
    },
  });
  uploadQueue.value = [];
  await store.fetchFolderFiles(folderId);
}

function onDownload(file, folderId) {
  const url = store.getDownloadUrl(file.$id, folderId);
  if (url && isClient.value) {
    window.open(url, '_blank');
  }
}

function confirmDelete(file, folderId) {
  $q.dialog({
    title: 'Delete File?',
    message: `Delete "${file.name}"? This cannot be undone.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    await store.deleteFile(file.$id, folderId);
  });
}
</script>

<style scoped>
.shared-storage-page {
  max-width: 1000px;
  margin: 0 auto;
}

.upload-drop-zone {
  border: 2px dashed rgba(0, 0, 0, 0.12);
  transition: border-color 0.2s ease;
}

.upload-drop-zone--active {
  border-color: var(--q-primary);
}

.upload-file-input {
  max-width: 320px;
  margin: 0 auto;
}

/* Ensure minimum touch target size for mobile */
@media (max-width: 599px) {
  .q-btn {
    min-height: 44px;
  }
}
</style>
