import { config } from '../config.js';

export const getProfileHtml = (client = null) => {
  const oauthConnectUrl = `/connect?from=profile`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Profile • Riya AI Bot Hub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;600&family=Georgia:ital,wght@1,700&display=swap" rel="stylesheet">
  
  <!-- Firebase SDK Setup -->
  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

    const firebaseConfig = {
      apiKey: "YOUR_APIKEY_HERE",
      authDomain: "riya-ai-girlfriend-discord-bot.firebaseapp.com",
      databaseURL: "https://riya-ai-girlfriend-discord-bot-default-rtdb.firebaseio.com",
      projectId: "riya-ai-girlfriend-discord-bot",
      storageBucket: "riya-ai-girlfriend-discord-bot.firebasestorage.app",
      messagingSenderId: "1016322069093",
      appId: "1:1016322069093:web:51cc280facd87caa5d2c8c",
      measurementId: "G-9XWSX7RFF7"
    };

    const app = initializeApp(firebaseConfig);
    if (typeof window !== 'undefined') {
      try { getAnalytics(app); } catch(e) {}
    }
  </script>

  <style>
    :root {
      --bg-dark: #0B0314;
      --bg-card: rgba(25, 10, 45, 0.85);
      --border-card: rgba(255, 20, 147, 0.35);
      --pink-primary: #FF1493;
      --purple-accent: #9B51E0;
      --cyan-neon: #00F0FF;
      --emerald-green: #50FFB1;
      --gold-star: #FFD700;
      --discord-blue: #5865F2;
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
      line-height: 1.6;
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
        radial-gradient(circle at 15% 25%, rgba(255, 20, 147, 0.22) 0%, transparent 50%),
        radial-gradient(circle at 85% 75%, rgba(0, 240, 255, 0.20) 0%, transparent 50%),
        linear-gradient(180deg, rgba(2, 2, 5, 0.76) 0%, rgba(11, 3, 20, 0.88) 100%),
        url('/website_bg.jpg');
      background-size: cover;
      background-position: center center;
      background-repeat: no-repeat;
      z-index: -1;
      pointer-events: none;
      filter: saturate(1.1) brightness(0.9);
      transform: translateZ(0);
    }

    /* Profile Content Area */
    #profileContentArea {
      display: block;
    }

    /* Header & Navigation */
    header {
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(16px);
      background: rgba(11, 3, 20, 0.85);
      border-bottom: 1px solid var(--border-card);
      padding: 1rem 2rem;
    }

    .nav-container {
      max-width: 1250px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, var(--pink-primary), var(--cyan-neon));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-decoration: none;
    }

    .brand img {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: 2px solid var(--pink-primary);
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .nav-links a {
      color: var(--text-muted);
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s ease;
    }

    .nav-links a:hover, .nav-links a.active {
      color: var(--pink-primary);
    }

    .btn-connect {
      background: linear-gradient(135deg, #5865F2, #7289DA);
      color: #fff;
      padding: 0.6rem 1.25rem;
      border-radius: 12px;
      font-weight: 700;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 4px 15px rgba(88, 101, 242, 0.4);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .btn-connect:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(88, 101, 242, 0.6);
    }

    /* Profile Main Container */
    .profile-container {
      max-width: 1200px;
      margin: 2.5rem auto;
      padding: 0 1.5rem;
    }

    /* Banner Container */
    .profile-banner-wrapper {
      position: relative;
      width: 100%;
      height: 240px;
      border-radius: 24px;
      overflow: hidden;
      border: 1px solid var(--border-card);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
      background: linear-gradient(135deg, #1E0638, #3B0A45, #660F45);
    }

    .profile-banner-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .banner-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(11, 3, 20, 0.9) 0%, transparent 60%);
    }

    /* Floating Avatar */
    .avatar-wrapper {
      position: absolute;
      bottom: -45px;
      left: 40px;
      z-index: 10;
    }

    .profile-avatar-img {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      border: 4px solid var(--pink-primary);
      box-shadow: 0 0 25px rgba(255, 20, 147, 0.7);
      object-fit: cover;
      background: #0B0314;
    }

    .status-badge {
      position: absolute;
      bottom: 8px;
      right: 6px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--emerald-green);
      border: 3px solid #0B0314;
      box-shadow: 0 0 10px var(--emerald-green);
    }

    /* User Header Info Card */
    .profile-header-card {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: 0 0 24px 24px;
      padding: 4rem 2.5rem 2rem 2.5rem;
      margin-top: -30px;
      margin-bottom: 2.5rem;
      backdrop-filter: blur(20px);
      position: relative;
    }

    .user-name-title {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 1.5rem;
    }

    .name-block h1 {
      font-size: 2.2rem;
      font-weight: 800;
      color: #FFF;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .name-block p.username-tag {
      font-size: 1.1rem;
      color: var(--text-muted);
      font-weight: 600;
      margin-top: 0.2rem;
    }

    .badges-row {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }

    .badge-chip {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 0.35rem 0.85rem;
      border-radius: 20px;
      font-size: 0.82rem;
      font-weight: 700;
      color: #E2D9F3;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .badge-chip.nitro {
      border-color: var(--pink-primary);
      color: var(--pink-primary);
      background: rgba(255, 20, 147, 0.15);
    }

    .badge-chip.partner {
      border-color: var(--gold-star);
      color: var(--gold-star);
      background: rgba(255, 215, 0, 0.15);
    }

    .badge-chip.verified {
      border-color: var(--cyan-neon);
      color: var(--cyan-neon);
      background: rgba(0, 240, 255, 0.15);
    }

    /* Action Buttons Row */
    .profile-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .btn-action {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #FFF;
      font-family: 'Outfit', sans-serif;
      font-size: 0.95rem;
      font-weight: 700;
      padding: 0.75rem 1.4rem;
      border-radius: 14px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.25s ease;
    }

    .btn-action:hover {
      background: rgba(255, 20, 147, 0.2);
      border-color: var(--pink-primary);
      transform: translateY(-2px);
    }

    .btn-action.primary {
      background: linear-gradient(135deg, var(--pink-primary), var(--purple-accent));
      border: none;
      box-shadow: 0 4px 15px rgba(255, 20, 147, 0.4);
    }

    .btn-action.primary:hover {
      box-shadow: 0 8px 25px rgba(255, 20, 147, 0.6);
    }

    /* Grid Layout for Stats Cards */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1.75rem;
      margin-bottom: 3rem;
    }

    .card-box {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: 20px;
      padding: 1.75rem;
      backdrop-filter: blur(20px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      position: relative;
      overflow: hidden;
    }

    .card-box h3.card-title {
      font-size: 0.9rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .card-value {
      font-size: 2.2rem;
      font-weight: 800;
      margin-bottom: 0.4rem;
    }

    .card-value.emerald {
      color: var(--emerald-green);
      text-shadow: 0 0 15px rgba(80, 255, 177, 0.4);
    }

    .card-value.pink {
      color: #FFB6C1;
    }

    .card-value.gold {
      color: var(--gold-star);
    }

    .card-subtext {
      font-size: 0.88rem;
      color: var(--text-muted);
    }

    /* Progress Bar */
    .xp-progress-bar {
      width: 100%;
      height: 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      overflow: hidden;
      margin: 1rem 0 0.5rem 0;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .xp-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--pink-primary), var(--cyan-neon));
      border-radius: 10px;
      transition: width 0.8s ease-in-out;
    }

    /* Signature Calligraphy Box */
    .signature-display-box {
      background: rgba(0, 0, 0, 0.4);
      border: 1.5px dashed var(--gold-star);
      border-radius: 14px;
      padding: 0.75rem 1.25rem;
      margin-top: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .sig-text {
      font-family: 'Georgia', serif;
      font-style: italic;
      font-weight: 700;
      font-size: 1.4rem;
      color: var(--gold-star);
      letter-spacing: 1px;
    }

    /* Access Denied Card */
    .login-prompt-banner {
      background: linear-gradient(135deg, rgba(88, 101, 242, 0.2), rgba(255, 20, 147, 0.2));
      border: 1px dashed rgba(88, 101, 242, 0.5);
      border-radius: 20px;
      padding: 2rem;
      text-align: center;
      margin-bottom: 2.5rem;
    }
  </style>
</head>
<body>

  <!-- Navigation Header -->
  <header>
    <div class="nav-container">
      <a href="/" class="brand">
        <img src="https://i.postimg.cc/63xkK4YM/HANSRAJ-AYAN-OFFICIAL-COMMUNITY-Global-Bank-discord-server.png" alt="Riya AI Logo">
        Riya AI Girlfriend
      </a>
      <nav class="nav-links">
        <a href="/">Home</a>
        <a href="/commands">Commands</a>
        <a href="/guide">Guide</a>
        <a href="/profile" class="active">👤 Profile</a>
        <a href="/dashboard">Dashboard</a>
        <a href="/login" class="btn-connect" id="headerAuthBtn">Connect Discord</a>
      </nav>
    </div>
  </header>

  <!-- Profile Main Content -->
  <main class="profile-container">

    <!-- Profile Content Area -->
    <div id="profileContentArea">

      <!-- Quick ID Search Bar for Firebase Progress -->
      <div style="background: rgba(25, 10, 45, 0.85); border: 1px solid var(--border-card); border-radius: 20px; padding: 1.25rem 1.75rem; margin-bottom: 2rem; backdrop-filter: blur(16px); display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="display: flex; align-items: center; gap: 0.75rem; font-weight: 700; color: #FFF; font-size: 1.05rem;">
          <span style="font-size: 1.4rem;">🔍</span>
          <span>Search Discord ID & Check Progress:</span>
        </div>
        <div style="display: flex; gap: 0.75rem; flex: 1; min-width: 280px; max-width: 600px;">
          <input type="text" id="quickSearchIdInput" placeholder="Enter Discord ID (e.g. 1016322069093)" style="flex: 1; padding: 0.8rem 1.1rem; background: rgba(0,0,0,0.6); border: 2px solid rgba(255,20,147,0.4); border-radius: 12px; color: #FFF; font-family: monospace; font-size: 1rem; outline: none;" onkeypress="if(event.key==='Enter') performQuickIdSearch();">
          <button onclick="performQuickIdSearch()" id="btnQuickSearch" style="padding: 0.8rem 1.4rem; background: linear-gradient(135deg, var(--pink-primary), var(--purple-accent)); color: #FFF; border: none; border-radius: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer; white-space: nowrap; box-shadow: 0 4px 15px rgba(255,20,147,0.4);">🔍 Inspect Progress</button>
        </div>
      </div>

      <!-- Banner & Header Section -->
      <div class="profile-banner-wrapper" id="bannerWrapper">
        <img id="profileBannerImg" src="" alt="User Banner" class="profile-banner-img" style="display: none;">
        <div class="banner-overlay"></div>
        
        <div class="avatar-wrapper">
          <img id="profileAvatarImg" src="https://cdn-icons-png.flaticon.com/512/3059/3059502.png" alt="User Avatar" class="profile-avatar-img">
          <div class="status-badge" title="Discord Online Status"></div>
        </div>
      </div>

      <!-- Header Info Box -->
      <div class="profile-header-card">
        <div class="user-name-title">
          <div class="name-block">
            <h1 id="userDisplayName"></h1>
            <p class="username-tag" id="userUsernameTag"></p>

            <div class="badges-row" id="badgesRow">
              <span class="badge-chip verified">⚡ Discord Connected</span>
              <span class="badge-chip nitro">💎 Premium Member</span>
              <span class="badge-chip partner" id="partnerBadgeChip" style="display: none;">👑 Riya Partner</span>
              <span class="badge-chip" id="userIpBadgeChip" style="background: rgba(0, 240, 255, 0.15); border-color: var(--cyan-neon); color: var(--cyan-neon);">🌐 IP: Connected</span>
            </div>
          </div>

          <div class="profile-actions">
            <button onclick="syncProfile()" id="btnSyncProfile" class="btn-action primary">
              🔄 Sync Profile
            </button>
            <button onclick="logoutDiscord()" class="btn-action" style="color: #FF4B4B; border-color: rgba(255, 75, 75, 0.5); background: rgba(255, 75, 75, 0.1);">
              🔌 Disconnect / Change ID
            </button>
          </div>
        </div>
      </div>

      <!-- Live Economy & RPG Stats Grid -->
      <div class="stats-grid">

        <!-- Bank Savings Vault -->
        <div class="card-box">
          <h3 class="card-title">🏦 Bank Savings Balance</h3>
          <div class="card-value emerald" id="bankSavingsVal"></div>
          <p class="card-subtext">Protected from robbery via <code style="color: var(--pink-primary);">/rob</code> command.</p>
        </div>

        <!-- Wallet Cash -->
        <div class="card-box">
          <h3 class="card-title">👛 Wallet Cash</h3>
          <div class="card-value pink" id="walletCashVal"></div>
          <p class="card-subtext">Liquid cash in pocket for shopping & gifts.</p>
        </div>

        <!-- Level & Relationship Title -->
        <div class="card-box">
          <h3 class="card-title">⭐ Level & Relationship Title</h3>
          <div class="card-value gold" id="levelTitleVal"></div>
          
          <div class="xp-progress-bar">
            <div class="xp-progress-fill" id="xpProgressFill" style="width: 0%;"></div>
          </div>
          <p class="card-subtext" id="xpTextSub"></p>
        </div>

        <!-- Official Authorised Signature -->
        <div class="card-box">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h3 class="card-title" style="margin-bottom: 0;">✒️ Official Banking Signature</h3>
            <button onclick="editBankSignature()" id="btnEditSig" style="background: rgba(255, 20, 147, 0.15); border: 1px solid var(--pink-primary); color: var(--pink-primary); padding: 0.25rem 0.65rem; border-radius: 8px; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.2s ease;">✏️ Edit Signature</button>
          </div>
          <p class="card-subtext">Cursive calligraphic signature string for banking certificates:</p>
          <div class="signature-display-box">
            <span class="sig-text" id="sigTextDisplay"></span>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Verified Card Holder</span>
          </div>
        </div>

      </div>

    </div>

  </main>

  <!-- Client-Side OAuth & Profile Script -->
  <script>
    function formatMoney(amount) {
      return '$' + (amount || 0).toLocaleString('en-US');
    }

    function cleanCanvasText(str) {
      if (!str) return 'Valued Member';
      let norm = str.replace(/[\\u{1F1E6}-\\u{1F1FF}]/gu, ch => {
        const code = ch.codePointAt(0) - 0x1F1E6 + 65;
        return String.fromCharCode(code);
      }).normalize('NFKD');

      const smallCapsMap = {
        'ᴀ': 'A', 'ʙ': 'B', 'ᴄ': 'C', 'ᴅ': 'D', 'ᴇ': 'E', 'ꜰ': 'F', 'ɢ': 'G', 'ʜ': 'H', 'ɪ': 'I',
        'ᴊ': 'J', 'ᴋ': 'K', 'ʟ': 'L', 'ᴍ': 'M', 'ɴ': 'N', 'ᴏ': 'O', 'ᴘ': 'P', 'ǫ': 'Q', 'ʀ': 'R',
        'ꜱ': 'S', 'ᴛ': 'T', 'ᴜ': 'U', 'ᴠ': 'V', 'ᴡ': 'W', 'x': 'X', 'ʏ': 'Y', 'ᴢ': 'Z'
      };
      norm = norm.split('').map(ch => smallCapsMap[ch] || ch).join('');

      let cleaned = norm
        .replace(/[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{1F600}-\\u{1F64F}\\u{1F680}-\\u{1F6FF}\\u{2600}-\\u{27BF}\\u{2B50}]/gu, '')
        .replace(/[^\\x20-\\x7E\\u00C0-\\u024F]/g, '')
        .replace(/\\s+/g, ' ')
        .trim();

      if (cleaned && /^(?:[A-Za-z0-9]\\s+)+[A-Za-z0-9]$/.test(cleaned)) {
        cleaned = cleaned.replace(/\\s+/g, '');
      }

      return cleaned || 'Valued Member';
    }

    function generateSignature(displayName, username) {
      const raw = cleanCanvasText(displayName || username || 'HANSRAJ VAGHELA');
      if (!raw || /^user[_\s]*\d+$/i.test(raw) || /^u\.\d+$/i.test(raw) || raw === 'Valued Member') {
        return 'H.VAGHELA';
      }
      const cleaned = raw.replace(/(\D+)\d+$/, '$1').trim();
      const words = cleaned.split(/[\s._-]+/).filter(Boolean);
      if (words.length >= 2) {
        return words[0][0].toUpperCase() + '.' + words[words.length - 1].toUpperCase();
      } else if (words.length === 1) {
        const w = words[0].toUpperCase();
        return w.length > 2 ? w[0] + '.' + w : w + '.' + w;
      }
      return 'H.VAGHELA';
    }

    async function editBankSignature() {
      const currentSig = document.getElementById('sigTextDisplay')?.innerText || 'H.VAGHELA';
      const activeId = localStorage.getItem('discord_user_id') || localStorage.getItem('discord_auth');
      
      if (!activeId) {
        alert('Please connect your Discord ID first to edit your Bank Signature.');
        return;
      }

      const newSig = prompt('✒️ Enter your custom Official Bank Signature (e.g. A.H. SHAH, H.VAGHELA, A.HANSRAJ):', currentSig);
      if (!newSig || !newSig.trim()) return;

      const cleanSig = newSig.trim().toUpperCase();
      const sigEl = document.getElementById('sigTextDisplay');
      if (sigEl) sigEl.innerText = cleanSig;
      localStorage.setItem('discord_user_signature', cleanSig);

      try {
        const res = await fetch('/api/user/signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: activeId, signature: cleanSig })
        });
        const data = await res.json();
        if (data.success) {
          alert('✅ Bank Signature updated and saved to Firebase: ' + cleanSig);
        }
      } catch(e) {
        console.warn('Could not save signature to Firebase server:', e);
      }
    }

    function connectDiscordFromProfile() {
      localStorage.setItem('pre_login_redirect', '/profile');
      window.location.href = '/connect';
    }

    function clearAuthSession() {
      localStorage.removeItem('discord_access_token');
      localStorage.removeItem('discord_auth');
      localStorage.removeItem('discord_user_cache');
      localStorage.removeItem('discord_user_details');
      localStorage.removeItem('discord_user_id');
      localStorage.removeItem('discord_user_name');
      localStorage.removeItem('discord_username');
      localStorage.removeItem('discord_user_avatar');
      localStorage.removeItem('discord_user_bank');
      localStorage.removeItem('discord_user_balance');
      localStorage.removeItem('discord_user_level');
      localStorage.removeItem('discord_user_xp');
      localStorage.removeItem('discord_user_title');
      localStorage.removeItem('discord_user_signature');
      localStorage.removeItem('pre_login_redirect');
      localStorage.removeItem('skip_login');
    }

    function saveLocalUserDetails(user, stats = null) {
      if (!user) return null;
      const displayName = user.global_name || user.display_name || user.displayName || user.username || 'Discord Member';
      const avatarExt = user.avatar ? (typeof user.avatar === 'string' && user.avatar.startsWith('a_') ? 'gif' : 'png') : null;
      const avatarUrl = user.avatar 
        ? (user.avatar.startsWith('http') ? user.avatar : 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.' + avatarExt + '?size=512')
        : 'https://cdn-icons-png.flaticon.com/512/3059/3059502.png';

      const details = {
        userId: user.id || user.userId,
        username: user.username,
        displayName: displayName,
        avatar: avatarUrl,
        banner: user.banner ? (user.banner.startsWith('http') ? user.banner : 'https://cdn.discordapp.com/banners/' + user.id + '/' + user.banner + '.' + (user.banner.startsWith('a_') ? 'gif' : 'png')) : null,
        accentColor: user.accent_color ? '#' + user.accent_color.toString(16).padStart(6, '0') : null,
        bank: stats?.bank !== undefined ? stats.bank : Number(localStorage.getItem('discord_user_bank') || 0),
        balance: stats?.balance !== undefined ? stats.balance : Number(localStorage.getItem('discord_user_balance') || 10000),
        level: stats?.level !== undefined ? stats.level : Number(localStorage.getItem('discord_user_level') || 1),
        xp: stats?.xp !== undefined ? stats.xp : Number(localStorage.getItem('discord_user_xp') || 0),
        title: stats?.title || localStorage.getItem('discord_user_title') || 'Acquaintance',
        signature: stats?.signature || localStorage.getItem('discord_user_signature') || '',
        lastLoginAt: new Date().toISOString()
      };

      localStorage.setItem('discord_user_cache', JSON.stringify(details));
      localStorage.setItem('discord_user_details', JSON.stringify(details));
      if (details.userId) localStorage.setItem('discord_user_id', details.userId);
      if (details.displayName) localStorage.setItem('discord_user_name', details.displayName);
      if (details.username) localStorage.setItem('discord_username', details.username);
      if (details.avatar) localStorage.setItem('discord_user_avatar', details.avatar);
      if (details.bank !== undefined) localStorage.setItem('discord_user_bank', details.bank);
      if (details.balance !== undefined) localStorage.setItem('discord_user_balance', details.balance);
      if (details.level !== undefined) localStorage.setItem('discord_user_level', details.level);
      if (details.xp !== undefined) localStorage.setItem('discord_user_xp', details.xp);
      if (details.title) localStorage.setItem('discord_user_title', details.title);
      if (details.signature) localStorage.setItem('discord_user_signature', details.signature);

      return details;
    }

    function updateNavHeader(userCache = null) {
      const btn = document.getElementById('headerAuthBtn');
      if (!btn) return;
      const token = localStorage.getItem('discord_access_token') || localStorage.getItem('discord_auth');
      
      if (token || userCache) {
        let name = 'My Profile';
        if (userCache && (userCache.displayName || userCache.username)) {
          name = userCache.displayName || userCache.username;
        } else {
          const cachedRaw = localStorage.getItem('discord_user_cache');
          if (cachedRaw) {
            try {
              const u = JSON.parse(cachedRaw);
              name = u.displayName || u.username || name;
            } catch(e) {}
          }
        }
        btn.href = '/profile';
        btn.style.background = 'linear-gradient(135deg, #00FF7F, #00F0FF)';
        btn.style.color = '#0B0314';
        btn.innerHTML = '👤 ' + name;
      } else {
        btn.href = '/connect';
        btn.style.background = 'linear-gradient(135deg, #5865F2, #7289DA)';
        btn.style.color = '#FFF';
        btn.innerHTML = 'Connect Discord';
      }
    }

    function showAccessDenied() {
      updateNavHeader(null);
      const activeId = localStorage.getItem('discord_user_id') || localStorage.getItem('discord_auth') || '1016322069093';
      fetchAndRenderProfile(activeId);
    }

    function showIdConnectPrompt() {
      const container = document.querySelector('.profile-container');
      if (!container) return;
      container.innerHTML = '<div style="max-width: 500px; margin: 4rem auto; padding: 2.5rem; background: rgba(25, 10, 45, 0.9); border: 1px solid var(--border-card); border-radius: 24px; backdrop-filter: blur(20px); text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.7);">' +
        '<img src="https://cdn-icons-png.flaticon.com/512/3081/3081840.png" style="width: 72px; height: 72px; border-radius: 50%; border: 3px solid var(--pink-primary); margin-bottom: 1rem;">' +
        '<h2 style="font-size: 1.8rem; font-weight: 800; color: #FFF; margin-bottom: 0.5rem;">Connect Discord Account ☕💖</h2>' +
        '<p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.5;">Enter your Discord User ID below to load your connected profile and Firebase stats.</p>' +
        '<input type="text" id="promptDiscordIdInput" placeholder="Enter Discord ID (e.g. 1016322069093)" style="width: 100%; padding: 0.95rem 1.2rem; background: rgba(0,0,0,0.6); border: 2px solid rgba(255,20,147,0.4); border-radius: 14px; color: #fff; font-family: monospace; font-size: 1.05rem; outline: none; margin-bottom: 1rem;">' +
        '<button onclick="submitPromptDiscordId()" id="btnPromptSubmit" style="width: 100%; padding: 0.95rem; background: linear-gradient(135deg, var(--pink-primary), var(--purple-accent)); color: #fff; border: none; border-radius: 14px; font-weight: 700; font-size: 1.05rem; cursor: pointer;">🔍 Search & Connect Account</button>' +
        '<div style="margin-top: 1rem;"><span onclick="document.getElementById(\\'promptDiscordIdInput\\').value=\\'1016322069093\\'; submitPromptDiscordId();" style="color: var(--cyan-neon); font-size: 0.85rem; font-family: monospace; cursor: pointer; text-decoration: underline;">⚡ Preset Owner ID: 1016322069093</span></div>' +
        '<div id="promptStatusMsg" style="margin-top: 1rem; font-size: 0.9rem; font-weight: 600;"></div>' +
      '</div>';
    }

    async function performQuickIdSearch() {
      const input = document.getElementById('quickSearchIdInput');
      const btn = document.getElementById('btnQuickSearch');
      if (!input) return;
      const rawId = input.value.trim();
      const cleanId = rawId.replace(/[^0-9]/g, '');

      if (!cleanId || cleanId.length < 3) {
        alert('Please enter a valid numeric Discord User ID to inspect.');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Fetching...';
      }

      localStorage.setItem('discord_user_id', cleanId);
      localStorage.setItem('discord_auth', cleanId);
      
      // Update browser URL query parameter without full reload
      if (window.history.pushState) {
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?id=' + cleanId;
        window.history.pushState({ path: newUrl }, '', newUrl);
      }

      await fetchAndRenderProfile(cleanId);

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '🔍 Inspect Progress';
      }
    }

    async function submitPromptDiscordId() {
      const input = document.getElementById('promptDiscordIdInput');
      const status = document.getElementById('promptStatusMsg');
      const btn = document.getElementById('btnPromptSubmit');
      const rawId = input ? input.value.trim() : '';
      const cleanId = rawId.replace(/[^0-9]/g, '');

      if (!cleanId || cleanId.length < 3) {
        if (status) {
          status.style.color = '#FF4B4B';
          status.innerText = '❌ Please enter a valid numeric Discord User ID.';
        }
        return;
      }

      if (status) {
        status.style.color = '#00FF7F';
        status.innerText = '⏳ Connecting to Firebase Cloud...';
      }
      if (btn) btn.disabled = true;

      localStorage.setItem('discord_user_id', cleanId);
      localStorage.setItem('discord_auth', cleanId);
      window.location.href = '/profile?id=' + cleanId;
    }

    async function fetchAndRenderProfile(userId) {
      try {
        const res = await fetch('/api/user/' + userId + '/profile?t=' + Date.now(), {
          headers: { 'Cache-Control': 'no-cache, no-store' },
          cache: 'no-store'
        });

        if (res.ok) {
          const user = await res.json();
          renderUserData(user);
          updateNavHeader(user);
        } else {
          showIdConnectPrompt();
        }
      } catch(err) {
        console.error('Error fetching user profile details:', err);
        showIdConnectPrompt();
      }
    }

    async function loadUserProfile() {
      const urlParams = new URLSearchParams(window.location.search);
      let activeId = urlParams.get('id') || urlParams.get('userId') || localStorage.getItem('discord_user_id') || localStorage.getItem('discord_auth') || '1016322069093';
      activeId = String(activeId).replace(/[^0-9]/g, '');

      if (activeId && activeId.length >= 3) {
        localStorage.setItem('discord_user_id', activeId);
        localStorage.setItem('discord_auth', activeId);
        const searchInput = document.getElementById('quickSearchIdInput');
        if (searchInput) searchInput.value = activeId;
        fetchAndRenderProfile(activeId);
      } else {
        showIdConnectPrompt();
      }
    }

    async function renderUserData(user) {
      if (!user) return;
      const displayName = user.displayName || user.username || 'Discord Member';
      const username = '@' + (user.username || 'username');
      const uId = user.userId || user.id || '1016322069093';

      const nameEl = document.getElementById('userDisplayName');
      if (nameEl) nameEl.innerText = displayName;

      const tagEl = document.getElementById('userUsernameTag');
      if (tagEl) tagEl.innerText = username + ' • ID: ' + uId;

      // Avatar Parsing
      const avatarEl = document.getElementById('profileAvatarImg');
      if (avatarEl) {
        let avatarUrl = user.avatar || 'https://cdn-icons-png.flaticon.com/512/3059/3059502.png';
        if (!avatarUrl.startsWith('http')) {
          const ext = avatarUrl.startsWith('a_') ? 'gif' : 'png';
          avatarUrl = 'https://cdn.discordapp.com/avatars/' + uId + '/' + avatarUrl + '.' + ext + '?size=512';
        }
        avatarEl.src = avatarUrl;
      }

      // Banner Parsing
      const bannerWrapper = document.getElementById('bannerWrapper');
      const bannerImg = document.getElementById('profileBannerImg');
      if (bannerWrapper && bannerImg) {
        if (user.banner) {
          let bannerUrl = user.banner;
          if (!bannerUrl.startsWith('http')) {
            const ext = bannerUrl.startsWith('a_') ? 'gif' : 'png';
            bannerUrl = 'https://cdn.discordapp.com/banners/' + uId + '/' + bannerUrl + '.' + ext + '?size=1024';
          }
          bannerImg.src = bannerUrl;
          bannerImg.style.display = 'block';
        } else {
          bannerWrapper.style.background = 'linear-gradient(135deg, #1E0638, #3B0A45, #660F45)';
          bannerImg.style.display = 'none';
        }
      }

      // Generate Signature & Stats
      const bankVal = document.getElementById('bankSavingsVal');
      if (bankVal) bankVal.innerText = formatMoney(user.bank !== undefined ? user.bank : 258590);

      const walletVal = document.getElementById('walletCashVal');
      if (walletVal) walletVal.innerText = formatMoney(user.balance !== undefined ? user.balance : 10000);

      const lvl = user.level || 1;
      const title = user.title || 'Acquaintance';
      const lvlEl = document.getElementById('levelTitleVal');
      if (lvlEl) lvlEl.innerText = 'Level ' + lvl + ' • ' + title;

      const xp = user.xp || 0;
      const nextLvlXp = lvl * 200;
      const pct = Math.min(100, Math.floor((xp / nextLvlXp) * 100));
      const xpFill = document.getElementById('xpProgressFill');
      if (xpFill) xpFill.style.width = pct + '%';
      const xpText = document.getElementById('xpTextSub');
      if (xpText) xpText.innerText = 'XP Progress: ' + xp + ' / ' + nextLvlXp + ' XP (' + pct + '%)';

      const sigEl = document.getElementById('sigTextDisplay');
      if (sigEl) sigEl.innerText = user.signature || generateSignature(displayName, user.username);

      if (user.isDailyPartner) {
        const partnerBadge = document.getElementById('partnerBadgeChip');
        if (partnerBadge) partnerBadge.style.display = 'inline-flex';
      }

      const ipChip = document.getElementById('userIpBadgeChip');
      if (ipChip) {
        const userIp = user.ipAddress || localStorage.getItem('discord_user_ip') || 'Verified';
        ipChip.innerText = '🌐 IP: ' + userIp;
      }

      // Save user details into browser localStorage
      saveLocalUserDetails(user, user);
    }

    async function syncProfile() {
      const btn = document.getElementById('btnSyncProfile');
      const activeId = localStorage.getItem('discord_user_id') || localStorage.getItem('discord_auth');

      if (!activeId) {
        showIdConnectPrompt();
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Syncing Firebase...';
        btn.style.opacity = '0.7';
      }

      try {
        await fetchAndRenderProfile(activeId);
        if (btn) {
          btn.style.opacity = '1';
          btn.innerHTML = '✅ Synced with Firebase!';
          btn.style.background = 'linear-gradient(135deg, #00FF7F, #00F0FF)';
          btn.style.color = '#0B0314';
          setTimeout(function() {
            btn.disabled = false;
            btn.style.background = '';
            btn.style.color = '';
            btn.innerHTML = '🔄 Sync Profile';
          }, 1500);
        }
      } catch (err) {
        console.error('Error syncing profile with Firebase:', err);
        if (btn) {
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.innerHTML = '❌ Sync Failed';
          setTimeout(function() {
            btn.innerHTML = '🔄 Sync Profile';
          }, 1500);
        }
      }
    }

    function logoutDiscord() {
      clearAuthSession();
      showIdConnectPrompt();
    }

    window.addEventListener('DOMContentLoaded', loadUserProfile);

    // Anti-DevTools Security Guard
    (function() {
      document.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; });
      document.addEventListener('keydown', function(e) {
        if (e.keyCode === 123) { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
          e.preventDefault(); return false;
        }
        if (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83)) {
          e.preventDefault(); return false;
        }
      });
    })();
  </script>
</body>
</html>`;
};
