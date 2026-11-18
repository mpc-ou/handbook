import MiniSearch from "minisearch";
import { canUserViewCourse } from "@/lib/progression";
import type {
  CategoryRecord,
  ContentStatus,
  CourseRecord,
  ItemRecord,
  ItemType,
  LessonRecord,
  UserProfile,
} from "@/types";

export type SearchResultKind = "course" | "lesson" | "item";

export interface SearchDocument {
  id: string;
  kind: SearchResultKind;
  entityId: string;
  title: string;
  summary: string;
  plainText: string;
  parentTitle: string;
  courseTitle: string;
  lessonTitle: string;
  href: string;
  itemType?: ItemType;
  status: ContentStatus;
}

export interface SearchHit extends SearchDocument {
  score: number;
  snippet: string;
}

export interface GroupedSearchResults {
  courses: SearchHit[];
  lessons: SearchHit[];
  items: SearchHit[];
}

export interface HighlightSegment {
  text: string;
  highlight: boolean;
}

/**
 * Chuẩn hóa chuỗi tiếng Việt về dạng không dấu, chữ thường để lập chỉ mục và so khớp.
 */
export function foldVietnamese(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

function buildFoldedWithMap(original: string): {
  folded: string;
  map: number[];
} {
  let folded = "";
  const map: number[] = [];
  for (let i = 0; i < original.length; i++) {
    const piece = foldVietnamese(original[i]);
    for (let j = 0; j < piece.length; j++) {
      folded += piece[j];
      map.push(i);
    }
  }
  return { folded, map };
}

export function extractQueryTerms(query: string): string[] {
  return foldVietnamese(query)
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Tạo đoạn trích ngắn quanh từ khóa khớp đầu tiên trong văn bản gốc.
 */
export function buildSnippet(
  sourceText: string,
  query: string,
  maxLength = 130
): string {
  const clean = sourceText.replace(/\s+/g, " ").trim();
  if (!clean) return "";

  const terms = extractQueryTerms(query);
  if (terms.length === 0) {
    return clean.length <= maxLength
      ? clean
      : `${clean.slice(0, maxLength).trimEnd()}…`;
  }

  const { folded, map } = buildFoldedWithMap(clean);
  let firstMatchFolded = -1;
  for (const term of terms) {
    const idx = folded.indexOf(term);
    if (idx !== -1 && (firstMatchFolded === -1 || idx < firstMatchFolded)) {
      firstMatchFolded = idx;
    }
  }

  if (firstMatchFolded === -1 || clean.length <= maxLength) {
    return clean.length <= maxLength
      ? clean
      : `${clean.slice(0, maxLength).trimEnd()}…`;
  }

  const origIdx = map[firstMatchFolded] ?? 0;
  let start = Math.max(0, origIdx - 36);
  if (start > 0) {
    const spaceAfter = clean.indexOf(" ", start);
    if (spaceAfter !== -1 && spaceAfter - start < 16) {
      start = spaceAfter + 1;
    }
  }

  let end = Math.min(clean.length, start + maxLength);
  if (end < clean.length) {
    const spaceBefore = clean.lastIndexOf(" ", end);
    if (spaceBefore > start + 40) {
      end = spaceBefore;
    }
  }

  const prefix = start > 0 ? "…" : "";
  const suffix = end < clean.length ? "…" : "";
  return `${prefix}${clean.slice(start, end).trim()}${suffix}`;
}

/**
 * Tách văn bản thành các đoạn thường và đoạn khớp từ khóa (so khớp không dấu).
 */
export function splitHighlightSegments(
  text: string,
  query: string
): HighlightSegment[] {
  if (!text) return [];
  const terms = extractQueryTerms(query);
  if (terms.length === 0) {
    return [{ text, highlight: false }];
  }

  const { folded, map } = buildFoldedWithMap(text);
  if (!folded) return [{ text, highlight: false }];

  const intervals: Array<[number, number]> = [];
  for (const term of terms) {
    let fromIndex = 0;
    while (fromIndex < folded.length) {
      const idx = folded.indexOf(term, fromIndex);
      if (idx === -1) break;
      const origStart = map[idx];
      const endFolded = idx + term.length;
      const origEnd =
        endFolded < map.length ? map[endFolded] : text.length;
      if (origStart !== undefined && origEnd > origStart) {
        intervals.push([origStart, origEnd]);
      }
      fromIndex = idx + Math.max(1, term.length);
    }
  }

  if (intervals.length === 0) {
    return [{ text, highlight: false }];
  }

  intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Array<[number, number]> = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = intervals[i];
    if (curr[0] <= prev[1]) {
      prev[1] = Math.max(prev[1], curr[1]);
    } else {
      merged.push([curr[0], curr[1]]);
    }
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), highlight: false });
    }
    segments.push({ text: text.slice(start, end), highlight: true });
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), highlight: false });
  }
  return segments;
}

export interface SearchIndexInput {
  courses: ReadonlyArray<CourseRecord>;
  lessons: ReadonlyArray<LessonRecord>;
  items: ReadonlyArray<ItemRecord>;
  categories?: ReadonlyArray<CategoryRecord>;
  user: UserProfile | null;
}

export interface HandbookSearchIndex {
  miniSearch: MiniSearch<SearchDocument>;
  documentsById: Map<string, SearchDocument>;
  visibleCourses: CourseRecord[];
}

const SEARCH_FIELDS: Array<keyof SearchDocument> = [
  "title",
  "summary",
  "plainText",
  "parentTitle",
];

