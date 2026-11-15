import React, { useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const AdminDashboard = () => {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { "x-admin-key": adminKey },
      });
      if (res.status === 401 || res.status === 403) {
        setError("Invalid admin key.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError("Failed to fetch stats. Try again.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setStats(data);
      setAuthenticated(true);
    } catch (err) {
      setError("Network error. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="admin-login-container">
        <h2>Admin Dashboard</h2>
        <p className="admin-desc">Enter your admin key to access stats.</p>
        <form onSubmit={handleLogin} className="admin-login-form">
          <label htmlFor="admin-key">Admin Key:</label>
          <input
            id="admin-key"
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Enter admin key"
            required
            autoComplete="current-password"
          />
          <button type="submit" disabled={loading}>
            {loading ? "⏳ Verifying..." : "Login"}
          </button>
          {error && <p className="error-message">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <h2>📊 Admin Dashboard</h2>

      <div className="admin-stats-row">
        <div className="admin-stat-card">
          <span className="admin-stat-number">{stats.totalSignups?.toLocaleString() ?? "—"}</span>
          <span className="admin-stat-label">Total Signups</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-number">{stats.totalReferrals?.toLocaleString() ?? "—"}</span>
          <span className="admin-stat-label">Total Referrals</span>
        </div>
      </div>

      <div className="admin-section">
        <h3>🏆 Top 10 Referrers</h3>
        {stats.topReferrers && stats.topReferrers.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Referrals</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {stats.topReferrers.map((r, i) => (
                <tr key={r.email || i}>
                  <td>{i + 1}</td>
                  <td>{r.name}</td>
                  <td>{r.email}</td>
                  <td>{r.referralCount}</td>
                  <td>#{r.position}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty">No referrers yet.</p>
        )}
      </div>

      <div className="admin-section">
        <h3>🕐 Recent 10 Signups</h3>
        {stats.recentSignups && stats.recentSignups.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Position</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentSignups.map((s, i) => (
                <tr key={s.email || i}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>#{s.position}</td>
                  <td>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty">No signups yet.</p>
        )}
      </div>

      <button
        className="admin-logout-btn"
        onClick={() => { setAuthenticated(false); setStats(null); setAdminKey(""); }}
      >
        Logout
      </button>
    </div>
  );
};

export default AdminDashboard;
