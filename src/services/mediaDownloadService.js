import axios from 'axios';
import btch from 'btch-downloader';
import { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, WebhookClient } from 'discord.js';
import { getGuildConfig } from '../database/models/GuildConfig.js';
import { logger } from '../utils/logger.js';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';

const DISCORD_MAX_FILE_BYTES = 24 * 1024 * 1024; // 24MB safety limit (under 25MB cap)
const BRAND_FOOTER = '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.';
const EMBLEM_ICON = 'https://cdn.discordapp.com/attachments/1450771986031706214/1560613901396086904/Global_Fishing_Emblem_1.png?ex=6ad35a74&is=6ad208f4&hm=c0756eb02f2652d908a466b51026a18c45165dcdd6aad2abf5645b29728cf52c&';

// Deduplication set for currently processing URLs
const processingLinks = new Set();

// 30 auto reaction emojis from user reference
export const REACTION_EMOJIS = [
  "❤️", "😂", "🔥", "😮", "👍",
  "👀", "👑", "🌟", "💯", "🎉",
  "✨", "💥", "🙌", "🤩", "😈",
  "💀", "🚨", "🎯", "⚡", "🔮",
  "🤖", "📈", "🤫", "🥶", "🤯",
  "🍀", "🥳", "🛸", "🍕", "🦾"
];

// Platform regex patterns
export const REGEX_PATTERNS = {
  instagram: /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reels|reel|tv|stories|share)\/([A-Za-z0-9_-]+)/i,
  tiktok: /(?:https?:\/\/)?(?:www\.|vm\.|vt\.)?tiktok\.com\/(?:@[\w.-]+\/video\/\d+|[\w.-]+)/i,
  youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
};

/**
 * Detect the platform from URL
 */
export const detectPlatform = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (REGEX_PATTERNS.tiktok.test(url)) return 'tiktok';
  if (REGEX_PATTERNS.instagram.test(url)) return 'instagram';
  if (REGEX_PATTERNS.youtube.test(url)) return 'youtube';
  return null;
};

/**
 * Extract social media URLs from message text
 */
export const extractUrlsFromText = (text) => {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex) || [];
  return matches.filter(url => detectPlatform(url) !== null);
};

/**
 * Download a remote URL into a Buffer with size limit checking
 */
export const downloadBuffer = async (mediaUrl, maxBytes = DISCORD_MAX_FILE_BYTES, customHeaders = {}) => {
  try {
    const reqHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...customHeaders
    };

    const headRes = await axios.head(mediaUrl, {
      timeout: 7000,
      headers: reqHeaders
    }).catch(() => null);

    const contentLength = headRes?.headers?.['content-length'] ? parseInt(headRes.headers['content-length'], 10) : 0;
    if (contentLength > maxBytes) {
      return { buffer: null, tooLarge: true, sizeBytes: contentLength, mediaUrl };
    }

    const response = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: maxBytes,
      headers: reqHeaders
    });

    const buffer = Buffer.from(response.data);
    return {
      buffer,
      tooLarge: buffer.length > maxBytes,
      sizeBytes: buffer.length,
      mediaUrl
    };
  } catch (error) {
    logger.debug(`Buffer download failed for ${mediaUrl}: ${error.message}`);
    return { buffer: null, tooLarge: false, sizeBytes: 0, mediaUrl, error: error.message };
  }
};

/**
 * Extract YouTube media details
 */
