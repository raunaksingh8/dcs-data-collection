const pool = require("../db");
const authMiddleware = require("../middleware/auth");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

/** Admin-only guard – returns 403 if the caller is not an admin. */
function adminOnly(req, res) {
  if (req.user.role !== "admin") {
    res.status(403).json({ message: "Access denied" });
    return false;
  }
  return true;
}

/**
 * Build the WHERE clause and parameter array used by both the
 * list and count queries for submissions.
 *
 * Supports: union_id, dcs_id, search, date_from, date_to
 */
function buildSubmissionFilters(query) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (query.union_id) {
    conditions.push(`d.union_id = $${idx++}`);
    params.push(query.union_id);
  }

  if (query.dcs_id) {
    conditions.push(`fs.dcs_id = $${idx++}`);
    params.push(query.dcs_id);
  }

  if (query.search) {
    const like = `%${query.search}%`;
    conditions.push(`(
      d.dcs_name   ILIKE $${idx}
      OR d.dcs_no  ILIKE $${idx}
      OR d.dcs_code ILIKE $${idx}
      OR d.dcs_id   ILIKE $${idx}
      OR d.secretary_name ILIKE $${idx}
    )`);
    params.push(like);
    idx++;
  }

  if (query.date_from) {
    conditions.push(`fs.submission_date >= $${idx++}`);
    params.push(query.date_from);
  }

  if (query.date_to) {
    conditions.push(`fs.submission_date <= $${idx++}`);
    params.push(query.date_to);
  }

  const where = conditions.length > 0
    ? "WHERE " + conditions.join(" AND ")
    : "";

  return { where, params, idx };
}

/** Column list shared by paginated query and export queries */
const SELECT_COLUMNS = `
  fs.submission_id,
  fs.submission_date,
  u.un_name  AS union_name,
  d.dcs_name,
  d.dcs_no,
  d.dcs_code,
  d.dcs_id,
  d.secretary_name,
  fs.committee_formation_date,
  fs.total_active_members,
  fs.member,
  fs.non_member,
  fs.achievement_15_days,
  fs.achievement_monthly,
  fs.monthly_target,
  fs.current_month_target,
  fs.week_1_achievement,
  fs.week_2_achievement,
  fs.week_3_achievement,
  fs.week_4_achievement,
  fs.total_achievement,
  fs.milk_producing_members,
  fs.dat_activated_producers,
  fs.dat_receiving_producers,
  fs.payment_1_to_10,
  fs.payment_11_to_20,
  fs.payment_21_to_31,
  fs.meeting_members_present,
  fs.audit_status,
  fs.submitted_at
`;

const FROM_JOINS = `
  FROM public.form_submissions fs
  JOIN public.dcs_master d      ON fs.dcs_id = d.dcs_id
  LEFT JOIN public.union_master u ON d.union_id = u.union_id
`;

/** Excel-friendly column headers (matching UI TABLE_COLUMNS) */
const COLUMN_HEADERS = [
  // "Submission ID",
  "Submission Date",
  "Union Name",
  "DCS Name",
  "DCS No",
  "DCS Code",
  // "DCS ID",
  "Secretary Name",
  "Committee Formation Date",
  "Total Active Members",
  "Member",
  "Non-Member",
  "15 Days Achievement",
  "Monthly Achievement",
  "Monthly Target",
  "Current Month Target",
  "Week 1 Achievement",
  "Week 2 Achievement",
  "Week 3 Achievement",
  "Week 4 Achievement",
  "Total Achievement",
  "Milk Producing Members",
  "DAT Activated Producers",
  "DAT Receiving Producers",
  "Payment 1–10",
  "Payment 11–20",
  "Payment 21–31",
  "Meeting Members Present",
  "Audit Status",
  "Submitted At",
];

/** Column keys matching the SELECT alias order and UI TABLE_COLUMNS */
const COLUMN_KEYS = [
  // "submission_id",
  "submission_date",
  "union_name",
  "dcs_name",
  "dcs_no",
  "dcs_code",
  // "dcs_id",
  "secretary_name",
  "committee_formation_date",
  "total_active_members",
  "member",
  "non_member",
  "achievement_15_days",
  "achievement_monthly",
  "monthly_target",
  "current_month_target",
  "week_1_achievement",
  "week_2_achievement",
  "week_3_achievement",
  "week_4_achievement",
  "total_achievement",
  "milk_producing_members",
  "dat_activated_producers",
  "dat_receiving_producers",
  "payment_1_to_10",
  "payment_11_to_20",
  "payment_21_to_31",
  "meeting_members_present",
  "audit_status",
  "submitted_at",
];

