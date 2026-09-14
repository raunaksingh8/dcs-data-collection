import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer, Zoom } from "react-toastify";
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