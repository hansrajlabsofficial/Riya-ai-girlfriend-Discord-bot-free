import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { downloadMedia, buildMediaResponse, detectPlatform, REACTION_EMOJIS } from '../services/mediaDownloadService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('download')
  .setDescription('Download videos or images from Instagram, YouTube, or TikTok')
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
  .addStringOption(option =>
    option
      .setName('type')
      .setDescription('Select media type (Video or Image)')
      .setRequired(true)
      .addChoices(
        { name: 'Video 🎬', value: 'video' },
        { name: 'Image 🖼️', value: 'image' }
      )
  )
  .addStringOption(option =>
    option
      .setName('platform')
      .setDescription('Select the social media platform')
      .setRequired(true)
      .addChoices(
        { name: 'Instagram 📸', value: 'instagram' },
        { name: 'YouTube 🎥', value: 'youtube' },
        { name: 'TikTok 🎵', value: 'tiktok' }
      )
  )
  .addStringOption(option =>
    option
      .setName('url')
      .setDescription('Enter the link to download')
      .setRequired(true)
  );

export const execute = async (interaction) => {
  if (!interaction.deferred && !interaction.replied) {
    try {
      await interaction.deferReply();
    } catch (deferErr) {
      logger.warn(`[Download] deferReply warning: ${deferErr.message}`);
    }
  }

  let type = interaction.options.getString('type') || 'video';
  let platform = interaction.options.getString('platform');
  let url = interaction.options.getString('url')?.trim();

  // Strip prefix like "url:" or "url :" if present
  if (url) {
    url = url.replace(/^url\s*:\s*/i, '').trim();
  }

  // Fallback: extract URL from raw input or args if missing
  if (!url || !url.startsWith('http')) {
    const rawArgs = interaction.options.getString('args') || interaction.options.getString('input') || '';
    const match = rawArgs.match(/(https?:\/\/[^\s]+)/i);
    if (match) url = match[1];
  }

  if (type !== 'image' && type !== 'video') {
    type = 'video';
  }

  if (!url || !url.startsWith('http')) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0055')
      .setTitle('❌ Invalid URL')
      .setDescription('Arey baka, please provide a valid HTTP or HTTPS media link! 🥺\nExample: `k ig https://www.instagram.com/reel/...` or `/download`')
      .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });
    
    if (interaction.deferred) {
      return await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
    } else if (!interaction.replied) {
      return await interaction.reply({ embeds: [errorEmbed] }).catch(() => {});
    } else {
      return await interaction.followUp({ embeds: [errorEmbed] }).catch(() => {});
    }
  }

  // Auto-detect if user selected mismatched platform or if platform was omitted
  const detected = detectPlatform(url);
  if (detected) {
    platform = detected;
  } else if (!platform) {
    platform = 'instagram';
  }

  try {
    const result = await downloadMedia({ url, platform, type });

    if (!result.success) {
      const failEmbed = new EmbedBuilder()
        .setColor('#FF3366')
        .setTitle('⚠️ Media Download Notice')
        .setDescription(
          `Arey baka! Couldn't extract the ${type} from this link directly: ${result.error || 'Server error or private media.'}\n\n` +
          `• Make sure the post or account is **public**.\n` +
          `• Check if the URL is correct and not expired.`
        )
        .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });
      
      if (interaction.deferred) {
        return await interaction.editReply({ embeds: [failEmbed] }).catch(() => {});
      } else if (!interaction.replied) {
        return await interaction.reply({ embeds: [failEmbed] }).catch(() => {});
      } else {
        return await interaction.followUp({ embeds: [failEmbed] }).catch(() => {});
      }
    }

    const { embed, row } = buildMediaResponse(result, url, interaction.user);
    const replyOptions = {
      content: `👤 **Requested by:** <@${interaction.user.id}>`
    };
    if (row) replyOptions.components = [row];

    if (result.buffer && !result.tooLarge) {
      const extension = result.type === 'image' ? 'jpg' : 'mp4';
      const fileAttachment = new AttachmentBuilder(result.buffer, {
        name: result.filename || `download_${Date.now()}.${extension}`
      });
      replyOptions.files = [fileAttachment];
    } else {
      replyOptions.embeds = [embed];
    }

    try {
      if (interaction.deferred) {
        await interaction.editReply(replyOptions);
      } else if (!interaction.replied) {
        await interaction.reply(replyOptions);
      } else {
        await interaction.followUp(replyOptions);
      }
    } catch (replyErr) {
      logger.warn(`[Download] Interaction reply/edit failed (${replyErr.message}). Delivering via channel directly...`);
      if (interaction.channel) {
        await interaction.channel.send(replyOptions).catch(chErr => logger.error(`Direct channel delivery failed: ${chErr.message}`));
      }
    }

    // Auto-react with all 30 emojis sequentially
    const replyMsg = await interaction.fetchReply().catch(() => null);
    if (replyMsg) {
      for (const emoji of REACTION_EMOJIS) {
        try {
          await replyMsg.react(emoji);
          await new Promise(r => setTimeout(r, 250));
        } catch (e) {
          logger.debug(`Reaction failed ${emoji}: ${e.message}`);
        }
      }
    }
  } catch (err) {
    logger.error(`Error in /download execution: ${err.message}`);
    const errEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Download Failed')
      .setDescription('Arey thodi technical issue aavi gayi baka! Please try again in a few moments.')
      .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });
    if (interaction.deferred) {
      await interaction.editReply({ embeds: [errEmbed] }).catch(() => {});
    } else if (!interaction.replied) {
      await interaction.reply({ embeds: [errEmbed] }).catch(() => {});
    }
  }
};
