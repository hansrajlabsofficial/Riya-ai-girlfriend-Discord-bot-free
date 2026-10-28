import { config } from '../config.js';

export const getLoginHtml = () => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect Discord Account • Riya AI Hub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #0B0314;
      --bg-card: rgba(25, 10, 45, 0.88);
      --border-card: rgba(255, 20, 147, 0.35);
      --pink-primary: #FF1493;
      --purple-accent: #9B51E0;
      --cyan-neon: #00F0FF;
      --emerald-green: #00FF7F;
      --text-main: #FFFFFF;
      --text-muted: #B8B0C8;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg-dark);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 1.5rem;
      position: relative;
      overflow-x: hidden;
    }

    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-image: 
        radial-gradient(circle at 15% 25%, rgba(255, 20, 147, 0.25) 0%, transparent 50%),
        radial-gradient(circle at 85% 75%, rgba(0, 240, 255, 0.20) 0%, transparent 50%),
        linear-gradient(180deg, rgba(11, 3, 20, 0.78) 0%, rgba(2, 2, 5, 0.90) 100%),
        url('/website_bg.jpg');
      background-size: cover;
      background-position: center center;
      background-repeat: no-repeat;
      z-index: -1;
      pointer-events: none;
      filter: saturate(1.1) brightness(0.9);
      transform: translateZ(0);
    }

    .login-container {
      width: 100%;
      max-width: 500px;
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: 24px;
      padding: 2.5rem 2rem;
      backdrop-filter: blur(20px);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 35px rgba(255, 20, 147, 0.25);
      text-align: center;
      position: relative;
    }

    .bot-logo {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      border: 3px solid var(--pink-primary);
      box-shadow: 0 0 25px rgba(255, 20, 147, 0.6);
      margin-bottom: 1.25rem;
      object-fit: cover;
    }

    h1 {
      font-size: 1.9rem;
      font-weight: 800;
      background: linear-gradient(135deg, #FFF, #FF1493);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }

    p.subtitle {
      color: var(--text-muted);
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: 2rem;
    }

    .input-box-wrapper {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.5rem;
      text-align: left;
    }

    .input-label {
      font-size: 0.9rem;
      font-weight: 700;
      color: #E2D9F3;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .discord-id-input {
      width: 100%;
      padding: 1rem 1.25rem;
      background: rgba(0, 0, 0, 0.5);
      border: 2px solid rgba(255, 20, 147, 0.3);
      border-radius: 14px;
      color: #FFF;
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.05rem;
      outline: none;
      transition: all 0.25s ease;
    }

    .discord-id-input:focus {
      border-color: var(--pink-primary);
      box-shadow: 0 0 15px rgba(255, 20, 147, 0.4);
      background: rgba(0, 0, 0, 0.7);
    }

    .btn-connect-id {
      width: 100%;
      background: linear-gradient(135deg, var(--pink-primary), var(--purple-accent));
      color: #FFF;
      font-size: 1.05rem;
      font-weight: 700;
      padding: 0.95rem 1.5rem;
      border-radius: 14px;
      border: none;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 8px 24px rgba(255, 20, 147, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn-connect-id:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(255, 20, 147, 0.6);
      background: linear-gradient(135deg, #FF40A8, #B055FF);
    }

    .preset-chips {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 0.75rem;
      flex-wrap: wrap;
    }

    .chip-btn {
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid var(--cyan-neon);
      color: var(--cyan-neon);
      font-size: 0.8rem;
      font-family: 'JetBrains Mono', monospace;
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .chip-btn:hover {
      background: var(--cyan-neon);
      color: #0B0314;
      font-weight: 700;
    }

    .status-msg {
      min-height: 24px;
      margin-top: 1rem;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--emerald-green);
    }

    .status-msg.error {
      color: #FF4B4B;
    }

    .features-list {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin-top: 2rem;
      padding-top: 1.5rem;
      display: flex;
      justify-content: space-around;
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .feature-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;
    }

    .feature-icon {
      font-size: 1.3rem;
    }

    footer {
      margin-top: 2rem;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
  </style>
</head>
<body>

  <div class="login-container">
    <img src="https://cdn-icons-png.flaticon.com/512/3081/3081840.png" alt="Riya AI Logo" class="bot-logo">
    <h1>Connect Discord Account ☕💖</h1>
    <p class="subtitle">Enter your Discord User ID below to connect your profile and check your bank balance, RPG stats, and details stored in Firebase.</p>

    <div class="input-box-wrapper">
      <label class="input-label" for="discordIdInput">
        🆔 Discord User ID
      </label>
      <input type="text" id="discordIdInput" placeholder="Enter Discord ID (e.g. 1016322069093)" class="discord-id-input" autocomplete="off" maxlength="20">
      
      <button onclick="submitDiscordId()" id="btnLogin" class="btn-connect-id">
        🔍 Check & Connect Account
      </button>

      <div class="preset-chips">
        <span onclick="usePresetId('1016322069093')" class="chip-btn">⚡ Preset Owner ID: 1016322069093</span>
      </div>
    </div>

    <div id="statusMsg" class="status-msg"></div>

    <div class="features-list">
      <div class="feature-item">
        <span class="feature-icon">🔥</span>
        <span>Firebase Sync</span>
      </div>
      <div class="feature-item">
        <span class="feature-icon">🏦</span>
        <span>Bank Vault</span>
      </div>
      <div class="feature-item">
        <span class="feature-icon">👤</span>
        <span>Profile Stats</span>
      </div>
    </div>
  </div>

  <footer>
    <div style="font-weight: 700; color: #FFF; margin-bottom: 0.25rem;">📄 License & Copyright</div>
    © 2026 | Developed by <strong>HL.Hansraj Labs</strong> | All Rights Reserved.<br>
    <span style="color: rgba(255, 255, 255, 0.45); font-size: 0.82rem;">All code, assets, and branding for Riya AI Girlfriend Discord Bot are protected under copyright.</span>
  </footer>

  <script>
    function usePresetId(id) {
      document.getElementById('discordIdInput').value = id;
      submitDiscordId();
    }

    async function submitDiscordId() {
      const input = document.getElementById('discordIdInput');
      const status = document.getElementById('statusMsg');
      const btn = document.getElementById('btnLogin');
      const rawId = input ? input.value.trim() : '';
      const cleanId = rawId.replace(/[^0-9]/g, '');

      if (!cleanId || cleanId.length < 3) {
        status.className = 'status-msg error';
        status.innerText = '❌ Please enter a valid numeric Discord User ID.';
        return;
      }

      status.className = 'status-msg';
      status.innerText = '⏳ Connecting to Firebase Cloud database...';
      btn.disabled = true;
      btn.style.opacity = '0.7';

      try {
        const res = await fetch('/api/login/discord-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: cleanId })
        });

        const data = await res.json();

        if (!res.ok || !data.user) {
          status.className = 'status-msg error';
          status.innerText = '❌ ' + (data.error || 'Failed to connect Discord account from Firebase.');
          btn.disabled = false;
          btn.style.opacity = '1';
          return;
        }

        const user = data.user;

        // Save complete profile, IP & economy details to LocalStorage
        localStorage.setItem('discord_user_id', user.userId);
        localStorage.setItem('discord_user_name', user.displayName || user.username);
        localStorage.setItem('discord_username', user.username);
        if (user.ipAddress || data.ipAddress) localStorage.setItem('discord_user_ip', user.ipAddress || data.ipAddress);
        if (user.avatar) localStorage.setItem('discord_user_avatar', user.avatar);
        if (user.banner) localStorage.setItem('discord_user_banner', user.banner);
        if (user.bank !== undefined) localStorage.setItem('discord_user_bank', user.bank);
        if (user.balance !== undefined) localStorage.setItem('discord_user_balance', user.balance);
        if (user.level !== undefined) localStorage.setItem('discord_user_level', user.level);
        if (user.xp !== undefined) localStorage.setItem('discord_user_xp', user.xp);
        if (user.title) localStorage.setItem('discord_user_title', user.title);
        if (user.signature) localStorage.setItem('discord_user_signature', user.signature);

        localStorage.setItem('discord_user_details', JSON.stringify(user));
        localStorage.setItem('discord_user_cache', JSON.stringify(user));
        localStorage.setItem('discord_auth', user.userId);
        localStorage.removeItem('skip_login');

        status.style.color = '#00FF7F';
        status.innerText = '✅ Account connected! (IP: ' + (user.ipAddress || 'Verified') + ') Loading profile...';

        setTimeout(function() {
          window.location.href = '/profile';
        }, 600);

      } catch(err) {
        status.className = 'status-msg error';
        status.innerText = '❌ Connection error: ' + err.message;
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    }

    document.getElementById('discordIdInput').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') submitDiscordId();
    });

    // Automatically fill existing ID if present
    document.addEventListener('DOMContentLoaded', function() {
      const existingId = localStorage.getItem('discord_user_id') || localStorage.getItem('discord_auth');
      if (existingId && /^\\d{5,25}$/.test(existingId)) {
        document.getElementById('discordIdInput').value = existingId;
      }
    });
  </script>
</body>
</html>`;
};
