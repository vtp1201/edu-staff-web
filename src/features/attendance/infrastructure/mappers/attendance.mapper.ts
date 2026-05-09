import type { AttendanceRecord } from "../../domain/entities/attendance-record.entity";
import type { AttendanceRoster } from "../../domain/entities/attendance-roster.entity";
import type { ClassPeriod } from "../../domain/entities/class-period.entity";
import type {
  AttendanceRecordDto,
  ClassPeriodDto,
  RosterResponseDto,
} from "../dtos/roster-response.dto";

export function mapPeriod(dto: ClassPeriodDto): ClassPeriod {
  return {
    id: dto.id,
    classId: dto.classId,
    className: dto.className,
    subject: dto.subject,
    date: dto.date,
    period: dto.period,
  };
}

export function mapRecord(dto: AttendanceRecordDto): AttendanceRecord {
  return {
    studentId: dto.studentId,
    studentName: dto.studentName,
    studentCode: dto.studentCode,
    avatarUrl: dto.avatarUrl,
    status: dto.status,
    note: dto.note,
  };
}

export function mapRoster(dto: RosterResponseDto): AttendanceRoster {
  return {
    period: mapPeriod(dto.period),
    records: dto.records.map(mapRecord),
  };
}
