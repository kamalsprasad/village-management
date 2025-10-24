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
