import { describe, expect, it } from "vitest";
import type { TimetableSlot } from "../../domain/entities/timetable-slot.entity";
import type {
  SlotResponseDto,
  TimetableResponseDto,
} from "../dtos/timetable-slot-response.dto";
import { TimetableMapper, TimetableSlotMapper } from "./timetable.mapper";

const SLOT_DTO: SlotResponseDto = {
  day: "WED",
  period: 3,
  subjectId: "sub-uuid",
  teacherMemberId: "tch-uuid",
};

describe("TimetableSlotMapper.toEntity", () => {
  it("joins the day enum to a 0-indexed day and synthesises the slotKey", () => {
    const slot = TimetableSlotMapper.toEntity(SLOT_DTO, "cls-1");
    expect(slot.day).toBe(2); // WED
    expect(slot.period).toBe(3);
    expect(slot.slotKey).toBe("cls-1|2|3");
    expect(slot.classId).toBe("cls-1");
  });

  it("maps teacherMemberId → teacherId and marks room as non-persistent (empty)", () => {
    const slot = TimetableSlotMapper.toEntity(SLOT_DTO, "cls-1");
    expect(slot.teacherId).toBe("tch-uuid");
    expect(slot.subjectId).toBe("sub-uuid");
    expect(slot.room).toBe("");
  });
});

describe("TimetableSlotMapper.toRequest", () => {
  const entity: TimetableSlot = {
    slotKey: "cls-1|0|1",
    classId: "cls-1",
    day: 0,
    period: 1,
    subjectId: "sub-uuid",
    teacherId: "tch-uuid",
    room: "P.201",
  };

  it("converts the domain slot to a wire request (day → enum, drops room)", () => {
    const req = TimetableSlotMapper.toRequest(entity);
    expect(req).toEqual({
      day: "MON",
      period: 1,
      subjectId: "sub-uuid",
      teacherMemberId: "tch-uuid",
    });
    expect(req).not.toHaveProperty("room");
  });

  it("round-trips a slot through toRequest → toEntity (identity fields)", () => {
    const req = TimetableSlotMapper.toRequest(entity);
    const back = TimetableSlotMapper.toEntity(req, "cls-1");
    expect(back.day).toBe(entity.day);
    expect(back.period).toBe(entity.period);
    expect(back.subjectId).toBe(entity.subjectId);
    expect(back.teacherId).toBe(entity.teacherId);
  });

  it("throws for a Saturday slot (index 5) — no wire enum", () => {
    expect(() => TimetableSlotMapper.toRequest({ ...entity, day: 5 })).toThrow(
      RangeError,
    );
  });
});

describe("TimetableMapper.toEntity", () => {
  const RESPONSE: TimetableResponseDto = {
    classId: "cls-1",
    termId: "term-1",
    slots: [
      { day: "MON", period: 1, subjectId: "s1", teacherMemberId: "t1" },
      { day: "FRI", period: 5, subjectId: "s2", teacherMemberId: "t2" },
    ],
  };

  it("nests wire slots into a slotKey record and stores termId in yearId", () => {
    const data = TimetableMapper.toEntity(RESPONSE);
    expect(data.classId).toBe("cls-1");
    expect(data.yearId).toBe("term-1");
    expect(Object.keys(data.slots)).toHaveLength(2);
    expect(data.slots["cls-1|0|1"]?.subjectId).toBe("s1");
    expect(data.slots["cls-1|4|5"]?.teacherId).toBe("t2");
  });

  it("returns no proactive conflicts in real mode (reactive-only, ask #16)", () => {
    expect(TimetableMapper.toEntity(RESPONSE).conflicts).toEqual([]);
  });
});
