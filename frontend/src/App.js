import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer, Zoom, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";

import ProtectedRoute from "./components/ProtectedRoute";
import Loader from "./components/Loader";

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const login = ({ token, user }) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");

        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
            }
        }

        setLoading(false);
    }, []);

    // 3-Hour Inactivity Timer
    useEffect(() => {
        if (!user) return; // Only track inactivity when logged in

        const INACTIVITY_LIMIT_MS = 3 * 60 * 60 * 1000; // 3 hours

        const checkInactivity = () => {
            const lastActivity = localStorage.getItem("lastActivity");
            if (lastActivity) {
                const now = Date.now();
                if (now - parseInt(lastActivity, 10) >= INACTIVITY_LIMIT_MS) {
                    logout();
                    toast.error("Session expired due to 3 hours of inactivity");
                }
            }
        };

        const updateActivity = () => {
            localStorage.setItem("lastActivity", Date.now().toString());
        };

        // Initialize immediately
        checkInactivity();
        // If there was no activity record or it's a new login, set the current time
        if (!localStorage.getItem("lastActivity")) {
            updateActivity();
        }

        // Listeners to track activity
        const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
        
        // Throttled update to avoid hitting localStorage on every pixel move
        let lastUpdateTime = Date.now();
        const handleActivity = () => {
            const now = Date.now();
            if (now - lastUpdateTime > 5000) { // update at most every 5 seconds
                updateActivity();
                lastUpdateTime = now;
            }
        };

        events.forEach((event) => window.addEventListener(event, handleActivity));

        // Periodic check just in case user is completely idle and timer expires
        const interval = setInterval(checkInactivity, 60000); // Check every minute

        return () => {
            events.forEach((event) => window.removeEventListener(event, handleActivity));
            clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    if (loading) {
        return <Loader />;
    }

    return (
        <BrowserRouter>
            <Routes>

                {/* COMFED LOGIN - LANDING PAGE */}
                <Route
                    path="/"
                    element={
                        user ? (
                            <Navigate
                                to={
                                    user.role === "admin"
                                        ? "/admin-dashboard"
                                        : "/dashboard"
                                }
                                replace
                            />
                        ) : (
                            <Login onLogin={login} />
                        )
                    }
                />

                {/* Keep /login working as well */}
                <Route
                    path="/login"
                    element={
                        user ? (
                            <Navigate
                                to={
                                    user.role === "admin"
                                        ? "/admin-dashboard"
                                        : "/dashboard"
                                }
                                replace
                            />
                        ) : (
                            <Login onLogin={login} />
                        )
                    }
                />

                {/* USER DASHBOARD */}
                <Route
                    element={
                        <ProtectedRoute
                            isAuthenticated={Boolean(user)}
                        />
                    }
                >
                    <Route
                        path="/dashboard"
                        element={
                            <Dashboard
                                user={user}
                                onLogout={logout}
                            />
                        }
                    />
                </Route>

                {/* ADMIN DASHBOARD */}
                <Route
                    path="/admin-dashboard"
                    element={
                        user?.role === "admin" ? (
                            <AdminDashboard
                                user={user}
                                onLogout={logout}
                            />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    }
                />

                {/* Unknown URL */}
                <Route
                    path="*"
                    element={<Navigate to="/" replace />}
                />

            </Routes>

            <ToastContainer
                position="top-right"
                autoClose={3000}
                limit={2}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick={false}
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
                transition={Zoom}
            />
        </BrowserRouter>
    );
}

export default App;