export const fetchYouTube = async (url, preferredType = 'video') => {
  const match = url.match(REGEX_PATTERNS.youtube);
  const videoId = match ? match[1] : null;
  const maxresThumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
  const hqThumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

  if (preferredType === 'image') {
    // Return maxres thumbnail
    const thumbUrl = maxresThumbnail || hqThumbnail;
    const download = await downloadBuffer(thumbUrl);
    return {
      success: true,
      platform: 'youtube',
      type: 'image',
      title: `YouTube Thumbnail [${videoId}]`,
      mediaUrl: thumbUrl,
      thumbnailUrl: thumbUrl,
      buffer: download.buffer,
      sizeBytes: download.sizeBytes,
      filename: `youtube_${videoId || 'image'}.jpg`
    };
  }

  // Preferred Video
  try {
    const res = await btch.youtube(url);
    if (res && res.status && res.mp4) {
      const videoUrl = typeof res.mp4 === 'string' ? res.mp4 : res.mp4[0];
      const download = await downloadBuffer(videoUrl);
      return {
        success: true,
        platform: 'youtube',
        type: 'video',
        title: res.title || `YouTube Video [${videoId}]`,
        mediaUrl: videoUrl,
        thumbnailUrl: res.thumbnail || maxresThumbnail || hqThumbnail,
        buffer: download.buffer,
        tooLarge: download.tooLarge,
        sizeBytes: download.sizeBytes,
        filename: `youtube_${videoId || Date.now()}.mp4`
      };
    }
  } catch (err) {
    logger.warn(`btch.youtube failed: ${err.message}`);
  }

  // Fallback: Return metadata and direct watch link
  return {
    success: true,
    platform: 'youtube',
    type: preferredType || 'video',
    title: `YouTube Video [${videoId}]`,
    mediaUrl: url,
    thumbnailUrl: maxresThumbnail || hqThumbnail,
    buffer: null,
    tooLarge: true,
    filename: `youtube_${videoId || Date.now()}.mp4`
  };
};

/**
 * Extract TikTok media details
 */
export const fetchTikTok = async (url, preferredType = 'video') => {
  try {
    const res = await btch.ttdl(url);
    if (res && res.status) {
      const videoUrl = Array.isArray(res.video) ? res.video[0] : res.video;
      const thumbnailUrl = res.thumbnail;
      const title = res.title || 'TikTok Media';

      if (preferredType === 'image') {
        const targetUrl = thumbnailUrl || videoUrl;
        const download = targetUrl ? await downloadBuffer(targetUrl) : { buffer: null };
        return {
          success: true,
          platform: 'tiktok',
          type: 'image',
          title,
          mediaUrl: targetUrl,
          thumbnailUrl,
          buffer: download.buffer,
          sizeBytes: download.sizeBytes,
          filename: `tiktok_${Date.now()}.jpg`
        };
      }

      // Default: Video
      if (videoUrl) {
        const download = await downloadBuffer(videoUrl);
        return {
          success: true,
          platform: 'tiktok',
          type: 'video',
          title,
          mediaUrl: videoUrl,
          thumbnailUrl,
          buffer: download.buffer,
          tooLarge: download.tooLarge,
          sizeBytes: download.sizeBytes,
          filename: `tiktok_${Date.now()}.mp4`
        };
      }
    }
  } catch (err) {
    logger.warn(`btch.ttdl error: ${err.message}`);
  }

  // Secondary fallback: TikWM direct API
  try {
    const tikwmRes = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
      timeout: 10000
    });
    if (tikwmRes.data && tikwmRes.data.code === 0 && tikwmRes.data.data) {
      const data = tikwmRes.data.data;
      const title = data.title || 'TikTok Media';
      const thumbnailUrl = data.cover;

      if (preferredType === 'image' && data.images && data.images.length > 0) {
        const imgUrl = data.images[0];
        const download = await downloadBuffer(imgUrl);
        return {
          success: true,
          platform: 'tiktok',
          type: 'image',
          title,
          mediaUrl: imgUrl,
          thumbnailUrl: data.cover,
          buffer: download.buffer,
          sizeBytes: download.sizeBytes,
          filename: `tiktok_${Date.now()}.jpg`
        };
      }

      const videoUrl = data.play || data.wmplay;
      const download = videoUrl ? await downloadBuffer(videoUrl) : { buffer: null };
      return {
        success: true,
        platform: 'tiktok',
        type: 'video',
        title,
        mediaUrl: videoUrl || url,
        thumbnailUrl: data.cover,
        buffer: download.buffer,
        tooLarge: download.tooLarge,
        sizeBytes: download.sizeBytes,
        filename: `tiktok_${Date.now()}.mp4`
      };
    }
  } catch (err) {
    logger.warn(`TikWM fallback failed: ${err.message}`);
  }

  return {
    success: false,
    platform: 'tiktok',
    error: 'Could not fetch TikTok media.'
  };
};

