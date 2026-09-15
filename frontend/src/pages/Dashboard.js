import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/Dashboard.css";
import API_BASE_URL from "../config/api";

const INITIAL_FORM_DATA = {
    committee_formation_date: "",
    total_active_members: "",
    member: "",
    non_member: "",
    achievement_15_days: "",
    achievement_monthly: "",

    monthly_target: "",
    current_month_target: "",
    week_1_achievement: "",
    week_2_achievement: "",
    week_3_achievement: "",
    week_4_achievement: "",
    total_achievement: "",

    milk_producing_members: "",
    dat_activated_producers: "",
    dat_receiving_producers: "",
    payment_1_to_10: "",
    payment_11_to_20: "",
    payment_21_to_31: "",

    meeting_members_present: "",
    audit_status: "",
};

export default function Dashboard({ user, onLogout }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [currentDate, setCurrentDate] = useState("");

    const [formData, setFormData] = useState(INITIAL_FORM_DATA);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const logout = () => {
        toast.success("Logout successful");
        onLogout();
        navigate("/", { replace: true });
    };

    // Check today's submission status on page load/refresh & midnight rollover
    const checkTodayStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await fetch(
                `${API_BASE_URL}/api/form/today-status`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                const serverDate = data.date;
                setCurrentDate(serverDate);

                const storageKey = `comfed_preserved_form_${user?.dcs_no || "user"}`;

                if (data.submitted) {
                    setHasSubmittedToday(true);

                    // Restore submitted values for today if preserved
                    try {
                        const saved = localStorage.getItem(storageKey);
                        if (saved) {
                            const parsed = JSON.parse(saved);
                            if (parsed && parsed.date === serverDate && parsed.formData) {
                                setFormData(parsed.formData);
                            } else {
                                // Previous day or date mismatch -> clear
                                localStorage.removeItem(storageKey);
                            }
                        }
                    } catch (err) {
                        console.error("Error reading preserved form data:", err);
                    }
                } else {
                    // Not submitted today (either new day or never submitted today):
                    // Previous day's entered values must NEVER carry over to the new day
                    setHasSubmittedToday((prevSubmitted) => {
                        if (prevSubmitted) {
                            // Midnight crossed into a new day
                            setFormData(INITIAL_FORM_DATA);
                            setSubmitted(false);
                        }
                        return false;
                    });
                    localStorage.removeItem(storageKey);
                }
            }
        } catch (error) {
            console.error("Error checking today's submission status:", error);
        }
    }, [user?.dcs_no]);

    useEffect(() => {
        checkTodayStatus();

        // Periodic check every 60 seconds to detect midnight transition across IST calendar day
        const interval = setInterval(() => {
            checkTodayStatus();
        }, 60000);

        const handleFocusOrVisibility = () => {
            if (document.visibilityState === "visible") {
                checkTodayStatus();
            }
        };

        window.addEventListener("focus", handleFocusOrVisibility);
        document.addEventListener("visibilitychange", handleFocusOrVisibility);

        return () => {
            clearInterval(interval);
            window.removeEventListener("focus", handleFocusOrVisibility);
            document.removeEventListener("visibilitychange", handleFocusOrVisibility);
        };
    }, [checkTodayStatus]);

    const requiredFields = [
        { key: "committee_formation_date", label: "Committee Formation Date" },
        { key: "total_active_members", label: "Total Active Members" },
        { key: "member", label: "Member" },
        { key: "non_member", label: "Non-Member" },
        { key: "achievement_15_days", label: "15 Days Achievement" },
        { key: "achievement_monthly", label: "Monthly Achievement" },
        { key: "monthly_target", label: "Monthly Target" },
        { key: "current_month_target", label: "Current Month Target" },
        { key: "week_1_achievement", label: "Week 1 Achievement" },
        { key: "week_2_achievement", label: "Week 2 Achievement" },
        { key: "week_3_achievement", label: "Week 3 Achievement" },
        { key: "week_4_achievement", label: "Week 4 Achievement" },
        { key: "total_achievement", label: "Total Achievement" },
        { key: "milk_producing_members", label: "Milk Producing Members" },
        { key: "dat_activated_producers", label: "Producers with Activated Accounts" },
        { key: "dat_receiving_producers", label: "Producers Receiving DAT" },
        { key: "payment_1_to_10", label: "Payment 1–10" },
        { key: "payment_11_to_20", label: "Payment 11–20" },
        { key: "payment_21_to_31", label: "Payment 21–31" },
        { key: "meeting_members_present", label: "Members Present in Meeting" },
        { key: "audit_status", label: "Audit Status" },
    ];

    // Step 1: Validate required fields and open confirmation popup
    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);

        // JS validation — check all required fields
        const missing = requiredFields.find(
            ({ key }) => formData[key] === "" || formData[key] === null || formData[key] === undefined
        );
        if (missing) {
            toast.error(`Please fill in: ${missing.label}`);
            return; // DO NOT open confirmation popup if validation fails
        }

        // All required fields valid -> open confirmation popup
        setShowConfirmModal(true);
    };

    // Step 2: User confirms in popup ("Yes, Submit") -> call API and preserve values
    const handleConfirmSubmit = async () => {
        setLoading(true);

        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                `${API_BASE_URL}/api/form/submit`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(formData),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.message || "Unable to submit form");
                setShowConfirmModal(false);
                return;
            }

            toast.success("Form submitted successfully!");
            setSubmitted(false);
            setHasSubmittedToday(true);
            setShowConfirmModal(false);

            // Preserve entered values for the current day in localStorage
            const todayStr = currentDate || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
            const storageKey = `comfed_preserved_form_${user?.dcs_no || "user"}`;
            try {
                localStorage.setItem(
                    storageKey,
                    JSON.stringify({
                        date: todayStr,
                        formData,
                    })
                );
            } catch (err) {
                console.error("Error saving preserved form data:", err);
            }

            // Values remain in formData so user can review what was entered (NOT reset to empty)
        } catch (error) {
            console.error("Form submission error:", error);
            toast.error("Unable to connect to server");
            setShowConfirmModal(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-page">

            {/* Header */}
            <header className="dashboard-header">
                <div>
                    <div className="dashboard-brand">
                        <img
                            src={process.env.PUBLIC_URL + "/logoimage.png"}
                            alt="COMFED Logo"
                            className="brand-logo-img"
                        />

                        <div className="brand-text">
                            <h1>{user?.dcs_name?.trim()}</h1>
                            <span className="dcs-no-text">{user?.dcs_no}</span>
                            <span className="portal-subtitle">DCS Data Collection Portal</span>
                        </div>
                    </div>
                </div>

                <div className="user-info">
                    {/* <div className="user-details">
                        <strong>{user?.dcs_name?.trim()}</strong>
                        <span>{user?.dcs_no}</span>
                    </div> */}

                    <button
                        className="logout-button"
                        onClick={logout}
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Main */}
            <main className="dashboard-main">

                {/* Today's Submission Info Banner */}
                {hasSubmittedToday && (
                    <div className="today-submitted-banner">
                        <div className="banner-icon">
                            <svg viewBox="0 0 20 20" fill="#f59e0b" width="22" height="22">
                                <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                        <div className="banner-content">
                            <h4 className="banner-title">
                                You have submitted the form for today.
                            </h4>
                            {/* <p className="banner-desc">
                                You can still view and update the form if required. The submit button will work as usual.
                            </p> */}
                        </div>
                    </div>
                )}

                <div className="form-heading">
                    <div>
                        <h2>DCS Data Collection Form</h2>
                        <p>
                            Enter the current details of your Milk Producer
                            Cooperative Society.
                        </p>
                    </div>

                    {/* <div className="dcs-badge">
                        {user?.dcs_code}
                    </div> */}
                </div>

                {/* DCS Info Card */}
                <div className="dcs-info-card">
                    <div className="dcs-info-header">
                        {/* <div className="dcs-info-icon">🏢</div> */}
                        <div>
                            <h3>DCS Information</h3>
                            <p>Your registered society details</p>
                        </div>
                    </div>

                    <div className="dcs-info-grid">
                        <div className="dcs-info-item">
                            <span className="dcs-info-label">Union Name</span>
                            <span className="dcs-info-value">
                                {user?.union_name || "—"}
                            </span>
                        </div>

                        <div className="dcs-info-item">
                            <span className="dcs-info-label">DCS Name</span>
                            <span className="dcs-info-value">
                                {user?.dcs_name?.trim() || "—"}
                            </span>
                        </div>

                        <div className="dcs-info-item">
                            <span className="dcs-info-label">DCS Code</span>
                            <span className="dcs-info-value dcs-info-code">
                                {user?.dcs_code || "—"}
                            </span>
                        </div>

                        <div className="dcs-info-item">
                            <span className="dcs-info-label">DCS No</span>
                            <span className="dcs-info-value">
                                {user?.dcs_no || "—"}
                            </span>
                        </div>

                        <div className="dcs-info-item">
                            <span className="dcs-info-label">Secretary Name</span>
                            <span className="dcs-info-value">
                                {user?.secretary_name || "—"}
                            </span>
                        </div>

                        <div className="dcs-info-item">
                            <span className="dcs-info-label">DCS Phone Number</span>
                            <span className="dcs-info-value">
                                {user?.dcs_phone_no || "—"}
                            </span>
                        </div>
                    </div>
                </div>

                <form
                    className="collection-form"
                    onSubmit={handleSubmit}
                >

                    {/* Member Details */}
                    <section className="form-section">
                        <div className="section-header">
                            <span className="section-number">01</span>

                            <div>
                                <h3>Member Details / सदस्य </h3>
                                <p>DCS membership information</p>
                            </div>
                        </div>

                        <div className="form-grid">

                            <FormInput
                                label="DCS Formation Date ( समिति गठन की तिथि )"
                                name="committee_formation_date"
                                type="date"
                                value={formData.committee_formation_date}
                                onChange={handleChange}
                                required
                                showError={submitted && !formData.committee_formation_date}
                            />

                            <FormInput
                                label="Members ( सदस्य संख्या )"
                                name="member"
                                type="number"
                                value={formData.member}
                                onChange={handleChange}
                                placeholder="Enter number"
                                required
                                showError={submitted && formData.member === ""}
                            />

                            <FormInput
                                label="Non-Members ( असदस्य संख्या )"
                                name="non_member"
                                type="number"
                                value={formData.non_member}
                                onChange={handleChange}
                                placeholder="Enter number"
                                required
                                showError={submitted && formData.non_member === ""}
                            />

                            <FormInput
                                label="Total Members (कुल सदस्य एवं असदस्य की संख्या )"
                                name="total_active_members"
                                type="number"
                                value={formData.total_active_members}
                                onChange={handleChange}
                                placeholder="Enter number"
                                required
                                showError={submitted && formData.total_active_members === ""}
                            />

                            <FormInput
                                label="15 Days Achievement ( विगत 15 दिन में नये जुड़े सदस्यों की सख्या )"
                                name="achievement_15_days"
                                type="number"
                                value={formData.achievement_15_days}
                                onChange={handleChange}
                                placeholder="Enter achievement"
                                required
                                showError={submitted && formData.achievement_15_days === ""}
                            />

                            <FormInput
                                label="Monthly Achievement ( इस माह में नये जुड़े सदस्यों की संख्या )"
                                name="achievement_monthly"
                                type="number"
                                value={formData.achievement_monthly}
                                onChange={handleChange}
                                placeholder="Enter achievement"
                                required
                                showError={submitted && formData.achievement_monthly === ""}
                            />

                        </div>
                    </section>

                    {/* Milk Collection */}
                    <section className="form-section">
                        <div className="section-header">
                            <span className="section-number">02</span>

                            <div>
                                <h3>Milk Collection / दुग्ध संग्रहण (ली०/दिन) </h3>
                                <p>Daily and weekly milk collection details</p>
                            </div>
                        </div>

                        <div className="form-grid">

                            <FormInput
                                label="Target( कुल लक्ष्य )"
                                name="monthly_target"
                                type="number"
                                step="0.01"
                                value={formData.monthly_target}
                                onChange={handleChange}
                                placeholder="Enter target"
                                required
                                showError={submitted && formData.monthly_target === ""}
                            />

                            <FormInput
                                label="Current Month Target (इस माह का लक्ष्य)"
                                name="current_month_target"
                                type="number"
                                step="0.01"
                                value={formData.current_month_target}
                                onChange={handleChange}
                                placeholder="Enter target"
                                required
                                showError={submitted && formData.current_month_target === ""}
                            />

                            <FormInput
                                label="Week 1 Achievement (प्रथम सप्ताह की उपलब्धि)"
                                name="week_1_achievement"
                                type="number"
                                step="0.01"
                                value={formData.week_1_achievement}
                                onChange={handleChange}
                                placeholder="Enter achievement"
                                required
                                showError={submitted && formData.week_1_achievement === ""}
                            />

                            <FormInput
                                label="Week 2 Achievement (द्वितीय सप्ताह की उपलब्धि)"
                                name="week_2_achievement"
                                type="number"
                                step="0.01"
                                value={formData.week_2_achievement}
                                onChange={handleChange}
                                placeholder="Enter achievement"
                                required
                                showError={submitted && formData.week_2_achievement === ""}
                            />

                            <FormInput
                                label="Week 3 Achievement (तृतीय सप्ताह की उपलब्धि)"
                                name="week_3_achievement"
                                type="number"
                                step="0.01"
                                value={formData.week_3_achievement}
                                onChange={handleChange}
                                placeholder="Enter achievement"
                                required
                                showError={submitted && formData.week_3_achievement === ""}
                            />

                            <FormInput
                                label="Week 4 Achievement (चतुर्थ सप्ताह की उपलब्धि)"
                                name="week_4_achievement"
                                type="number"
                                step="0.01"
                                value={formData.week_4_achievement}
                                onChange={handleChange}
                                placeholder="Enter achievement"
                                required
                                showError={submitted && formData.week_4_achievement === ""}
                            />

                            <FormInput
                                label="Total Achievement (कुल उपलब्धि)"
                                name="total_achievement"
                                type="number"
                                step="0.01"
                                value={formData.total_achievement}
                                onChange={handleChange}
                                placeholder="Enter total"
                                required
                                showError={submitted && formData.total_achievement === ""}
                            />

                        </div>
                    </section>

                    {/* DAT */}
                    <section className="form-section">
                        <div className="section-header">
                            <span className="section-number">03</span>

                            <div>
                                <h3>Direct Account Payment (DAT) / सीधे खाते में भुगतान (DAT) </h3>
                                <p>Producer account and payment details</p>
                            </div>
                        </div>

                        <div className="form-grid">

                            <FormInput
                                label="Total Farmers (कुल दुग्ध उत्पादकों की संख्या)"
                                name="milk_producing_members"
                                type="number"
                                value={formData.milk_producing_members}
                                onChange={handleChange}
                                placeholder="Enter number"
                                required
                                showError={submitted && formData.milk_producing_members === ""}
                            />

                            <FormInput
                                label="Total Registered Farmers in DAT (DAT में कुल स्वीकृत उत्पादकों की संख्या)"
                                name="dat_activated_producers"
                                type="number"
                                value={formData.dat_activated_producers}
                                onChange={handleChange}
                                placeholder="Enter number"
                                required
                                showError={submitted && formData.dat_activated_producers === ""}
                            />

                            <FormInput
                                label="Total Pouring Farmers in DAT (DAT में कुल दूध देने वाले सदस्यों की संख्या)"
                                name="dat_receiving_producers"
                                type="number"
                                value={formData.dat_receiving_producers}
                                onChange={handleChange}
                                placeholder="Enter number"
                                required
                                showError={submitted && formData.dat_receiving_producers === ""}
                            />

                            <FormInput
                                label="Payment 1–10 in ₹ (राशि विपत्र अवधि 1-10)"
                                name="payment_1_to_10"
                                type="number"
                                step="0.01"
                                value={formData.payment_1_to_10}
                                onChange={handleChange}
                                placeholder="Enter amount"
                                required
                                showError={submitted && formData.payment_1_to_10 === ""}
                            />

                            <FormInput
                                label="Payment 11–20 in ₹ (राशि विपत्र अवधि 11-20)"
                                name="payment_11_to_20"
                                type="number"
                                step="0.01"
                                value={formData.payment_11_to_20}
                                onChange={handleChange}
                                placeholder="Enter amount"
                                required
                                showError={submitted && formData.payment_11_to_20 === ""}
                            />

                            <FormInput
                                label="Payment 21–31 in ₹ (राशि विपत्र अवधि 21-31)"
                                name="payment_21_to_31"
                                type="number"
                                step="0.01"
                                value={formData.payment_21_to_31}
                                onChange={handleChange}
                                placeholder="Enter amount"
                                required
                                showError={submitted && formData.payment_21_to_31 === ""}
                            />

                        </div>
                    </section>

                    {/* Committee Meeting */}
                    <section className="form-section">
                        <div className="section-header">
                            <span className="section-number">04</span>

                            <div>
                                <h3>Committee Meeting / बैठक समिति स्तर पर </h3>
                                <p>Meeting and audit information</p>
                            </div>
                        </div>

                        <div className="form-grid">

                            <FormInput
                                label="Members Present in Meeting (उपस्थित सदस्यों की संख्या)"
                                name="meeting_members_present"
                                type="number"
                                value={formData.meeting_members_present}
                                onChange={handleChange}
                                placeholder="Enter number"
                                required
                                showError={submitted && formData.meeting_members_present === ""}
                            />

                            <div className={`input-group${submitted && !formData.audit_status ? " input-error" : ""}`}>
                                <label>
                                    Audit Status (समिति की अन्तिम ऑडिट का वर्ष)
                                    <span className="required-star"> *</span>
                                </label>

                                <select
                                    name="audit_status"
                                    value={formData.audit_status}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select Audit Status</option>
                                    <option value="2018-2019">2018-2019</option>
                                    <option value="2019-2020">2019-2020</option>
                                    <option value="2020-2021">2020-2021</option>
                                    <option value="2021-2022">2021-2022</option>
                                    <option value="2022-2023">2022-2023</option>
                                    <option value="2023-2024">2023-2024</option>
                                    <option value="2024-2025">2024-2025</option>
                                    <option value="New DCS no audit">New DCS no audit</option>
                                </select>

                                {submitted && !formData.audit_status && (
                                    <span className="error-message">This field is required</span>
                                )}
                            </div>

                        </div>
                    </section>

                    {/* Submit */}
                    <div className="form-actions">
                        <button
                            type="submit"
                            className="submit-button"
                            disabled={loading}
                        >
                            {loading ? "Submitting..." : "Submit Form"}
                        </button>
                    </div>

                </form>
            </main>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div
                    className="modal-overlay"
                    onClick={() => {
                        if (!loading) setShowConfirmModal(false);
                    }}
                >
                    <div
                        className="modal-container"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <div className="modal-icon-badge">
                                <svg
                                    viewBox="0 0 24 24"
                                    width="22"
                                    height="22"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <h3 className="modal-title">Confirm Submission</h3>
                        </div>

                        <p className="modal-message">
                            Are you sure you want to submit the form?
                        </p>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="modal-btn modal-btn-cancel"
                                onClick={() => setShowConfirmModal(false)}
                                disabled={loading}
                            >
                                No, Cancel
                            </button>

                            <button
                                type="button"
                                className="modal-btn modal-btn-confirm"
                                onClick={handleConfirmSubmit}
                                disabled={loading}
                            >
                                {loading ? "Submitting..." : "Yes, Submit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


/* Reusable input component */

function FormInput({
    label,
    name,
    type = "text",
    value,
    onChange,
    placeholder = "",
    step,
    required = false,
    showError = false,
}) {
    return (
        <div className={`input-group${showError ? " input-error" : ""}`}>
            <label>
                {label}
                {required && <span className="required-star"> *</span>}
            </label>

            <input
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                step={step}
                required={required}
            />

            {showError && (
                <span className="error-message">This field is required</span>
            )}
        </div>
    );
}