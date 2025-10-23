## Epic 4: School Management and Educational Accountability (10 stories)

**Expanded Goal:** Enable systematic tracking of learner performance and teacher effectiveness to support early intervention for struggling learners and meaningful teacher accountability.

**Value Delivered:** Head Teacher can identify struggling learners early, implement and track interventions, conduct meaningful teacher evaluations (peer reviews with consequences), and demonstrate measurable educational outcomes to donors.

---

### Story 4.1: School Module - Learner Enrollment from Residents
As a **Head Teacher**, I want to enroll learners by selecting from residents table, so that learner data is pre-populated and consistent.

**Acceptance Criteria:** 1. School navigation appears for Head Teacher, Teacher, Admin roles 2. "Enroll Learner" button: select resident (dropdown), auto-populated fields (name, DOB, gender, household - read-only), additional fields (grade level, enrollment date, parent/guardian, medical notes, emergency contact) 3. Validation: Resident can only be enrolled once 4. Learner detail page shows: personal info, grade, enrollment status, academic performance, test scores, attendance, interventions 5. Grade promotion, enrollment status changes, search/filter learners

**Prerequisites:** Epic 1 Story 1.6, 1.7

---

### Story 4.2: School Module - Test Score Recording (Bulk Entry by Grade)
As a **Teacher**, I want to record test scores for entire grade in spreadsheet format, so that I can efficiently track learner academic performance.

**Acceptance Criteria:** 1. "Record Scores for Class" button 2. Select grade, subject, assessment type, test date 3. Spreadsheet-style table: columns (Learner Name, Score - editable, Notes), Tab navigation, visual validation 4. "Save All Scores" button 5. Learner detail shows test scores (view only), filters, averages, performance trend chart 6. Class performance view with averages, distribution chart

**Prerequisites:** Story 4.1

---

### Story 4.3: School Module - Attendance Tracking (Bulk Entry by Grade)
As a **Teacher**, I want to record daily attendance for my class in spreadsheet format.

**Acceptance Criteria:** 1. "Record Attendance" page 2. Select date, grade 3. Spreadsheet table: columns (Learner Name, Status dropdown, Reason), "Mark All Present" button 4. Attendance history: calendar view, color-coded, statistics 5. Class attendance report, dashboard widget

**Prerequisites:** Story 4.1

---

### Story 4.4: School Module - At-Risk Learner Identification (90% Attendance Threshold)
As a **Head Teacher**, I want to automatically identify struggling learners.

**Acceptance Criteria:** 1. At-risk criteria: Academic (<50% any subject, <60% overall), Attendance (<90%) 2. Attendance intervention trigger: does NOT trigger until after first 5 school days, system tracks school year start date, alerts suppressed for first 5 days 3. "At-Risk Learners" dashboard widget and dedicated page 4. Automatic alerts to Head Teacher 5. At-risk status updates automatically

**Prerequisites:** Story 4.2, 4.3

---

### Story 4.5: School Module - Intervention Planning and Progress Tracking
As a **Head Teacher**, I want to create and track intervention plans for struggling learners.

**Acceptance Criteria:** 1. "Create Intervention Plan" button: learner, intervention type, assigned teacher, focus areas, frequency, schedule, success criteria 2. Intervention detail page: progress notes, status, outcome 3. Teacher dashboard: "My Interventions" widget 4. Intervention effectiveness tracking

**Prerequisites:** Story 4.4

---

### Story 4.6: School Module - Peer Review with Enhanced Categories and Checked Status
As a **Teacher**, I want to conduct peer evaluations with comprehensive rating categories.

**Acceptance Criteria:** 1. Peer Review form: 10 rating categories (1-5 scale): Teaching Effectiveness, Classroom Management, Collaboration, Innovation, Professionalism, Gender-Equitable Teaching, Student-Centered Teaching, Movement Around Classroom, Checking for Understanding, Monitoring Student Work 2. Overall rating (auto-calculated average of 10 categories) 3. Peer review process: Teacher submits (status: Submitted), Head Teacher dashboard shows "New Peer Reviews" widget, Head Teacher marks as "Checked", status flow: Draft → Submitted → Checked 4. Teacher can view peer review after Head Teacher marks as "Checked"

**Prerequisites:** Epic 1 Story 1.7

---

### Story 4.7: School Module - Self-Evaluation and Head Teacher Evaluation
As a **Teacher**, I want to complete self-evaluations. As a **Head Teacher**, I want to conduct formal evaluations of teachers.

**Acceptance Criteria:** 1. Self-Evaluation: same 10 rating categories, goals, challenges, support needed 2. Head Teacher Evaluation: same categories + Impact on Learner Outcomes, recommendation (Exceeds Expectations/Meets Expectations/Needs Improvement/Unsatisfactory) 3. Teacher profile shows combined evaluation summary: weighted (Peer 30%, Self 20%, Head Teacher 50%) 4. School dashboard widget: "Teacher Performance Overview"