/**
 * Calculates exact bitrate needed to make the video fit 24MB using ffprobe and ffmpeg
 */
export const smartCompress = async (inputPath, outputPath) => {
  try {
    const duration = await new Promise((resolve) => {
      execFile('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        inputPath
      ], (err, stdout) => {
        if (err) return resolve(null);
        const parsed = parseFloat(stdout.trim());
        resolve(isNaN(parsed) ? null : parsed);
      });
    });

    if (!duration || duration <= 0) return inputPath;

    const targetTotalBitrate = Math.floor((DISCORD_MAX_FILE_BYTES * 8) / duration);
    const videoBitrate = Math.floor(targetTotalBitrate * 0.9);
    const audioBitrate = Math.floor(targetTotalBitrate * 0.1);

    logger.info(`[VideoCompressor] Compressing ${path.basename(inputPath)} (target bitrate: ${targetTotalBitrate})`);

    const result = await new Promise((resolve) => {
      execFile('ffmpeg', [
        '-i', inputPath,
        '-b:v', `${videoBitrate}`,
        '-b:a', `${audioBitrate}`,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-y',
        outputPath
      ], (err) => {
        if (err || !fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
          logger.warn(`[VideoCompressor] Compression error: ${err?.message}`);
          resolve(inputPath);
        } else {
          resolve(outputPath);
        }
      });
    });

    return result;
  } catch (e) {
    logger.warn(`[VideoCompressor] Error in smartCompress: ${e.message}`);
    return inputPath;
  }
};

/**
 * Ensures a valid cookies.txt exists from environment variables if not present on disk
 */
export const ensureCookiesFile = () => {
  if (fs.existsSync('cookies.txt') && fs.statSync('cookies.txt').size > 10) {
    return 'cookies.txt';
  }

  const sessionId = process.env.INSTAGRAM_SESSION_ID || '8791412152%3AB2rL4f4pX8NpSR%3A13%3AAYmmjDPXHenvDR1qfJyvXEGoqXeNkBIjtx3BBYMt0n0';
  const cookieHeader = process.env.INSTAGRAM_COOKIE;

  if (cookieHeader) {
    const lines = ['# Netscape HTTP Cookie File'];
    const parts = cookieHeader.split(';').map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      const eqIdx = part.indexOf('=');
      if (eqIdx !== -1) {
        const name = part.slice(0, eqIdx).trim();
        const value = part.slice(eqIdx + 1).trim();
        lines.push(`.instagram.com\tTRUE\t/\tTRUE\t2147483647\t${name}\t${value}`);
      }
    }
    fs.writeFileSync('cookies.txt', lines.join('\n'), 'utf8');
    logger.info('🔑 Created cookies.txt from INSTAGRAM_COOKIE environment variable.');
    return 'cookies.txt';
  }

  if (sessionId) {
    const rawSession = sessionId.trim();
    const userIdMatch = rawSession.match(/^(\d+)/);
    const lines = [
      '# Netscape HTTP Cookie File',
      `.instagram.com\tTRUE\t/\tTRUE\t2147483647\tsessionid\t${rawSession}`
    ];
    if (userIdMatch) {
      lines.push(`.instagram.com\tTRUE\t/\tTRUE\t2147483647\tds_user_id\t${userIdMatch[1]}`);
    }
    fs.writeFileSync('cookies.txt', lines.join('\n'), 'utf8');
    logger.info('🔑 Created cookies.txt from INSTAGRAM_SESSION_ID environment variable.');
    return 'cookies.txt';
  }

  return null;
};

