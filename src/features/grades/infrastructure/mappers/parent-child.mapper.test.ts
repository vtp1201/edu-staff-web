/**
 * Unit tests — `toParentChildren` (US-E18.33).
 *
 * The real `GET /members/{parentId}/linked-students` wire row carries NO
 * display name; the name arrives separately from IAM's narrowed-tier batch
 * lookup, so the mapper's whole job is joining the two and deriving the three
 * fields (`ordinal`-stable order, `avatar`, `color`) the wire never sends.
 */
import { describe, expect, it } from "vitest";
import { toParentChildren } from "./parent-child.mapper";

const LINKS = [
  {
    linkId: "link-b",
    parentMemberId: "p-1",
    studentMemberId: "st-2",
    createdAt: "2026-01-02T00:00:00Z",
    classId: "cls-8b1",
    className: "8B1",
  },
  {
    linkId: "link-a",
    parentMemberId: "p-1",
    studentMemberId: "st-1",
    createdAt: "2026-01-01T00:00:00Z",
    classId: "cls-11a2",
    className: "11A2",
  },
];

describe("toParentChildren", () => {
  it("joins the resolved display names onto the linked-student rows", () => {
    const children = toParentChildren(
      LINKS,
      new Map([
        ["st-1", "Nguyễn Minh Khoa"],
        ["st-2", "Nguyễn Thu Hà"],
      ]),
    );

    expect(children).toEqual([
      {
        childId: "st-1",
        name: "Nguyễn Minh Khoa",
        className: "11A2",
        ordinal: 1,
        avatar: "NK",
        color: "primary",
      },
      {
        childId: "st-2",
        name: "Nguyễn Thu Hà",
        className: "8B1",
        ordinal: 2,
        avatar: "NH",
        color: "success",
      },
    ]);
  });

  it("orders by linkId ascending — NEVER raw response order (which BE does not guarantee stable)", () => {
    // LINKS arrives b-then-a; a raw-order mapping would flip the roster (and
    // therefore the colors and the default-selected child) between refetches.
    const children = toParentChildren(LINKS, new Map());
    expect(children.map((c) => c.childId)).toEqual(["st-1", "st-2"]);
  });

  it("cycles the 5-color palette by stable roster position", () => {
    const many = Array.from({ length: 6 }, (_, i) => ({
      linkId: `link-${i}`,
      parentMemberId: "p-1",
      studentMemberId: `st-${i}`,
      createdAt: "2026-01-01T00:00:00Z",
    }));
    expect(toParentChildren(many, new Map()).map((c) => c.color)).toEqual([
      "primary",
      "success",
      "warning",
      "error",
      "purple",
      "primary",
    ]);
  });

  it("leaves an unresolved name ABSENT — never the raw memberId — with the ordinal digit as the avatar", () => {
    // The batch lookup silently omits unknown/other-tenant ids; a missing name
    // is a cosmetic degradation, never an error (staffing/invitations
    // precedent). Neither fake initials NOR the raw uuid may stand in for a
    // human name: a uuid in the name slot becomes the tab's accessible name and
    // a screen reader would read out the random string. `name` stays absent so
    // `ChildSwitcher` renders its "Con thứ N" ordinal label instead — exactly
    // how the sibling `toTimetableChildren`/`ChildPicker` pair degrades.
    const [child] = toParentChildren([LINKS[1]], new Map());
    expect(child).toMatchObject({ ordinal: 1, avatar: "1" });
    // `toEqual`/`toMatchObject` ignore undefined-valued keys, so assert the key
    // is genuinely absent — `name: undefined` would still be a wire-level lie.
    expect(Object.keys(child).sort()).toEqual([
      "avatar",
      "childId",
      "className",
      "color",
      "ordinal",
    ]);
    expect(child.name).toBeUndefined();
  });

  it("numbers `ordinal` 1-based off the STABLE linkId order, not the response order", () => {
    // The ordinal is user-visible ("Con thứ 2") whenever a name is unresolved,
    // so it must not jump between refetches.
    const children = toParentChildren(LINKS, new Map());
    expect(children.map((c) => [c.childId, c.ordinal])).toEqual([
      ["st-1", 1],
      ["st-2", 2],
    ]);
  });

  it("treats an absent and a null className identically (US-148 D5)", () => {
    const [absent] = toParentChildren(
      [{ ...LINKS[1], classId: undefined, className: undefined }],
      new Map(),
    );
    const [nulled] = toParentChildren(
      [{ ...LINKS[1], classId: null, className: null }],
      new Map(),
    );
    expect(absent.className).toBe("");
    expect(nulled.className).toBe("");
  });

  it("takes the FIRST two initials of a multi-word Vietnamese name", () => {
    const [child] = toParentChildren(
      [LINKS[1]],
      new Map([["st-1", "Lê Hoàng Bảo Long"]]),
    );
    expect(child.avatar).toBe("LL");
  });

  it("falls back to a single initial for a one-word name", () => {
    const [child] = toParentChildren([LINKS[1]], new Map([["st-1", "Khoa"]]));
    expect(child.avatar).toBe("K");
  });
});
