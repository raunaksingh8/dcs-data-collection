import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/AdminDashboard.css";
import { CiSearch } from "react-icons/ci";
import API from "../config/api";

/** Format a date string to Indian locale (14 September 2026) */
function formatDate(value) {
    if (!value) return "–";
    try {
        const d = new Date(value);
        if (isNaN(d)) return "–";
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

/** Format a datetime string to Indian locale */
function formatDateTime(value) {
    if (!value) return "–";
    try {
        const d = new Date(value);
        if (isNaN(d)) return "–";
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

/** Display null / undefined as dash */
function cell(v) {
    if (v === null || v === undefined || v === "") return "–";
    return v;
}

/** Format number with Indian comma grouping */
function formatNumber(n) {
    if (n === null || n === undefined || n === "") return "–";
    return Number(n).toLocaleString("en-IN");
}

/**
 * Format a summary number (SUM of a numeric column).
 * Whole numbers display without decimals; fractional values keep up to 2 dp.
 */
function formatSummaryNum(n) {
    const num = Number(n);
    if (isNaN(num)) return "0";
    if (Number.isInteger(num)) return num.toLocaleString("en-IN");
    return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** Format audit status: date if YYYY-MM-DD, otherwise string or dash */
function formatAuditStatus(value) {
    if (value === null || value === undefined || value === "") return "–";
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return formatDate(value);
    }
    return String(value);
}


// ────────────────────────────────────────────
// COLUMN CONFIG
// ────────────────────────────────────────────

const TABLE_COLUMNS = [
    // { key: "submission_id", label: "ID", render: cell },
    {
        key: "submission_date",
        label: <>Submission Date<br />प्रपत्र जमा करने की तिथि</>,
        render: formatDate
    },

    {
        key: "union_name",
        label: <>Union Name<br />संघ का नाम</>,
        render: cell
    },

    {
        key: "dcs_name",
        label: <>DCS Name<br />डी०सी०एस० का नाम</>,
        render: cell
    },

    {
        key: "dcs_no",
        label: <>DCS No<br />डी०सी०एस० संख्या</>,
        render: cell
    },

    {
        key: "dcs_code",
        label: <>DCS Code<br />डी०सी०एस० कोड</>,
        render: cell
    },

    // { key: "dcs_id", label: "DCS ID", render: cell },

    {
        key: "secretary_name",
        label: <>Secretary Name<br />सचिव का नाम</>,
        render: cell
    },
    {
        key: "committee_formation_date",
        label: <>Committee Date<br />समिति गठन की तिथि</>,
        render: formatDate
    },

    {
        key: "total_active_members",
        label: <>Total Active Members<br />कुल सदस्य एवं असदस्य की संख्या</>,
        render: formatNumber
    },

    {
        key: "member",
        label: <>Member<br />सदस्य संख्या</>,
        render: formatNumber
    },

    {
        key: "non_member",
        label: <>Non-Member<br />असदस्य संख्या</>,
        render: formatNumber
    },

    {
        key: "achievement_15_days",
        label: <>15 Days Achievement<br />विगत 15 दिन में नये जुड़े सदस्यों की सख्या</>,
        render: formatNumber
    },

    {
        key: "achievement_monthly",
        label: <>Monthly Achievement<br />इस माह में नये जुड़े सदस्यों की संख्या</>,
        render: formatNumber
    },

    {
        key: "monthly_target",
        label: <>Monthly Target<br />कुल लक्ष्य</>,
        render: formatNumber
    },

    {
        key: "current_month_target",
        label: <>Current Month Target<br />इस माह का लक्ष्य</>,
        render: formatNumber
    },

    {
        key: "week_1_achievement",
        label: <>Week 1 Achievement<br />प्रथम सप्ताह की उपलब्धि</>,
        render: formatNumber
    },

    {
        key: "week_2_achievement",
        label: <>Week 2 Achievement<br />द्वितीय सप्ताह की उपलब्धि</>,
        render: formatNumber
    },

    {
        key: "week_3_achievement",
        label: <>Week 3 Achievement<br />तृतीय सप्ताह की उपलब्धि</>,
        render: formatNumber
    },

    {
        key: "week_4_achievement",
        label: <>Week 4 Achievement<br />चतुर्थ सप्ताह की उपलब्धि</>,
        render: formatNumber
    },

    {
        key: "total_achievement",
        label: <>Total Achievement<br />कुल उपलब्धि</>,
        render: formatNumber
    },

    {
        key: "milk_producing_members",
        label: <>Total Farmers<br />कुल दुग्ध उत्पादकों की संख्या</>,
        render: formatNumber
    },

    {
        key: "dat_activated_producers",
        label: <>Total Registered Farmers in DAT<br />DAT में कुल स्वीकृत उत्पादकों की संख्या</>,
        render: formatNumber
    },

    {
        key: "dat_receiving_producers",
        label: <>Total Pouring Farmers in DAT<br />DAT में कुल दूध देने वाले सदस्यों की संख्या</>,
        render: formatNumber
    },

    {
        key: "payment_1_to_10",
        label: <>Payment 1–10 in ₹<br />राशि विपत्र अवधि 1-10</>,
        render: formatNumber
    },

    {
        key: "payment_11_to_20",
        label: <>Payment 11–20 in ₹<br />राशि विपत्र अवधि 11-20</>,
        render: formatNumber
    },

    {
        key: "payment_21_to_31",
        label: <>Payment 21–31 in ₹<br />राशि विपत्र अवधि 21-31</>,
        render: formatNumber
    },

    {
        key: "meeting_members_present",
        label: <>Members Present in Meeting<br />उपस्थित सदस्यों की संख्या</>,
        render: formatNumber
    },

    {
        key: "audit_status",
        label: <>Audit Status<br />समिति की अन्तिम ऑडिट का वर्ष</>,
        render: formatAuditStatus
    },
    { key: "submitted_at", label: "Submitted At", render: formatDateTime },
];

/** Dedicated row component to keep React fiber tree shallow and prevent Fast Refresh stack overflow */
const AdminTableRow = React.memo(function AdminTableRow({ row, columns }) {
    return (
        <tr>
            {columns.map((col) => (
                <td key={col.key}>
                    {col.render ? col.render(row[col.key]) : row[col.key]}
                </td>
            ))}
        </tr>
    );
});


// ────────────────────────────────────────────
// EXCEL EXPORT COLUMN CONFIG
// Separate from TABLE_COLUMNS so labels can use \n (not JSX <br />)
// ────────────────────────────────────────────

const EXCEL_COLUMNS = [
    { key: "submission_date", header: "Submission Date \n जमा करने की तिथि", render: formatDate },
    { key: "union_name", header: "Union Name \n संघ का नाम", render: cell },
    { key: "dcs_name", header: "DCS Name \n डी०सी०एस० का नाम", render: cell },
    { key: "dcs_no", header: "DCS No \n डी०सी०एस० संख्या", render: cell },
    { key: "dcs_code", header: "DCS Code \n डी०सी०एस० कोड", render: cell },
    { key: "secretary_name", header: "Secretary Name \n सचिव का नाम", render: cell },
    { key: "committee_formation_date", header: "Committee Date \n समिति गठन की तिथि", render: formatDate },
    { key: "total_active_members", header: "Total Active Members \n कुल सदस्य एवं असदस्य की संख्या", render: formatNumber },
    { key: "member", header: "Member \n सदस्य संख्या", render: formatNumber },
    { key: "non_member", header: "Non-Member \n असदस्य संख्या", render: formatNumber },
    { key: "achievement_15_days", header: "15 Days Achievement \n विगत 15 दिन में नये जुड़े सदस्यों की सख्या", render: formatNumber },
    { key: "achievement_monthly", header: "Monthly Achievement \n इस माह में नये जुड़े सदस्यों की संख्या", render: formatNumber },
    { key: "monthly_target", header: "Monthly Target \n कुल लक्ष्य", render: formatNumber },
    { key: "current_month_target", header: "Current Month Target \n इस माह का लक्ष्य", render: formatNumber },
    { key: "week_1_achievement", header: "Week 1 Achievement \n प्रथम सप्ताह की उपलब्धि", render: formatNumber },
    { key: "week_2_achievement", header: "Week 2 Achievement \n द्वितीय सप्ताह की उपलब्धि", render: formatNumber },
    { key: "week_3_achievement", header: "Week 3 Achievement \n तृतीय सप्ताह की उपलब्धि", render: formatNumber },
    { key: "week_4_achievement", header: "Week 4 Achievement \n चतुर्थ सप्ताह की उपलब्धि", render: formatNumber },
    { key: "total_achievement", header: "Total Achievement \n कुल उपलब्धि", render: formatNumber },
    { key: "milk_producing_members", header: "Total Farmers \n कुल दुग्ध उत्पादकों की संख्या", render: formatNumber },
    { key: "dat_activated_producers", header: "Total Registered Farmers in DAT \n DAT में कुल स्वीकृत उत्पादकों की संख्या", render: formatNumber },
    { key: "dat_receiving_producers", header: "Total Pouring Farmers in DAT \n DAT में कुल दूध देने वाले सदस्यों की संख्या", render: formatNumber },
    { key: "payment_1_to_10", header: "Payment 1\u201310 in \u20B9 \n राशि विपत्र अवधि 1-10", render: formatNumber },
    { key: "payment_11_to_20", header: "Payment 11\u201320 in \u20B9 \n राशि विपत्र अवधि 11-20", render: formatNumber },
    { key: "payment_21_to_31", header: "Payment 21\u201331 in \u20B9 \n राशि विपत्र अवधि 21-31", render: formatNumber },
    { key: "meeting_members_present", header: "Members Present in Meeting \n उपस्थित सदस्यों की संख्या", render: formatNumber },
    { key: "audit_status", header: "Audit Status \n समिति की अन्तिम ऑडिट का वर्ष", render: (v) => (v === null || v === undefined || v === "" ? "" : String(v)) },
    { key: "submitted_at", header: "Submitted At \n जमा करने का समय", render: formatDateTime },
];



// ════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════

export default function AdminDashboard({ user, onLogout }) {
    const navigate = useNavigate();

    // ── Filters ──
    const [unionId, setUnionId] = useState("");
    const [dcsId, setDcsId] = useState("");
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // ── Dropdowns ──
    const [unions, setUnions] = useState([]);
    const [dcsList, setDcsList] = useState([]);

    // ── Table ──
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [totalPages, setTotalPages] = useState(1);

    // ── State ──
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exporting, setExporting] = useState(null); // "excel" | "pdf" | null

    const searchTimer = useRef(null);
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // ── Summary ──
    const SUMMARY_DEFAULTS = {
        week_1_achievement: 0,
        week_2_achievement: 0,
        week_3_achievement: 0,
        week_4_achievement: 0,
        total_achievement: 0,
        payment_1_to_10: 0,
        payment_11_to_20: 0,
        payment_21_to_31: 0,
        audit_count: 0,
    };
    const [summary, setSummary] = useState(SUMMARY_DEFAULTS);
    const [summaryLoading, setSummaryLoading] = useState(true);

    // ── Auth helper ──
    const token = localStorage.getItem("token");

    const authHeaders = useCallback(() => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    }), [token]);

    // ── Debounce search ──
    useEffect(() => {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);

        return () => clearTimeout(searchTimer.current);
    }, [search]);

    // ── Load unions ──
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API}/api/admin/unions`, {
                    headers: authHeaders(),
                });
                if (res.ok) {
                    const json = await res.json();
                    setUnions(json.unions || []);
                }
            } catch {
                // silent
            }
        })();
    }, [authHeaders]);

    // ── Load DCS (cascading by union) ──
    useEffect(() => {
        (async () => {
            try {
                const url = unionId
                    ? `${API}/api/admin/dcs?union_id=${encodeURIComponent(unionId)}`
                    : `${API}/api/admin/dcs`;

                const res = await fetch(url, { headers: authHeaders() });
                if (res.ok) {
                    const json = await res.json();
                    setDcsList(json.dcs || []);
                }
            } catch {
                // silent
            }
        })();

        // Reset DCS selection when union changes
        setDcsId("");
    }, [unionId, authHeaders]);

    // ── Load submissions ──
    const fetchSubmissions = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
            });

            if (unionId) params.set("union_id", unionId);
            if (dcsId) params.set("dcs_id", dcsId);
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (dateFrom) params.set("date_from", dateFrom);
            if (dateTo) params.set("date_to", dateTo);

            const res = await fetch(
                `${API}/api/admin/submissions?${params.toString()}`,
                { headers: authHeaders() }
            );

            if (!res.ok) {
                throw new Error("Failed to load submissions");
            }

            const json = await res.json();
            setData(json.data || []);
            setTotal(json.total || 0);
            setTotalPages(json.totalPages || 1);
        } catch (err) {
            setError(err.message || "Unable to load submissions");
        } finally {
            setLoading(false);
        }
    }, [page, limit, unionId, dcsId, debouncedSearch, dateFrom, dateTo, authHeaders]);

    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    // ── Fetch Summary ──
    const fetchSummary = useCallback(async () => {
        setSummaryLoading(true);
        try {
            const params = new URLSearchParams();
            if (unionId) params.set("union_id", unionId);
            if (dcsId) params.set("dcs_id", dcsId);
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (dateFrom) params.set("date_from", dateFrom);
            if (dateTo) params.set("date_to", dateTo);

            const res = await fetch(
                `${API}/api/admin/submissions/summary?${params.toString()}`,
                { headers: authHeaders() }
            );

            if (res.ok) {
                const json = await res.json();
                setSummary({
                    week_1_achievement: Number(json.week_1_achievement) || 0,
                    week_2_achievement: Number(json.week_2_achievement) || 0,
                    week_3_achievement: Number(json.week_3_achievement) || 0,
                    week_4_achievement: Number(json.week_4_achievement) || 0,
                    total_achievement: Number(json.total_achievement) || 0,
                    payment_1_to_10: Number(json.payment_1_to_10) || 0,
                    payment_11_to_20: Number(json.payment_11_to_20) || 0,
                    payment_21_to_31: Number(json.payment_21_to_31) || 0,
                    audit_count: Number(json.audit_count) || 0,
                });
            } else {
                setSummary(SUMMARY_DEFAULTS);
            }
        } catch {
            setSummary(SUMMARY_DEFAULTS);
        } finally {
            setSummaryLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unionId, dcsId, debouncedSearch, dateFrom, dateTo, authHeaders]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    // ── Filter handlers ──
    const handleUnionChange = (e) => {
        setUnionId(e.target.value);
        setPage(1);
    };

    const handleDcsChange = (e) => {
        setDcsId(e.target.value);
        setPage(1);
    };

    const handleDateFromChange = (e) => {
        setDateFrom(e.target.value);
        setPage(1);
    };

    const handleDateToChange = (e) => {
        setDateTo(e.target.value);
        setPage(1);
    };

    const handleLimitChange = (e) => {
        setLimit(parseInt(e.target.value, 10));
        setPage(1);
    };

    // ── Export ──
    const handleExport = async (type) => {
        if (type === "excel") {
            if (!data || data.length === 0) {
                toast.info("No data in table to export");
                return;
            }

            setExporting("excel");

            try {
                const XLSX = await import("xlsx");

                // ── Header row (bilingual, \n-separated) ──
                const headerRow = EXCEL_COLUMNS.map((col) => col.header);

                // ── Data rows (formatted, same as UI) ──
                const dataRows = data.map((row) =>
                    EXCEL_COLUMNS.map((col) => {
                        const formatted = col.render
                            ? col.render(row[col.key])
                            : (row[col.key] ?? "");
                        return formatted === "–" ? "" : (formatted ?? "");
                    })
                );

                // ── Build worksheet from AOA ──
                const aoa = [headerRow, ...dataRows];
                const worksheet = XLSX.utils.aoa_to_sheet(aoa);

                // ── Column widths (auto-fit, capped) ──
                worksheet["!cols"] = EXCEL_COLUMNS.map((col) => {
                    const headerLen = col.header.split("\n")[0].length;
                    const maxDataLen = data.reduce((max, r) => {
                        const val = col.render ? col.render(r[col.key]) : r[col.key];
                        const len = val && val !== "–" ? String(val).length : 0;
                        return Math.max(max, len);
                    }, 0);
                    return { wch: Math.min(Math.max(headerLen, maxDataLen) + 4, 48) };
                });

                // ── Header row height (~52pt for 2 lines of text) ──
                worksheet["!rows"] = [{ hpt: 52 }];

                // ── Apply wrapText + bold + blue background to header cells ──
                const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
                for (let C = range.s.c; C <= range.e.c; C++) {
                    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
                    if (!worksheet[addr]) continue;
                    worksheet[addr].s = {
                        font: { bold: true, color: { rgb: "FFFFFF" } },
                        fill: { fgColor: { rgb: "1D4ED8" }, patternType: "solid" },
                        alignment: { wrapText: true, vertical: "top" },
                    };
                }

                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");

                XLSX.writeFile(
                    workbook,
                    `COMFED_Submissions_${new Date().toISOString().slice(0, 10)}.xlsx`
                );

                toast.success("Excel exported successfully!");
            } catch (err) {
                console.error("Excel export error:", err);
                toast.error("Export failed. Please try again.");
            } finally {
                setExporting(null);
            }
            return;
        }

        // Fallback for other export types (e.g. PDF if re-enabled)
        setExporting(type);

        try {
            const params = new URLSearchParams();
            if (unionId) params.set("union_id", unionId);
            if (dcsId) params.set("dcs_id", dcsId);
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (dateFrom) params.set("date_from", dateFrom);
            if (dateTo) params.set("date_to", dateTo);

            const res = await fetch(
                `${API}/api/admin/submissions/export/${type}?${params.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!res.ok) throw new Error("Export failed");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `COMFED_Submissions_${new Date().toISOString().slice(0, 10)}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            toast.success("PDF exported successfully!");
        } catch {
            toast.error("Export failed. Please try again.");
        } finally {
            setExporting(null);
        }
    };

    // ── Logout ──
    const logout = () => {
        toast.success("Logout successful");
        onLogout();
        navigate("/", { replace: true });
    };

    // ── Computed ──
    const startRow = total === 0 ? 0 : (page - 1) * limit + 1;
    const endRow = Math.min(page * limit, total);


    // ════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════

    return (
        <div className="admin-page">

            {/* Header */}
            <header className="admin-header">
                <div>
                    <div className="admin-brand">
                        <img
                            src={process.env.PUBLIC_URL + "/logoimage.png"}
                            alt="COMFED Logo"
                            className="admin-brand-logo-img"
                        />

                        <div>
                            <h1>COMFED</h1>
                            <span>Admin Dashboard</span>
                        </div>
                    </div>
                </div>

                <div className="admin-user-info">
                    <div className="admin-user-details">
                        <strong>Administrator</strong>
                        <span>{user?.admin_phone_no}</span>
                    </div>

                    <button
                        className="admin-logout-btn"
                        onClick={logout}
                    >
                        Logout
                    </button>
                </div>
            </header>


            {/* Main Content */}
            <main className="admin-main">

                {/* Summary Cards Grid */}
                <div className="admin-summary-grid">

                    {/* Total Submissions – existing card */}
                    <div className="admin-summary-card">
                        <div>
                            <div className="admin-summary-label">Total Submissions</div>
                            <div className="admin-summary-value">
                                {loading ? "…" : formatNumber(total)}
                            </div>
                        </div>
                    </div>

                    {/* Week 1 */}
                    <div className="admin-summary-card admin-summary-card--week1">
                        <div>
                            <div className="admin-summary-label">Week 1 Achievement</div>
                            <div className="admin-summary-value">
                                {summaryLoading ? "…" : formatSummaryNum(summary.week_1_achievement)}
                            </div>
                        </div>
                    </div>

                    {/* Week 2 */}
                    <div className="admin-summary-card admin-summary-card--week2">
                        <div>
                            <div className="admin-summary-label">Week 2 Achievement</div>
                            <div className="admin-summary-value">
                                {summaryLoading ? "…" : formatSummaryNum(summary.week_2_achievement)}
                            </div>
                        </div>
                    </div>

                    {/* Week 3 */}
                    <div className="admin-summary-card admin-summary-card--week3">
                        <div>
                            <div className="admin-summary-label">Week 3 Achievement</div>
                            <div className="admin-summary-value">
                                {summaryLoading ? "…" : formatSummaryNum(summary.week_3_achievement)}
                            </div>
                        </div>
                    </div>

                    {/* Week 4 */}
                    <div className="admin-summary-card admin-summary-card--week4">
                        <div>
                            <div className="admin-summary-label">Week 4 Achievement</div>
                            <div className="admin-summary-value">
                                {summaryLoading ? "…" : formatSummaryNum(summary.week_4_achievement)}
                            </div>
                        </div>
                    </div>

                    {/* Total Achievement */}
                    <div className="admin-summary-card admin-summary-card--total">
                        <div>
                            <div className="admin-summary-label">Total Achievement</div>
                            <div className="admin-summary-value">
                                {summaryLoading ? "…" : formatSummaryNum(summary.total_achievement)}
                            </div>
                        </div>
                    </div>

                    {/* Payment 1-10 */}
                    <div className="admin-summary-card admin-summary-card--pay1">
                        <div>
                            <div className="admin-summary-label">Payment 1–10 (₹)</div>
                            <div className="admin-summary-value">
                                {summaryLoading ? "…" : formatSummaryNum(summary.payment_1_to_10)}
                            </div>
                        </div>
                    </div>

                    {/* Payment 11-20 */}
                    <div className="admin-summary-card admin-summary-card--pay2">
                        <div>
                            <div className="admin-summary-label">Payment 11–20 (₹)</div>
                            <div className="admin-summary-value">
                                {summaryLoading ? "…" : formatSummaryNum(summary.payment_11_to_20)}
                            </div>
                        </div>
                    </div>

                    {/* Payment 21-31 */}
                    <div className="admin-summary-card admin-summary-card--pay3">
                        <div>
                            <div className="admin-summary-label">Payment 21–31 (₹)</div>
                            <div className="admin-summary-value">
                                {summaryLoading ? "…" : formatSummaryNum(summary.payment_21_to_31)}
                            </div>
                        </div>
                    </div>

                    {/* Audit Count */}
                    <div className="admin-summary-card admin-summary-card--audit">
                        <div>
                            <div className="admin-summary-label">Audit Count</div>
                            <div className="admin-summary-value">
                                {summaryLoading ? "…" : formatNumber(summary.audit_count)}
                            </div>
                        </div>
                    </div>

                </div>


                {/* Filters */}
                <div className="admin-filters">

                    {/* Union */}
                    <div className="admin-filter-group">
                        <label>Union</label>
                        <select
                            value={unionId}
                            onChange={handleUnionChange}
                        >
                            <option value="">All Unions</option>
                            {unions.map((u) => (
                                <option
                                    key={u.union_id}
                                    value={u.union_id}
                                >
                                    {u.un_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* DCS */}
                    <div className="admin-filter-group">
                        <label>DCS</label>
                        <select
                            value={dcsId}
                            onChange={handleDcsChange}
                        >
                            <option value="">All DCS</option>
                            {dcsList.map((d) => (
                                <option
                                    key={d.dcs_id}
                                    value={d.dcs_id}
                                >
                                    {d.dcs_name?.trim()} ({d.dcs_no})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date From */}
                    <div className="admin-filter-group">
                        <label>From Date</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={handleDateFromChange}
                        />
                    </div>

                    {/* Date To */}
                    <div className="admin-filter-group">
                        <label>To Date</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={handleDateToChange}
                        />
                    </div>

                    {/* Search */}
                    <div className="admin-filter-group admin-search-group">
                        <label>Search</label>
                        <div className="admin-search-wrapper">
                            <span className="admin-search-icon"><CiSearch size={20} /></span>
                            <input
                                type="text"
                                placeholder="Search DCS name, number, code, secretary..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Export */}
                    <div className="admin-filter-actions">
                        <button
                            className="admin-export-btn excel-btn"
                            onClick={() => handleExport("excel")}
                            disabled={exporting !== null}
                        >
                            {exporting === "excel" ? "⏳" : "📗"}{" "}
                            Excel
                        </button>

                        {/* <button
                            className="admin-export-btn pdf-btn"
                            onClick={() => handleExport("pdf")}
                            disabled={exporting !== null}
                        >
                            {exporting === "pdf" ? "⏳" : "📕"}{" "}
                            PDF
                        </button> */}
                    </div>
                </div>


                {/* Table */}
                <div className="admin-table-card">

                    {loading ? (
                        <div className="admin-loading">
                            <div className="admin-spinner"></div>
                            <div className="admin-loading-text">
                                Loading submissions...
                            </div>
                        </div>

                    ) : error ? (
                        <div className="admin-error">
                            <div className="admin-error-icon">⚠️</div>
                            <div className="admin-error-text">{error}</div>
                            <button
                                className="admin-retry-btn"
                                onClick={fetchSubmissions}
                            >
                                Retry
                            </button>
                        </div>

                    ) : data.length === 0 ? (
                        <div className="admin-empty">
                            <div className="admin-empty-icon">📭</div>
                            <div className="admin-empty-text">
                                No submissions found.
                            </div>
                        </div>

                    ) : (
                        <>
                            <div className="admin-table-scroll">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            {TABLE_COLUMNS.map((col) => (
                                                <th key={col.key}>
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {data.map((row, idx) => (
                                            <AdminTableRow
                                                key={row.submission_id || idx}
                                                row={row}
                                                columns={TABLE_COLUMNS}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="admin-pagination">
                                <div className="admin-pagination-info">
                                    Showing {formatNumber(startRow)}–{formatNumber(endRow)} of{" "}
                                    {formatNumber(total)}
                                </div>

                                <div className="admin-pagination-controls">
                                    <button
                                        className="admin-page-btn"
                                        disabled={page <= 1}
                                        onClick={() => setPage((p) => p - 1)}
                                    >
                                        ← Previous
                                    </button>

                                    <span className="admin-page-indicator">
                                        Page {formatNumber(page)} of{" "}
                                        {formatNumber(totalPages)}
                                    </span>

                                    <button
                                        className="admin-page-btn"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage((p) => p + 1)}
                                    >
                                        Next →
                                    </button>
                                </div>

                                <div className="admin-page-size">
                                    <label>Rows:</label>
                                    <select
                                        value={limit}
                                        onChange={handleLimitChange}
                                    >
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}
                </div>

            </main>
        </div>
    );
}
