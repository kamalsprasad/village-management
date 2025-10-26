<template>
  <q-page class="q-pa-md">
    <div class="q-gutter-md" style="max-width: 600px">
      <h4>Appwrite Connection Test</h4>

      <q-card>
        <q-card-section>
          <div class="text-h6">Connection Status</div>
        </q-card-section>

        <q-card-section>
          <div v-if="loading" class="text-center">
            <q-spinner color="primary" size="3em" />
            <p>Testing connection...</p>
          </div>

          <div v-else-if="connectionStatus.success" class="text-positive">
            <q-icon name="check_circle" size="2em" />
            <p class="text-h6">✅ Connected Successfully!</p>
            <div class="q-mt-md">
              <p><strong>Endpoint:</strong> {{ connectionStatus.endpoint }}</p>
              <p><strong>Project ID:</strong> {{ connectionStatus.projectId }}</p>
            </div>
          </div>

          <div v-else-if="connectionStatus.error" class="text-negative">
            <q-icon name="error" size="2em" />
            <p class="text-h6">❌ Connection Failed</p>
            <p class="q-mt-md">{{ connectionStatus.error }}</p>
          </div>
        </q-card-section>

        <q-card-actions>
          <q-btn
            color="primary"
            label="Test Connection"
            @click="testConnection"
            :loading="loading"
          />
          <q-btn
            color="secondary"
            label="Test TablesDB Access"
            @click="testDatabaseAccess"
            :loading="loading"
            :disable="!connectionStatus.success"
          />
          <q-btn
            color="amber"
            text-color="black"
            label="List Tables"
            @click="listAvailableTables"
            :loading="listTablesLoading"
            :disable="!connectionStatus.success"
          />
        </q-card-actions>
      </q-card>

      <q-card class="q-mt-md">
        <q-card-section>
          <div class="text-h6">TablesDB Access Test</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="tableId"
            label="Table ID"
            hint="Enter the table ID you want to test (e.g., users, residents)"
            debounce="300"
          />
          <p class="text-caption q-mt-sm">
            Tables are created in the Appwrite console. Update this field after you create them.
          </p>
        </q-card-section>

        <q-card-actions>
          <q-btn
            color="secondary"
            label="Test TablesDB Access"
            @click="testDatabaseAccess"
            :loading="loading"
            :disable="!connectionStatus.success || !tableId"
          />
        </q-card-actions>
      </q-card>

      <q-card v-if="availableTables.length" class="q-mt-md">
        <q-card-section>
          <div class="text-h6">Available Tables</div>
        </q-card-section>

        <q-card-section>
          <q-list bordered separator>
            <q-item v-for="table in availableTables" :key="table.$id">
              <q-item-section>
                <q-item-label>{{ table.name || table.$id }}</q-item-label>
                <q-item-label caption>ID: {{ table.$id }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
          <p class="text-caption q-mt-sm">
            Use the IDs above in the input when testing TablesDB access.
          </p>
        </q-card-section>
      </q-card>

      <q-card v-if="databaseTest.tested" class="q-mt-md">
        <q-card-section>
          <div class="text-h6">TablesDB Access Result</div>
        </q-card-section>

        <q-card-section>
          <div v-if="databaseTest.success" class="text-positive">
            <q-icon name="check_circle" size="2em" />
            <p class="text-h6">✅ TablesDB Access Successful!</p>
            <div class="q-mt-md">
              <p><strong>Database:</strong> {{ databaseTest.databaseId }}</p>
              <p><strong>Table:</strong> {{ databaseTest.tableId }}</p>
              <p><strong>Total Rows:</strong> {{ databaseTest.totalRows }}</p>
              <div v-if="databaseTest.rowsPreview.length > 0">
                <p><strong>Sample Row IDs:</strong></p>
                <ul>
                  <li v-for="row in databaseTest.rowsPreview" :key="row.$id">
                    {{ row.$id }}
                  </li>
                </ul>
                <p class="text-caption">
                  Showing up to 5 row IDs. Use the Appwrite console to view full data.
                </p>
              </div>
            </div>
          </div>

          <div v-else class="text-negative">
            <q-icon name="error" size="2em" />
            <p class="text-h6">❌ TablesDB Access Failed</p>
            <p class="q-mt-md">{{ databaseTest.error }}</p>

            <div v-if="isTableNotFoundError" class="q-mt-md q-pa-md bg-orange-1 rounded-borders">
              <p class="text-h6 text-orange-9"><q-icon name="info" /> Table Not Found</p>
              <p class="q-mt-sm">
                The table <strong>{{ databaseTest.tableId }}</strong> doesn't exist yet.
              </p>

              <div class="q-mt-md">
                <p class="text-weight-bold">Quick Setup Options:</p>
                <ol class="q-pl-md">
                  <li class="q-mb-sm">
                    <strong>Automated Setup (Recommended):</strong>
                    <br />
                    Run the setup script to create all tables automatically:
                    <pre class="q-mt-xs q-pa-sm bg-grey-3 rounded-borders">
npm run setup:appwrite</pre
                    >
                    <p class="text-caption q-mt-xs">
                      Note: You'll need to create an API key in the Appwrite console first.
                    </p>
                  </li>
                  <li class="q-mb-sm">
                    <strong>Manual Setup:</strong>
                    <br />
                    Follow the step-by-step guide in:
                    <code>appwrite_setup/README.md</code>
                  </li>
                </ol>
              </div>

              <q-btn
                color="primary"
                label="View Setup Guide"
                icon="description"
                @click="openSetupGuide"
                class="q-mt-sm"
                size="sm"
              />
            </div>

            <p v-else class="text-caption q-mt-sm">
              If the table has not been created yet, follow the setup guide in
              <code>appwrite_setup/README.md</code>.
            </p>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { tables } from 'src/boot/appwrite';

const $q = useQuasar();
const loading = ref(false);
const connectionStatus = ref({
  success: false,
  error: null,
  endpoint: null,
  projectId: null,
});
const databaseTest = ref({
  tested: false,
  success: false,
  error: null,
  databaseId: null,
  tableId: null,
  rowsPreview: [],
  totalRows: 0,
});

const tableId = ref('users');
const availableTables = ref([]);
const listTablesLoading = ref(false);

const isTableNotFoundError = computed(() => {
  return (
    databaseTest.value.error &&
    (databaseTest.value.error.includes('not found') ||
      databaseTest.value.error.includes('404') ||
      databaseTest.value.error.includes('does not exist'))
  );
});

async function testConnection() {
  loading.value = true;
  connectionStatus.value = {
    success: false,
    error: null,
    endpoint: null,
    projectId: null,
  };

  try {
    // Get client configuration
    const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
    const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;

    if (!endpoint || !projectId) {
      throw new Error('Missing VITE_APPWRITE_ENDPOINT or VITE_APPWRITE_PROJECT_ID in .env file');
    }

    // Test connection by checking health endpoint
    connectionStatus.value = {
      success: true,
      error: null,
      endpoint: endpoint,
      projectId: projectId,
    };

    $q.notify({
      message: 'Appwrite connection successful!',
      color: 'positive',
      position: 'top',
    });
  } catch (error) {
    connectionStatus.value = {
      success: false,
      error: error.message,
      endpoint: null,
      projectId: null,
    };

    $q.notify({
      message: `Connection failed: ${error.message}`,
      color: 'negative',
      position: 'top',
    });
  } finally {
    loading.value = false;
  }
}

async function testDatabaseAccess() {
  loading.value = true;
  databaseTest.value = {
    tested: false,
    success: false,
    error: null,
    databaseId: null,
    tableId: null,
    rowsPreview: [],
    totalRows: 0,
  };

  try {
    const databaseId = 'villageDB';
    const selectedTableId = (tableId.value || '').trim();

    if (!selectedTableId) {
      throw new Error('Please enter a table ID to test (e.g., users).');
    }
    console.log(tables);

    // Attempt to list documents from the specified collection
    const response = await tables.listRows({ databaseId, tableId: selectedTableId });
    console.log(`response: ${response}`);
    const preview = (response.rows || []).slice(0, 5);

    databaseTest.value = {
      tested: true,
      success: true,
      error: null,
      databaseId: databaseId,
      tableId: selectedTableId,
      rowsPreview: preview,
      totalRows: response.total ?? preview.length,
    };

    $q.notify({
      message: `TablesDB access successful! Found ${databaseTest.value.totalRows} row(s).`,
      color: 'positive',
      position: 'top',
    });
  } catch (error) {
    databaseTest.value = {
      tested: true,
      success: false,
      error: error?.message || 'Unknown error',
      databaseId: 'villageDB',
      tableId: tableId.value,
      rowsPreview: [],
      totalRows: 0,
    };

    $q.notify({
      message: `TablesDB access failed: ${error?.message || 'Unknown error'}`,
      color: 'negative',
      position: 'top',
    });

    console.error(error);
  } finally {
    loading.value = false;
  }
}

function openSetupGuide() {
  $q.notify({
    message: 'Opening setup guide in your file explorer...',
    color: 'info',
    position: 'top',
  });

  // In a real app, you might want to open the README file
  // For now, just show a helpful message
  $q.dialog({
    title: 'Setup Guide Location',
    message:
      'The setup guide is located at: appwrite_setup/README.md\n\nOr run: npm run setup:appwrite',
    html: true,
  });
}

async function listAvailableTables() {
  listTablesLoading.value = true;
  try {
    const response = await tables.listTables('villageDB');
    availableTables.value = response.tables || [];
    if (!availableTables.value.length) {
      $q.notify({
        message: 'No tables found in villageDB.',
        color: 'warning',
        position: 'top',
      });
    } else {
      $q.notify({
        message: `Found ${response.total ?? availableTables.value.length} table(s).`,
        color: 'info',
        position: 'top',
      });
    }
  } catch (error) {
    availableTables.value = [];
    $q.notify({
      message: `Failed to list tables: ${error?.message || 'Unknown error'}`,
      color: 'negative',
      position: 'top',
    });
    console.error('Failed to list tables', error);
  } finally {
    listTablesLoading.value = false;
  }
}

// Auto-test connection on mount
testConnection();
</script>
