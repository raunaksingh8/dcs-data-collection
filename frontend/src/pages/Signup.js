import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/Signup.css";
import Loader from "../components/Loader";
import API_URL from "../config/api";

export default function Signup({ onLogin }) {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                }),
            });

            const data = await res.json();

            console.log("Status:", res.status);
            console.log("Response:", data);

            if (!res.ok) {
                toast(data.message || "Signup failed");
                return;
            }

            // Show backend message
            toast(data.message || "Account created successfully!");

            if (data.token && data.user) {
                onLogin({
                    token: data.token,
                    user: data.user,
                });
            }

            // Wait so the toast is visible
            setTimeout(() => {
                navigate("/dashboard", { replace: true });
            }, 3000);

        } catch (err) {
            console.error(err);
            toast("Unable to connect to the server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">

            {loading && <Loader />}

            <div className="blob blob--cyan" aria-hidden="true" />
            <div className="blob blob--pink" aria-hidden="true" />
            <div className="blob blob--purple" aria-hidden="true" />

            <Link to="/" className="auth-logo">
                Price<span className="logo-highlight">Dekho</span>App
            </Link>

            <div className="auth-card">
                <h1>Create your account</h1>

                <p className="auth-subtext">
                    Join the community finding the best prices nearby.
                </p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label htmlFor="signup-name">Name</label>
                        <input
                            id="signup-name"
                            type="text"
                            placeholder="Your full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoComplete="name"
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="signup-email">Email</label>
                        <input
                            id="signup-email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="signup-password">Password</label>
                        <input
                            id="signup-password"
                            type="password"
                            placeholder="Create a strong password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="auth-submit"
                        disabled={loading}
                    >
                        {loading ? "Creating Account..." : "Sign Up"}
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account?{" "}
                    <Link to="/login">Login</Link>
                </p>
            </div>
        </div>
    );
}
