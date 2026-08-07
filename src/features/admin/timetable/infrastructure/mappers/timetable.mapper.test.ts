import { describe, expect, it } from "vitest";
import type { TimetableSlot } from "../../domain/entities/timetable-slot.entity";
import type {
  ConflictEntryDto,
  TimetableConflictsResponseDto,
} from "../dtos/timetable-conflicts-response.dto";
import type {
  SlotResponseDto,
  TimetableResponseDto,
} from "../dtos/timetable-slot-response.dto";
import {
  TimetableConflictsMapper,
  TimetableMapper,
  TimetableSlotMapper,
} from "./timetable.mapper";

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

  it("maps teacherMemberId → teacherId", () => {
    const slot = TimetableSlotMapper.toEntity(SLOT_DTO, "cls-1");
    expect(slot.teacherId).toBe("tch-uuid");
    expect(slot.subjectId).toBe("sub-uuid");
  });

  it("reads the wire room (US-E18.26 — persisted since BE US-153)", () => {
    const slot = TimetableSlotMapper.toEntity(
      { ...SLOT_DTO, room: "P.201" },
      "cls-1",
    );
    expect(slot.room).toBe("P.201");
  });

  it("falls an omitted wire room back to the entity's empty-string convention", () => {
    expect(TimetableSlotMapper.toEntity(SLOT_DTO, "cls-1").room).toBe("");
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

  it("converts the domain slot to a wire request (day → enum) and CARRIES room", () => {
    const req = TimetableSlotMapper.toRequest(entity);
    expect(req).toEqual({
      day: "MON",
      period: 1,
      subjectId: "sub-uuid",
      teacherMemberId: "tch-uuid",
      room: "P.201",
    });
  });

  it("omits room entirely when the domain slot has none (empty string is not sent)", () => {
    const req = TimetableSlotMapper.toRequest({ ...entity, room: "" });
    expect(req.room).toBeUndefined();
  });

  it("round-trips room through toRequest → toEntity", () => {
    const back = TimetableSlotMapper.toEntity(
      TimetableSlotMapper.toRequest(entity),
      "cls-1",
    );
    expect(back.room).toBe("P.201");
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

  it("no longer carries a conflicts field — conflicts are their own scan (US-E18.48)", () => {
    expect(Object.keys(TimetableMapper.toEntity(RESPONSE)).sort()).toEqual([
      "classId",
      "slots",
      "yearId",
    ]);
  });
});

describe("TimetableConflictsMapper.toEntity (BE US-188 whole-school scan)", () => {
  const RESPONSE: TimetableConflictsResponseDto = {
    termId: "term-uuid",
    truncated: false,
    conflicts: [
      {
        type: "TEACHER_DOUBLE_BOOKED",
        day: "WED",
        period: 4,
        classes: [
          { classId: "cls-a", subjectId: "sub-1" },
          { classId: "cls-b", subjectId: "sub-2" },
        ],
        teacherMemberId: "member-uuid",
      },
      {
        type: "ROOM_DOUBLE_BOOKED",
        day: "MON",
        period: 1,
        classes: [
          { classId: "cls-c", subjectId: "sub-3" },
          { classId: "cls-d", subjectId: "sub-4" },
        ],
        room: "P.201",
      },
    ],
  };

  it("translates the wire enum to the stable domain key (never the raw enum)", () => {
    const scan = TimetableConflictsMapper.toEntity(RESPONSE);
    expect(scan.conflicts.map((c) => c.type)).toEqual([
      "teacher-double-booked",
      "room-double-booked",
    ]);
  });

  it("joins the day enum to the 0-indexed domain day and keeps the period", () => {
    const scan = TimetableConflictsMapper.toEntity(RESPONSE);
    expect(scan.conflicts[0]).toMatchObject({ day: 2, period: 4 }); // WED
    expect(scan.conflicts[1]).toMatchObject({ day: 0, period: 1 }); // MON
  });

  it("maps teacherMemberId → teacherId on a teacher conflict", () => {
    const scan = TimetableConflictsMapper.toEntity(RESPONSE);
    const teacher = scan.conflicts[0];
    expect(teacher.type).toBe("teacher-double-booked");
    if (teacher.type !== "teacher-double-booked") return;
    expect(teacher.teacherId).toBe("member-uuid");
  });

  it("carries the room on a room conflict and the classes' subjectIds on both", () => {
    const scan = TimetableConflictsMapper.toEntity(RESPONSE);
    const room = scan.conflicts[1];
    expect(room.type).toBe("room-double-booked");
    if (room.type !== "room-double-booked") return;
    expect(room.room).toBe("P.201");
    expect(room.classes).toEqual([
      { classId: "cls-c", subjectId: "sub-3" },
      { classId: "cls-d", subjectId: "sub-4" },
    ]);
  });

  it("passes termId and truncated through untouched", () => {
    expect(
      TimetableConflictsMapper.toEntity({ ...RESPONSE, truncated: true }),
    ).toMatchObject({ termId: "term-uuid", truncated: true });
  });

  it("preserves the BE's deterministic order (no client re-sort)", () => {
    const scan = TimetableConflictsMapper.toEntity(RESPONSE);
    expect(scan.conflicts.map((c) => c.period)).toEqual([4, 1]);
  });

  it("drops an entry whose `type` is unknown (forward-compatible, never renders a blank row)", () => {
    const scan = TimetableConflictsMapper.toEntity({
      ...RESPONSE,
      conflicts: [
        ...RESPONSE.conflicts,
        {
          type: "CLASS_DOUBLE_BOOKED" as ConflictEntryDto["type"],
          day: "FRI",
          period: 2,
          classes: [
            { classId: "cls-e", subjectId: "sub-5" },
            { classId: "cls-f", subjectId: "sub-6" },
          ],
        },
      ],
    });
    expect(scan.conflicts).toHaveLength(2);
  });

  it("drops an entry whose kind-defining field is absent (omitempty on the wire)", () => {
    const scan = TimetableConflictsMapper.toEntity({
      ...RESPONSE,
      conflicts: [
        {
          type: "ROOM_DOUBLE_BOOKED",
          day: "FRI",
          period: 2,
          classes: [
            { classId: "cls-e", subjectId: "sub-5" },
            { classId: "cls-f", subjectId: "sub-6" },
          ],
          // no `room` — a room conflict without a room is not renderable
        },
      ],
    });
    expect(scan.conflicts).toEqual([]);
  });

  it("maps an empty scan (unknown termId returns 200 + [], never 404)", () => {
    expect(
      TimetableConflictsMapper.toEntity({
        termId: "unknown",
        truncated: false,
        conflicts: [],
      }),
    ).toEqual({ termId: "unknown", truncated: false, conflicts: [] });
  });
});