let resolvedYtDlpBin = null;

/**
 * Resolves or auto-downloads the standalone yt-dlp binary across platforms
 */
export const getYtDlpBin = async () => {
  if (resolvedYtDlpBin) return resolvedYtDlpBin;

  // 1. Check if yt-dlp is available in PATH
  const inPath = await new Promise((resolve) => {
    execFile('yt-dlp', ['--version'], (err) => resolve(!err));
  });
  if (inPath) {
    resolvedYtDlpBin = 'yt-dlp';
    return resolvedYtDlpBin;
  }

  // 2. Check local bin directory
  const isWin = process.platform === 'win32';
  const binName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
  const localBin = path.resolve(process.cwd(), 'bin', binName);
  if (fs.existsSync(localBin)) {
    resolvedYtDlpBin = localBin;
    return resolvedYtDlpBin;
  }

  // 3. Auto-download standalone Linux binary if on Linux / cloud container
  if (process.platform === 'linux') {
    try {
      const binDir = path.dirname(localBin);
      if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });
      logger.info('⬇️ Auto-installing standalone Linux yt-dlp binary...');
      const response = await axios({
        url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
        method: 'GET',
        responseType: 'arraybuffer',
        timeout: 45000
      });
      fs.writeFileSync(localBin, Buffer.from(response.data));
      fs.chmodSync(localBin, 0o755);
      logger.info('✅ Standalone Linux yt-dlp binary installed successfully!');
      resolvedYtDlpBin = localBin;
      return resolvedYtDlpBin;
    } catch (e) {
      logger.warn(`Failed to auto-download yt-dlp binary: ${e.message}`);
    }
  }

  return 'yt-dlp';
};

/**
 * Downloads media using yt-dlp with multiple fallback strategies and cookies.txt support
 */
