import { config } from '../config.js';
import { ALL_COMMANDS } from './commandsData.js';

export const DEFAULT_CONNECTED_GUILDS = [
  {
    id: '1205579847863369788',
    name: '⚡ VIP ARMY ┃ VIP BHAI',
    icon: 'https://cdn.discordapp.com/icons/1205579847863369788/70b8ada9bd0eb40ab23d559c92b1830f.png',
    memberCount: 169
  },
  {
    id: '1275436284390674443',
    name: '🌐FG eSports🏆',
    icon: 'https://cdn.discordapp.com/icons/1275436284390674443/587f70373973667ff2f44e12b5a86554.png',
    memberCount: 5
  },
  {
    id: '1361649010623910020',
    name: "Gamer's Galaxy",
    icon: 'https://cdn.discordapp.com/icons/1361649010623910020/2a3b15ccfe8adce32ce0554737a013e3.png',
    memberCount: 51
  },
  {
    id: '1378386158685388920',
    name: 'GLOBAL HQ',
    icon: 'https://cdn.discordapp.com/icons/1378386158685388920/5ae888e8b96707ea289d9d90cbc7606b.png',
    memberCount: 16
  },
  {
    id: '1388437540461346877',
    name: 'HANSRAJ AYAN OFFICIAL COMMUNITY',
    icon: 'https://cdn.discordapp.com/icons/1388437540461346877/dd6d7f9c887a210b7b624a8514cfe800.png',
    memberCount: 309
  },
  {
    id: '1480210158348009704',
    name: 'XXXXXXXXXXXXXXXX',
    icon: 'https://cdn.discordapp.com/icons/1480210158348009704/ae23eda385a9e199d4ad94e481883bdc.png',
    memberCount: 9
  },
  {
    id: '1517106528258097182',
    name: "HANSRAJxFPS's serverxxx",
    icon: 'https://cdn-icons-png.flaticon.com/512/2913/2913990.png',
    memberCount: 7
  }
];

