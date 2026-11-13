export interface ParsedAttendancePerson {
  name: string;
  role: "teacher" | "student";
  code?: string;
  email?: string;
  department?: string;
  courseTitle?: string;
}

export interface AttendanceImportParseResult {
  records: ParsedAttendancePerson[];
  teacherCount: number;
  studentCount: number;
  warnings: string[];
}

const TEACHER_ROLE_WORDS = new Set([
  "teacher",
  "instructor",
  "staff",
  "faculty",
  "lecturer",
  "tutor",
  "prof",
  "professor",
  "educator",
  "admin",
]);

const STUDENT_ROLE_WORDS = new Set([
  "student",
  "learner",
  "pupil",
  "scholar",
  "trainee",
  "candidate",
]);

function normalizeRole(
  raw: string | undefined,
  fallback: "teacher" | "student"
): "teacher" | "student" {
  if (!raw) return fallback;
  const cleaned = raw.trim().toLowerCase();
  if (TEACHER_ROLE_WORDS.has(cleaned)) return "teacher";
  if (STUDENT_ROLE_WORDS.has(cleaned)) return "student";
  if (cleaned.includes("teach") || cleaned.includes("instruct") || cleaned.includes("staff")) {
    return "teacher";
  }
  if (cleaned.includes("stud") || cleaned.includes("learn") || cleaned.includes("pupil")) {
    return "student";
  }
  return fallback;
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function detectDelimiter(lines: string[]): string {
  const sample = lines.slice(0, 5).join("\n");
  const tabCount = (sample.match(/\t/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;
  const semiCount = (sample.match(/;/g) || []).length;

  if (tabCount >= commaCount && tabCount >= semiCount && tabCount > 0) return "\t";
  if (semiCount > commaCount && semiCount > 0) return ";";
  return ",";
}

function dedupeParsedPeople(list: ParsedAttendancePerson[]): ParsedAttendancePerson[] {
  const seen = new Set<string>();
  const deduped: ParsedAttendancePerson[] = [];

  for (const item of list) {
    const key = `${item.role}::${(item.email || item.code || item.name).trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }
  return deduped;
}

export function parseAttendanceImportFile(
  rawText: string,
  fileName: string,
  defaultRole: "teacher" | "student" = "student"
): AttendanceImportParseResult {
  const warnings: string[] = [];
  const text = rawText.replace(/^\uFEFF/, "").trim();
  if (!text) {
    return {
      records: [],
      teacherCount: 0,
      studentCount: 0,
      warnings: ["The uploaded file is empty."],
    };
  }

  // Binary ZIP / Excel (.xlsx / .xls) guard
  if (text.startsWith("PK\u0003\u0004") || fileName.toLowerCase().endsWith(".xlsx") || fileName.toLowerCase().endsWith(".xls")) {
    return {
      records: [],
      teacherCount: 0,
      studentCount: 0,
      warnings: [
        "Excel binary workbooks (.xlsx/.xls) should be saved/exported as CSV UTF-8 (.csv) or TSV (.tsv) before importing.",
      ],
    };
  }

  const parsed: ParsedAttendancePerson[] = [];

  // JSON Support
  if (fileName.toLowerCase().endsWith(".json") || text.startsWith("[") || text.startsWith("{")) {
    try {
      const json = JSON.parse(text) as unknown;
      const rows = Array.isArray(json)
        ? json
        : typeof json === "object" && json !== null && Array.isArray((json as Record<string, unknown>).records)
        ? ((json as Record<string, unknown>).records as unknown[])
        : typeof json === "object" && json !== null && Array.isArray((json as Record<string, unknown>).students)
        ? ((json as Record<string, unknown>).students as unknown[])
        : [];

      rows.forEach((row, index) => {
        if (typeof row === "string" && row.trim()) {
          parsed.push({ name: row.trim(), role: defaultRole });
          return;
        }
        if (typeof row === "object" && row !== null) {
          const obj = row as Record<string, unknown>;
          const rawName = String(
            obj.name ??
              obj.fullName ??
              obj.full_name ??
              obj.studentName ??
              obj.teacherName ??
              ""
          ).trim();
          if (!rawName) {
            warnings.push(`Row ${index + 1}: missing name, skipped.`);
            return;
          }
          const rawRole = obj.role ?? obj.type ?? obj.userRole ?? obj.category;
          const rawCode = obj.code ?? obj.id ?? obj.studentId ?? obj.staffId ?? obj.rollNumber;
          const rawEmail = obj.email ?? obj.mail ?? obj.contactEmail;
          const rawDept = obj.department ?? obj.dept ?? obj.grade ?? obj.wing;
          const rawCourse = obj.course ?? obj.class ?? obj.courseTitle ?? obj.className;

          parsed.push({
            name: rawName,
            role: normalizeRole(rawRole ? String(rawRole) : undefined, defaultRole),
            code: rawCode ? String(rawCode).trim() : undefined,
            email: rawEmail ? String(rawEmail).trim() : undefined,
            department: rawDept ? String(rawDept).trim() : undefined,
            courseTitle: rawCourse ? String(rawCourse).trim() : undefined,
          });
        }
      });

      const records = dedupeParsedPeople(parsed);
      return {
        records,
        teacherCount: records.filter((r) => r.role === "teacher").length,
        studentCount: records.filter((r) => r.role === "student").length,
        warnings,
      };
    } catch {
      warnings.push("File looked like JSON but could not be parsed cleanly.");
      return { records: [], teacherCount: 0, studentCount: 0, warnings };
    }
  }

  // CSV / TSV / TXT Support
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { records: [], teacherCount: 0, studentCount: 0, warnings: ["No non-empty rows found."] };
  }

  const delimiter = detectDelimiter(lines);
  const firstCells = splitDelimitedLine(lines[0], delimiter).map((c) => c.toLowerCase());

  const headerTokens = [
    "name",
    "full name",
    "fullname",
    "student name",
    "teacher name",
    "role",
    "type",
    "email",
    "code",
    "id",
    "id code",
    "student id",
    "staff id",
    "roll",
    "roll number",
    "department",
    "grade",
    "class",
    "course",
  ];
  const hasHeader = firstCells.some((cell) => headerTokens.includes(cell));

  let nameIdx = -1;
  let roleIdx = -1;
  let codeIdx = -1;
  let emailIdx = -1;
  let deptIdx = -1;
  let courseIdx = -1;

  if (hasHeader) {
    firstCells.forEach((h, idx) => {
      if (nameIdx === -1 && (h === "name" || h.includes("full name") || h === "fullname" || h === "student name" || h === "teacher name" || h === "person")) {
        nameIdx = idx;
      } else if (roleIdx === -1 && (h === "role" || h === "type" || h === "category" || h === "position")) {
        roleIdx = idx;
      } else if (codeIdx === -1 && (h === "code" || h === "id" || h === "id code" || h.includes("student id") || h.includes("staff id") || h.includes("roll") || h.includes("badge"))) {
        codeIdx = idx;
      } else if (emailIdx === -1 && (h.includes("email") || h === "mail")) {
        emailIdx = idx;
      } else if (deptIdx === -1 && (h.includes("department") || h === "dept" || h === "grade" || h === "wing")) {
        deptIdx = idx;
      } else if (courseIdx === -1 && (h === "class" || h === "course" || h.includes("course title") || h.includes("class name"))) {
        courseIdx = idx;
      }
    });
    if (nameIdx === -1) nameIdx = 0;
  }

  const startRow = hasHeader ? 1 : 0;
  for (let i = startRow; i < lines.length; i += 1) {
    const cells = splitDelimitedLine(lines[i], delimiter);
    if (cells.length === 0 || !cells[0]) continue;

    if (hasHeader) {
      const name = (cells[nameIdx] || "").trim();
      if (!name) {
        warnings.push(`Row ${i + 1}: empty name, skipped.`);
        continue;
      }
      const rawRole = roleIdx >= 0 ? cells[roleIdx] : undefined;
      parsed.push({
        name,
        role: normalizeRole(rawRole, defaultRole),
        code: codeIdx >= 0 && cells[codeIdx] ? cells[codeIdx].trim() : undefined,
        email: emailIdx >= 0 && cells[emailIdx] ? cells[emailIdx].trim() : undefined,
        department: deptIdx >= 0 && cells[deptIdx] ? cells[deptIdx].trim() : undefined,
        courseTitle: courseIdx >= 0 && cells[courseIdx] ? cells[courseIdx].trim() : undefined,
      });
    } else {
      // Headerless intelligent row mapping
      const name = cells[0].trim();
      let role: "teacher" | "student" = defaultRole;
      let code: string | undefined;
      let email: string | undefined;
      let department: string | undefined;

      for (let c = 1; c < cells.length; c += 1) {
        const val = cells[c].trim();
        if (!val) continue;
        const lower = val.toLowerCase();
        if (TEACHER_ROLE_WORDS.has(lower) || STUDENT_ROLE_WORDS.has(lower)) {
          role = normalizeRole(val, defaultRole);
        } else if (val.includes("@") && !email) {
          email = val;
        } else if (!code) {
          code = val;
        } else if (!department) {
          department = val;
        }
      }

      parsed.push({ name, role, code, email, department });
    }
  }

  const records = dedupeParsedPeople(parsed);
  return {
    records,
    teacherCount: records.filter((r) => r.role === "teacher").length,
    studentCount: records.filter((r) => r.role === "student").length,
    warnings,
  };
}

export function buildSampleAttendanceCsv(mode: "gate" | "class_students"): string {
  if (mode === "class_students") {
    return [
      "Name,ID Code,Email",
      "Chinedu Okafor,STU-101,chinedu@example.com",
      "Amina Yusuf,STU-102,amina@example.com",
      "David Mensah,STU-103,",
    ].join("\n");
  }
  return [
    "Name,Role,ID Code,Email,Department",
    "Mr. Adeyemi Bello,teacher,TCH-01,adeyemi@school.edu,Sciences",
    "Ms. Grace Eze,teacher,TCH-02,grace@school.edu,Mathematics",
    "Chinedu Okafor,student,STU-101,chinedu@example.com,SS2 Science",
    "Amina Yusuf,student,STU-102,,SS2 Science",
  ].join("\n");
}
