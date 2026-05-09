import "server-only";
import type { AxiosInstance } from "axios";
import { ATTENDANCE_EP } from "@/bootstrap/endpoint/attendance.endpoint";
import type { AttendanceRecord } from "../../domain/entities/attendance-record.entity";
import type { AttendanceRoster } from "../../domain/entities/attendance-roster.entity";
import type { ClassPeriod } from "../../domain/entities/class-period.entity";
import type {
  ClassSummary,
  IAttendanceRepository,
} from "../../domain/repositories/i-attendance.repository";
import type { ClassListResponseDto } from "../dtos/class-list-response.dto";
import type { HistoryResponseDto } from "../dtos/history-response.dto";
import type { RosterResponseDto } from "../dtos/roster-response.dto";
import { mapPeriod, mapRoster } from "../mappers/attendance.mapper";

export class AttendanceRepository implements IAttendanceRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listMyClasses(): Promise<ClassSummary[]> {
    const dto = (await this.http.get(
      ATTENDANCE_EP.myClasses,
    )) as unknown as ClassListResponseDto;
    return dto.map((d) => ({ id: d.id, name: d.name }));
  }

  async getRoster(
    classId: string,
    date: string,
    period: number,
  ): Promise<AttendanceRoster> {
    const dto = (await this.http.get(ATTENDANCE_EP.roster(classId), {
      params: { date, period },
    })) as unknown as RosterResponseDto;
    return mapRoster(dto);
  }

  async saveAttendance(
    periodId: string,
    records: AttendanceRecord[],
  ): Promise<void> {
    await this.http.put(ATTENDANCE_EP.save(periodId), { records });
  }

  async listHistory(
    classId: string,
    from: string,
    to: string,
  ): Promise<ClassPeriod[]> {
    const dto = (await this.http.get(ATTENDANCE_EP.history(classId), {
      params: { from, to },
    })) as unknown as HistoryResponseDto;
    return dto.map(mapPeriod);
  }
}