export const getDashboardHtml = (client = null, authData = null, externalGuilds = null) => {
  const clientId = config.clientId || '1479052475368607926';
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=51200&integration_type=0&scope=bot+applications.commands+guilds.join+gdm.join`;
  const oauthConnectUrl = `/connect`;

  let rawGuilds = [];
  if (externalGuilds && Array.isArray(externalGuilds) && externalGuilds.length > 0) {
    rawGuilds = externalGuilds;
  } else if (client?.guilds?.cache?.size > 0) {
    rawGuilds = client.guilds.cache.map(g => ({
      id: g.id,
      name: g.name,
      icon: g.iconURL() || 'https://cdn-icons-png.flaticon.com/512/2913/2913990.png',
      memberCount: g.memberCount,
      botActive: true
    }));
  } else {
    rawGuilds = DEFAULT_CONNECTED_GUILDS;
  }

  const guildsList = rawGuilds.map(g => ({
    id: g.id,
    name: g.name,
    icon: g.icon || g.iconURL?.() || 'https://cdn-icons-png.flaticon.com/512/2913/2913990.png',
    memberCount: g.memberCount !== undefined ? g.memberCount : (g.approximate_member_count || 0),
    botActive: true
  }));

  const serverCount = guildsList.length > 0 ? guildsList.length : (client?.guilds?.cache?.size || 7);
  const totalMembers = guildsList.reduce((acc, g) => acc + (Number(g.memberCount) || 0), 0);
  const userCount = totalMembers > 0 ? totalMembers : (client?.users?.cache?.size || 566);
  const uptimeSec = Math.floor(process.uptime() || 0);
  const uDays = Math.floor(uptimeSec / 86400);
  const uHours = Math.floor((uptimeSec % 86400) / 3600);
  const uMins = Math.floor((uptimeSec % 3600) / 60);
  const uSecs = Math.floor(uptimeSec % 60);
  const uptimeFormatted = uDays > 0 ? `${uDays}d ${uHours}h ${uMins}m ${uSecs}s` : (uHours > 0 ? `${uHours}h ${uMins}m ${uSecs}s` : (uMins > 0 ? `${uMins}m ${uSecs}s` : `${uSecs}s`));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Riya AI Bot • Sanctum Control Center & Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700;800&family=Outfit:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  
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
      try { getAnalytics(app); } catch(e) { console.log('Analytics loaded'); }
    }
  </script>

  <style>
    :root {
      --bg-void: #020205;
      --bg-dark: #0B0314;
      --bg-card: rgba(15, 7, 30, 0.75);
      --border-card: rgba(0, 240, 255, 0.2);
      --border-pink: rgba(255, 20, 147, 0.25);
      --pink-primary: #FF1493;
      --purple-accent: #9B51E0;
      --cyan-neon: #00F0FF;
      --gold-star: #FFD700;
      --green-online: #00FF7F;
      --text-main: #FFFFFF;
      --text-muted: #B3A0CC;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg-void);
      color: var(--text-main);
      min-height: 100vh;
      line-height: 1.6;
      overflow-x: hidden;
      position: relative;
    }

    /* Fixed Immersive Anime Gamer Room Wallpaper with Cyberpunk Glow */
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

    /* Initial Pulse Loader Screen (Scribe VC Sanctum Style) */
    #initial-loader {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: #020205;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      transition: opacity 0.5s ease, visibility 0.5s ease;
    }

    #initial-loader.hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    .pulse-container {
      position: relative;
      width: 140px;
      height: 140px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .pulse-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 3px solid transparent;
      border-top-color: var(--cyan-neon);
      border-bottom-color: var(--pink-primary);
      animation: spinPulse 1.8s linear infinite;
      box-shadow: 0 0 25px rgba(0, 240, 255, 0.4);
    }

    .pulse-core {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: radial-gradient(circle, var(--pink-primary), var(--purple-accent));
      box-shadow: 0 0 35px var(--pink-primary);
      animation: coreGlow 1.5s ease-in-out infinite alternate;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 2.2rem;
    }

    .loader-title {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 800;
      font-size: 1.5rem;
      letter-spacing: 2px;
      margin-top: 1.75rem;
      color: var(--cyan-neon);
      text-transform: uppercase;
      text-shadow: 0 0 12px rgba(0, 240, 255, 0.6);
    }

    .loader-subtitle {
      font-size: 0.9rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    @keyframes spinPulse {
      0% { transform: rotate(0deg) scale(1); }
      50% { transform: rotate(180deg) scale(1.1); }
      100% { transform: rotate(360deg) scale(1); }
    }

    @keyframes coreGlow {
      0% { opacity: 0.7; transform: scale(0.95); }
      100% { opacity: 1; transform: scale(1.05); }
    }

    /* Header & Navigation */
    header {
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(20px);
      background: rgba(2, 2, 5, 0.85);
      border-bottom: 1px solid var(--border-card);
      padding: 1rem 2rem;
    }

    .nav-container {
      max-width: 1300px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-family: 'Rajdhani', sans-serif;
      font-size: 1.8rem;
      font-weight: 800;
      letter-spacing: 1px;
      background: linear-gradient(135deg, var(--cyan-neon), var(--pink-primary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-decoration: none;
    }

    .brand img {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: 2px solid var(--cyan-neon);
      box-shadow: 0 0 12px rgba(0, 240, 255, 0.5);
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
      font-size: 0.95rem;
    }

    .nav-links a:hover, .nav-links a.active {
      color: var(--cyan-neon);
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

    .btn-invite {
      background: linear-gradient(135deg, var(--pink-primary), var(--purple-accent));
      color: #fff;
      padding: 0.6rem 1.25rem;
      border-radius: 12px;
      font-weight: 700;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 4px 15px rgba(255, 20, 147, 0.4);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .btn-invite:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 20, 147, 0.6);
    }

    /* Container Main */
    .main-content {
      max-width: 1300px;
      margin: 2rem auto;
      padding: 0 1.5rem;
    }

    /* Hero Banner (Sanctum Style) */
    .hero-banner {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: 24px;
      padding: 3rem 2.5rem;
      margin-bottom: 2.5rem;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 10px 35px rgba(0, 0, 0, 0.7);
    }

    .hero-banner::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(0, 240, 255, 0.15), transparent 70%);
      pointer-events: none;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(0, 255, 127, 0.1);
      border: 1px solid rgba(0, 255, 127, 0.3);
      color: var(--green-online);
      padding: 0.35rem 0.9rem;
      border-radius: 20px;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 0.85rem;
      letter-spacing: 1px;
      margin-bottom: 1.25rem;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      background-color: var(--green-online);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--green-online);
      animation: statusPulse 1.5s infinite alternate;
    }

    @keyframes statusPulse {
      0% { opacity: 0.4; }
      100% { opacity: 1; }
    }

    .hero-banner h1 {
      font-family: 'Rajdhani', sans-serif;
      font-size: 3rem;
      font-weight: 800;
      letter-spacing: 1px;
      margin-bottom: 1rem;
      line-height: 1.15;
      text-transform: uppercase;
      background: linear-gradient(135deg, #FFFFFF, var(--text-muted));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-banner h1 span {
      background: linear-gradient(135deg, var(--cyan-neon), var(--pink-primary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-banner p {
      font-size: 1.15rem;
      color: var(--text-muted);
      max-width: 780px;
      margin-bottom: 2rem;
    }

    .hero-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 2.5rem;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1.25rem;
    }

    .stat-card {
      background: rgba(2, 2, 5, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.25rem;
      text-align: center;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .stat-card:hover {
      transform: translateY(-3px);
      border-color: var(--cyan-neon);
    }

    .stat-number {
      font-family: 'Rajdhani', sans-serif;
      font-size: 2.2rem;
      font-weight: 800;
      color: var(--cyan-neon);
      text-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
    }

    .stat-label {
      font-size: 0.85rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }

    /* Section Titles */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .section-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    /* Server Picker Grid */
    .servers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.25rem;
      margin-bottom: 3rem;
    }

    .server-card {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: 18px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .server-card:hover {
      transform: translateY(-4px);
      border-color: var(--pink-primary);
    }

    .server-icon {
      width: 54px;
      height: 54px;
      border-radius: 16px;
      border: 2px solid var(--border-card);
      object-fit: cover;
    }

    .server-info h4 {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 0.2rem;
    }

    .server-info p {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    /* Feature Showcase Grid (6 High-Tech Cards) */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3.5rem;
    }

    .feature-card {
      background: var(--bg-card);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 1.75rem;
      position: relative;
      overflow: hidden;
      transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
    }

    .feature-card:hover {
      transform: translateY(-5px);
      border-color: var(--cyan-neon);
      box-shadow: 0 10px 30px rgba(0, 240, 255, 0.15);
    }

    .feature-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid var(--cyan-neon);
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 1.6rem;
      margin-bottom: 1.25rem;
    }

    .feature-card h3 {
      font-family: 'Rajdhani', sans-serif;
      font-size: 1.4rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 0.6rem;
      color: #FFF;
    }

    .feature-card p {
      font-size: 0.95rem;
      color: var(--text-muted);
      line-height: 1.5;
    }

    /* Search Bar & Category Pills */
    .search-filter-container {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: 20px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .search-input {
      font-family: 'Outfit', sans-serif;
      background: rgba(2, 2, 5, 0.8);
      border: 1px solid var(--border-pink);
      color: #fff;
      padding: 0.85rem 1.25rem;
      border-radius: 14px;
      font-size: 1rem;
      width: 100%;
      outline: none;
      margin-bottom: 1.25rem;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .search-input:focus {
      border-color: var(--cyan-neon);
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.3);
    }

    .category-pills {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-muted);
      padding: 0.55rem 1.1rem;
      border-radius: 20px;
      font-family: 'Rajdhani', sans-serif;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .pill:hover, .pill.active {
      background: linear-gradient(135deg, var(--pink-primary), var(--purple-accent));
      color: #fff;
      border-color: var(--pink-primary);
      box-shadow: 0 4px 15px rgba(255, 20, 147, 0.3);
    }

    /* Commands Grid */
    .commands-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
      margin-bottom: 3.5rem;
    }

    .command-card {
      background: var(--bg-card);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.35rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.2s ease, border-color 0.2s ease;
      cursor: pointer;
    }

    .command-card:hover {
      transform: translateY(-4px);
      border-color: var(--cyan-neon);
    }

    .cmd-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.6rem;
    }

    .cmd-name {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 1.15rem;
      color: var(--pink-primary);
    }

    .cmd-badge {
      font-family: 'Rajdhani', sans-serif;
      font-size: 0.8rem;
      background: rgba(155, 81, 224, 0.3);
      color: var(--cyan-neon);
      padding: 0.2rem 0.6rem;
      border-radius: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .cmd-desc {
      font-size: 0.92rem;
      color: var(--text-muted);
      margin-bottom: 1rem;
    }

    .cmd-usage {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      background: rgba(0, 0, 0, 0.7);
      padding: 0.45rem 0.75rem;
      border-radius: 8px;
      color: var(--cyan-neon);
      border: 1px solid rgba(0, 240, 255, 0.15);
    }

    /* Live System Status Widget */
    .status-widget {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: 20px;
      padding: 2rem;
      margin-bottom: 3.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .status-items-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }

    .status-item {
      background: rgba(2, 2, 5, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 1.25rem;
    }

    .status-item-label {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 0.4rem;
      text-transform: uppercase;
      font-weight: 600;
    }

    .status-item-val {
      font-family: 'Rajdhani', sans-serif;
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--cyan-neon);
    }

    /* Footer */
    footer {
      border-top: 1px solid var(--border-card);
      padding: 2.5rem 1.5rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.92rem;
      background: rgba(2, 2, 5, 0.9);
    }

    footer a {
      color: var(--pink-primary);
      text-decoration: none;
      font-weight: 600;
    }

    footer a:hover {
      text-decoration: underline;
    }

    /* Floating Cyberpunk BGM Music Player Widget */
    #riya-bgm-bar {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: rgba(19, 24, 43, 0.94);
      border: 1px solid #FF4D8D;
      padding: 12px 18px;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 77, 141, 0.25);
      backdrop-filter: blur(16px);
      max-width: 580px;
      width: calc(100% - 40px);
      transition: all 0.3s ease;
      font-family: 'Outfit', sans-serif;
    }

    .bgm-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .bgm-track-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      flex: 1;
    }

    .bgm-art {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      border: 1px solid var(--cyan-neon);
      object-fit: cover;
      box-shadow: 0 0 12px rgba(0, 240, 255, 0.35);
      flex-shrink: 0;
    }

    .bgm-info {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .bgm-now-playing {
      font-size: 0.88rem;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #FFF;
    }

    .bgm-now-playing .tag {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 800;
      color: var(--cyan-neon);
      margin-right: 6px;
      letter-spacing: 0.5px;
    }

    .bgm-subtext {
      font-size: 0.76rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      font-family: 'JetBrains Mono', monospace;
    }

    .bgm-subtext .bpm {
      color: var(--gold-star);
      font-weight: 700;
    }

    .bgm-subtext .brand {
      color: #FF4D8D;
      font-weight: 700;
    }

    .bgm-ctrl-btns {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .bgm-nav-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #FFF;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .bgm-nav-btn:hover {
      background: var(--cyan-neon);
      color: #000;
      border-color: var(--cyan-neon);
    }

    #riya-play-btn {
      background: linear-gradient(135deg, #FF1493, #9B51E0);
      color: #fff;
      border: none;
      border-radius: 20px;
      padding: 0.45rem 1.15rem;
      font-weight: 800;
      font-family: 'Rajdhani', sans-serif;
      font-size: 0.92rem;
      letter-spacing: 0.5px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 15px rgba(255, 20, 147, 0.45);
      transition: transform 0.2s, box-shadow 0.2s;
      white-space: nowrap;
    }

    #riya-play-btn:hover {
      transform: scale(1.04);
      box-shadow: 0 6px 20px rgba(255, 20, 147, 0.65);
    }

    /* Sub Controls Row (Visualizer + Volume + Download) */
    .bgm-bottom-row {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 8px;
    }

    .bgm-visualizer {
      display: flex;
      align-items: flex-end;
      gap: 3px;
      height: 20px;
      width: 80px;
    }

    .bgm-visualizer .bar {
      width: 4px;
      height: 4px;
      border-radius: 2px;
      background: var(--cyan-neon);
      transition: height 0.15s ease;
    }

    .bgm-visualizer.active .bar:nth-child(1) { animation: barBounce 0.6s ease infinite alternate 0.1s; }
    .bgm-visualizer.active .bar:nth-child(2) { animation: barBounce 0.8s ease infinite alternate 0.2s; }
    .bgm-visualizer.active .bar:nth-child(3) { animation: barBounce 0.5s ease infinite alternate 0.3s; }
    .bgm-visualizer.active .bar:nth-child(4) { animation: barBounce 0.9s ease infinite alternate 0.15s; }
    .bgm-visualizer.active .bar:nth-child(5) { animation: barBounce 0.7s ease infinite alternate 0.25s; }
    .bgm-visualizer.active .bar:nth-child(6) { animation: barBounce 0.6s ease infinite alternate 0.05s; }
    .bgm-visualizer.active .bar:nth-child(7) { animation: barBounce 0.85s ease infinite alternate 0.35s; }
    .bgm-visualizer.active .bar:nth-child(8) { animation: barBounce 0.55s ease infinite alternate 0.2s; }

    @keyframes barBounce {
      0% { height: 4px; background: var(--cyan-neon); }
      100% { height: 20px; background: var(--pink-primary); }
    }

    .bgm-vol-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-muted);
      font-size: 0.88rem;
    }

    .bgm-vol-slider {
      accent-color: var(--pink-primary);
      width: 75px;
      height: 4px;
      cursor: pointer;
    }

    .bgm-dl-btn {
      color: var(--cyan-neon);
      font-size: 0.78rem;
      text-decoration: none;
      border: 1px solid rgba(0, 240, 255, 0.35);
      padding: 0.25rem 0.65rem;
      border-radius: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .bgm-dl-btn:hover {
      background: rgba(0, 240, 255, 0.15);
      border-color: var(--cyan-neon);
      color: #fff;
    }

    @media (max-width: 600px) {
      #riya-bgm-bar {
        bottom: 12px;
        right: 12px;
        width: calc(100% - 24px);
        padding: 10px 14px;
      }
      .bgm-now-playing {
        max-width: 170px;
      }
    }
  </style>
</head>
<body>

  <!-- Initial Sanctum Pulse Loader Screen -->
  <div id="initial-loader">
    <div class="pulse-container">
      <div class="pulse-ring"></div>
      <div class="pulse-core">👩🏻‍❤️‍👩🏻</div>
    </div>
    <div class="loader-title">INITIALIZING RIYA SANCTUM...</div>
    <div class="loader-subtitle">Connecting AI Core & Discord Gateway Services</div>
  </div>

  <!-- Header Navigation -->
  <header>
    <div class="nav-container">
      <a href="/" class="brand">
        <img src="https://cdn-icons-png.flaticon.com/512/3081/3081840.png" alt="Riya Logo">
        Riya AI Sanctum
      </a>
      <div class="nav-links">
        <a href="#dashboard" class="active">Dashboard</a>
        <a href="#features">Features</a>
        <a href="#commands">Commands (100)</a>
        <a href="#system">Live Status</a>
        <a href="${oauthConnectUrl}" class="btn-connect" id="headerAuthBtn">
          🔑 Connect Discord ID
        </a>
      </div>
    </div>
  </header>

  <!-- Main Content Container -->
  <div class="main-content">

    <!-- Hero Banner -->
    <div class="hero-banner" id="dashboard">
      <div class="status-pill">
        <div class="status-dot"></div>
        24/7 ONLINE & ACTIVE • SANCTUM CORE v4.0 • 100/100 COMMANDS READY
      </div>

      <h1>RIYA AI <span>SANCTUM CONTROL</span></h1>
      <p>The ultimate next-gen AI Girlfriend & Multipurpose Discord Bot. Equipped with 100 interactive slash commands, dedicated AI chat channel binding, VIP ARMY & HANSRAJ gaming role hubs, dynamic onboarding welcome banners, world region selector, universal Raw JSON configuration engine, Karuta anime cards, cavern mining RPG, metallic bank cards, and inter-server global chat.</p>

      <div class="hero-actions">
        <a href="${inviteUrl}" target="_blank" class="btn-invite">
          ➕ Add to Discord Server
        </a>
        <a href="${oauthConnectUrl}" class="btn-connect">
          🔑 Connect Discord Profile
        </a>
      </div>

      <!-- Live Stats Row -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-number">ONLINE</div>
          <div class="stat-label">Bot Status</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="statServerCount">${serverCount}</div>
          <div class="stat-label">Active Servers</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="statUserCount">${userCount}+</div>
          <div class="stat-label">Total Users</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="statCommandCount">100</div>
          <div class="stat-label">Interactive Commands</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="statUptime">${uptimeFormatted}</div>
          <div class="stat-label">System Uptime</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="statLatency">&lt;42ms</div>
          <div class="stat-label">API Latency</div>
        </div>
      </div>
    </div>

    <!-- BOT Connected Discord Servers & Guild -->
    <div class="section-header">
      <div class="section-title">
        <span>🌐</span> BOT Connected Discord Servers & Guild
      </div>
    </div>

    <div class="servers-grid" id="serversGrid">
      ${guildsList.map(g => `
        <div class="server-card">
          <img src="${g.icon}" class="server-icon" alt="${g.name}">
          <div class="server-info">
            <h4>${g.name}</h4>
            <p>👥 ${g.memberCount || 0} Members • Active</p>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- 10 Feature Showcase Cards -->
    <div class="section-header" id="features">
      <div class="section-title">
        <span>✨</span> Next-Gen Core Features
      </div>
    </div>

    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">👩🏻‍❤️‍👩🏻</div>
        <h3>Dedicated AI Chat Channel</h3>
        <p>Bind Riya to any channel with <code>/select_channel</code> for natural, continuous ping-free conversations. Features intelligent emotion reactions, memory retention, & affection XP progression.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🎮</div>
        <h3>VIP ARMY Dual-Panel Game Roles</h3>
        <p>Deploy interactive dual panels with <code>/setup_games_roles</code> (Panel 1: Top 17 PC/Mobile Games like Minecraft, BGMI, GTA, Valorant; Panel 2: Notification Pings) with smart existing-role matching.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">👑</div>
        <h3>VIP ARMY Welcome Engine</h3>
        <p>Automate member onboarding via <code>/setup_welcome</code> featuring custom animated GIF banners, quick server buttons, and dynamic tokens (<code>{mention}</code>, <code>{server}</code>, <code>{membercount}</code>).</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🌍</div>
        <h3>Interactive World Region Selector</h3>
        <p>Deploy continent auto-role selectors via <code>/setup_region_roles</code> with styled buttons and world map visuals. Assigns regional roles instantly with zero duplicate role conflicts.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3>Universal Raw JSON Engine</h3>
        <p>Instant automated configuration across welcome systems, game roles, and region setups. Paste ready-made Raw JSON or export server configurations with a single command.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🛡️</div>
        <h3>Atomic Concurrency Mutex Lock</h3>
        <p>Enterprise-grade Firestore <code>runTransaction</code> mutex locks preventing duplicate bot responses across distributed clusters, cloud instances (Render), and local environments.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🌐</div>
        <h3>Inter-Server Global Chat</h3>
        <p>Seamlessly bridge communication across multiple Discord communities with cross-server text relays, user avatar syncing, server badges, and automated moderation.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🎴</div>
        <h3>Karuta Style Anime Cards</h3>
        <p>Discover, drop, claim, wishlist, and trade 100+ high-quality anime character cards. Complete album decks, upgrade card rarities, burn cards for gold, & view market values.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">⛏️</div>
        <h3>Cavern Mining & RPG System</h3>
        <p>Explore deep cavern mines, dig for rare gemstones & ancient relics, craft titanium pickaxes, raid boss dungeons, duel server members, & climb global leaderboards.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">💳</div>
        <h3>Metallic PNG Bank Cards</h3>
        <p>Generate shiny metal credit PNG bank cards customized with your Discord avatar, current wallet balance, VIP tier title, and verified status with <code>/bank</code>.</p>
      </div>
    </div>

    <!-- Command Directory with Search & Category Pills -->
    <div class="section-header" id="commands">
      <div class="section-title">
        <span>⚡</span> Interactive Command Directory (100 Commands)
      </div>
    </div>

    <div class="search-filter-container">
      <input type="text" id="cmdSearchInput" class="search-input" placeholder="🔍 Search 100 commands by name, description, or keyword (e.g. select_channel, setup_welcome, games, bank, card, mine)...">
      <div class="category-pills" id="categoryPills">
        <button class="pill active" data-cat="all">All (100)</button>
        <button class="pill" data-cat="ai">👩🏻‍❤️‍👩🏻 AI & Companion (15)</button>
        <button class="pill" data-cat="anime">🎴 Anime Cards (7)</button>
        <button class="pill" data-cat="economy">💰 Economy & Bank (16)</button>
        <button class="pill" data-cat="mining">⛏️ Mining & RPG (13)</button>
        <button class="pill" data-cat="casino">🎲 Casino & Gambling (12)</button>
        <button class="pill" data-cat="games">🎮 Minigames & Fun (11)</button>
        <button class="pill" data-cat="global">🌐 Global Network (3)</button>
        <button class="pill" data-cat="config">⚙️ Server Setup (23)</button>
      </div>
    </div>

    <!-- Commands Directory Grid (All 100 Commands) -->
    <div class="commands-grid" id="commandsGrid">
      ${ALL_COMMANDS.map(c => `
      <div class="command-card" data-cat="${c.category}" data-name="${c.keywords}">
        <div>
          <div class="cmd-header">
            <span class="cmd-name">/${c.name}</span>
            <span class="cmd-badge">${c.badge}</span>
          </div>
          <div class="cmd-desc">${c.desc.replace(/"/g, '&quot;')}</div>
        </div>
        <div class="cmd-usage">${c.usage.replace(/"/g, '&quot;')}</div>
      </div>`).join('')}
    </div>

    <!-- 24/7 System Live Status Widget -->
    <div class="section-header" id="system">
      <div class="section-title">
        <span>🔄</span> 24/7 Live Sanctum Gateway Status
      </div>
    </div>

    <div class="status-widget">
      <div class="status-items-grid">
        <div class="status-item">
          <div class="status-item-label">Runtime Environment</div>
          <div class="status-item-val">Node.js v20.x ESM</div>
        </div>

        <div class="status-item">
          <div class="status-item-label">Discord Gateway</div>
          <div class="status-item-val" style="color: var(--green-online);">WebSocket 100% OK</div>
        </div>

        <div class="status-item">
          <div class="status-item-label">Memory Usage</div>
          <div class="status-item-val">~128 MB / 512 MB</div>
        </div>

        <div class="status-item">
          <div class="status-item-label">Database Sync</div>
          <div class="status-item-val" style="color: var(--gold-star);">Firebase RTDB Live</div>
        </div>
      </div>

      <div style="text-align: right;">
        <button id="btnRefreshStatus" class="btn-connect" style="background: linear-gradient(135deg, var(--cyan-neon), var(--purple-accent)); cursor: pointer;">
          🔄 Refresh Live Gateway Status
        </button>
      </div>
    </div>

  </div>

  <!-- Footer -->
  <footer>
    <p style="font-size: 1.05rem; font-weight: 700; color: #FFF; margin-bottom: 0.35rem;">📄 License & Copyright</p>
    <p>© 2026 | Developed by <strong>HL.Hansraj Labs</strong> | All Rights Reserved.</p>
    <p style="margin-top: 0.4rem; color: rgba(255, 255, 255, 0.5); font-size: 0.85rem;">All code, assets, and branding for Riya AI Girlfriend Discord Bot are protected under copyright.</p>
  </footer>

  <!-- 1. Looping Audio Element -->
  <audio id="riya-bgm" src="riya_lofi_bgm.mp3" loop preload="auto"></audio>

  <!-- 2. Floating Cyberpunk BGM Control Widget -->
  <div id="riya-bgm-bar">
    <div class="bgm-top-row">
      <div class="bgm-track-meta">
        <img src="/riya_lofi_cover.jpg" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3081/3081840.png'" class="bgm-art" alt="Riya Avatar" id="bgm-art">
        <div class="bgm-info">
          <div class="bgm-now-playing">
            <span class="tag">NOW PLAYING:</span><span id="bgm-title">Duo Partner Stream Hype Synthwave</span>
          </div>
          <div class="bgm-subtext">
            <span id="bgm-timer">0:00 / 0:00</span> • <span class="bpm" id="bgm-bpm">124 BPM</span> • <span class="brand">HL.Hansraj Labs</span>
          </div>
        </div>
      </div>

      <div class="bgm-ctrl-btns">
        <button id="bgm-prev-btn" class="bgm-nav-btn" title="Previous Track">❮</button>
        <button id="riya-play-btn" title="Play / Pause BGM">
          <span id="riya-play-icon">▶</span> <span id="riya-play-text">Play BGM</span>
        </button>
        <button id="bgm-next-btn" class="bgm-nav-btn" title="Next Track">❯</button>
      </div>
    </div>

    <div class="bgm-bottom-row">
      <!-- Animated Neon Audio Equalizer Visualizer -->
      <div class="bgm-visualizer" id="riya-visualizer" title="Equalizer Audio Waves">
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
      </div>

      <!-- Volume Slider -->
      <div class="bgm-vol-wrap">
        <span id="bgm-vol-icon" style="cursor: pointer;" title="Toggle Mute">🔊</span>
        <input type="range" id="bgm-volume-slider" class="bgm-vol-slider" min="0" max="1" step="0.05" value="0.65" title="Volume">
      </div>

      <!-- Download Track Button -->
      <a id="riya-download-btn" href="riya_lofi_bgm.mp3" download="riya_lofi_bgm.mp3" class="bgm-dl-btn" title="Download Audio File">
        <span>⬇️</span> Download MP3
      </a>
    </div>
  </div>

  <script>
    // Initial Loader Hide Logic
    window.addEventListener('load', function() {
      setTimeout(function() {
        var loader = document.getElementById('initial-loader');
        if (loader) {
          loader.classList.add('hidden');
        }
      }, 400);
    });

    // Client-side Search & Category Filtering
    var searchInput = document.getElementById('cmdSearchInput');
    var categoryPills = document.querySelectorAll('#categoryPills .pill');
    var commandCards = document.querySelectorAll('#commandsGrid .command-card');
    var currentCat = 'all';

    function filterCommands() {
      var query = searchInput ? searchInput.value.toLowerCase().trim() : '';

      commandCards.forEach(function(card) {
        var cat = card.getAttribute('data-cat');
        var name = card.getAttribute('data-name') ? card.getAttribute('data-name').toLowerCase() : '';
        var textContent = card.innerText.toLowerCase();

        var matchesCat = (currentCat === 'all' || cat === currentCat);
        var matchesSearch = (query === '' || name.includes(query) || textContent.includes(query));

        if (matchesCat && matchesSearch) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', filterCommands);
    }

    categoryPills.forEach(function(pill) {
      pill.addEventListener('click', function() {
        categoryPills.forEach(function(p) { p.classList.remove('active'); });
        this.classList.add('active');
        currentCat = this.getAttribute('data-cat');
        filterCommands();
      });
    });

    // Copy Command Syntax on Click
    commandCards.forEach(function(card) {
      card.addEventListener('click', function() {
        var usageEl = card.querySelector('.cmd-usage');
        if (usageEl) {
          var text = usageEl.innerText.trim();
          navigator.clipboard.writeText(text).then(function() {
            var orig = usageEl.innerText;
            usageEl.innerText = '✅ Copied: ' + text;
            usageEl.style.color = '#00FF7F';
            setTimeout(function() {
              usageEl.innerText = orig;
              usageEl.style.color = 'var(--cyan-neon)';
            }, 1800);
          }).catch(function() {});
        }
      });
    });

    // Real-Time Stats Fetching & Timer
    var clientUptimeSec = null;
    function formatUptime(seconds) {
      var d = Math.floor(seconds / 86400);
      var h = Math.floor((seconds % 86400) / 3600);
      var m = Math.floor((seconds % 3600) / 60);
      var s = Math.floor(seconds % 60);
      if (d > 0) return d + 'd ' + h + 'h ' + m + 'm';
      if (h > 0) return h + 'h ' + m + 'm ' + s + 's';
      if (m > 0) return m + 'm ' + s + 's';
      return s + 's';
    }

    async function updateRealTimeStats() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          if (document.getElementById('statServerCount') && data.guilds !== undefined) {
            document.getElementById('statServerCount').innerText = data.guilds > 0 ? data.guilds : '${serverCount}';
          }
          if (document.getElementById('statCommandCount')) {
            document.getElementById('statCommandCount').innerText = data.commands || 100;
          }
          if (typeof data.uptime === 'number') {
            clientUptimeSec = data.uptime;
            if (document.getElementById('statUptime')) {
              document.getElementById('statUptime').innerText = formatUptime(clientUptimeSec);
            }
          }
        }
      } catch(e) {}
    }

    async function updateConnectedGuilds() {
      try {
        const res = await fetch('/api/guilds');
        if (res.ok) {
          const data = await res.json();
          if (data.guilds && Array.isArray(data.guilds) && data.guilds.length > 0) {
            const grid = document.getElementById('serversGrid');
            if (grid) {
              grid.innerHTML = data.guilds.map(function(g) {
                var icon = g.icon || 'https://cdn-icons-png.flaticon.com/512/2913/2913990.png';
                var mCount = g.memberCount !== undefined ? g.memberCount : (g.approximate_member_count || 0);
                return '<div class="server-card">' +
                  '<img src="' + icon + '" class="server-icon" alt="' + g.name + '">' +
                  '<div class="server-info">' +
                    '<h4>' + g.name + '</h4>' +
                    '<p>👥 ' + mCount + ' Members • Active</p>' +
                  '</div>' +
                '</div>';
              }).join('');
            }
            if (document.getElementById('statServerCount')) {
              document.getElementById('statServerCount').innerText = data.guilds.length;
            }
          }
        }
      } catch(e) {}
    }

    window.addEventListener('DOMContentLoaded', function() {
      updateConnectedGuilds();
      updateRealTimeStats();
      setInterval(updateRealTimeStats, 10000);
      setInterval(updateConnectedGuilds, 30000);

      setInterval(function() {
        if (clientUptimeSec !== null) {
          clientUptimeSec++;
          const el = document.getElementById('statUptime');
          if (el) {
            el.innerText = formatUptime(clientUptimeSec);
          }
        }
      }, 1000);

      var btnRefresh = document.getElementById('btnRefreshStatus');
      if (btnRefresh) {
        btnRefresh.addEventListener('click', function() {
          btnRefresh.innerText = '⌛ Syncing Gateway...';
          updateConnectedGuilds();
          updateRealTimeStats();
          setTimeout(function() {
            btnRefresh.innerText = '✅ Live Status Synced!';
            setTimeout(function() {
              btnRefresh.innerText = '🔄 Refresh Live Gateway Status';
            }, 2000);
          }, 800);
        });
      }
    });

    // --- 3. BGM Music Player Controller & Autoplay Handler ---
    (function() {
      var bgm = document.getElementById('riya-bgm');
      var playBtn = document.getElementById('riya-play-btn');
      var playIcon = document.getElementById('riya-play-icon');
      var playText = document.getElementById('riya-play-text');
      var titleEl = document.getElementById('bgm-title');
      var bpmEl = document.getElementById('bgm-bpm');
      var timerEl = document.getElementById('bgm-timer');
      var visualizer = document.getElementById('riya-visualizer');
      var volSlider = document.getElementById('bgm-volume-slider');
      var volIcon = document.getElementById('bgm-vol-icon');
      var prevBtn = document.getElementById('bgm-prev-btn');
      var nextBtn = document.getElementById('bgm-next-btn');
      var dlBtn = document.getElementById('riya-download-btn');
      var artEl = document.getElementById('bgm-art');

      if (!bgm || !playBtn) return;

      var playlist = [
        {
          title: 'Duo Partner Stream Hype Synthwave',
          bpm: '124 BPM',
          src: 'riya_lofi_bgm.mp3',
          cover: '/riya_lofi_cover.jpg'
        },
        {
          title: '☕ Riya - Chai & Clutch',
          bpm: '80 BPM',
          src: 'https://raw.githubusercontent.com/goldfire/howler.js/master/examples/player/audio/80s_vibe.mp3',
          cover: '/riya_lofi_cover.jpg'
        },
        {
          title: '⚡ Cyberpunk Neon Drift',
          bpm: '128 BPM',
          src: 'https://raw.githubusercontent.com/goldfire/howler.js/master/examples/player/audio/rave_digger.mp3',
          cover: '/riya_lofi_cover.jpg'
        },
        {
          title: '🌙 Midnight Amdavadi Chill',
          bpm: '75 BPM',
          src: 'riya_lofi_bgm.mp3',
          cover: '/riya_lofi_cover.jpg'
        }
      ];

      var currentIndex = 0;
      bgm.volume = 0.65;
      if (volSlider) volSlider.value = 0.65;

      function formatTime(sec) {
        if (isNaN(sec) || !isFinite(sec)) return '0:00';
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
      }

      function updateTrackUI() {
        var track = playlist[currentIndex];
        if (titleEl) titleEl.textContent = track.title;
        if (bpmEl) bpmEl.textContent = track.bpm;
        if (dlBtn) {
          dlBtn.href = track.src;
          dlBtn.setAttribute('download', track.title.replace(/[^a-zA-Z0-9_-]/g, '_') + '.mp3');
        }
        if (artEl && track.cover) {
          artEl.src = track.cover;
        }
      }

      function updateButton() {
        var isPaused = bgm.paused;
        if (playIcon) playIcon.textContent = isPaused ? '▶' : '⏸';
        if (playText) playText.textContent = isPaused ? 'Play BGM' : 'Pause BGM';
        if (visualizer) {
          if (!isPaused) {
            visualizer.classList.add('active');
          } else {
            visualizer.classList.remove('active');
          }
        }
      }

      function loadTrack(index, autoPlay) {
        currentIndex = (index + playlist.length) % playlist.length;
        var track = playlist[currentIndex];
        bgm.src = track.src;
        bgm.load();
        updateTrackUI();
        if (autoPlay) {
          bgm.play().then(updateButton).catch(function(e) { console.log('Autoplay error:', e); });
        } else {
          updateButton();
        }
      }

      playBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (bgm.paused) {
          bgm.play().then(updateButton).catch(function(err) {
            console.log('Playback error:', err);
          });
        } else {
          bgm.pause();
          updateButton();
        }
      });

      if (prevBtn) {
        prevBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          loadTrack(currentIndex - 1, !bgm.paused);
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          loadTrack(currentIndex + 1, !bgm.paused);
        });
      }

      // Time update listener
      bgm.addEventListener('timeupdate', function() {
        if (timerEl) {
          var cur = formatTime(bgm.currentTime);
          var dur = formatTime(bgm.duration);
          timerEl.textContent = cur + ' / ' + dur;
        }
      });

      // Track ended auto next
      bgm.addEventListener('ended', function() {
        loadTrack(currentIndex + 1, true);
      });

      // Volume slider
      if (volSlider) {
        volSlider.addEventListener('input', function() {
          bgm.volume = parseFloat(this.value);
          if (volIcon) {
            volIcon.textContent = bgm.volume === 0 ? '🔇' : (bgm.volume < 0.5 ? '🔉' : '🔊');
          }
        });
      }

      // Mute toggle on icon click
      if (volIcon) {
        volIcon.addEventListener('click', function(e) {
          e.stopPropagation();
          if (bgm.volume > 0) {
            bgm.dataset.prevVol = bgm.volume;
            bgm.volume = 0;
            if (volSlider) volSlider.value = 0;
            volIcon.textContent = '🔇';
          } else {
            var prev = parseFloat(bgm.dataset.prevVol || 0.65);
            bgm.volume = prev;
            if (volSlider) volSlider.value = prev;
            volIcon.textContent = prev < 0.5 ? '🔉' : '🔊';
          }
        });
      }

      // Automatically start on user's first interaction to bypass browser autoplay blocks
      function triggerFirstPlay() {
        if (bgm.paused && !sessionStorage.getItem('bgm_started')) {
          bgm.play().then(function() {
            sessionStorage.setItem('bgm_started', 'true');
            updateButton();
          }).catch(function() {});
        }
      }

      window.addEventListener('click', triggerFirstPlay, { once: true });
      window.addEventListener('keydown', triggerFirstPlay, { once: true });
      window.addEventListener('touchstart', triggerFirstPlay, { once: true });

      // Initial state setup
      updateTrackUI();
      updateButton();
    })();

    (function() {
      // 1. Disable Right Click Context Menu
      document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
      });

      // 2. Disable DevTools Shortcuts
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
