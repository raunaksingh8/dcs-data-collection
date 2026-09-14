import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/Dashboard.css";
import API_BASE_URL from "../config/api";

export default function Dashboard({ user, onLogout }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
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
    });

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

    const handleSubmit = async (e) => {
        e.preventDefault();

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
                return;
            }

            toast.success("Form submitted successfully!");

            setFormData({
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
            });
        } catch (error) {
            console.error("Form submission error:", error);
            toast.error("Unable to connect to server");
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
                                <h3>Member Details</h3>
                                <p>Committee membership information</p>
                            </div>
                        </div>

                        <div className="form-grid">

                            <FormInput
                                label="Committee Formation Date"
                                name="committee_formation_date"
                                type="date"
                                value={formData.committee_formation_date}
                                onChange={handleChange}
                            />

                            <FormInput
                                label="Total Active Members"
                                name="total_active_members"
                                type="number"
                                value={formData.total_active_members}
                                onChange={handleChange}
                                placeholder="Enter number"
                            />

                            <FormInput
                                label="Member"
                                name="member"
                                type="number"
                                value={formData.member}
                                onChange={handleChange}
                                placeholder="Enter number"
                            />

                            <FormInput
                                label="Non-Member"
                                name="non_member"
                                type="number"
                                value={formData.non_member}
                                onChange={handleChange}
                                placeholder="Enter number"
                            />

                            <FormInput
                                label="15 Days Achievement"
                                name="achievement_15_days"
                                type="number"
                                value={formData.achievement_15_days}
                                onChange={handleChange}
                                placeholder="Enter achievement"
                            />

                            <FormInput
                                label="Monthly Achievement"
                                name="achievement_monthly"
                                type="number"
                                value={formData.achievement_monthly}
                                onChange={handleChange}
                                placeholder="Enter achievement"
                            />

                        </div>
                    </section>

                    {/* Milk Collection */}
                    <section className="form-section">
                        <div className="section-header">
                            <span className="section-number">02</span>

                            <div>
                                <h3>Milk Collection</h3>
                                <p>Daily and weekly milk collection details</p>
                            </div>
                        </div>

                        <div className="form-grid">

                            <FormInput
                                label="Monthly Target (Litres)"
                                name="monthly_target"
                                type="number"
                                step="0.01"
                                value={formData.monthly_target}
                                onChange={handleChange}
                                placeholder="Enter target"
                            />

                            <FormInput
                                label="Current Month Target (Litres)"
                                name="current_month_target"
                                type="number"
                                step="0.01"
                                value={formData.current_month_target}
                                onChange={handleChange}
                                placeholder="Enter target"
                            />

                            <FormInput
                                label="Week 1 Achievement (Litres)"
                                name="week_1_achievement"
                                type="number"
                                step="0.01"
                                value={formData.week_1_achievement}
                                onChange={handleChange}
                                placeholder="Enter achievement"
                            />

                            <FormInput
                                label="Week 2 Achievement (Litres)"
                                name="week_2_achievement"
                                type="number"
                                step="0.01"
                                value={formData.week_2_achievement}
                                onChange={handleChange}
                                placeholder="Enter achievement"
                            />

                            <FormInput
                                label="Week 3 Achievement (Litres)"
                                name="week_3_achievement"
                                type="number"
                                step="0.01"
                                value={formData.week_3_achievement}
                                onChange={handleChange}
                                placeholder="Enter achievement"
                            />

                            <FormInput
                                label="Week 4 Achievement (Litres)"
                                name="week_4_achievement"
                                type="number"
                                step="0.01"
                                value={formData.week_4_achievement}
                                onChange={handleChange}
                                placeholder="Enter achievement"
                            />

                            <FormInput
                                label="Total Achievement (Litres)"
                                name="total_achievement"
                                type="number"
                                step="0.01"
                                value={formData.total_achievement}
                                onChange={handleChange}
                                placeholder="Enter total"
                            />

                        </div>
                    </section>

                    {/* DAT */}
                    <section className="form-section">
                        <div className="section-header">
                            <span className="section-number">03</span>

                            <div>
                                <h3>Direct Account Payment (DAT)</h3>
                                <p>Producer account and payment details</p>
                            </div>
                        </div>

                        <div className="form-grid">

                            <FormInput
                                label="Milk Producing Members"
                                name="milk_producing_members"
                                type="number"
                                value={formData.milk_producing_members}
                                onChange={handleChange}
                                placeholder="Enter number"
                            />

                            <FormInput
                                label="Producers with Activated Accounts"
                                name="dat_activated_producers"
                                type="number"
                                value={formData.dat_activated_producers}
                                onChange={handleChange}
                                placeholder="Enter number"
                            />

                            <FormInput
                                label="Producers Receiving DAT"
                                name="dat_receiving_producers"
                                type="number"
                                value={formData.dat_receiving_producers}
                                onChange={handleChange}
                                placeholder="Enter number"
                            />

                            <FormInput
                                label="Payment 1–10"
                                name="payment_1_to_10"
                                type="number"
                                step="0.01"
                                value={formData.payment_1_to_10}
                                onChange={handleChange}
                                placeholder="Enter amount"
                            />

                            <FormInput
                                label="Payment 11–20"
                                name="payment_11_to_20"
                                type="number"
                                step="0.01"
                                value={formData.payment_11_to_20}
                                onChange={handleChange}
                                placeholder="Enter amount"
                            />

                            <FormInput
                                label="Payment 21–31"
                                name="payment_21_to_31"
                                type="number"
                                step="0.01"
                                value={formData.payment_21_to_31}
                                onChange={handleChange}
                                placeholder="Enter amount"
                            />

                        </div>
                    </section>

                    {/* Committee Meeting */}
                    <section className="form-section">
                        <div className="section-header">
                            <span className="section-number">04</span>

                            <div>
                                <h3>Committee Meeting</h3>
                                <p>Meeting and audit information</p>
                            </div>
                        </div>

                        <div className="form-grid">

                            <FormInput
                                label="Members Present in Meeting"
                                name="meeting_members_present"
                                type="number"
                                value={formData.meeting_members_present}
                                onChange={handleChange}
                                placeholder="Enter number"
                            />

                            <div className="input-group">
                                <label>Audit Status</label>

                                <select
                                    name="audit_status"
                                    value={formData.audit_status}
                                    onChange={handleChange}
                                >
                                    <option value="">
                                        Select audit status
                                    </option>

                                    <option value="Completed">
                                        Completed
                                    </option>

                                    <option value="Pending">
                                        Pending
                                    </option>

                                    <option value="Not Applicable">
                                        Not Applicable
                                    </option>
                                </select>
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
}) {
    return (
        <div className="input-group">
            <label>{label}</label>

            <input
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                step={step}
            />
        </div>
    );
}