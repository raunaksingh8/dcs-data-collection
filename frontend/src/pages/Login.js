import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/Login.css";
import API_BASE_URL from "../config/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

const Login = ({ onLogin }) => {
    const navigate = useNavigate();

    const [loginType, setLoginType] = useState("user");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!phone || !password) {
            toast.error("Please enter phone number and password");
            return;
        }

        setLoading(true);

        try {
            const endpoint =
                loginType === "user"
                    ? `${API_BASE_URL}/api/auth/user-login`
                    : `${API_BASE_URL}/api/auth/admin-login`;

            const body =
                loginType === "user"
                    ? {
                        dcs_phone_no: phone,
                        password: password,
                    }
                    : {
                        admin_phone_no: phone,
                        password: password,
                    };

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.message || "Login failed");
                return;
            }

            // Save login information
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            // Update authentication state in App.js
            if (onLogin) {
                onLogin({
                    token: data.token,
                    user: data.user,
                });
            }

            toast.success(data.message || "Login successful");

            // Redirect based on role
            if (data.user.role === "admin") {
                navigate("/admin-dashboard", { replace: true });
            } else {
                navigate("/dashboard", { replace: true });
            }

        } catch (error) {
            console.error("Login error:", error);
            toast.error("Unable to connect to server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">

            <div
                className="login-bg-image"
                style={{
                    backgroundImage: `url(${process.env.PUBLIC_URL + "/background.png"})`,
                }}
            />
            <div className="login-bg-overlay" />

            <div className="login-container">

                <div className="login-card">

                    {/* Header */}
                    <div className="login-header">

                        <img
                            src={process.env.PUBLIC_URL + "/logoimage.png"}
                            alt="COMFED Logo"
                            className="comfed-logo"
                        />

                        <h1>COMFED LOGIN</h1>

                        <p>
                            {loginType === "user"
                                ? "DCS Data Collection Portal"
                                : "Administration Portal"}
                        </p>

                    </div>


                    {/* User / Admin Switch */}
                    <div className="login-switch">

                        <button
                            type="button"
                            className={
                                loginType === "user"
                                    ? "active"
                                    : ""
                            }
                            onClick={() => {
                                setLoginType("user");
                                setPhone("");
                                setPassword("");
                            }}
                        >
                            User
                        </button>


                        <button
                            type="button"
                            className={
                                loginType === "admin"
                                    ? "active"
                                    : ""
                            }
                            onClick={() => {
                                setLoginType("admin");
                                setPhone("");
                                setPassword("");
                            }}
                        >
                            Admin
                        </button>


                        <div
                            className={`switch-slider ${loginType === "admin"
                                ? "slide-right"
                                : ""
                                }`}
                        ></div>

                    </div>


                    {/* Login Form */}
                    <form
                        className="login-form"
                        onSubmit={handleLogin}
                    >

                        {/* Phone */}
                        <div className="input-group">

                            <label>
                                {loginType === "user"
                                    ? "DCS Phone Number"
                                    : "Admin Phone Number"}
                            </label>

                            <div className="input-wrapper">

                                <span className="input-icon">
                                    <FontAwesomeIcon icon={faUser} />
                                </span>

                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) =>
                                        setPhone(
                                            e.target.value.replace(
                                                /\D/g,
                                                ""
                                            )
                                        )
                                    }
                                    placeholder="Enter phone number"
                                    maxLength="10"
                                    autoComplete="tel"
                                />

                            </div>

                        </div>


                        {/* Password */}
                        <div className="input-group">

                            <label>
                                Password
                            </label>

                            <div className="input-wrapper">

                                <span
                                    className="input-icon"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => setShowPassword(!showPassword)}
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                                </span>

                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Enter password"
                                    autoComplete="current-password"
                                />

                            </div>

                        </div>


                        {/* Login Button */}
                        <button
                            type="submit"
                            className="login-button"
                            disabled={loading}
                        >

                            {loading ? (
                                <span className="button-loading">

                                    <span className="spinner"></span>

                                    Signing in...

                                </span>
                            ) : (
                                "Sign In"
                            )}

                        </button>

                    </form>


                    {/* Footer */}
                    <div className="login-footer">

                        <span>
                            COMFED
                        </span>

                        <span className="footer-dot">
                            •
                        </span>

                        <span>
                            Secure Access Portal
                        </span>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default Login;