import { RoomType } from './enums';

export interface GradeDto {
  id: string;
  name: string;
  nameAr: string;
  orderIndex: number;
  isActive: boolean;
  groupCount: number;
}

export interface GroupDto {
  id: string;
  name: string;
  nameAr: string;
  gradeId: string;
  gradeName: string;
  gradeNameAr: string;
  capacity: number;
  isActive: boolean;
  studentCount: number;
}

export interface SubjectDto {
  id: string;
  name: string;
  nameAr: string;
  code?: string;
  departmentId?: string;
  departmentName?: string;
  requiredRoomType?: RoomType;
  isActive: boolean;
}

export interface DepartmentDto {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  isActive: boolean;
  subjectCount: number;
}

export interface SemesterDto {
  id: string;
  name: string;
  nameAr: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isActive: boolean;
}

export interface StudentAssignmentDto {
  id: string;
  studentProfileId: string;
  studentName: string;
  gradeId: string;
  gradeName: string;
  groupId: string;
  groupName: string;
  semesterId: string;
  semesterName: string;
  isActive: boolean;
}

export interface BulkAssignStudentsRequest {
  studentProfileIds: string[];
  gradeId: string;
  groupId: string;
  semesterId: string;
}

// New entities
export interface PeriodDefinitionDto {
  id: string;
  periodNumber: number;
  label: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  isActive: boolean;
}

export interface RoomDto {
  id: string;
  name: string;
  nameAr: string;
  code: string;
  roomType: RoomType;
  capacity: number;
  building?: string;
  floor?: number;
  isActive: boolean;
}

export interface CurriculumContractDto {
  id: string;
  gradeId: string;
  gradeName: string;
  semesterId: string;
  semesterName: string;
  subjectId: string;
  subjectName: string;
  periodsPerWeek: number;
}

export interface TeacherSubjectLinkDto {
  id: string;
  teacherProfileId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  gradeId?: string;
  gradeName?: string;
  isActive: boolean;
}
