import React, { useState, useEffect } from 'react';

/**
 * DiscordServerDashboard Component
 * Modern dark-themed dashboard for managing Discord servers with admin permissions.
 */
export default function DiscordServerDashboard() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Configuration Modal State
  const [activeServer, setActiveServer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [config, setConfig] = useState({
    prefix: 'x',
    aiPersona: 'amdavadi',
    globalChatChannelId: '',
    countingChannelId: '',
    language: 'en'
  });
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Fetch servers from API
  const fetchServers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/guilds');
      if (!response.ok) {
        throw new Error(`Failed to fetch servers: ${response.statusText}`);
      }
      const data = await response.json();
      setServers(data.guilds || []);
    } catch (err) {
      setError(err.message || 'Error loading servers');
      setServers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  // Open configuration modal for selected server
  const handleOpenConfig = async (server) => {
    setActiveServer(server);
    setIsModalOpen(true);
    try {
      const res = await fetch(`/api/guilds/${server.id}/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig({
          prefix: data.prefix || 'x',
          aiPersona: data.aiPersona || 'amdavadi',
          globalChatChannelId: data.globalChatChannelId || '',
          countingChannelId: data.countingChannelId || '',
          language: data.language || 'en'
        });
      }
    } catch (err) {
      console.warn('Could not load specific config, using defaults:', err);
    }
  };

  // Save server settings
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!activeServer) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/guilds/${activeServer.id}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        showToast(`✅ Configuration saved for ${activeServer.name}!`);
        setIsModalOpen(false);
        fetchServers(true);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (err) {
      showToast(`❌ Error saving: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div style={styles.dashboardContainer}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={styles.toast}>
          {toastMessage}
        </div>
      )}

      {/* Header & Refresh Controls */}
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>⚙️ Manage Server Configurations</h2>
          <p style={styles.subtitle}>
            Servers where you hold Administrative permissions and can customize Riya Bot settings.
          </p>
        </div>
        <button
          onClick={() => fetchServers(true)}
          disabled={refreshing || loading}
          style={styles.refreshBtn}
        >
          <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.6s ease' }}>
            🔄
          </span>
          {refreshing ? ' refreshing...' : ' Refresh Servers'}
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={{ marginTop: '1rem', color: '#B3A0CC' }}>Loading your authorized Discord servers...</p>
        </div>
      ) : error && servers.length === 0 ? (
        <div style={styles.errorBox}>
          ⚠️ {error}
        </div>
      ) : (
        /* Server Cards Grid */
        <div style={styles.serverGrid}>
          {servers.map((server) => (
            <div key={server.id} style={styles.serverCard}>
              <div style={styles.cardHeader}>
                <img
                  src={server.icon || 'https://cdn-icons-png.flaticon.com/512/2913/2913990.png'}
                  alt={server.name}
                  style={styles.serverIcon}
                  onError={(e) => {
                    e.target.src = 'https://cdn-icons-png.flaticon.com/512/2913/2913990.png';
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={styles.serverName}>{server.name}</h3>
                  <p style={styles.serverMeta}>
                    ID: {server.id} • {server.memberCount ? server.memberCount.toLocaleString() : 'N/A'} Members
                  </p>
                </div>
              </div>

              {/* Status Badges */}
              <div style={styles.badgeRow}>
                <span style={styles.badgeActive}>🟢 Bot Active</span>
                <span style={styles.badgeTag}>Prefix: {server.config?.prefix || 'x'}</span>
                <span style={styles.badgeTag}>Admin Authorized</span>
              </div>

              {/* Configure Button */}
              <button
                onClick={() => handleOpenConfig(server)}
                style={styles.configureBtn}
              >
                ⚙️ Configure Server Settings
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Configuration Modal */}
      {isModalOpen && activeServer && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '1.4rem' }}>⚙️ Configure {activeServer.name}</h3>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeBtn}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveConfig} style={{ marginTop: '1.25rem' }}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Command Prefix</label>
                <input
                  type="text"
                  value={config.prefix}
                  onChange={(e) => setConfig({ ...config, prefix: e.target.value })}
                  placeholder="e.g. x, !, ?, ."
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>AI Girlfriend Persona & Tone</label>
                <select
                  value={config.aiPersona}
                  onChange={(e) => setConfig({ ...config, aiPersona: e.target.value })}
                  style={styles.select}
                >
                  <option value="amdavadi">☕ Amdavadi Sweet Girlfriend (Default)</option>
                  <option value="flirty">💖 Flirty & Romantic Girlfriend</option>
                  <option value="tsundere">💢 Tsundere Anime Companion</option>
                  <option value="wholesome">🌟 Wholesome Support Bestie</option>
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Global Cross-Server Chat Channel ID</label>
                <input
                  type="text"
                  value={config.globalChatChannelId}
                  onChange={(e) => setConfig({ ...config, globalChatChannelId: e.target.value })}
                  placeholder="e.g. 123456789012345678"
                  style={styles.input}
                />
                <small style={styles.hint}>Channel ID where global inter-server messages are relayed.</small>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Counting Minigame Channel ID</label>
                <input
                  type="text"
                  value={config.countingChannelId}
                  onChange={(e) => setConfig({ ...config, countingChannelId: e.target.value })}
                  placeholder="e.g. 987654321098765432"
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Bot System Language</label>
                <select
                  value={config.language}
                  onChange={(e) => setConfig({ ...config, language: e.target.value })}
                  style={styles.select}
                >
                  <option value="en">English (en)</option>
                  <option value="gu">Gujarati (gu)</option>
                  <option value="hi">Hindi (hi)</option>
                </select>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={styles.saveBtn}
                >
                  {saving ? 'Saving...' : '💾 Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Clean, Responsive Dark Glassmorphism Styles
const styles = {
  dashboardContainer: {
    fontFamily: "'Outfit', 'Segoe UI', sans-serif",
    backgroundColor: '#0B0314',
    color: '#FFFFFF',
    padding: '2rem',
    borderRadius: '24px',
    border: '1px solid rgba(255, 20, 147, 0.25)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid rgba(255, 20, 147, 0.15)'
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '800',
    margin: 0,
    background: 'linear-gradient(135deg, #FF1493, #00F0FF)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    color: '#B3A0CC',
    fontSize: '0.95rem',
    marginTop: '0.4rem',
    margin: 0
  },
  refreshBtn: {
    background: 'rgba(155, 81, 224, 0.25)',
    border: '1px solid #9B51E0',
    color: '#FFFFFF',
    padding: '0.65rem 1.25rem',
    borderRadius: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s ease'
  },
  serverGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.5rem'
  },
  serverCard: {
    backgroundColor: 'rgba(25, 10, 45, 0.75)',
    border: '1px solid rgba(255, 20, 147, 0.3)',
    borderRadius: '20px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justify: 'space-between',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
    transition: 'transform 0.2s ease, border-color 0.2s ease'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem'
  },
  serverIcon: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    border: '2px solid #FF1493',
    objectFit: 'cover'
  },
  serverName: {
    fontSize: '1.2rem',
    fontWeight: '700',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  serverMeta: {
    color: '#B3A0CC',
    fontSize: '0.825rem',
    margin: '0.2rem 0 0 0'
  },
  badgeRow: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginBottom: '1.25rem'
  },
  badgeActive: {
    fontSize: '0.75rem',
    backgroundColor: 'rgba(0, 255, 127, 0.15)',
    color: '#00FF7F',
    padding: '0.25rem 0.65rem',
    borderRadius: '10px',
    fontWeight: '600',
    border: '1px solid rgba(0, 255, 127, 0.3)'
  },
  badgeTag: {
    fontSize: '0.75rem',
    backgroundColor: 'rgba(155, 81, 224, 0.25)',
    color: '#D8B4FE',
    padding: '0.25rem 0.65rem',
    borderRadius: '10px',
    fontWeight: '600'
  },
  configureBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #FF1493, #9B51E0)',
    color: '#FFFFFF',
    border: 'none',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '0.95rem',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(255, 20, 147, 0.35)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '4rem 0'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255, 20, 147, 0.2)',
    borderTop: '3px solid #FF1493',
    borderRadius: '50%',
    margin: '0 auto',
    animation: 'spin 1s linear infinite'
  },
  errorBox: {
    backgroundColor: 'rgba(255, 0, 0, 0.15)',
    border: '1px solid rgba(255, 0, 0, 0.4)',
    color: '#FF6B6B',
    padding: '1rem',
    borderRadius: '12px',
    textAlign: 'center'
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(11, 3, 20, 0.85)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '1.5rem'
  },
  modalContent: {
    backgroundColor: '#0B0314',
    border: '1px solid rgba(255, 20, 147, 0.4)',
    borderRadius: '24px',
    padding: '2rem',
    maxWidth: '560px',
    width: '100%',
    boxShadow: '0 10px 40px rgba(255, 20, 147, 0.3)',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 20, 147, 0.2)',
    paddingBottom: '1rem'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#B3A0CC',
    fontSize: '1.8rem',
    cursor: 'pointer'
  },
  fieldGroup: {
    marginBottom: '1.25rem'
  },
  label: {
    display: 'block',
    fontWeight: '600',
    fontSize: '0.9rem',
    marginBottom: '0.4rem',
    color: '#FF1493'
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    backgroundColor: 'rgba(25, 10, 45, 0.9)',
    border: '1px solid rgba(255, 20, 147, 0.25)',
    color: '#FFFFFF',
    fontFamily: "'JetBrains Mono', monospace",
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    backgroundColor: 'rgba(25, 10, 45, 0.9)',
    border: '1px solid rgba(255, 20, 147, 0.25)',
    color: '#FFFFFF',
    boxSizing: 'border-box'
  },
  hint: {
    color: '#B3A0CC',
    fontSize: '0.8rem',
    marginTop: '0.3rem',
    display: 'block'
  },
  modalFooter: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1.75rem'
  },
  cancelBtn: {
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
    border: 'none',
    cursor: 'pointer'
  },
  saveBtn: {
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #FF1493, #9B51E0)',
    color: '#FFFFFF',
    border: 'none',
    fontWeight: '700',
    cursor: 'pointer'
  },
  toast: {
    position: 'fixed',
    bottom: '2rem',
    right: '2rem',
    backgroundColor: '#00FF7F',
    color: '#0B0314',
    padding: '0.9rem 1.5rem',
    borderRadius: '14px',
    fontWeight: '700',
    boxShadow: '0 8px 24px rgba(0, 255, 127, 0.4)',
    zIndex: 2000
  }
};
