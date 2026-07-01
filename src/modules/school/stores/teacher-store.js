/**
 * Teacher Store (Story 4.2)
 *
 * Pinia store for teacher grade assignments. Manages the teacher_assignments table.
 */

import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useAuthStore } from 'src/stores/auth-store';
import { usePermissions } from 'src/composables/usePermissions';
import { ID, Query } from 'appwrite';
import { GRADE_LEVELS } from '../utils/school-constants';

const errorHandler = useErrorHandler();

export const useTeacherStore = defineStore('teacher', {
  state: () => ({
    teacherAssignments: [],
    teacherAssignmentsLoaded: false,
    isLoading: false,
  }),

  getters: {
    /**
     * Group teacher assignments by teacher_id
     */
    assignmentsByTeacher: (state) => {
      const groups = {};
      state.teacherAssignments.forEach((assign) => {
        const teacherId = assign.teacher_id_normalized;
        if (!groups[teacherId]) {
          groups[teacherId] = {
            teacher_id: teacherId,
            teacher_name: assign.teacher_name,
            grades: [],
          };
        }
        groups[teacherId].grades.push(assign);
      });
      return Object.values(groups);
    },

    /**
     * The resident_id of the currently logged-in user, but only if they
     * have a teacher assignment in teacher_assignments.
     * Returns null if the current user is not a teacher.
     * Used by MyInterventionsWidget (Story 4.8).
     */
    currentTeacherResidentId: (state) => {
      const authStore = useAuthStore();
      const residentId = authStore.user?.resident_id;
      if (!residentId) return null;
      const hasAssignment = state.teacherAssignments.some(
        (a) => a.teacher_id_normalized === residentId,
      );
      return hasAssignment ? residentId : null;
    },
  },

  actions: {
    /**
     * Enrich dynamic record with resident details
     */
    enrichAssignment(assignment, residentsMap = null) {
      const teacherId =
        typeof assignment.teacher_id === 'object'
          ? assignment.teacher_id?.$id
          : assignment.teacher_id;
      const resident = typeof assignment.teacher_id === 'object' ? assignment.teacher_id : null;

      let teacherName = 'Unknown Teacher';
      if (resident) {
        const parts = [resident.first_name, resident.middle_names, resident.last_name].filter(
          Boolean,
        );
        teacherName = parts.join(' ') || teacherName;
      } else if (teacherId && residentsMap) {
        const r = residentsMap.get(teacherId);
        if (r) {
          const parts = [r.first_name, r.middle_names, r.last_name].filter(Boolean);
          teacherName = parts.join(' ') || teacherName;
        }
      }

      return {
        ...assignment,
        teacher_id_normalized: teacherId,
        teacher_name: teacherName,
      };
    },

    /**
     * Fetch all teacher grade level assignments
     */
    async fetchTeacherAssignments(force = false) {
      if (this.teacherAssignmentsLoaded && !force) {
        return { success: true, data: this.teacherAssignments };
      }
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'teacher_assignments',
          queries: [Query.limit(500)],
        });

        // Build residents map for name lookup when teacher_id is a string ID
        let residentsMap = null;
        try {
          const resTableId = import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS;
          const residentsRes = await tables.listRows({
            databaseId: dbId,
            tableId: resTableId,
            queries: [Query.limit(500)],
          });
          residentsMap = new Map(residentsRes.rows.map((r) => [r.$id, r]));
        } catch {
          // non-fatal — teacher names will show as 'Unknown Teacher'
        }

        // Enrich assignments with resident names
        this.teacherAssignments = response.rows.map((row) =>
          this.enrichAssignment(row, residentsMap),
        );
        this.teacherAssignmentsLoaded = true;
        return { success: true, data: this.teacherAssignments };
      } catch (error) {
        console.error('Error fetching teacher assignments:', error);
        errorHandler.notifyError('Failed to load teacher assignments. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Assign a teacher to a grade level
     */
    async createTeacherAssignment(teacherId, gradeLevel, notes = '', subjects = []) {
      this.isLoading = true;
      try {
        // Enforce uniqueness of (teacher_id, grade_level) client-side
        await this.fetchTeacherAssignments();
        const existing = this.teacherAssignments.find(
          (a) => a.teacher_id_normalized === teacherId && a.grade_level === gradeLevel,
        );

        if (existing) {
          return {
            success: false,
            error: `Teacher is already assigned to ${gradeLevel}.`,
          };
        }

        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const data = {
          teacher_id: teacherId,
          grade_level: gradeLevel,
          notes,
        };
        if (subjects && subjects.length > 0) {
          data.subjects = subjects;
        }
        const response = await tables.createRow({
          databaseId: dbId,
          tableId: 'teacher_assignments',
          rowId: ID.unique(),
          data,
        });

        const enriched = this.enrichAssignment(response);

        // If Appwrite returned raw without resident expanded, re-fetch assignments
        if (enriched.teacher_name === 'Unknown Teacher') {
          await this.fetchTeacherAssignments(true);
        } else {
          this.teacherAssignments.push(enriched);
        }

        return { success: true, data: enriched };
      } catch (error) {
        console.error('Error creating teacher assignment:', error);
        errorHandler.notifyError('Failed to assign teacher to grade. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Remove a teacher assignment
     */
    async deleteTeacherAssignment(assignmentId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        await tables.deleteRow({
          databaseId: dbId,
          tableId: 'teacher_assignments',
          rowId: assignmentId,
        });

        this.teacherAssignments = this.teacherAssignments.filter((a) => a.$id !== assignmentId);
        return { success: true };
      } catch (error) {
        console.error('Error deleting teacher assignment:', error);
        errorHandler.notifyError('Failed to remove teacher assignment. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Get assigned grades for the current logged-in user.
     * Admin/Head Teacher role bypasses and has access to all grades.
     * Fallback: if no assignments exist in the system, all teachers bypass the filter (greenfield support).
     */
    async getAssignedGradesForCurrentUser() {
      const authStore = useAuthStore();
      const { hasPermission } = usePermissions();

      // Ensure user details and roles are fully loaded
      const residentId = authStore.user?.resident_id;

      // If user is Admin or Head Teacher, they can write/read all classes
      if (hasPermission('school:admin')) {
        return GRADE_LEVELS;
      }

      await this.fetchTeacherAssignments();

      // GREENFIELD FALLBACK: If there are absolutely no assignments in the DB, let everyone bypass
      if (this.teacherAssignments.length === 0) {
        return GRADE_LEVELS;
      }

      if (!residentId) return [];

      const matches = this.teacherAssignments.filter((a) => a.teacher_id_normalized === residentId);

      return matches.map((a) => a.grade_level);
    },
  },
});
