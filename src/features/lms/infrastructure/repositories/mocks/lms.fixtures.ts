import type {
  ChapterDto,
  CourseLessonsDto,
} from "../../dtos/course-lessons-response.dto";
import type { CourseDto } from "../../dtos/course-response.dto";

/**
 * Seeded 1:1 from `design_src/edu/student.jsx` (`COURSES` + `COURSE_LESSONS`).
 * Course 1 (Toán) is the only course wired with lesson content; the others fall
 * through to the designed "teacher hasn't uploaded content" empty state.
 *
 * Deviation from the mockup's `COURSES` progress numbers: course 1's summary
 * counts are set to match its actual lesson hierarchy (1 done / 4 total) so the
 * optimistic mark-complete patch of the courses-list cache stays consistent with
 * the player's progress (state-architecture.md §6.1). A fourth (text) lesson is
 * added to chapter 1 so all three content types (video/pdf/text) are reachable
 * via the mock repo for the LessonPlayer_Text validation story.
 *
 * These are DTOs (raw hex `color`); the mock repository maps them via
 * `lms.mapper.ts`, exercising the color→tone lookup end-to-end.
 */
export const COURSES_DTO: CourseDto[] = [
  {
    id: "1",
    name: "Toán học",
    teacherName: "Nguyễn Thị Hương",
    color: "#5D87FF",
    lessonsDone: 1,
    lessonsTotal: 4,
    grade: 8.5,
  },
  {
    id: "2",
    name: "Vật Lý",
    teacherName: "Trần Văn Minh",
    color: "#13DEB9",
    lessonsDone: 14,
    lessonsTotal: 22,
    grade: 9.0,
  },
  {
    id: "3",
    name: "Hóa Học",
    teacherName: "Lê Thị Hoa",
    color: "#FFAE1F",
    lessonsDone: 12,
    lessonsTotal: 22,
    grade: 7.5,
  },
  {
    id: "4",
    name: "Ngữ Văn",
    teacherName: "Phạm Quốc Bảo",
    color: "#7B5EA7",
    lessonsDone: 20,
    lessonsTotal: 24,
    grade: 8.0,
  },
  {
    id: "5",
    name: "Tiếng Anh",
    teacherName: "Đỗ Thị Mai",
    color: "#00B8A9",
    lessonsDone: 16,
    lessonsTotal: 24,
    grade: 8.8,
  },
  {
    id: "6",
    name: "Lịch Sử",
    teacherName: "Hoàng Văn Nam",
    color: "#FA896B",
    lessonsDone: 10,
    lessonsTotal: 24,
    grade: 7.2,
  },
];

const COURSE_1_CHAPTERS: ChapterDto[] = [
  {
    id: "ch1",
    title: "Chương 1 — Mệnh đề & Tập hợp",
    lessons: [
      {
        id: "l1",
        chapterId: "ch1",
        type: "video",
        order: 1,
        title: "Bài 1: Mệnh đề toán học",
        durationLabel: "32 phút",
        done: true,
      },
      {
        id: "l2",
        chapterId: "ch1",
        type: "video",
        order: 2,
        title: "Bài 2: Tập hợp & các phép toán",
        durationLabel: "28 phút",
        done: false,
      },
      {
        id: "l3",
        chapterId: "ch1",
        type: "pdf",
        order: 3,
        title: "Bài 3: Tài liệu ôn tập chương I",
        durationLabel: "12 trang",
        done: false,
        downloadHref: "/mock/lms/toan-chuong-1-on-tap.pdf",
      },
      {
        id: "l4",
        chapterId: "ch1",
        type: "text",
        order: 4,
        title: "Bài 4: Tổng kết lý thuyết",
        durationLabel: "6 phút đọc",
        done: false,
        blocks: [
          {
            heading: "Khái niệm",
            paragraphs: [
              "Một mệnh đề toán học là một khẳng định có giá trị chân lý xác định — đúng hoặc sai, nhưng không thể đồng thời cả hai.",
            ],
          },
          {
            heading: "Ví dụ",
            paragraphs: [
              "“Số 7 là số nguyên tố” — mệnh đề đúng.",
              "“Trái Đất phẳng” — mệnh đề sai.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "ch2",
    title: "Chương 2 — Bất phương trình & Hệ",
    lessons: [],
  },
];

/** Course id → lesson hierarchy DTO. Only course 1 has content. */
export const COURSE_LESSONS_DTO: Record<string, CourseLessonsDto> = {
  "1": {
    course: { id: "1", name: "Toán học", color: "#5D87FF" },
    chapters: COURSE_1_CHAPTERS,
  },
};

/** Set of valid course ids (an id outside this → not-found). */
export const COURSE_IDS = new Set(COURSES_DTO.map((c) => c.id));

/** Seed notes keyed by lessonId (demonstrates AC-12 persistence). */
export const NOTES_SEED: Record<string, string> = {
  l1: "Ghi nhớ: mệnh đề phải có giá trị chân lý xác định.",
};

/** Seed Q&A keyed by lessonId (l1 has an answered question; others empty). */
export const QUESTIONS_SEED: Record<
  string,
  Array<{
    id: string;
    question: string;
    answer: string | null;
    askedAt: string;
  }>
> = {
  l1: [
    {
      id: "q1",
      question: "Câu phủ định của một mệnh đề đúng có luôn sai không ạ?",
      answer: "Đúng vậy — phủ định của mệnh đề đúng là mệnh đề sai.",
      askedAt: "2026-06-01T08:30:00.000Z",
    },
  ],
};
