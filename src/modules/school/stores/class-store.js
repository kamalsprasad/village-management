/**
 * Class Store (Story 4.2 Reorganization)
 *
 * Pinia store for school classes, schedules/timetables, and learner attendance.
 * Handles the school_classes, school_timetable, and learner_attendance tables.
 * Implements Appwrite storage with robust local fallback and seed data for immediate runnability.
 */

import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { useLearnerStore } from './learner-store';
import { ID, Query } from 'appwrite';
import { computeScorePercent } from '../utils/school-utils';

// Seed data helper for local fallback mode
const LOCAL_STORAGE_KEYS = {
  CLASSES: 'school_classes_fallback',
  TIMETABLE: 'school_timetable_fallback',
  ATTENDANCE: 'school_attendance_fallback',
};

export const useClassStore = defineStore('class', {
  state: () => ({
    classes: [],
    timetable: [],
    attendance: [],
    classesLoaded: false,
    timetableLoaded: false,
    attendanceLoaded: false,
    isLoading: false,
  }),

  getters: {
    /**
     * Get class size of active learners in a class ID
     */
    getClassSize: () => (classId) => {
      const learnerStore = useLearnerStore();
      return learnerStore.learners.filter(
        (l) => l.class_id === classId && l.enrollment_status === 'Active',
      ).length;
    },

    /**
     * Get list of active learners in a class, sorted alphabetically
     */
    getActiveLearnersByClass: () => (classId) => {
      const learnerStore = useLearnerStore();
      return learnerStore.learners
        .filter((l) => l.class_id === classId && l.enrollment_status === 'Active')
        .sort((a, b) => {
          const nameA = learnerStore.getLearnerName(a).toLowerCase();
          const nameB = learnerStore.getLearnerName(b).toLowerCase();
          return nameA.localeCompare(nameB);
        });
    },

    /**
     * Group flat test scores into unique past assessments.
     * Modified to filter for a specific class.
     */
    getClassAssessments: () => (classId) => {
      const schoolStore = useSchoolStore();
      const learnerStore = useLearnerStore();
      const groups = {};

      schoolStore.testScores.forEach((score) => {
        // Enforce class match
        const learner = learnerStore.learners.find((l) => l.$id === score.learner_id_normalized);
        if (!learner || learner.class_id !== classId) return;

        const dateStr = score.assessment_date ? score.assessment_date.slice(0, 10) : 'Unknown';
        const key = `${dateStr}_${score.subject}_${score.assessment_type}_${score.term}_${score.academic_year}`;

        if (!groups[key]) {
          groups[key] = {
            id: key,
            assessment_date: score.assessment_date,
            class_id: classId,
            subject: score.subject,
            assessment_type: score.assessment_type,
            term: score.term,
            academic_year: score.academic_year,
            max_score: score.max_score,
            scores: [],
          };
        }
        groups[key].scores.push(score);
      });

      return Object.values(groups)
        .map((group) => {
          const totalLearners = group.scores.length;
          const totalPercent = group.scores.reduce((acc, score) => {
            return acc + computeScorePercent(score.score_value, score.max_score);
          }, 0);

          return {
            ...group,
            learner_count: totalLearners,
            class_average: totalLearners > 0 ? Math.round(totalPercent / totalLearners) : 0,
          };
        })
        .sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date));
    },

    /**
     * Get class stats for a specific past assessment
     */
    getAssessmentClassStats: () => (assessmentScores) => {
      if (!assessmentScores || assessmentScores.length === 0) {
        return {
          total_assessed: 0,
          average_percent: 0,
          highest_percent: 0,
          lowest_percent: 0,
          highest_score: 0,
          lowest_score: 0,
          max_score: 100,
        };
      }

      const maxScore = assessmentScores[0].max_score;
      const totalAssessed = assessmentScores.length;

      let highestScore = -Infinity;
      let lowestScore = Infinity;
      let totalPercent = 0;

      assessmentScores.forEach((s) => {
        const val = s.score_value;
        if (val > highestScore) highestScore = val;
        if (val < lowestScore) lowestScore = val;
        totalPercent += computeScorePercent(val, maxScore);
      });

      return {
        total_assessed: totalAssessed,
        average_percent: Math.round(totalPercent / totalAssessed),
        highest_percent: computeScorePercent(highestScore, maxScore),
        lowest_percent: computeScorePercent(lowestScore, maxScore),
        highest_score: highestScore,
        lowest_score: lowestScore,
        max_score: maxScore,
      };
    },

    /**
     * Get score distribution ranges (0-9, 10-19... 90-100)
     */
    getAssessmentDistribution: () => (assessmentScores) => {
      const distribution = Array(10).fill(0);

      if (!assessmentScores || assessmentScores.length === 0) return distribution;

      const maxScore = assessmentScores[0].max_score;

      assessmentScores.forEach((s) => {
        const percent = computeScorePercent(s.score_value, maxScore);
        let index = Math.floor(percent / 10);
        if (index > 9) index = 9;
        distribution[index] += 1;
      });

      return distribution;
    },
  },

  actions: {
    /**
     * Load dynamic school classes with offline/local seeding support
     */
    async fetchClasses(force = false) {
      if (this.classesLoaded && !force) {
        return { success: true, data: this.classes };
      }
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'school_classes',
          queries: [Query.limit(100)],
        });

        // Enrich classes with teacher name details dynamically
        this.classes = response.rows.map((row) => this.enrichClass(row));
        this.classesLoaded = true;
        this.saveToLocalCache(LOCAL_STORAGE_KEYS.CLASSES, this.classes);
        this.autoAssignLearnersToClasses();
        return { success: true, data: this.classes };
      } catch (error) {
        console.warn(
          'Appwrite school_classes read failed, falling back to seed/local cache:',
          error,
        );
        // Fallback to local storage or create seeded classes
        const cached = localStorage.getItem(LOCAL_STORAGE_KEYS.CLASSES);
        if (cached) {
          this.classes = JSON.parse(cached);
        } else {
          // Initialize robust seed data
          this.classes = [
            {
              $id: 'class_g1',
              name: 'Grade 1',
              grade_level: 'Grade 1',
              academic_year: 2026,
              class_teacher_id: null,
              teacher_name: 'Grace Mwale',
              notes: 'General Primary Class',
            },
            {
              $id: 'class_g2',
              name: 'Grade 2',
              grade_level: 'Grade 2',
              academic_year: 2026,
              class_teacher_id: null,
              teacher_name: 'Peter Banda',
              notes: 'General Primary Class',
            },
            {
              $id: 'class_g3_a',
              name: 'Grade 3A',
              grade_level: 'Grade 3',
              academic_year: 2026,
              class_teacher_id: null,
              teacher_name: 'Grace Mwale',
              notes: 'Section A - High capacity',
            },
            {
              $id: 'class_g3_b',
              name: 'Grade 3B',
              grade_level: 'Grade 3',
              academic_year: 2026,
              class_teacher_id: null,
              teacher_name: 'Peter Banda',
              notes: 'Section B - Smaller group support',
            },
            {
              $id: 'class_g5',
              name: 'Grade 5',
              grade_level: 'Grade 5',
              academic_year: 2026,
              class_teacher_id: null,
              teacher_name: 'Peter Banda',
              notes: 'Intermediate Grade',
            },
          ];
          this.saveToLocalCache(LOCAL_STORAGE_KEYS.CLASSES, this.classes);
        }
        this.classesLoaded = true;
        this.autoAssignLearnersToClasses();
        return { success: true, data: this.classes };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Distribute learners to classes for fallback support if class_id is unassigned
     */
    async autoAssignLearnersToClasses() {
      const learnerStore = useLearnerStore();
      await learnerStore.fetchLearners();

      learnerStore.learners.forEach((learner) => {
        if (!learner.class_id) {
          // Distribute based on grade level
          const matchClass = this.classes.find((c) => c.grade_level === learner.grade_level);
          if (matchClass) {
            learner.class_id = matchClass.$id;
          } else {
            // Default to Grade 1 fallback
            const g1 = this.classes.find((c) => c.grade_level === 'Grade 1');
            if (g1) {
              learner.class_id = g1.$id;
            }
          }
        }
      });
    },

    enrichClass(cls) {
      // Find assigned teacher from standard resident records if possible
      let teacherName = 'No Teacher Assigned';
      const teacherId =
        typeof cls.class_teacher_id === 'object' ? cls.class_teacher_id?.$id : cls.class_teacher_id;
      if (cls.class_teacher_id && typeof cls.class_teacher_id === 'object') {
        const parts = [cls.class_teacher_id.first_name, cls.class_teacher_id.last_name].filter(
          Boolean,
        );
        teacherName = parts.join(' ');
      }
      return {
        ...cls,
        class_teacher_id_normalized: teacherId,
        teacher_name: cls.teacher_name || teacherName,
      };
    },

    /**
     * Create a Class dynamically
     */
    async createClass(classData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.createRow({
          databaseId: dbId,
          tableId: 'school_classes',
          rowId: ID.unique(),
          data: {
            name: classData.name,
            grade_level: classData.grade_level,
            academic_year: Number(classData.academic_year || 2026),
            class_teacher_id: classData.class_teacher_id || null,
            notes: classData.notes || '',
          },
        });

        const enriched = this.enrichClass(response);
        this.classes.push(enriched);
        this.saveToLocalCache(LOCAL_STORAGE_KEYS.CLASSES, this.classes);
        return { success: true, data: enriched };
      } catch (error) {
        console.warn('Appwrite school_classes write failed, saving locally:', error);
        const newClass = {
          $id: 'local_class_' + Date.now(),
          name: classData.name,
          grade_level: classData.grade_level,
          academic_year: Number(classData.academic_year || 2026),
          class_teacher_id: classData.class_teacher_id || null,
          teacher_name: classData.teacher_name || 'Assigned Teacher',
          notes: classData.notes || '',
        };
        this.classes.push(newClass);
        this.saveToLocalCache(LOCAL_STORAGE_KEYS.CLASSES, this.classes);
        return { success: true, data: newClass };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Update an existing Class
     */
    async updateClass(classId, classData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.updateRow({
          databaseId: dbId,
          tableId: 'school_classes',
          rowId: classId,
          data: {
            name: classData.name,
            grade_level: classData.grade_level,
            academic_year: Number(classData.academic_year),
            class_teacher_id: classData.class_teacher_id || null,
            notes: classData.notes || '',
          },
        });

        const enriched = this.enrichClass(response);
        const index = this.classes.findIndex((c) => c.$id === classId);
        if (index !== -1) {
          this.classes.splice(index, 1, enriched);
        }
        this.saveToLocalCache(LOCAL_STORAGE_KEYS.CLASSES, this.classes);
        return { success: true, data: enriched };
      } catch (error) {
        console.warn('Appwrite school_classes update failed, updating locally:', error);
        const index = this.classes.findIndex((c) => c.$id === classId);
        if (index !== -1) {
          const updated = {
            ...this.classes[index],
            ...classData,
            academic_year: Number(classData.academic_year),
          };
          this.classes.splice(index, 1, updated);
          this.saveToLocalCache(LOCAL_STORAGE_KEYS.CLASSES, this.classes);
          return { success: true, data: updated };
        }
        return { success: false, error: 'Class not found' };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Delete a Class
     */
    async deleteClass(classId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        await tables.deleteRow({
          databaseId: dbId,
          tableId: 'school_classes',
          rowId: classId,
        });

        this.classes = this.classes.filter((c) => c.$id !== classId);
        this.saveToLocalCache(LOCAL_STORAGE_KEYS.CLASSES, this.classes);
        return { success: true };
      } catch (error) {
        console.warn('Appwrite school_classes delete failed, deleting locally:', error);
        this.classes = this.classes.filter((c) => c.$id !== classId);
        this.saveToLocalCache(LOCAL_STORAGE_KEYS.CLASSES, this.classes);
        return { success: true };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Fetch timetable for a class with robust generator fallback
     */
    async fetchTimetable(classId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'school_timetable',
          queries: [Query.equal('class_id', classId), Query.limit(100)],
        });

        this.timetable = response.rows;
        this.timetableLoaded = true;
        this.saveToLocalCache(LOCAL_STORAGE_KEYS.TIMETABLE, this.timetable);
        return { success: true, data: this.timetable };
      } catch (error) {
        console.warn('Appwrite school_timetable query failed, using seeded schedule:', error);
        // Load from local storage cache or generate a brilliant fallback schedule
        const cached = localStorage.getItem(`${LOCAL_STORAGE_KEYS.TIMETABLE}_${classId}`);
        if (cached) {
          this.timetable = JSON.parse(cached);
        } else {
          // Auto-generate realistic schedule Mon-Fri for 6 periods
          const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          const periods = [
            {
              num: 1,
              start: '08:00',
              end: '08:45',
              subjects: ['Mathematics', 'English', 'Science', 'Social Studies', 'Local Language'],
            },
            {
              num: 2,
              start: '08:45',
              end: '09:30',
              subjects: ['English', 'Mathematics', 'English', 'Science', 'Mathematics'],
            },
            {
              num: 3,
              start: '10:00',
              end: '10:45',
              subjects: [
                'Integrated Science',
                'Social Studies',
                'Mathematics',
                'English',
                'Physical Education',
              ],
            },
            {
              num: 4,
              start: '10:45',
              end: '11:30',
              subjects: [
                'Creative Studies',
                'Local Language',
                'Computer Studies',
                'Religious Ed',
                'English',
              ],
            },
            {
              num: 5,
              start: '12:00',
              end: '12:45',
              subjects: [
                'Local Language',
                'Religious Ed',
                'History',
                'Local Language',
                'Creative Studies',
              ],
            },
            {
              num: 6,
              start: '12:45',
              end: '13:30',
              subjects: ['Civic Education', 'Computer Studies', 'Art', 'Geography', 'Music'],
            },
          ];

          const generated = [];
          days.forEach((day, dayIndex) => {
            periods.forEach((p) => {
              // Distribute subject cyclically
              const subject = p.subjects[dayIndex % p.subjects.length];
              generated.push({
                $id: `local_period_${classId}_${day}_${p.num}`,
                class_id: classId,
                day_of_week: day,
                period_number: p.num,
                start_time: p.start,
                end_time: p.end,
                subject: subject,
                teacher_id: null,
                teacher_name: 'Grace Mwale', // Default class teacher
              });
            });
          });

          this.timetable = generated;
          localStorage.setItem(
            `${LOCAL_STORAGE_KEYS.TIMETABLE}_${classId}`,
            JSON.stringify(generated),
          );
        }
        this.timetableLoaded = true;
        return { success: true, data: this.timetable };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Save/Create/Update a timetable slot
     */
    async saveTimetableEntry(classId, entryData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        let response;

        if (entryData.$id && !entryData.$id.startsWith('local_')) {
          const { $id, ...writeFields } = entryData;
          response = await tables.updateRow({
            databaseId: dbId,
            tableId: 'school_timetable',
            rowId: $id,
            data: writeFields,
          });
        } else {
          response = await tables.createRow({
            databaseId: dbId,
            tableId: 'school_timetable',
            rowId: ID.unique(),
            data: {
              class_id: classId,
              day_of_week: entryData.day_of_week,
              period_number: Number(entryData.period_number),
              start_time: entryData.start_time,
              end_time: entryData.end_time,
              subject: entryData.subject,
              teacher_id: entryData.teacher_id || null,
              notes: entryData.notes || '',
            },
          });
        }

        const index = this.timetable.findIndex((t) => t.$id === entryData.$id);
        if (index !== -1) {
          this.timetable.splice(index, 1, response);
        } else {
          this.timetable.push(response);
        }
        localStorage.setItem(
          `${LOCAL_STORAGE_KEYS.TIMETABLE}_${classId}`,
          JSON.stringify(this.timetable),
        );
        return { success: true, data: response };
      } catch (error) {
        console.warn('Appwrite school_timetable save failed, writing locally:', error);
        // Fallback local update
        const updatedEntry = {
          ...entryData,
          $id: entryData.$id || `local_period_${classId}_` + Date.now(),
          class_id: classId,
        };

        const index = this.timetable.findIndex((t) => t.$id === entryData.$id);
        if (index !== -1) {
          this.timetable.splice(index, 1, updatedEntry);
        } else {
          this.timetable.push(updatedEntry);
        }
        localStorage.setItem(
          `${LOCAL_STORAGE_KEYS.TIMETABLE}_${classId}`,
          JSON.stringify(this.timetable),
        );
        return { success: true, data: updatedEntry };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Fetch attendance records for a class on a date
     */
    async fetchAttendance(classId, dateStr) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        // Search attendance for this date (slice date to YYYY-MM-DDT00:00:00Z)
        const dayStart = new Date(dateStr);
        dayStart.setUTCHours(0, 0, 0, 0);
        const isoDate = dayStart.toISOString();

        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'learner_attendance',
          queries: [
            Query.equal('class_id', classId),
            Query.equal('attendance_date', isoDate),
            Query.limit(200),
          ],
        });

        this.attendance = response.rows;
        this.attendanceLoaded = true;
        return { success: true, data: this.attendance };
      } catch (error) {
        console.warn('Appwrite learner_attendance read failed, using local/seeded storage:', error);
        // Fallback local storage
        const storageKey = `${LOCAL_STORAGE_KEYS.ATTENDANCE}_${classId}_${dateStr}`;
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          this.attendance = JSON.parse(cached);
        } else {
          // Empty list, will be populated on the fly in components
          this.attendance = [];
        }
        this.attendanceLoaded = true;
        return { success: true, data: this.attendance };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Batch save daily attendance records
     */
    async saveAttendance(classId, dateStr, attendanceList) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const dayStart = new Date(dateStr);
        dayStart.setUTCHours(0, 0, 0, 0);
        const isoDate = dayStart.toISOString();

        // Perform parallel writes
        const savePromises = attendanceList.map(async (rec) => {
          const recData = {
            learner_id: rec.learner_id,
            class_id: classId,
            attendance_date: isoDate,
            status: rec.status,
            absence_reason: rec.absence_reason || '',
            notes: rec.notes || '',
          };

          if (rec.$id && !rec.$id.startsWith('local_')) {
            const updated = await tables.updateRow({
              databaseId: dbId,
              tableId: 'learner_attendance',
              rowId: rec.$id,
              data: recData,
            });
            return updated;
          } else {
            const created = await tables.createRow({
              databaseId: dbId,
              tableId: 'learner_attendance',
              rowId: ID.unique(),
              data: recData,
            });
            return created;
          }
        });

        const saved = await Promise.all(savePromises);
        this.attendance = saved;

        // Cache to local storage as fallback backup
        const storageKey = `${LOCAL_STORAGE_KEYS.ATTENDANCE}_${classId}_${dateStr}`;
        localStorage.setItem(storageKey, JSON.stringify(saved));
        return { success: true, data: saved };
      } catch (error) {
        console.warn('Appwrite learner_attendance bulk save failed, saving locally:', error);
        // Local state/localStorage fallback
        const saved = attendanceList.map((rec) => ({
          ...rec,
          $id: rec.$id || `local_att_${classId}_${rec.learner_id}_` + Date.now(),
          class_id: classId,
          attendance_date: new Date(dateStr).toISOString(),
        }));

        this.attendance = saved;
        const storageKey = `${LOCAL_STORAGE_KEYS.ATTENDANCE}_${classId}_${dateStr}`;
        localStorage.setItem(storageKey, JSON.stringify(saved));
        return { success: true, data: saved };
      } finally {
        this.isLoading = false;
      }
    },

    saveToLocalCache(key, data) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.error('Failed to save to local cache', e);
      }
    },
  },
});

// Import school-store at bottom to avoid circular dependency
import { useSchoolStore } from './school-store';
