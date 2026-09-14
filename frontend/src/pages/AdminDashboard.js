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
    { key: "submission_date", label: "Submission Date", render: formatDate },
    { key: "union_name", label: "Union Name", render: cell },
    { key: "dcs_name", label: "DCS Name", render: cell },
    { key: "dcs_no", label: "DCS No", render: cell },
    { key: "dcs_code", label: "DCS Code", render: cell },
    // { key: "dcs_id", label: "DCS ID", render: cell },
    { key: "secretary_name", label: "Secretary Name", render: cell },
    { key: "committee_formation_date", label: "Committee Date", render: formatDate },
    { key: "total_active_members", label: "Active Members", render: formatNumber },
    { key: "member", label: "Member", render: formatNumber },
    { key: "non_member", label: "Non-Member", render: formatNumber },
    { key: "achievement_15_days", label: "15 Day Achv.", render: formatNumber },
    { key: "achievement_monthly", label: "Monthly Achv.", render: formatNumber },
    { key: "monthly_target", label: "Monthly Target", render: formatNumber },
    { key: "current_month_target", label: "Current Target", render: formatNumber },
    { key: "week_1_achievement", label: "Week 1", render: formatNumber },
    { key: "week_2_achievement", label: "Week 2", render: formatNumber },
    { key: "week_3_achievement", label: "Week 3", render: formatNumber },
    { key: "week_4_achievement", label: "Week 4", render: formatNumber },
    { key: "total_achievement", label: "Total Achv.", render: formatNumber },
    { key: "milk_producing_members", label: "Milk Producers", render: formatNumber },
    { key: "dat_activated_producers", label: "DAT Activated", render: formatNumber },
    { key: "dat_receiving_producers", label: "DAT Receiving", render: formatNumber },
    { key: "payment_1_to_10", label: "Pay 1–10", render: formatNumber },
    { key: "payment_11_to_20", label: "Pay 11–20", render: formatNumber },
    { key: "payment_21_to_31", label: "Pay 21–31", render: formatNumber },
    { key: "meeting_members_present", label: "Meeting Present", render: formatNumber },
    { key: "audit_status", label: "Audit Status", render: formatAuditStatus },
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
                // Dynamically import xlsx on demand
                const XLSX = await import("xlsx");

                // Export ONLY what is in the table on UI:
                // 1. Only active columns defined in TABLE_COLUMNS
                // 2. Only rows currently loaded and displayed in the table
                // 3. Formatted exactly as shown on the UI
                const exportRows = data.map((row) => {
                    const rowObj = {};
                    TABLE_COLUMNS.forEach((col) => {
                        const formatted = col.render ? col.render(row[col.key]) : row[col.key];
                        rowObj[col.label] = formatted === "–" ? "" : formatted;
                    });
                    return rowObj;
                });

                const worksheet = XLSX.utils.json_to_sheet(exportRows);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");

                // Auto-fit column widths based on content
                worksheet["!cols"] = TABLE_COLUMNS.map((col) => {
                    const maxValLen = Math.max(
                        col.label.length,
                        ...data.map((r) => {
                            const val = col.render ? col.render(r[col.key]) : r[col.key];
                            return val && val !== "–" ? String(val).length : 0;
                        })
                    );
                    return { wch: Math.min(Math.max(maxValLen + 2, 12), 40) };
                });

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

                {/* Summary Card */}
                <div className="admin-summary-card">
                    {/* <div className="admin-summary-icon">📊</div> */}
                    <div>
                        <div className="admin-summary-label">
                            Total Submissions
                        </div>
                        <div className="admin-summary-value">
                            {loading ? "…" : formatNumber(total)}
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