export const downloadMediaYtDlp = async (url, platform = 'instagram') => {
  const downloadsDir = path.resolve(process.cwd(), 'downloads');
  if (fs.existsSync(downloadsDir)) {
    try { fs.rmSync(downloadsDir, { recursive: true, force: true }); } catch {}
  }
  fs.mkdirSync(downloadsDir, { recursive: true });

  const match = url.match(REGEX_PATTERNS.instagram);
  const shortcode = match ? match[1] : null;

  // Ensure canonical URL with trailing slash for Instagram
  let cleanUrl = url.trim().replace(/\?.*$/, '');
  if (platform === 'instagram' && !cleanUrl.endsWith('/')) {
    cleanUrl += '/';
  }

  const baseArgs = [
    '--no-warnings',
    '--merge-output-format', 'mp4',
    '--socket-timeout', '30',
    '--retries', '3',
    '-o', path.join(downloadsDir, '%(id)s.%(ext)s')
  ];

  ensureCookiesFile();
  if (fs.existsSync('cookies.txt')) {
    baseArgs.push('--cookies', 'cookies.txt');
    logger.info('🔑 cookies.txt detected — using authenticated session.');
  }

  let strategies = [];
  if (platform === 'instagram') {
    strategies = [
      { desc: 'Clean native extraction', targetUrl: cleanUrl, extra: [] },
      { desc: 'Best mp4 format', targetUrl: cleanUrl, extra: ['-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'] },
      ...(shortcode ? [
        { desc: 'Canonical /reel/ URL', targetUrl: `https://www.instagram.com/reel/${shortcode}/`, extra: [] },
        { desc: 'Canonical /p/ URL', targetUrl: `https://www.instagram.com/p/${shortcode}/`, extra: [] }
      ] : [])
    ];
  } else {
    strategies = [
      { desc: `${platform} best mp4 extraction`, targetUrl: cleanUrl, extra: ['-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'] },
      { desc: `${platform} native extraction`, targetUrl: cleanUrl, extra: [] }
    ];
  }

  const ytDlpExecutable = await getYtDlpBin();

  for (const { desc, targetUrl: tryUrl, extra } of strategies) {
    logger.debug(`🔄 [${platform}] Trying: ${desc} -> ${tryUrl}`);
    const args = [...baseArgs, ...extra, tryUrl];
    const ok = await new Promise((resolve) => {
      execFile(ytDlpExecutable, args, { timeout: 60000 }, (err, stdout, stderr) => {
        if (err) {
          logger.debug(`↳ yt-dlp error [${desc}]: ${err.message}`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });

    if (ok) {
      const files = fs.readdirSync(downloadsDir);
      if (files.length > 0) {
        let filename = path.join(downloadsDir, files[0]);
        if (!filename.endsWith('.mp4')) {
          const newName = filename.replace(/\.[^.]+$/, '.mp4');
          try {
            fs.renameSync(filename, newName);
            filename = newName;
          } catch {}
        }
        if (fs.existsSync(filename) && fs.statSync(filename).size > 0) {
          logger.info(`✅ [${platform}] Success! Downloaded: ${filename} (${(fs.statSync(filename).size / (1024*1024)).toFixed(2)} MB)`);
          return filename;
        }
      }
    }
  }

  logger.warn(`❌ All yt-dlp download strategies failed for ${platform}.`);
  return null;
};

export const downloadInstagramYtDlp = async (url) => downloadMediaYtDlp(url, 'instagram');

/**
 * Extract Instagram media details
 */
export const fetchInstagram = async (url, preferredType = 'video') => {
  const match = url.match(REGEX_PATTERNS.instagram);
  const shortcode = match ? match[1] : null;

  // Clean the URL of tracker query params with trailing slash
  let cleanUrl = url.trim().replace(/\?.*$/, '');
  if (!cleanUrl.endsWith('/')) {
    cleanUrl += '/';
  }

  // 1. Try yt-dlp native extraction (fast, direct, full HD)
  try {
    const ytDlpFile = await downloadInstagramYtDlp(cleanUrl);
    if (ytDlpFile && fs.existsSync(ytDlpFile)) {
      let finalFile = ytDlpFile;
      if (fs.statSync(ytDlpFile).size > DISCORD_MAX_FILE_BYTES) {
        const compressed = ytDlpFile.replace('.mp4', '_min.mp4');
        finalFile = await smartCompress(ytDlpFile, compressed);
      }
      const buffer = fs.readFileSync(finalFile);
      return {
        success: true,
        platform: 'instagram',
        type: 'video',
        title: `Instagram Post [${shortcode || 'Media'}]`,
        mediaUrl: cleanUrl,
        buffer,
        filePath: finalFile,
        tooLarge: buffer.length > DISCORD_MAX_FILE_BYTES,
        sizeBytes: buffer.length,
        filename: 'video.mp4'
      };
    }
  } catch (err) {
    logger.debug(`yt-dlp instagram download attempt error: ${err.message}`);
  }

  // 2. Try btch.igdl with item headers support
  try {
    const res = await btch.igdl(cleanUrl);
    if (res && res.status && Array.isArray(res.result) && res.result.length > 0) {
      const valid = res.result.find(item => item.url && item.url.length > 10);
      if (valid) {
        const isVideo = valid.url.includes('.mp4') || preferredType === 'video';
        const customHeaders = valid.headers || res.headers || {};
        const download = await downloadBuffer(valid.url, DISCORD_MAX_FILE_BYTES, customHeaders);
        if (download && download.buffer) {
          return {
            success: true,
            platform: 'instagram',
            type: isVideo ? 'video' : 'image',
            title: `Instagram Post [${shortcode || 'Media'}]`,
            mediaUrl: valid.url,
            thumbnailUrl: valid.thumbnail || null,
            buffer: download.buffer,
            tooLarge: download.tooLarge,
            sizeBytes: download.sizeBytes,
            filename: `instagram_${shortcode || Date.now()}.${isVideo ? 'mp4' : 'jpg'}`
          };
        }
      }
    }
  } catch (err) {
    logger.debug(`btch.igdl failed: ${err.message}`);
  }

  // 3. Fallback: Return clear failure if media cannot be directly extracted
  return {
    success: false,
    platform: 'instagram',
    error: 'Could not extract Instagram media directly. Post may be private, age-restricted, or Instagram is requiring a login session.'
  };
};

/**
 * Universal media extraction orchestrator
 */
export const downloadMedia = async ({ url, platform, type = 'video' }) => {
  const targetPlatform = platform || detectPlatform(url);
  if (!targetPlatform) {
    return {
      success: false,
      error: 'Unsupported or unrecognised URL. Please provide a valid Instagram, YouTube, or TikTok link!'
    };
  }

  if (targetPlatform === 'tiktok') {
    return await fetchTikTok(url, type);
  }
  if (targetPlatform === 'youtube') {
    return await fetchYouTube(url, type);
  }
  if (targetPlatform === 'instagram') {
    return await fetchInstagram(url, type);
  }

  return { success: false, error: 'Unknown platform.' };
};

/**
 * Builds rich embed and action row for downloaded media
 */
export const buildMediaResponse = (result, originalUrl, requestedBy) => {
  const platformNames = {
    instagram: 'Instagram 📸',
    youtube: 'YouTube 🎥',
    tiktok: 'TikTok 🎵'
  };

  const platformColors = {
    instagram: 0xE1306C,
    youtube: 0xFF0000,
    tiktok: 0x00F2FE
  };

  const embed = new EmbedBuilder()
    .setTitle(`📥 Downloaded: ${result.title || 'Social Media Content'}`)
    .setColor(platformColors[result.platform] || 0xFF69B4)
    .addFields(
      { name: '🌐 Platform', value: platformNames[result.platform] || result.platform, inline: true },
      { name: '📁 Media Type', value: result.type === 'image' ? 'Image 🖼️' : 'Video 🎬', inline: true }
    )
    .setFooter({ text: BRAND_FOOTER, iconURL: EMBLEM_ICON })
    .setTimestamp();

  if (result.sizeBytes) {
    const mb = (result.sizeBytes / (1024 * 1024)).toFixed(2);
    embed.addFields({ name: '📦 File Size', value: `${mb} MB`, inline: true });
  }

  if (result.thumbnailUrl) {
    embed.setThumbnail(result.thumbnailUrl);
  }

  if (requestedBy) {
    embed.setAuthor({
      name: `Downloaded by ${requestedBy.tag || requestedBy.username}`,
      iconURL: requestedBy.displayAvatarURL?.()
    });
  }

  const buttons = [];
  const directLink = result.directDownloadUrl || result.mediaUrl;
  if (directLink && directLink.startsWith('http') && directLink.length <= 512) {
    buttons.push(
      new ButtonBuilder()
        .setLabel('📥 Direct Media Link')
        .setStyle(ButtonStyle.Link)
        .setURL(directLink)
    );
  }

  if (originalUrl && originalUrl.startsWith('http')) {
    buttons.push(
      new ButtonBuilder()
        .setLabel('🔗 Original Post')
        .setStyle(ButtonStyle.Link)
        .setURL(originalUrl)
    );
  }

  const row = buttons.length > 0 ? new ActionRowBuilder().addComponents(buttons) : null;

  return { embed, row };
};

export const PLATFORM_ASSETS = {
  instagram: {
    username: 'INSTAGRAM DOWNLOAD LINK',
    avatarURL: 'https://cdn.discordapp.com/attachments/1447917590663008329/1515632984240296007/image.png',
    color: '#E1306C'
  },
  tiktok: {
    username: 'TIKTOK DOWNLOAD LINK',
    avatarURL: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png',
    color: '#00F2FE'
  },
  youtube: {
    username: 'YOUTUBE DOWNLOAD LINK',
    avatarURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/1024px-YouTube_full-color_icon_%282017%29.svg.png',
    color: '#FF0000'
  }
};

/**
 * Handles incoming messages in the auto-download channel or direct messages (DMs)
 */
export const handleAutoDownloadMessage = async (message) => {
  if (message.author.bot) return false;

  const isDM = !message.guild;

  // In guilds, only process if the channel is configured for auto-download
  if (!isDM) {
    const guildConfig = await getGuildConfig(message.guild.id);
    if (!guildConfig.autoDownloadChannelId || guildConfig.autoDownloadChannelId !== message.channel.id) {
      return false;
    }

    if (guildConfig.autoDownloadEnabled === false) {
      return false;
    }
  }

  const urls = extractUrlsFromText(message.content);
  if (urls.length === 0) return false;

  // Process the first media URL
  const targetUrl = urls[0];
  const platform = detectPlatform(targetUrl);
  if (!platform) return false;

  let cleanUrl = targetUrl.replace(/\?.*$/, '');
  if (!cleanUrl.endsWith('/')) {
    cleanUrl += '/';
  }
  if (processingLinks.has(cleanUrl)) return false;
  processingLinks.add(cleanUrl);

  const pInfo = PLATFORM_ASSETS[platform] || {
    username: 'MEDIA DOWNLOAD LINK',
    avatarURL: 'https://cdn.discordapp.com/attachments/1447917590663008329/1515632984240296007/image.png',
    color: '#00E5FF'
  };

  // Status progression message
  let statusMsg = await message.channel.send(`⏳ **Downloading from ${platform === 'instagram' ? 'Instagram' : platform}...**`).catch(() => null);

  // Delete original user message safely (only in guild channels where bot has permission)
  if (!isDM) {
    await message.delete().catch(() => {});
  }

  try {
    let finalFilePath = null;

    // 1. Primary downloader: yt-dlp (native full HD)
    const ytDlpFile = await downloadMediaYtDlp(cleanUrl, platform);
    if (ytDlpFile && fs.existsSync(ytDlpFile)) {
      finalFilePath = ytDlpFile;
      if (fs.statSync(ytDlpFile).size > DISCORD_MAX_FILE_BYTES) {
        if (statusMsg) await statusMsg.edit('⚙️ **Video is large. Compressing...**').catch(() => {});
        const compressed = ytDlpFile.replace('.mp4', '_min.mp4');
        finalFilePath = await smartCompress(ytDlpFile, compressed);
      }
    }

    const contentText = `👤 **Requested by:** <@${message.author.id}>`;
    let postedMsgId = null;

    if (finalFilePath && fs.existsSync(finalFilePath) && fs.statSync(finalFilePath).size > 0) {
      if (statusMsg) await statusMsg.edit('📤 **Uploading...**').catch(() => {});
      const fileAttachment = new AttachmentBuilder(finalFilePath, { name: 'video.mp4' });

      let sentViaWebhook = false;

      // 1. Try sending via custom WEBHOOK_URL or channel webhook (guild only)
      if (!isDM) {
        const customWebhookUrl = process.env.WEBHOOK_URL;
        if (customWebhookUrl && customWebhookUrl.startsWith('https://discord.com/api/webhooks/')) {
          try {
            const webhookClient = new WebhookClient({ url: customWebhookUrl });
            const whMsg = await webhookClient.send({
              content: contentText,
              username: pInfo.username,
              avatarURL: pInfo.avatarURL,
              files: [fileAttachment]
            });
            postedMsgId = whMsg.id;
            sentViaWebhook = true;
          } catch (whErr) {
            logger.debug(`Custom WEBHOOK_URL failed: ${whErr.message}`);
          }
        }

        if (!sentViaWebhook && message.guild) {
          const botMember = message.guild.members?.me || await message.guild.members?.fetchMe().catch(() => null);
          if (botMember && message.channel.permissionsFor(botMember)?.has('ManageWebhooks')) {
            try {
              const webhooks = await message.channel.fetchWebhooks().catch(() => null);
              let webhook = webhooks?.find(wh => wh.name.includes('DOWNLOAD LINK') || wh.owner?.id === message.client.user.id);
              if (!webhook) {
                webhook = await message.channel.createWebhook({
                  name: 'MEDIA DOWNLOAD LINK',
                  avatar: pInfo.avatarURL
                }).catch(() => null);
              }
              if (webhook) {
                const whMsg = await webhook.send({
                  content: contentText,
                  username: pInfo.username,
                  avatarURL: pInfo.avatarURL,
                  files: [fileAttachment]
                });
                postedMsgId = whMsg.id;
                sentViaWebhook = true;
              }
            } catch (whErr) {
              logger.debug(`Dynamic channel webhook failed: ${whErr.message}`);
            }
          }
        }
      }

      if (!sentViaWebhook) {
        const botMsg = await message.channel.send({
          content: contentText,
          files: [fileAttachment]
        });
        postedMsgId = botMsg.id;
      }

      // Delete status message on success (always delete without permission gates)
      if (statusMsg) {
        await statusMsg.delete().catch(() => {});
      }

      // Add all 30 auto reactions sequentially with 0.25s delay
      if (postedMsgId) {
        try {
          const realMsg = await message.channel.messages.fetch(postedMsgId).catch(() => null);
          if (realMsg) {
            for (const emoji of REACTION_EMOJIS) {
              try {
                await realMsg.react(emoji);
                await new Promise(r => setTimeout(r, 250));
              } catch (e) {
                logger.debug(`Reaction failed ${emoji}: ${e.message}`);
              }
            }
          }
        } catch (fetchErr) {
          logger.debug(`Could not fetch message for reactions: ${fetchErr.message}`);
        }
      }

      return true;
    } else {
      // 2. yt-dlp failed, try secondary fallback scrapers (downloadMedia)
      const result = await downloadMedia({ url: targetUrl, platform, type: 'video' });
      if (result.success && result.buffer && !result.tooLarge) {
        if (statusMsg) await statusMsg.edit('📤 **Uploading...**').catch(() => {});
        const fileAttachment = new AttachmentBuilder(result.buffer, {
          name: result.filename || `video.mp4`
        });
        const msg = await message.channel.send({
          content: contentText,
          files: [fileAttachment]
        });
        if (statusMsg) await statusMsg.delete().catch(() => {});
        if (msg) {
          for (const emoji of REACTION_EMOJIS) {
            try {
              await msg.react(emoji);
              await new Promise(r => setTimeout(r, 250));
            } catch {}
          }
        }
        return true;
      }

      // Both primary and secondary downloaders failed: Show clear failure notice and auto-delete
      const platformLabel = platform === 'instagram' ? 'Instagram' : platform === 'tiktok' ? 'TikTok' : 'YouTube';
      if (statusMsg) {
        await statusMsg.edit(
          `❌ **Download failed.**\n` +
          `> <@${message.author.id}>, could not download this ${platformLabel} post.\n` +
          `> **Reason:** The post may be private, age-restricted, or ${platformLabel} is blocking anonymous downloads.\n` +
          `> 💡 **Fix:** Put a valid \`cookies.txt\` in your bot folder or make sure the post is public.`
        ).catch(() => {});
        setTimeout(() => {
          statusMsg.delete().catch(() => {});
        }, 15000);
      }
      return false;
    }
  } catch (err) {
    logger.error(`Error in handleAutoDownloadMessage: ${err.message}`);
    if (statusMsg) {
      await statusMsg.edit(`❌ **Error:** \`${err.message}\``).catch(() => {});
      setTimeout(() => statusMsg.delete().catch(() => {}), 15000);
    }
    return false;
  } finally {
    processingLinks.delete(cleanUrl);
    const downloadsDir = path.resolve(process.cwd(), 'downloads');
    if (fs.existsSync(downloadsDir)) {
      try { fs.rmSync(downloadsDir, { recursive: true, force: true }); } catch {}
    }
  }
};