**Prerequisites:** Story 4.6

---

### Story 4.8: School Module - Collaborative Teaching Practices Documentation
As a **Teacher**, I want to document collaborative teaching practices.

**Acceptance Criteria:** 1. Teaching practice entry form: title, subject, grade, practice type, description, materials, implementation steps, outcomes, effectiveness rating 2. Teaching practices library: list view, filters, search 3. Practice detail page: comments, "I've tried this" button, adoption tracking 4. Export to PDF

**Prerequisites:** Story 4.6

---

### Story 4.9: School Module - Progress Toward Long-Term Educational Goal (90% in 90th Percentile)
As a **Head Teacher**, I want to track progress toward the goal of 90% of learners in 90th percentile by year 10.

**Acceptance Criteria:** 1. School Settings: Long-Term Goal Configuration 2. Goal tracking calculations: current %, progress, years remaining, required improvement rate, projected outcome 3. "Educational Goals" dashboard page: goal progress chart, key metrics, breakdown by grade/subject 4. Quarterly goal review report 5. School dashboard widget: "Progress to Goal"

**Prerequisites:** Story 4.2

---

### Story 4.10: School Module - Learner Progress Reports and School Dashboard Completion
As a **Head Teacher**, I want to generate comprehensive learner progress reports.

**Acceptance Criteria:** 1. "Generate Progress Report" button: select term, report type, include sections 2. Generated report: header, academic performance, attendance, interventions, teacher comments, next steps 3. Export to PDF, bulk report generation 4. School dashboard completion: all widgets functional, loads within 2 seconds, mobile-responsive

**Prerequisites:** Story 4.2, 4.3, 4.5, 4.9

---

**Epic 4 Summary:** 10 stories, 20-30 hours. Deliverables: School management (learners from residents, bulk test scores/attendance), at-risk identification (90% attendance, 5-day delay), interventions, teacher evaluations (10 categories, checked status), teaching practices, progress tracking, learner reports.

---

## Epic 5: Village Calendar, Storage, and Optional Modules (10 stories)

**Expanded Goal:** Complete the integrated village management platform with shared calendar, cloud storage, and optional modules.

**Value Delivered:** Village has complete operational visibility with shared calendar, document management, and optional modules (Guests, Equipment, Vendors, Energy).

---

### Story 5.1: Village Calendar - Global Calendar with Category Filtering
As a **village user**, I want to see all village events in a single calendar with filtering.

**Acceptance Criteria:** 1. Calendar views: month, week, day, agenda 2. Events color-coded by category: School, Farm, Village, Guests, Equipment, Energy, Other 3. Filter UI with checkboxes, "Show All" / "Hide All" toggles 4. Event detail popup 5. Automatic event creation: Farm (expected harvests), Equipment (maintenance reminders) 6. Calendar dashboard widget: "Upcoming Events"

**Prerequisites:** Epic 1

---

### Story 5.2: Village Calendar - Role-Based Event Creation and Editing
As a **module manager**, I want to create and edit calendar events for my area.

**Acceptance Criteria:** 1. "Create Event" button 2. Event form: title, category, date, time, recurring, location, description, notify users 3. Role-based permissions: Farm Manager (Farm), Head Teacher (School), Village Head (Village), Events Coordinator (ALL), Admin (all) 4. Event editing/deletion with confirmation 5. Automatic events marked as "System Generated"

**Prerequisites:** Story 5.1

---

### Story 5.3: Cloud Storage - Role-Based Storage Quotas and Personal Folders
As a **village user**, I want personal cloud storage with a quota based on my role.

**Acceptance Criteria:** 1. Storage quotas: Admin (Unlimited), Village Head (20 GB), Deputy (10 GB), Finance/Farm/Head Teacher (5-10 GB), Crop Manager/Resident (2 GB), Learner (1 GB), Guest (500 MB) 2. Storage page: usage display, progress bar, warning if >90% 3. Personal folder: private, upload files, file operations (download, delete, rename, move), search 4. File upload: drag-and-drop, multiple files, progress indicator, quota validation

**Prerequisites:** Epic 1 Story 1.10

---

### Story 5.4: Cloud Storage - Shared Folders and Module-Based Access
As a **module manager**, I want shared storage folders for my team.

**Acceptance Criteria:** 1. Shared folders: Finance Shared, Farm Shared, School Shared, Village Documents, Admin Only 2. Shared folder permissions: read-only, read-write, role-based access 3. File sharing workflow: "Share to Folder" from personal folder 4. Storage settings (Admin): view all users' usage, adjust quotas, storage reports

**Prerequisites:** Story 5.3

---

### Story 5.5: Guests Management Module (Optional - No 90-Day Alert/Conversion)
As a **Village Head**, I want to track guests staying in the village.

