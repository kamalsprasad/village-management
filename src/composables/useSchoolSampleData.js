import { ref } from 'vue';
import { tables } from 'src/boot/appwrite';
import { ID, Query } from 'appwrite';

/**
 * Composable for seeding school sample data (Epic 4)
 *
 * Generates realistic school data for the Katete Model Village:
 * - School Classes (one per grade level with learners)
 * - Learner Enrollments
 * - Teacher Grade Assignments
 * - Test Scores
 * - Class Timetables
 * - Attendance Records
 *
 * Called from useSampleData.js after residents are created.
 */
export function useSchoolSampleData() {
  const isSchoolSeeding = ref(false);
  const schoolSeedingProgress = ref(0);
  const schoolSeedingStatus = ref('');

  const seedSchoolData = async (residentIds = [], sampleResidents = []) => {
    isSchoolSeeding.value = true;
    schoolSeedingProgress.value = 0;
    schoolSeedingStatus.value = 'Preparing school data...';

    try {
      const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

      const findResidentId = (first, last) => {
        const idx = sampleResidents.findIndex(
          (r) => r.first_name === first && r.last_name === last,
        );
        return idx >= 0 ? residentIds[idx] : null;
      };

      // 1. Create classes (without teacher IDs first, then patch)
      schoolSeedingStatus.value = 'Creating school classes...';
      const classDefs = buildClasses();
      const createdClasses = await batchInsert(
        dbId,
        'school_classes',
        classDefs.map((d) => ({ data: d, _key: d.grade_level })),
      );
      const classByGrade = (grade) => createdClasses.find((c) => c._key === grade)?.$id;
      schoolSeedingProgress.value = 0.1;

      // 1b. Patch class_teacher_id by fetching resident IDs from live DB
      schoolSeedingStatus.value = 'Assigning class teachers...';
      await assignClassTeachers(dbId, createdClasses);
      schoolSeedingProgress.value = 0.15;

      // 2. Enroll learners
      schoolSeedingStatus.value = 'Enrolling learners...';
      const learnerDefs = buildLearners({ findResidentId, classByGrade });
      const createdLearners = await batchInsert(
        dbId,
        'learners',
        learnerDefs.map((d, i) => ({ data: d, _key: i })),
      );
      // const learnerByName = (first, last) => {
      //   const idx = sampleResidents.findIndex(
      //     (r) => r.first_name === first && r.last_name === last,
      //   );
      //   const def = learnerDefs[idx];
      //   if (!def) return null;
      //   return createdLearners.find((l) => l._key === idx)?.$id;
      // };
      schoolSeedingProgress.value = 0.3;

      // 3. Teacher assignments
      schoolSeedingStatus.value = 'Assigning teachers...';
      const assignmentDefs = buildTeacherAssignments({ findResidentId });
      await batchInsert(
        dbId,
        'teacher_assignments',
        assignmentDefs.map((d) => ({ data: d })),
      );
      schoolSeedingProgress.value = 0.4;

      // 4. Test scores
      schoolSeedingStatus.value = 'Recording test scores...';
      const gradeByClassId = {};
      createdClasses.forEach((c) => {
        if (c._key && c.$id) gradeByClassId[c.$id] = c._key;
      });
      const scoreDefs = buildTestScores({ createdLearners, gradeByClassId });
      await batchInsert(
        dbId,
        'test_scores',
        scoreDefs.map((d) => ({ data: d })),
      );
      schoolSeedingProgress.value = 0.65;

      // 5. Timetables (Monday-only for all classes to keep seeding fast)
      schoolSeedingStatus.value = 'Creating class timetables...';
      const timetableDefs = buildTimetables({ classByGrade, findResidentId });
      await batchInsert(
        dbId,
        'school_timetable',
        timetableDefs.map((d) => ({ data: d })),
      );
      schoolSeedingProgress.value = 0.85;

      // 6. Attendance records
      schoolSeedingStatus.value = 'Recording attendance...';
      const attendanceDefs = buildAttendance({ createdLearners, classByGrade });
      await batchInsert(
        dbId,
        'learner_attendance',
        attendanceDefs.map((d) => ({ data: d })),
      );

      schoolSeedingProgress.value = 1.0;
      schoolSeedingStatus.value = 'School data seeded successfully!';
      return { success: true };
    } catch (error) {
      console.error('Error seeding school data:', error);
      schoolSeedingStatus.value = 'Error loading school data';
      return { success: false, error: error.message };
    } finally {
      isSchoolSeeding.value = false;
    }
  };

  // ========================================================================
  // DATA BUILDERS
  // ========================================================================

  const teachersByGrade = [
    { grade: 'Early Childhood', first: 'Grace', last: 'Banda' },
    { grade: 'Grade 1', first: 'Rebecca', last: 'Tembo' },
    { grade: 'Grade 2', first: 'Esther', last: 'Zulu' },
    { grade: 'Grade 3', first: 'Ruth', last: 'Phiri' },
    { grade: 'Grade 4', first: 'Mary', last: 'Banda' },
    { grade: 'Grade 5', first: 'Elizabeth', last: 'Mwale' },
    { grade: 'Grade 6', first: 'Joseph', last: 'Banda' },
    { grade: 'Grade 7', first: 'Emmanuel', last: 'Phiri' },
    { grade: 'Grade 8', first: 'James', last: 'Mwale' },
    { grade: 'Grade 9', first: 'Michael', last: 'Tembo' },
    { grade: 'Grade 10', first: 'Daniel', last: 'Zulu' },
    { grade: 'Grade 11', first: 'Andrew', last: 'Mulenga' },
    { grade: 'Grade 12', first: 'Priscilla', last: 'Mulenga' },
  ];

  async function assignClassTeachers(dbId, createdClasses) {
    const resTableId = import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS;
    for (const { grade, first, last } of teachersByGrade) {
      const cls = createdClasses.find((c) => c._key === grade);
      if (!cls) continue;
      try {
        const res = await tables.listRows({
          databaseId: dbId,
          tableId: resTableId,
          queries: [
            Query.equal('first_name', first),
            Query.equal('last_name', last),
            Query.limit(1),
          ],
        });
        const resident = res.rows[0];
        if (!resident) continue;
        await tables.updateRow({
          databaseId: dbId,
          tableId: 'school_classes',
          rowId: cls.$id,
          data: { class_teacher_id: resident.$id },
        });
      } catch {
        // non-fatal — class will show without teacher
      }
    }
  }

  function buildClasses() {
    const createClass = (name, gradeLevel, notes) => ({
      name,
      grade_level: gradeLevel,
      academic_year: 2026,
      notes,
    });

    return [
      createClass('Early Childhood', 'Early Childhood', 'Pre-primary class'),
      createClass('Grade 1', 'Grade 1', 'Foundation literacy and numeracy'),
      createClass('Grade 2', 'Grade 2', 'Building reading fluency'),
      createClass('Grade 3', 'Grade 3', 'Transition to upper primary'),
      createClass('Grade 4', 'Grade 4', 'Upper primary'),
      createClass('Grade 5', 'Grade 5', 'Intermediate primary'),
      createClass('Grade 6', 'Grade 6', 'Preparing for junior secondary'),
      createClass('Grade 7', 'Grade 7', 'First year junior secondary'),
      createClass('Grade 8', 'Grade 8', 'Junior secondary'),
      createClass('Grade 9', 'Grade 9', 'Junior certificate year'),
      createClass('Grade 10', 'Grade 10', 'Senior secondary'),
      createClass('Grade 11', 'Grade 11', 'Senior secondary - IGCSE track'),
      createClass('Grade 12', 'Grade 12', 'Final year - school certificate'),
    ];
  }

  function buildLearners({ findResidentId, classByGrade }) {
    const enroll = (first, last, grade, baseDate = '2024-01-15', details = {}) => ({
      resident_id: findResidentId(first, last),
      class_id: classByGrade(grade),
      enrollment_date: new Date(`${baseDate}T12:00:00Z`).toISOString(),
      enrollment_status: details.status || 'Active',
      parent_guardian_name: details.guardian || '',
      parent_guardian_phone: details.guardianPhone || '',
      emergency_contact_name: details.emergencyContact || details.guardian || '',
      emergency_contact_phone: details.emergencyPhone || details.guardianPhone || '',
      medical_notes: details.medicalNotes || '',
      notes: details.notes || '',
    });

    return [
      enroll('Abel', 'Zulu', 'Early Childhood', '2026-01-12', {
        guardian: 'Daniel Zulu',
        guardianPhone: '+260976789012',
      }),
      enroll('Daniel', 'Phiri', 'Early Childhood', '2026-01-12', {
        guardian: 'Emmanuel Phiri',
        guardianPhone: '+260972345678',
      }),
      enroll('Faith', 'Tembo', 'Grade 1', '2025-01-13', { guardian: 'Michael Tembo' }),
      enroll('Joseph', 'Tembo', 'Grade 1', '2025-01-13', { guardian: 'Michael Tembo' }),
      enroll('Samuel', 'Zulu', 'Grade 2', '2024-01-15', { guardian: 'Daniel Zulu' }),
      enroll('Blessing', 'Zulu', 'Grade 3', '2023-01-16', { guardian: 'Daniel Zulu' }),
      enroll('Esther', 'Phiri', 'Grade 4', '2022-01-17', {
        guardian: 'Emmanuel Phiri',
        guardianPhone: '+260972345678',
      }),
      enroll('Lucy', 'Banda', 'Grade 5', '2021-01-18', {
        guardian: 'Joseph Banda',
        guardianPhone: '+260971234567',
      }),
      enroll('Catherine', 'Mwale', 'Grade 6', '2020-01-14', {
        guardian: 'James Mwale',
        guardianPhone: '+260973456789',
      }),
      enroll('Joshua', 'Phiri', 'Grade 7', '2019-01-15', {
        guardian: 'Emmanuel Phiri',
        guardianPhone: '+260972345678',
      }),
      enroll('Michael', 'Mwale', 'Grade 8', '2018-01-15', {
        guardian: 'James Mwale',
        guardianPhone: '+260973456789',
      }),
      enroll('Thomas', 'Banda', 'Grade 9', '2017-01-16', {
        guardian: 'Joseph Banda',
        guardianPhone: '+260971234567',
      }),
      enroll('Paul', 'Mwale', 'Grade 10', '2016-01-18', {
        guardian: 'James Mwale',
        guardianPhone: '+260973456789',
      }),
      enroll('Sophia', 'Banda', 'Grade 11', '2015-01-19', {
        guardian: 'Joseph Banda',
        guardianPhone: '+260971234567',
      }),
      enroll('Sarah', 'Phiri', 'Grade 11', '2015-01-19', {
        guardian: 'Emmanuel Phiri',
        guardianPhone: '+260972345678',
      }),
      enroll('Margaret', 'Mwale', 'Grade 12', '2014-01-20', {
        guardian: 'James Mwale',
        guardianPhone: '+260973456789',
      }),
      enroll('Peter', 'Banda', 'Grade 12', '2014-01-20', {
        guardian: 'Joseph Banda',
        guardianPhone: '+260971234567',
      }),
    ].filter((l) => l.resident_id && l.class_id);
  }

  function buildTeacherAssignments({ findResidentId }) {
    const assign = (first, last, ...entries) =>
      entries.map((entry) => {
        const isString = typeof entry === 'string';
        const grade = isString ? entry : entry.grade;
        const subjects = isString ? undefined : entry.subjects;
        return {
          teacher_id: findResidentId(first, last),
          grade_level: grade,
          subjects: subjects || undefined,
          notes: '',
        };
      });

    return [
      ...assign('Grace', 'Banda', 'Early Childhood'),
      ...assign('Rebecca', 'Tembo', 'Grade 1'),
      ...assign('Esther', 'Zulu', 'Grade 2'),
      ...assign('Ruth', 'Phiri', 'Grade 3'),
      ...assign('Mary', 'Banda', 'Grade 4'),
      ...assign('Elizabeth', 'Mwale', 'Grade 5'),
      ...assign('Joseph', 'Banda', { grade: 'Grade 6', subjects: ['Mathematics', 'English'] }),
      ...assign('Emmanuel', 'Phiri', {
        grade: 'Grade 7',
        subjects: ['Integrated Science', 'Agriculture Science'],
      }),
      ...assign('James', 'Mwale', {
        grade: 'Grade 8',
        subjects: ['Mathematics', 'Business Studies'],
      }),
      ...assign('Michael', 'Tembo', { grade: 'Grade 9', subjects: ['English', 'Civic Education'] }),
      ...assign('Daniel', 'Zulu', {
        grade: 'Grade 10',
        subjects: ['Biology', 'Agriculture Science'],
      }),
      ...assign('Andrew', 'Mulenga', { grade: 'Grade 11', subjects: ['Physics', 'Geography'] }),
      ...assign('Priscilla', 'Mulenga', { grade: 'Grade 12', subjects: ['Chemistry', 'Biology'] }),
    ].filter((a) => a.teacher_id);
  }

  function buildTestScores({ createdLearners, gradeByClassId }) {
    const scores = [];

    const subjectsByGrade = {
      'Early Childhood': ['Local Language', 'Mathematics', 'Creative and Technology Studies'],
      'Grade 1': ['Mathematics', 'English', 'Local Language'],
      'Grade 2': ['Mathematics', 'English', 'Local Language'],
      'Grade 3': ['Mathematics', 'English', 'Integrated Science'],
      'Grade 4': ['Mathematics', 'English', 'Integrated Science'],
      'Grade 5': ['Mathematics', 'English', 'Integrated Science'],
      'Grade 6': ['Mathematics', 'English', 'Social Studies'],
      'Grade 7': ['Mathematics', 'English', 'Integrated Science'],
      'Grade 8': ['Mathematics', 'English', 'Integrated Science'],
      'Grade 9': ['Mathematics', 'English', 'Biology'],
      'Grade 10': ['Mathematics', 'English', 'Biology'],
      'Grade 11': ['Mathematics', 'English', 'Physics'],
      'Grade 12': ['Mathematics', 'English', 'Chemistry'],
    };

    const assessments = [
      { type: 'Mid-Term Exam', date: '2025-08-15', term: 'Term 2', year: 2025 },
      { type: 'End-of-Term Exam', date: '2025-10-31', term: 'Term 3', year: 2025 },
      { type: 'Mid-Term Exam', date: '2026-02-14', term: 'Term 1', year: 2026 },
      { type: 'End-of-Term Exam', date: '2026-03-28', term: 'Term 1', year: 2026 },
      { type: 'Mid-Term Exam', date: '2026-05-16', term: 'Term 2', year: 2026 },
    ];

    const abilities = [70, 65, 78, 82, 68, 62, 72, 65, 58, 70, 60, 55, 48, 80, 85, 90];

    createdLearners.forEach((learner, idx) => {
      const classId =
        typeof learner.class_id === 'object' ? learner.class_id?.$id : learner.class_id;
      const grade = gradeByClassId[classId] || 'Grade 1';
      const subjects = subjectsByGrade[grade] || ['Mathematics', 'English', 'Local Language'];
      const base = abilities[idx] ?? 65;

      subjects.forEach((subject) => {
        assessments.forEach((a) => {
          const variation = Math.round((Math.random() - 0.5) * 24);
          const score = Math.max(0, Math.min(100, base + variation));
          scores.push({
            learner_id: learner.$id,
            class_id: classId,
            subject,
            assessment_type: a.type,
            term: a.term,
            academic_year: a.year,
            assessment_date: new Date(`${a.date}T12:00:00Z`).toISOString(),
            score_value: score,
            max_score: 100,
            notes: '',
          });
        });
      });
    });

    return scores;
  }

  function buildTimetables({ classByGrade, findResidentId }) {
    const entries = [];
    const grades = [
      'Early Childhood',
      'Grade 1',
      'Grade 2',
      'Grade 3',
      'Grade 4',
      'Grade 5',
      'Grade 6',
      'Grade 7',
      'Grade 8',
      'Grade 9',
      'Grade 10',
      'Grade 11',
      'Grade 12',
    ];

    const periods = [
      { num: 1, start: '08:00', end: '08:45', subject: 'Mathematics' },
      { num: 2, start: '08:45', end: '09:30', subject: 'English' },
      { num: 3, start: '10:00', end: '10:45', subject: 'Integrated Science' },
      { num: 4, start: '10:45', end: '11:30', subject: 'Social Studies' },
      { num: 5, start: '12:00', end: '12:45', subject: 'Local Language' },
      { num: 6, start: '12:45', end: '13:30', subject: 'Creative and Technology Studies' },
    ];

    const teacherByGrade = {
      'Early Childhood': findResidentId('Grace', 'Banda'),
      'Grade 1': findResidentId('Rebecca', 'Tembo'),
      'Grade 2': findResidentId('Esther', 'Zulu'),
      'Grade 3': findResidentId('Ruth', 'Phiri'),
      'Grade 4': findResidentId('Mary', 'Banda'),
      'Grade 5': findResidentId('Elizabeth', 'Mwale'),
      'Grade 6': findResidentId('Joseph', 'Banda'),
      'Grade 7': findResidentId('Emmanuel', 'Phiri'),
      'Grade 8': findResidentId('James', 'Mwale'),
      'Grade 9': findResidentId('Michael', 'Tembo'),
      'Grade 10': findResidentId('Daniel', 'Zulu'),
      'Grade 11': findResidentId('Andrew', 'Mulenga'),
      'Grade 12': findResidentId('Priscilla', 'Mulenga'),
    };

    grades.forEach((grade) => {
      const classId = classByGrade(grade);
      if (!classId) return;
      periods.forEach((p) => {
        entries.push({
          class_id: classId,
          day_of_week: 'Monday',
          period_number: p.num,
          start_time: p.start,
          end_time: p.end,
          subject: p.subject,
          teacher_id: teacherByGrade[grade] || null,
          notes: '',
        });
      });
    });

    return entries;
  }

  function buildAttendance({ createdLearners }) {
    const records = [];
    const statuses = ['Present', 'Absent', 'Late'];
    const today = new Date();

    createdLearners.forEach((learner) => {
      const classId =
        typeof learner.class_id === 'object' ? learner.class_id?.$id : learner.class_id;
      if (!classId) return;

      for (let i = 0; i < 10; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i - 1);
        if (d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends
        const dateStr = d.toISOString().split('T')[0];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        records.push({
          learner_id: learner.$id,
          class_id: classId,
          attendance_date: new Date(`${dateStr}T00:00:00Z`).toISOString(),
          status,
          absence_reason: status === 'Absent' ? 'Sick' : '',
          notes: '',
        });
      }
    });

    return records;
  }

  // ========================================================================
  // BATCH INSERT HELPER (matches useFinanceSampleData.js pattern)
  // ========================================================================

  const batchInsert = async (dbId, tableId, items, batchSize = 5) => {
    const results = [];
    const MAX_RETRY_DELAY_MS = 30000;
    const PER_ROW_DELAY_MS = 120;

    const createRowWithRetry = async (item, idx, retries = 6, delay = 2000) => {
      try {
        return await tables.createRow({
          databaseId: dbId,
          tableId,
          rowId: ID.unique(),
          data: item.data || item,
        });
      } catch (err) {
        if ((err.code === 429 || err.type === 'general_rate_limit_exceeded') && retries > 0) {
          const waitMs = Math.min(delay, MAX_RETRY_DELAY_MS);
          console.warn(
            `Rate limit hit for ${tableId} item ${idx}, retrying in ${waitMs}ms (${retries} retries left)...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          return createRowWithRetry(
            item,
            idx,
            retries - 1,
            Math.min(delay * 2, MAX_RETRY_DELAY_MS),
          );
        }
        console.error(`Error inserting into ${tableId}, batch item ${idx}:`, item.data || item);
        throw err;
      }
    };

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = [];
      for (let j = 0; j < batch.length; j++) {
        const res = await createRowWithRetry(batch[j], i + j);
        batchResults.push(res);
        if (j < batch.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, PER_ROW_DELAY_MS));
        }
      }
      batchResults.forEach((res, idx) => {
        if (batch[idx]._key !== undefined) {
          res._key = batch[idx]._key;
        }
      });
      results.push(...batchResults);
      if (i + batchSize < items.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    return results;
  };

  return {
    seedSchoolData,
    isSchoolSeeding,
    schoolSeedingProgress,
    schoolSeedingStatus,
  };
}
