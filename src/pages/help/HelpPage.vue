<template>
  <q-page padding>
    <div class="q-pa-md">
      <h4 class="q-my-none">Help &amp; Documentation</h4>

      <q-tabs v-model="activeTab" class="q-mt-md" dense align="left">
        <q-tab name="guide" label="User Guide" />
        <q-tab name="faq" label="FAQ" />
      </q-tabs>

      <q-tab-panels v-model="activeTab" animated class="q-mt-md">
        <!-- User Guide -->
        <q-tab-panel name="guide">
          <!-- Getting Started -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-h6 q-mb-md">Getting Started</div>
              <p>
                <strong>First Login &amp; Setup:</strong>
                An administrator runs the Start Fresh wizard on first login to configure the village
                profile, admin account, and initial modules. See the Administration section below
                for details on managing users, roles, and modules.
              </p>
              <p>
                <strong>Sample Data Mode:</strong>
                If the banner at the top of the app says you are using sample data, all records are
                placeholders. A System Administrator can switch to real data via
                <em>Start Fresh - Wipe All Data</em>
                in the sample-data banner, which permanently deletes the sample records.
              </p>
              <p>
                <strong>Navigation:</strong>
                Use the left drawer to reach each module, the search box in the header to jump
                directly to a resident, transaction, plot, learner, vendor, or event, and the
                breadcrumb trail at the top of detail pages to go back up a level.
              </p>
            </q-card-section>
          </q-card>

          <q-list bordered separator>
            <!-- Navigation -->
            <q-expansion-item icon="menu" label="Navigation" header-class="text-weight-medium">
              <q-card flat>
                <q-card-section>
                  <p>
                    The left drawer groups related pages into sections such as Community, Finance,
                    Agriculture, School, Services, and Administration. Click a section header to
                    expand it and see its pages.
                  </p>
                  <p>
                    At the top of the screen, the quick-search box lets you jump directly to records
                    across modules. The bell icon shows notifications relevant to your roles. Your
                    avatar menu contains profile, settings, and logout options.
                  </p>
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Residents & Households -->
            <q-expansion-item
              icon="people"
              label="Residents & Households"
              header-class="text-weight-medium"
            >
              <q-card flat>
                <q-card-section>
                  <p>
                    Add a household from the Households page, then add residents to it from either
                    the household detail page or the Residents page. Each resident links to one
                    household.
                  </p>
                  <ol>
                    <li>Open Community &gt; Households and click Add Household.</li>
                    <li>Fill in the household name, type, address, and other details.</li>
                    <li>
                      Open the new household and click Add Resident, or go to Residents &gt; Add
                      Resident.
                    </li>
                    <li>Enter the resident's name, gender, date of birth, and contact details.</li>
                  </ol>
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Finance -->
            <q-expansion-item
              icon="account_balance"
              label="Finance"
              header-class="text-weight-medium"
            >
              <q-card flat>
                <q-card-section>
                  <p>
                    Use the Record Income and Record Expense buttons on Finance &gt; Transactions to
                    log a transaction. Reports shows summaries by category. Inventory and Lending
                    are reached from the Finance section of the drawer when those modules are
                    enabled.
                  </p>
                  <ol>
                    <li>Go to Finance &gt; Transactions.</li>
                    <li>Click Record Income or Record Expense.</li>
                    <li>Enter the amount, category, date, and optional description.</li>
                    <li>
                      Save the transaction. It will appear in the list and reports immediately.
                    </li>
                  </ol>
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Inventory -->
            <q-expansion-item
              icon="inventory_2"
              label="Inventory"
              header-class="text-weight-medium"
            >
              <q-card flat>
                <q-card-section>
                  <p>
                    Inventory items can be added manually or are auto-created when a Finance expense
                    is tagged as an inventory purchase. Track stock levels, set low-stock alerts,
                    and adjust quantities as items are used or received.
                  </p>
                  <ol>
                    <li>Go to Finance &gt; Inventory.</li>
                    <li>
                      Click Add Inventory Item and enter the item name, type, and initial stock.
                    </li>
                    <li>Use the Adjust action to record stock changes.</li>
                  </ol>
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Farm -->
            <q-expansion-item icon="agriculture" label="Farm" header-class="text-weight-medium">
              <q-card flat>
                <q-card-section v-if="!isClient || settingsStore.modulesEnabled.includes('farm')">
                  <p>
                    Plots, crops, plantings, harvests, and sales are managed under the Agriculture
                    section. The Farm Alerts widget on the dashboard surfaces upcoming or overdue
                    harvests, low inventory, underperforming yield, and crop-failure alerts. You
                    will also receive a notification if you hold a farm role.
                  </p>
                  <ol>
                    <li>Open Agriculture &gt; Farm Plots and register each plot.</li>
                    <li>Open a plot and create plantings with expected harvest dates.</li>
                    <li>Record harvests from the planting detail page.</li>
                    <li>Log farm sales under Agriculture &gt; Farm Sales.</li>
                  </ol>
                </q-card-section>
                <q-card-section v-else>
                  <q-banner class="bg-warning text-dark" rounded>
                    This module is not enabled. Ask a System Administrator to enable it in Module
                    Management.
                  </q-banner>
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- School -->
            <q-expansion-item icon="school" label="School" header-class="text-weight-medium">
              <q-card flat>
                <q-card-section v-if="!isClient || settingsStore.modulesEnabled.includes('school')">
                  <p>
                    Manage learners, attendance, test scores, calendars, bell schedules, and
                    timetables under the School section. At-Risk Learners flags students below the
                    attendance or academic thresholds so staff can log an intervention. You will
                    receive a notification if you hold a school role.
                  </p>
                  <ol>
                    <li>Open School &gt; Learners and enroll learners.</li>
                    <li>Create classes and assign learners.</li>
                    <li>Record attendance and test scores from learner or class detail pages.</li>
                    <li>Review flagged learners in At-Risk Learners and log interventions.</li>
                  </ol>
                </q-card-section>
                <q-card-section v-else>
                  <q-banner class="bg-warning text-dark" rounded>
                    This module is not enabled. Ask a System Administrator to enable it in Module
                    Management.
                  </q-banner>
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Vendors -->
            <q-expansion-item icon="storefront" label="Vendors" header-class="text-weight-medium">
              <q-card flat>
                <q-card-section
                  v-if="!isClient || settingsStore.modulesEnabled.includes('vendors')"
                >
                  <p>
                    Vendors track suppliers and buyers. Once added, a vendor appears in the Farm
                    sales buyer dropdown and the Finance expense vendor dropdown. You can also
                    review each vendor's transaction history.
                  </p>
                  <ol>
                    <li>Go to Vendors &gt; Vendors.</li>
                    <li>Click Add Vendor and enter the name, type, and contact details.</li>
                    <li>Use the vendor in Farm sales or Finance expenses.</li>
                  </ol>
                </q-card-section>
                <q-card-section v-else>
                  <q-banner class="bg-warning text-dark" rounded>
                    This module is not enabled. Ask a System Administrator to enable it in Module
                    Management.
                  </q-banner>
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Calendar -->
            <q-expansion-item icon="event" label="Calendar" header-class="text-weight-medium">
              <q-card flat>
                <q-card-section>
                  <p>
                    The village calendar shows all events color-coded by category. Only users with
                    the matching role (for example Farm Manager for Farm events) or the Events
                    Coordinator or System Administrator role can create or edit events.
                  </p>
                  <ol>
                    <li>Open Services &gt; Calendar.</li>
                    <li>Switch between month, week, day, and agenda views.</li>
                    <li>Click a date to add an event if you have permission.</li>
                    <li>Use the category filters to show or hide event types.</li>
                  </ol>
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Storage -->
            <q-expansion-item icon="folder" label="Storage" header-class="text-weight-medium">
              <q-card flat>
                <q-card-section>
                  <p>
                    My Files holds your personal, private uploads. Shared Folders (Finance, Farm,
                    School, Village Documents, Admin Only) are shared with everyone who has
                    read/write access to that module. Your quota and usage are shown in the user
                    menu.
                  </p>
                  <ol>
                    <li>Open Services &gt; Storage.</li>
                    <li>Upload files to My Files or a shared folder.</li>
                    <li>
                      Admins can review usage and adjust quotas in Administration &gt; Storage
                      Settings.
                    </li>
                  </ol>
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Administration -->
            <q-expansion-item
              icon="admin_panel_settings"
              label="Administration"
              header-class="text-weight-medium"
            >
              <q-card flat>
                <q-card-section>
                  <p>
                    System Administrators manage user accounts and roles under User Management and
                    Roles &amp; Permissions, enable or disable optional modules under Module
                    Management, and configure village-wide settings such as currency and timezone
                    under Village Settings.
                  </p>
                  <ol>
                    <li>Open Administration &gt; User Management to add or edit users.</li>
                    <li>Open Roles &amp; Permissions to review role permissions.</li>
                    <li>Use Module Management to turn Farm, School, and Vendors on or off.</li>
                    <li>Update village-wide defaults in Village Settings.</li>
                  </ol>
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Notifications -->
            <q-expansion-item
              icon="notifications"
              label="Notifications"
              header-class="text-weight-medium"
            >
              <q-card flat>
                <q-card-section>
                  <p>
                    The bell icon in the header shows unread notifications for events relevant to
                    your role, such as at-risk learners, farm alerts, and new vendors. Click a
                    notification to jump to the related page, and use Mark all read to clear the
                    badge.
                  </p>
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </q-list>
        </q-tab-panel>

        <!-- FAQ -->
        <q-tab-panel name="faq">
          <q-list bordered separator>
            <q-item-label header>General</q-item-label>
            <q-expansion-item label="What is this system?">
              <q-card flat>
                <q-card-section>
                  A village management platform for tracking residents, households, finances,
                  inventory, farm activity, school records, vendors, the shared calendar, and file
                  storage.
                </q-card-section>
              </q-card>
            </q-expansion-item>
            <q-expansion-item label="How do I log in?">
              <q-card flat>
                <q-card-section>
                  Enter the email and password given to you by your System Administrator on the
                  login page. Accounts are created by administrators. There is no self-service
                  signup.
                </q-card-section>
              </q-card>
            </q-expansion-item>
            <q-expansion-item label="How do I change my password?">
              <q-card flat>
                <q-card-section>
                  Open your profile (click your avatar in the header, then My Profile) and use the
                  Change Password option. You will need to enter your current password.
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <q-item-label header>Data Entry</q-item-label>
            <q-expansion-item label="How do I add a resident?">
              <q-card flat>
                <q-card-section>
                  Go to Residents (or a household's detail page) and click Add Resident.
                </q-card-section>
              </q-card>
            </q-expansion-item>
            <q-expansion-item label="How do I record a harvest?">
              <q-card flat>
                <q-card-section>
                  Open the planting's detail page under Farm &gt; Plots and use the harvest entry
                  form.
                </q-card-section>
              </q-card>
            </q-expansion-item>
            <q-expansion-item label="How do I enter a test score?">
              <q-card flat>
                <q-card-section>
                  Open the learner's or class's detail page under School and use the test score
                  entry form.
                </q-card-section>
              </q-card>
            </q-expansion-item>
            <q-expansion-item label="How do I create a finance transaction?">
              <q-card flat>
                <q-card-section>
                  Go to Finance &gt; Transactions and click Record Income or Record Expense.
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <q-item-label header>Roles &amp; Permissions</q-item-label>
            <q-expansion-item label="What can each role do?">
              <q-card flat>
                <q-card-section>
                  Open Administration &gt; Roles &amp; Permissions to see every role and the exact
                  permissions it grants.
                </q-card-section>
              </q-card>
            </q-expansion-item>
            <q-expansion-item label="Why don't I see a module in the menu?">
              <q-card flat>
                <q-card-section>
                  Either your role lacks permission for it, or a System Administrator has disabled
                  that optional module (Farm, School, or Vendors) in Module Management.
                </q-card-section>
              </q-card>
            </q-expansion-item>
            <q-expansion-item label="How are roles assigned to me?">
              <q-card flat>
                <q-card-section>
                  A System Administrator assigns one or more roles to your account from User
                  Management &gt; Manage Roles. Your permissions are the union of all your assigned
                  roles.
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <q-item-label header>Troubleshooting</q-item-label>
            <q-expansion-item label="A page won't load.">
              <q-card flat>
                <q-card-section>
                  Refresh the page. If it still won't load, confirm you have permission to view it.
                  You may see an Unauthorized page instead.
                </q-card-section>
              </q-card>
            </q-expansion-item>
            <q-expansion-item label="My changes aren't saving.">
              <q-card flat>
                <q-card-section>
                  Check for a red error notification at the top of the screen. It usually explains
                  what is missing. Confirm your internet connection is active.
                </q-card-section>
              </q-card>
            </q-expansion-item>
            <q-expansion-item label="Search isn't finding what I expect.">
              <q-card flat>
                <q-card-section>
                  Quick search only returns results from modules you have permission to view, and
                  requires at least 2 characters.
                </q-card-section>
              </q-card>
            </q-expansion-item>
            <q-expansion-item label="I'm not seeing notifications.">
              <q-card flat>
                <q-card-section>
                  Notifications are role-targeted. You will only see ones relevant to your assigned
                  roles, such as at-risk learners for school roles and farm alerts for farm roles.
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <q-item-label header>Sample Data vs Real Data</q-item-label>
            <q-expansion-item label="How do I switch from sample data to real data?">
              <q-card flat>
                <q-card-section>
                  A System Administrator clicks Start Fresh - Wipe All Data on the sample-data
                  banner and completes the 5-step setup wizard.
                </q-card-section>
              </q-card>
            </q-expansion-item>
            <q-expansion-item label="What does Start Fresh - Wipe All Data do?">
              <q-card flat>
                <q-card-section>
                  It permanently deletes all sample records and lets you configure your village
                  profile, admin account, village head, modules, and first household from scratch.
                </q-card-section>
              </q-card>
            </q-expansion-item>
            <q-expansion-item label="Is it safe to edit sample data?">
              <q-card flat>
                <q-card-section>
                  Yes. Sample data is placeholder content meant for exploration. Nothing you do to
                  it affects real village records, since real records only exist after Start Fresh
                  is run.
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </q-list>
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useSettingsStore } from 'src/stores/settings-store';

const route = useRoute();
const settingsStore = useSettingsStore();

const isClient = ref(false);
const activeTab = ref(route.query.tab === 'faq' ? 'faq' : 'guide');

onMounted(() => {
  isClient.value = true;
});
</script>
