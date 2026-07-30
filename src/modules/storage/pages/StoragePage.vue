<template>
  <q-page padding class="storage-page">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h1 class="text-h5 text-weight-bold q-my-none">My Files</h1>
        <p class="text-grey-7 q-mt-xs q-mb-none">Personal storage — visible only to you.</p>
      </div>
    </div>

    <!-- Usage banner -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row items-center justify-between q-mb-xs">
          <div class="text-subtitle2">
            {{ isClient ? formatBytes(store.usageBytes) : 'Loading...' }} of
            {{ isClient ? formatQuota(quotaBytes) : '...' }} used
          </div>
          <div class="text-caption text-grey-7">
            {{ isClient ? formatPercent(store.usagePercent) : '' }}
          </div>
        </div>
        <q-linear-progress
          :value="isClient ? store.usagePercent : 0"
          :color="isClient && store.isOverQuota90 ? 'negative' : 'primary'"
          rounded
          size="10px"
        />
      </q-card-section>

      <q-banner v-if="isClient && store.isOverQuota90" dense class="bg-warning text-dark">
        <template v-slot:avatar>
          <q-icon name="warning" color="dark" />
        </template>
        You have used over 90% of your storage quota. Delete files or contact an administrator to
        free up space.
      </q-banner>
    </q-card>

    <!-- Upload area -->
    <q-card
      v-if="canWrite"
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
          @update:model-value="onFilesSelected"
        />
        <q-btn
          color="primary"
          label="Upload"
          class="q-mt-sm"
          :disable="!pendingFiles || pendingFiles.length === 0"
          @click="startUpload"
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

    <!-- Search -->
    <q-input
      v-model="search"
      outlined
      dense
      debounce="200"
      placeholder="Search files by name"
      class="q-mb-md"
      clearable
    >
      <template v-slot:prepend>
        <q-icon name="search" />
      </template>
    </q-input>

    <!-- File list -->
    <q-card flat bordered>
      <q-list v-if="isClient && visibleFiles.length > 0" separator>
        <q-item v-for="file in visibleFiles" :key="file.$id">
          <q-item-section avatar>
            <q-icon name="insert_drive_file" color="grey-7" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ file.name }}</q-item-label>
            <q-item-label caption>
              {{ formatBytes(file.size) }} &middot; {{ file.folder_path || '/' }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row q-gutter-xs">
              <q-btn flat round dense icon="download" @click="onDownload(file)">
                <q-tooltip>Download</q-tooltip>
              </q-btn>
              <q-btn v-if="canWrite" flat round dense icon="edit" @click="openRenameDialog(file)">
                <q-tooltip>Rename</q-tooltip>
              </q-btn>
              <q-btn
                v-if="canWrite"
                flat
                round
                dense
                icon="drive_file_move"
                @click="openMoveDialog(file)"
              >
                <q-tooltip>Move</q-tooltip>
              </q-btn>
              <q-btn
                v-if="shareableFolders.length > 0"
                flat
                round
                dense
                icon="ios_share"
                @click="openShareDialog(file)"
              >
                <q-tooltip>Share to Folder</q-tooltip>
              </q-btn>
              <q-btn
                v-if="canWrite"
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click="confirmDelete(file)"
              >
                <q-tooltip>Delete</q-tooltip>
              </q-btn>
            </div>
          </q-item-section>
        </q-item>
      </q-list>

      <div v-else-if="isClient" class="text-center text-grey-7 q-py-lg">
        <q-icon name="folder_open" size="48px" />
        <div class="q-mt-sm">
          {{ search ? 'No files match your search.' : 'No files uploaded yet.' }}
        </div>
      </div>

      <div v-else class="text-center text-grey-7 q-py-lg">
        <q-spinner size="32px" color="primary" />
      </div>
    </q-card>

    <!-- Rename dialog -->
    <q-dialog v-model="showRenameDialog">
      <q-card style="min-width: 320px">
        <q-card-section class="text-h6">Rename File</q-card-section>
        <q-card-section>
          <q-input v-model="renameValue" outlined dense label="File name" autofocus />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="showRenameDialog = false" />
          <q-btn color="primary" label="Rename" @click="submitRename" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Move dialog -->
    <q-dialog v-model="showMoveDialog">
      <q-card style="min-width: 320px">
        <q-card-section class="text-h6">Move File</q-card-section>
        <q-card-section>
          <q-input
            v-model="moveValue"
            outlined
            dense
            label="Folder path"
            hint="Must start with / (e.g. /Documents)"
            autofocus
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="showMoveDialog = false" />
          <q-btn color="primary" label="Move" @click="submitMove" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Share to Folder dialog -->
    <q-dialog v-model="showShareDialog">
      <q-card style="min-width: 320px">
        <q-card-section class="text-h6">Share to Folder</q-card-section>
        <q-card-section>
          <q-select
            v-model="shareFolderId"
            outlined
            dense
            emit-value
            map-options
            :options="shareableFolderOptions"
            label="Shared folder"
            autofocus
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="showShareDialog = false" />
          <q-btn color="primary" label="Share" :disable="!shareFolderId" @click="submitShare" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { usePersonalFilesStore } from '../stores/personal-files-store';
import { usePermissions } from 'src/composables/usePermissions';
import { formatBytes, formatPercent, formatQuota } from '../utils/format-storage';
import { SHARED_FOLDERS } from '../constants/shared-folders';

const $q = useQuasar();
const store = usePersonalFilesStore();
const { hasPermission, userStorageQuota } = usePermissions();

const isClient = ref(false);
const search = ref('');
const pendingFiles = ref([]);
const isDragging = ref(false);
const uploadQueue = ref([]);

const showRenameDialog = ref(false);
const renameValue = ref('');
const renamingFile = ref(null);

const showMoveDialog = ref(false);
const moveValue = ref('');
const movingFile = ref(null);

const showShareDialog = ref(false);
const shareFolderId = ref(null);
const sharingFile = ref(null);

const canWrite = computed(() => hasPermission('storage:write'));
const quotaBytes = computed(() => userStorageQuota.value);
const visibleFiles = computed(() => store.filteredFiles(search.value));

// Story 5.4: shared folders the current user may share a personal file into.
const shareableFolders = computed(() =>
  SHARED_FOLDERS.filter((f) => hasPermission(f.writePermission)),
);
const shareableFolderOptions = computed(() =>
  shareableFolders.value.map((f) => ({ label: f.label, value: f.id })),
);

onMounted(() => {
  isClient.value = true;
  store.fetchFiles();
});

function onDrop(event) {
  isDragging.value = false;
  const dropped = Array.from(event.dataTransfer?.files || []);
  if (dropped.length === 0) return;
  pendingFiles.value = [...pendingFiles.value, ...dropped];
}

function onFilesSelected() {
  // q-file already keeps pendingFiles in sync via v-model.
}

async function startUpload() {
  const files = pendingFiles.value;
  if (!files || files.length === 0) return;

  uploadQueue.value = files.map((file) => ({ name: file.name, progress: 0 }));
  pendingFiles.value = [];

  await store.uploadFiles(files, {
    onProgress: (index, progress) => {
      const item = uploadQueue.value[index];
      if (item) {
        item.progress = progress;
      }
    },
  });
  uploadQueue.value = [];
}

function onDownload(file) {
  const url = store.getDownloadUrl(file.$id);
  if (url && isClient.value) {
    window.open(url, '_blank');
  }
}

function openRenameDialog(file) {
  renamingFile.value = file;
  renameValue.value = file.name;
  showRenameDialog.value = true;
}

async function submitRename() {
  if (!renamingFile.value) return;
  await store.renameFile(renamingFile.value.$id, renameValue.value);
  showRenameDialog.value = false;
  renamingFile.value = null;
}

function openMoveDialog(file) {
  movingFile.value = file;
  moveValue.value = file.folder_path || '/';
  showMoveDialog.value = true;
}

async function submitMove() {
  if (!movingFile.value) return;
  await store.moveFile(movingFile.value.$id, moveValue.value);
  showMoveDialog.value = false;
  movingFile.value = null;
}

function openShareDialog(file) {
  sharingFile.value = file;
  shareFolderId.value = shareableFolders.value[0]?.id || null;
  showShareDialog.value = true;
}

async function submitShare() {
  if (!sharingFile.value || !shareFolderId.value) return;
  await store.shareToFolder(sharingFile.value, shareFolderId.value);
  showShareDialog.value = false;
  sharingFile.value = null;
  shareFolderId.value = null;
}

function confirmDelete(file) {
  $q.dialog({
    title: 'Delete File?',
    message: `Delete "${file.name}"? This cannot be undone.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    await store.deleteFile(file.$id);
  });
}
</script>

<style scoped>
.storage-page {
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
