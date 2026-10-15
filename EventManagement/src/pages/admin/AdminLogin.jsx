import { useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import api from "../../api/axiosClient";

import nunifiedLogo from "../../assets/nunifiedlogo.png";

export default function AdminLogin() {
  const navigate =
    useNavigate();

  const [form, setForm] =
    useState({
      username: "",
      password: "",
    });

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  /* =====================================================
     LOGIN
  ===================================================== */

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      setError("");
      setLoading(true);

      try {
        const { data } =
          await api.post(
            "/auth/login",
            form
          );

        /* ===============================================
           ADMIN ONLY
        =============================================== */

        if (
          data.user.role !==
          "admin"
        ) {
          setError(
            "This account is not an administrator."
          );

          return;
        }

        /* ===============================================
           SAVE SESSION
        =============================================== */

        localStorage.setItem(
          "token",
          data.token
        );

        localStorage.setItem(
          "role",
          data.user.role
        );

        localStorage.setItem(
          "user",
          JSON.stringify(
            data.user
          )
        );

        /* ===============================================
           DASHBOARD
        =============================================== */

        navigate(
          "/admin/dashboard"
        );
      } catch (error) {
        setError(
          error.response?.data
            ?.message ||
            "Invalid admin credentials."
        );
      } finally {
        setLoading(false);
      }
    };

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <div className="auth-screen">
      <form
        className="auth-card"
        onSubmit={handleSubmit}
      >
        {/* ===============================================
            NUNIFIED LOGO
        =============================================== */}

        <div
          className="nu-logo"
          style={{
            overflow: "hidden",
            padding: 0,
          }}
        >
          <img
            src={nunifiedLogo}
            alt="NUnified Logo"
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              objectFit: "cover",
              borderRadius:
                "inherit",
            }}
          />
        </div>

        {/* ===============================================
            TITLE
        =============================================== */}

        <h1>
          Administrator Login
        </h1>

        <p>
          NUnified Event Management
          System
        </p>

        {/* ===============================================
            ERROR
        =============================================== */}

        {error && (
          <div className="alert-error">
            {error}
          </div>
        )}

        {/* ===============================================
            USERNAME
        =============================================== */}

        <label>
          Username
        </label>

        <input
          type="text"
          value={form.username}
          onChange={(e) =>
            setForm({
              ...form,
              username:
                e.target.value,
            })
          }
          autoComplete="username"
          required
        />

        {/* ===============================================
            PASSWORD
        =============================================== */}

        <label>
          Password
        </label>

        <input
          type="password"
          value={form.password}
          onChange={(e) =>
            setForm({
              ...form,
              password:
                e.target.value,
            })
          }
          autoComplete="current-password"
          required
        />

        {/* ===============================================
            LOGIN BUTTON
        =============================================== */}

        <button
          type="submit"
          className="
            nu-btn
            nu-btn-primary
          "
          style={{
            width: "100%",
            marginTop: "20px",
          }}
          disabled={loading}
        >
          {loading
            ? "Signing in..."
            : "Login as Admin"}
        </button>

        {/* ===============================================
            HOME
        =============================================== */}

        <div className="auth-links">
          <Link to="/">
            Back to Home
          </Link>
        </div>
      </form>
    </div>
  );
}