**Acceptance Criteria:** 1. Guests module enabled via module settings 2. Guests list, "Add Guest" form: name, guest type, arrival/departure dates, housing, payment details, training details 3. Guest detail page: basic info, housing, payment history, training progress, duration, status 4. Guest payments integration with Finance 5. Calendar integration: arrival/departure events

**Prerequisites:** Epic 1 Story 1.6, Epic 2 Story 2.1

---

### Story 5.6: Equipment Management Module (Optional)
As a **Village Head**, I want to track village-wide equipment and assets.

**Acceptance Criteria:** 1. Equipment module enabled via settings 2. Equipment list, "Add Equipment" form: name, type, serial number, procurement details, location, assigned to, condition, maintenance schedule 3. Equipment detail page: maintenance history, "Record Maintenance" button 4. Maintenance reminders: alerts 7 days before, calendar events 5. Equipment dashboard widget 6. Finance integration: procurement and maintenance costs

**Prerequisites:** Epic 2 Story 2.2

---

### Story 5.7: Vendors/Suppliers Management Module (Optional)
As a **Finance Manager**, I want to track vendors and suppliers.

**Acceptance Criteria:** 1. Vendors module enabled via settings 2. Vendors list, "Add Vendor" form: name, vendor type (Supplier/Buyer/Both), business type, contact info, payment terms, quality rating 3. Vendor detail page: transaction history, performance metrics 4. Vendor selection integration: Farm sales buyer dropdown, Finance expenses vendor dropdown 5. Vendor transaction history automatically updated 6. Vendors dashboard widget

**Prerequisites:** Epic 2 Story 2.2, Epic 3 Story 3.8

---

### Story 5.8: Energy Management Module (Optional) - Solar Microgrid Monitoring
As a **Village Head**, I want to monitor solar microgrid production and consumption.

**Acceptance Criteria:** 1. Energy module enabled via settings 2. Energy dashboard: real-time metrics (production, consumption, battery status, net balance), visual indicators 3. 30-day rolling historical data: line chart, daily balance, peak times 4. Energy data collection: IoT integration or manual entry 5. Energy alerts: low battery, high consumption, system offline 6. Energy reports: daily/monthly summaries, export to PDF/Excel 7. Calendar integration: maintenance events

**Prerequisites:** Epic 1

---

### Story 5.9: Module Management and Configuration
As a **System Administrator**, I want to enable/disable optional modules.

**Acceptance Criteria:** 1. Admin menu: "Module Management" 2. Module Management page: Core Modules (always enabled), Optional Modules (can be enabled/disabled) 3. For each module: name, description, status, toggle switch, "Configure" button 4. Enabling module: navigation appears, widgets visible 5. Disabling module: confirmation, navigation hidden, data preserved 6. Module dependencies: warning if disabling module that others depend on 7. First-time setup wizard updated: "Select Modules" step

**Prerequisites:** All previous stories

---

### Story 5.10: System Completion - Final Dashboard Integration and Production Setup
As a **village user**, I want a polished, cohesive system with all modules integrated.

**Acceptance Criteria:** 1. Main dashboard completion: role-based widgets, all functional, loads within 2 seconds 2. Navigation polish: clean menu, active page highlighted, breadcrumbs, quick search 3. Notifications system: bell icon, count badge, notification panel, filter by type, mark as read 4. UX polish: consistent UI, loading states, error handling, success confirmations, accessibility 5. Performance optimization: <3 seconds on 3G, lazy loading, caching 6. Mobile responsiveness: all pages functional on mobile (320px+), touch-friendly (44px minimum) 7. Help and documentation: help icon, contextual tooltips, user guide, FAQ 8. System health monitoring (Admin): database size, storage usage, active users, error logs 9. Final testing checklist: all user journeys tested, RBAC enforced, data integrity validated, all integrations working, sample data mode functional 10. Production setup wizard: "Start Fresh with Real Data" option, guides through village config, first household, admin user, Village Head user, module selection, initial data entry, sets is_using_sample_data = false

**Prerequisites:** All previous stories in all epics

---

**Epic 5 Summary:** 10 stories, 20-30 hours. Deliverables: Village calendar, cloud storage with shared folders, Guests Management (no 90-day alert/conversion), Equipment Management, Vendors Management, Energy Management, module management system, polished production-ready system, production setup wizard.

---

## Story Guidelines Reference

**Story Format:**
```
**Story [EPIC.N]: [Story Title]**
As a [user type], I want [goal/desire], so that [benefit/value].

**Acceptance Criteria:**
1. [Specific testable criterion]
2. [Another specific criterion]

**Prerequisites:** [Dependencies on previous stories, if any]
```

**Story Requirements:**
- **Vertical slices** - Complete, testable functionality delivery
- **Sequential ordering** - Logical progression within epic
- **No forward dependencies** - Only depend on previous work
- **AI-agent sized** - Completable in 2-4 hour focused session
- **Value-focused** - Integrate technical enablers into value-delivering stories

---

**For implementation:** Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown.