const BOOST_WEIGHTS: Record<string, number> = {
  title: 5,
  summary: 2.5,
  parentTitle: 1.5,
  plainText: 1,
};

/**
 * Tạo chỉ mục MiniSearch cho các khóa học, bài học và chương/bài tập mà người dùng có quyền xem.
 */
export function createHandbookSearchIndex({
  courses,
  lessons,
  items,
  categories = [],
  user,
}: SearchIndexInput): HandbookSearchIndex {
  const isStaff = Boolean(
    user && (user.role === "ADMIN" || user.role === "EDITOR")
  );

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const visibleCourses = courses
    .filter((c) => {
      if (c.status !== "PUBLISHED" && !isStaff) return false;
      if (c.visibility === "UNPUBLIC" && !isStaff) return false;
      if (!isStaff && !canUserViewCourse(user, c).allowed) return false;
      return true;
    })
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const courseMap = new Map(visibleCourses.map((c) => [c.id, c]));

  const visibleLessons = lessons
    .filter((l) => {
      if (!courseMap.has(l.courseId)) return false;
      if (!l.isPublished && !isStaff) return false;
      return true;
    })
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const lessonMap = new Map(visibleLessons.map((l) => [l.id, l]));

  const visibleItems = items
    .filter((i) => {
      if (!lessonMap.has(i.lessonId)) return false;
      if (i.status !== "PUBLISHED" && !isStaff) return false;
      return true;
    })
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const documents: SearchDocument[] = [];

  for (const course of visibleCourses) {
    const catNames = course.categoryIds
      .map((id) => categoryMap.get(id))
      .filter(Boolean)
      .join(" ");
    documents.push({
      id: `course:${course.id}`,
      kind: "course",
      entityId: course.id,
      title: course.title,
      summary: course.summary || "",
      plainText: "",
      parentTitle: catNames,
      courseTitle: course.title,
      lessonTitle: "",
      href: `/learn/${course.slug}`,
      status: course.status,
    });
  }

  for (const lesson of visibleLessons) {
    const course = courseMap.get(lesson.courseId);
    if (!course) continue;
    documents.push({
      id: `lesson:${lesson.id}`,
      kind: "lesson",
      entityId: lesson.id,
      title: lesson.title,
      summary: lesson.summary || "",
      plainText: "",
      parentTitle: course.title,
      courseTitle: course.title,
      lessonTitle: lesson.title,
      href: `/learn/${course.slug}/${lesson.slug}`,
      status: lesson.isPublished ? "PUBLISHED" : "DRAFT",
    });
  }

  for (const item of visibleItems) {
    const lesson = lessonMap.get(item.lessonId);
    const course = lesson ? courseMap.get(lesson.courseId) : undefined;
    if (!lesson || !course) continue;
    documents.push({
      id: `item:${item.id}`,
      kind: "item",
      entityId: item.id,
      title: item.title,
      summary: item.summary || "",
      plainText: item.plainText || "",
      parentTitle: `${course.title} ${lesson.title}`,
      courseTitle: course.title,
      lessonTitle: lesson.title,
      href: `/learn/${course.slug}/${lesson.slug}/${item.slug}`,
      itemType: item.type,
      status: item.status,
    });
  }

  const miniSearch = new MiniSearch<SearchDocument>({
    fields: SEARCH_FIELDS,
    storeFields: ["id"],
    tokenize: (text) =>
      text
        .split(/[^\p{L}\p{N}]+/u)
        .filter((token) => token.length > 0),
    processTerm: (term) => {
      const folded = foldVietnamese(term).trim();
      return folded.length > 0 ? folded : null;
    },
    searchOptions: {
      boost: BOOST_WEIGHTS,
      prefix: true,
      fuzzy: 0.2,
    },
  });

  miniSearch.addAll(documents);
  const documentsById = new Map(documents.map((d) => [d.id, d]));

  return { miniSearch, documentsById, visibleCourses };
}

/**
 * Tìm kiếm học liệu với kết hợp AND, tự động fallback sang OR nếu không có kết quả.
 */
export function searchHandbook(
  index: HandbookSearchIndex,
  rawQuery: string,
  limitPerGroup = 10
): GroupedSearchResults {
  const query = rawQuery.trim();
  if (!query) {
    return { courses: [], lessons: [], items: [] };
  }

  let rawResults = index.miniSearch.search(query, {
    combineWith: "AND",
    prefix: true,
    fuzzy: 0.2,
    boost: BOOST_WEIGHTS,
  });

  if (rawResults.length === 0) {
    rawResults = index.miniSearch.search(query, {
      combineWith: "OR",
      prefix: true,
      fuzzy: 0.2,
      boost: BOOST_WEIGHTS,
    });
  }

  const grouped: GroupedSearchResults = {
    courses: [],
    lessons: [],
    items: [],
  };

  for (const res of rawResults) {
    const doc = index.documentsById.get(String(res.id));
    if (!doc) continue;

    const sourceForSnippet = doc.plainText || doc.summary;
    const snippet = buildSnippet(sourceForSnippet, query);
    const hit: SearchHit = {
      ...doc,
      score: res.score,
      snippet,
    };

    if (doc.kind === "course" && grouped.courses.length < limitPerGroup) {
      grouped.courses.push(hit);
    } else if (doc.kind === "lesson" && grouped.lessons.length < limitPerGroup) {
      grouped.lessons.push(hit);
    } else if (doc.kind === "item" && grouped.items.length < limitPerGroup) {
      grouped.items.push(hit);
    }
  }

  return grouped;
}