const EXPORT_ROW_LIMIT = 50000;

/** Format a date for Indian locale display */
function formatDateIST(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return String(value);
  }
}

function formatDateTimeIST(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return String(value);
  }
}

function cellValue(v) {
  return v === null || v === undefined ? "-" : v;
}


// ════════════════════════════════════════════
// Routes
// ════════════════════════════════════════════

module.exports = (app) => {

  // ──────────────────────────────────────────
  // GET /api/admin/unions
  // ──────────────────────────────────────────
  app.get("/api/admin/unions", authMiddleware, async (req, res) => {
    if (!adminOnly(req, res)) return;

    try {
      const result = await pool.query(
        "SELECT union_id, un_name FROM public.union_master ORDER BY un_name"
      );

      return res.json({ unions: result.rows });
    } catch (err) {
      console.error("Admin unions error:", err);
      return res.status(500).json({ message: "Unable to load unions" });
    }
  });


  // ──────────────────────────────────────────
  // GET /api/admin/dcs?union_id=
  // ──────────────────────────────────────────
  app.get("/api/admin/dcs", authMiddleware, async (req, res) => {
    if (!adminOnly(req, res)) return;

    try {
      let sql = "SELECT dcs_id, dcs_name, dcs_no, dcs_code FROM public.dcs_master";
      const params = [];

      if (req.query.union_id) {
        sql += " WHERE union_id = $1";
        params.push(req.query.union_id);
      }

      sql += " ORDER BY dcs_name";

      const result = await pool.query(sql, params);

      return res.json({ dcs: result.rows });
    } catch (err) {
      console.error("Admin DCS error:", err);
      return res.status(500).json({ message: "Unable to load DCS list" });
    }
  });


  // ──────────────────────────────────────────
  // GET /api/admin/submissions
  // Paginated + filtered
  // ──────────────────────────────────────────
  app.get("/api/admin/submissions", authMiddleware, async (req, res) => {
    if (!adminOnly(req, res)) return;

    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
      const offset = (page - 1) * limit;

      const { where, params, idx } = buildSubmissionFilters(req.query);

      // Count
      const countSQL = `SELECT COUNT(*) ${FROM_JOINS} ${where}`;
      const countResult = await pool.query(countSQL, params);
      const total = parseInt(countResult.rows[0].count, 10);

      // Data
      const dataParams = [...params, limit, offset];
      const dataSQL = `
        SELECT ${SELECT_COLUMNS}
        ${FROM_JOINS}
        ${where}
        ORDER BY fs.submission_date DESC, fs.submitted_at DESC
        LIMIT $${idx} OFFSET $${idx + 1}
      `;
      const dataResult = await pool.query(dataSQL, dataParams);

      return res.json({
        data: dataResult.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      });
    } catch (err) {
      console.error("Admin submissions error:", err);
      return res.status(500).json({ message: "Unable to load submissions" });
    }
  });


  // ──────────────────────────────────────────
  // GET /api/admin/submissions/export/excel
  // ──────────────────────────────────────────
  app.get("/api/admin/submissions/export/excel", authMiddleware, async (req, res) => {
    if (!adminOnly(req, res)) return;

    try {
      const { where, params, idx } = buildSubmissionFilters(req.query);

      const sql = `
        SELECT ${SELECT_COLUMNS}
        ${FROM_JOINS}
        ${where}
        ORDER BY fs.submission_date DESC, fs.submitted_at DESC
        LIMIT ${EXPORT_ROW_LIMIT}
      `;

      const result = await pool.query(sql, params);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "COMFED Admin";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Submissions");

      // Header row
      sheet.columns = COLUMN_HEADERS.map((header, i) => ({
        header,
        key: COLUMN_KEYS[i],
        width: header.length + 6,
      }));

      // Style header
      sheet.getRow(1).font = { bold: true, size: 11 };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1D4ED8" },
      };
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };

      // Data rows
      for (const row of result.rows) {
        const values = {};
        COLUMN_KEYS.forEach((key) => {
          let v = row[key];
          if (key === "submission_date" || key === "committee_formation_date" || key === "audit_status") {
            v = formatDateIST(v);
          } else if (key === "submitted_at") {
            v = formatDateTimeIST(v);
          }
          values[key] = cellValue(v);
        });
        sheet.addRow(values);
      }

      // Response
      const filename = `COMFED_Submissions_${new Date().toISOString().slice(0, 10)}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      await workbook.xlsx.write(res);
      res.end();

    } catch (err) {
      console.error("Admin Excel export error:", err);
      return res.status(500).json({ message: "Export failed" });
    }
  });


  // ──────────────────────────────────────────
  // GET /api/admin/submissions/export/pdf
  // ──────────────────────────────────────────
  // app.get("/api/admin/submissions/export/pdf", authMiddleware, async (req, res) => {
  //   if (!adminOnly(req, res)) return;

  //   try {
  //     const { where, params, idx } = buildSubmissionFilters(req.query);

  //     const sql = `
  //       SELECT ${SELECT_COLUMNS}
  //       ${FROM_JOINS}
  //       ${where}
  //       ORDER BY fs.submission_date DESC, fs.submitted_at DESC
  //       LIMIT ${EXPORT_ROW_LIMIT}
  //     `;

  //     const result = await pool.query(sql, params);

  //     const filename = `COMFED_Submissions_${new Date().toISOString().slice(0, 10)}.pdf`;

  //     res.setHeader("Content-Type", "application/pdf");
  //     res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  //     // Use a subset of columns for the PDF to keep it readable
  //     const pdfColumns = [
  //       "submission_id",
  //       "submission_date",
  //       "union_name",
  //       "dcs_name",
  //       "dcs_no",
  //       "secretary_name",
  //       "total_active_members",
  //       "member",
  //       "non_member",
  //       "monthly_target",
  //       "total_achievement",
  //       "audit_status",
  //     ];

  //     const pdfHeaders = [
  //       "ID",
  //       "Date",
  //       "Union",
  //       "DCS Name",
  //       "DCS No",
  //       "Secretary",
  //       "Active Members",
  //       "Member",
  //       "Non-Member",
  //       "Target",
  //       "Achievement",
  //       "Audit",
  //     ];

  //     const doc = new PDFDocument({
  //       layout: "landscape",
  //       size: "A3",
  //       margin: 30,
  //       bufferPages: true,
  //     });

  //     doc.pipe(res);

  //     // Title
  //     doc.fontSize(16).font("Helvetica-Bold").text("COMFED - DCS Submissions Report", { align: "center" });
  //     doc.fontSize(9).font("Helvetica").text(
  //       `Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}  |  Total rows: ${result.rows.length}`,
  //       { align: "center" }
  //     );
  //     doc.moveDown(1);

  //     // Table
  //     const startX = 30;
  //     let y = doc.y;
  //     const colWidths = [50, 80, 130, 140, 85, 110, 75, 55, 65, 70, 80, 65];
  //     const rowHeight = 18;
  //     const headerHeight = 22;
  //     const pageHeight = doc.page.height - 60;

  //     // Draw header
  //     function drawHeader() {
  //       doc.fontSize(8).font("Helvetica-Bold");
  //       let x = startX;
  //       // Header background
  //       doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), headerHeight)
  //         .fill("#1d4ed8");

  //       x = startX;
  //       pdfHeaders.forEach((h, i) => {
  //         doc.fillColor("#ffffff").text(h, x + 4, y + 5, { width: colWidths[i] - 8, height: headerHeight });
  //         x += colWidths[i];
  //       });

  //       doc.fillColor("#000000");
  //       y += headerHeight;
  //     }

  //     drawHeader();

  //     // Rows
  //     doc.font("Helvetica").fontSize(7);

  //     for (let r = 0; r < result.rows.length; r++) {
  //       if (y + rowHeight > pageHeight) {
  //         doc.addPage({ layout: "landscape", size: "A3", margin: 30 });
  //         y = 30;
  //         drawHeader();
  //       }

  //       const row = result.rows[r];

  //       // Alternating bg
  //       if (r % 2 === 0) {
  //         doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowHeight)
  //           .fill("#f5f7fa");
  //         doc.fillColor("#000000");
  //       }

  //       let x = startX;
  //       pdfColumns.forEach((key, i) => {
  //         let v = row[key];
  //         if (key === "submission_date" || key === "committee_formation_date" || key === "audit_status") {
  //           v = formatDateIST(v);
  //         } else if (key === "submitted_at") {
  //           v = formatDateTimeIST(v);
  //         }
  //         const display = cellValue(v);
  //         doc.text(String(display), x + 4, y + 4, { width: colWidths[i] - 8, height: rowHeight, ellipsis: true });
  //         x += colWidths[i];
  //       });

  //       y += rowHeight;
  //     }

  //     if (result.rows.length === 0) {
  //       doc.fontSize(12).text("No submissions found.", { align: "center" });
  //     }

  //     doc.end();

  //   } catch (err) {
  //     console.error("Admin PDF export error:", err);
  //     if (!res.headersSent) {
  //       return res.status(500).json({ message: "Export failed" });
  //     }
  //   }
  // });

};
