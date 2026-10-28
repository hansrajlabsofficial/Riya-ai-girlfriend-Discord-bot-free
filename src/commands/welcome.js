import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';
import { getGuildConfig, saveGuildConfig } from '../database/models/GuildConfig.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('welcome')
  .setDescription('Manage onboarding greetings and welcome configurations')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub
      .setName('channel')
      .setDescription('Configure the target channel where welcome messages will be posted')
      .addChannelOption(opt =>
        opt
          .setName('channel')
          .setDescription('Text channel to route user onboarding alerts')
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('message')
      .setDescription('Configure customized greeting text pattern and DM settings')
      .addStringOption(opt =>
        opt
          .setName('text')
          .setDescription('Dynamic greeting text ({user}, {server}, {member_count})')
          .setRequired(true)
      )
      .addBooleanOption(opt =>
        opt
          .setName('send_dm')
          .setDescription('Should the welcome message also be sent directly to the user\'s DMs?')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('second_message')
      .setDescription('Configure a customized second follow-up message sent after the welcome greeting')
      .addStringOption(opt =>
        opt
          .setName('text')
          .setDescription('Custom text for second message ({user}, {server}, {member_count})')
          .setRequired(true)
      )
      .addBooleanOption(opt =>
        opt
          .setName('as_embed')
          .setDescription('Send second message as an embed card box? (Default: False)')
          .setRequired(false)
      )
      .addBooleanOption(opt =>
        opt
          .setName('enabled')
          .setDescription('Enable or disable sending this second message (Default: True)')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('banner')
      .setDescription('Configure the image URL background design to showcase with the greeting')
      .addStringOption(opt =>
        opt
          .setName('image_url')
          .setDescription('A direct web URL to a JPEG/PNG welcome banner image')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('raw_json')
      .setDescription('View or automatically import welcome setup using formatted Raw JSON')
      .addStringOption(opt =>
        opt
          .setName('code')
          .setDescription('Paste raw JSON code to automatically update and apply welcome settings')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('test')
      .setDescription('Dispatches a mockup greeting to test the current welcome configuration')
  );

export const execute = async (interaction) => {
  if (!interaction.guild) {
    return interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
  }

  // Acknowledge immediately within 3s to prevent DiscordAPIError[10062] Unknown Interaction
  await interaction.deferReply({ ephemeral: true }).catch(() => {});

  const subcommand = interaction.options.getSubcommand();
  const guildConfig = await getGuildConfig(interaction.guild.id);

  // --- 1. /welcome channel ---
  if (subcommand === 'channel') {
    const channel = interaction.options.getChannel('channel', true);
    guildConfig.welcomeChannelId = channel.id;
    guildConfig.welcomeEnabled = true;
    await saveGuildConfig(guildConfig);

    const embed = new EmbedBuilder()
      .setTitle('👋 Onboarding Channel Configured')
      .setDescription(`Welcome greeting broadcasts have been routed to <#${channel.id}>.`)
      .setColor(0x2ecc71)
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // --- 2. /welcome message ---
  if (subcommand === 'message') {
    const text = interaction.options.getString('text', true);
    const sendDm = interaction.options.getBoolean('send_dm') ?? false;

    guildConfig.welcomeMessage = text;
    guildConfig.welcomeSendDm = sendDm;
    guildConfig.welcomeEnabled = true;
    await saveGuildConfig(guildConfig);

    const statusDm = sendDm ? '✅ **ENABLED**' : '❌ **DISABLED**';

    const embed = new EmbedBuilder()
      .setTitle('📝 Onboarding Template Updated')
      .setDescription(`Welcome text string successfully configured to:\n\`\`\`\n${text}\n\`\`\`\n• **Direct Message (DM) Delivery:** ${statusDm}`)
      .setColor(0x3498db)
      .setFooter({ text: 'Tags verified: {user}, {server}, {member_count}' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // --- 3. /welcome second_message ---
  if (subcommand === 'second_message') {
    const text = interaction.options.getString('text', true);
    const asEmbed = interaction.options.getBoolean('as_embed') ?? false;
    const enabled = interaction.options.getBoolean('enabled') ?? true;

    guildConfig.welcomeSecondMessage = text;
    guildConfig.welcomeSecondMessageAsEmbed = asEmbed;
    guildConfig.welcomeSecondMessageEnabled = enabled;
    await saveGuildConfig(guildConfig);

    const statusText = enabled ? '✅ **ENABLED**' : '❌ **DISABLED**';
    const formatText = asEmbed ? '📦 **Embed Card Box**' : '💬 **Plain Text Message**';

    const embed = new EmbedBuilder()
      .setTitle('📬 Second Follow-Up Message Configured')
      .setDescription(`Your second follow-up message has been configured:\n\`\`\`\n${text}\n\`\`\`\n• **Status:** ${statusText}\n• **Format:** ${formatText}`)
      .setColor(0x3498db)
      .setFooter({ text: 'Tags verified: {user}, {server}, {member_count}' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // --- 4. /welcome banner ---
  if (subcommand === 'banner') {
    const imageUrl = interaction.options.getString('image_url', true);

    if (!imageUrl.toLowerCase().startsWith('http://') && !imageUrl.toLowerCase().startsWith('https://')) {
      return interaction.editReply({
        content: '❌ Verification Error: Please provide a valid web URL starting with `http://` or `https://`.'
      });
    }

    guildConfig.welcomeBannerUrl = imageUrl;
    await saveGuildConfig(guildConfig);

    const embed = new EmbedBuilder()
      .setTitle('🖼️ Onboarding Banner Saved')
      .setDescription('Your custom welcome banner has been configured successfully.')
      .setImage(imageUrl)
      .setColor(0x9b59b6)
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // --- 5. /welcome raw_json ---
  if (subcommand === 'raw_json') {
    const inputCode = interaction.options.getString('code');
    if (inputCode) {
      try {
        const cleaned = inputCode.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(cleaned);

        if (parsed.channel_id || parsed.channelId || parsed.welcomeChannelId || parsed.channel) {
          const cId = String(parsed.channel_id || parsed.channelId || parsed.welcomeChannelId || parsed.channel).replace(/[<#>]/g, '').trim();
          guildConfig.welcomeChannelId = cId;
          guildConfig.welcomeEnabled = true;
        }
        if (parsed.message || parsed.welcomeMessage || parsed.text) {
          guildConfig.welcomeMessage = parsed.message || parsed.welcomeMessage || parsed.text;
        }
        if (parsed.banner_url || parsed.welcomeBannerUrl || parsed.image_url) {
          guildConfig.welcomeBannerUrl = parsed.banner_url || parsed.welcomeBannerUrl || parsed.image_url;
        }
        if (parsed.send_dm !== undefined || parsed.welcomeSendDm !== undefined) {
          guildConfig.welcomeSendDm = Boolean(parsed.send_dm ?? parsed.welcomeSendDm);
        }
        if (parsed.second_message || parsed.welcomeSecondMessage) {
          guildConfig.welcomeSecondMessage = parsed.second_message || parsed.welcomeSecondMessage;
        }
        if (parsed.second_message_enabled !== undefined || parsed.welcomeSecondMessageEnabled !== undefined) {
          guildConfig.welcomeSecondMessageEnabled = Boolean(parsed.second_message_enabled ?? parsed.welcomeSecondMessageEnabled);
        }
        if (parsed.second_message_as_embed !== undefined || parsed.welcomeSecondMessageAsEmbed !== undefined) {
          guildConfig.welcomeSecondMessageAsEmbed = Boolean(parsed.second_message_as_embed ?? parsed.welcomeSecondMessageAsEmbed);
        }
        if (parsed.welcome_enabled !== undefined || parsed.welcomeEnabled !== undefined) {
          guildConfig.welcomeEnabled = Boolean(parsed.welcome_enabled ?? parsed.welcomeEnabled);
        }

        await saveGuildConfig(guildConfig);

        const updatedConfig = {
          guildId: interaction.guild.id,
          guildName: interaction.guild.name,
          welcomeEnabled: guildConfig.welcomeEnabled,
          welcomeChannelId: guildConfig.welcomeChannelId,
          welcomeMessage: guildConfig.welcomeMessage,
          welcomeBannerUrl: guildConfig.welcomeBannerUrl,
          welcomeSendDm: guildConfig.welcomeSendDm,
          welcomeSecondMessage: guildConfig.welcomeSecondMessage,
          welcomeSecondMessageEnabled: guildConfig.welcomeSecondMessageEnabled,
          welcomeSecondMessageAsEmbed: guildConfig.welcomeSecondMessageAsEmbed
        };

        const embed = new EmbedBuilder()
          .setTitle('✅ Automatic Welcome Setup Updated from Raw JSON!')
          .setDescription(`All welcome configurations have been successfully updated from your JSON code!\n\n• **Target Channel:** ${guildConfig.welcomeChannelId ? `<#${guildConfig.welcomeChannelId}>` : '*(Not configured)*'}\n• **Status:** ${guildConfig.welcomeEnabled ? '🟢 ENABLED' : '🔴 DISABLED'}\n• **DM Dispatch:** ${guildConfig.welcomeSendDm ? '✅ ENABLED' : '❌ DISABLED'}\n• **Second Message:** ${guildConfig.welcomeSecondMessageEnabled ? '✅ ENABLED' : '❌ DISABLED'}\n\n**Applied JSON Matrix:**\n\`\`\`json\n${JSON.stringify(updatedConfig, null, 2).slice(0, 3000)}\n\`\`\``)
          .setColor(0x2ecc71)
          .setFooter({ text: 'Riya AI • Welcome Config Matrix' })
          .setTimestamp();

        if (guildConfig.welcomeBannerUrl) {
          embed.setImage(guildConfig.welcomeBannerUrl);
        }

        return interaction.editReply({ embeds: [embed] });
      } catch (parseErr) {
        return interaction.editReply({
          content: `❌ **Invalid Raw JSON Syntax:** Could not parse code!\n\`\`\`\n${parseErr.message}\n\`\`\``
        });
      }
    }

    const rawConfig = {
      guildId: interaction.guild.id,
      guildName: interaction.guild.name,
      welcomeEnabled: guildConfig.welcomeEnabled ?? true,
      welcomeChannelId: guildConfig.welcomeChannelId || null,
      welcomeMessage: guildConfig.welcomeMessage || 'Welcome {user} to the {server} matrix!',
      welcomeBannerUrl: guildConfig.welcomeBannerUrl || null,
      welcomeSendDm: guildConfig.welcomeSendDm ?? false,
      welcomeSecondMessage: guildConfig.welcomeSecondMessage || null,
      welcomeSecondMessageEnabled: guildConfig.welcomeSecondMessageEnabled ?? false,
      welcomeSecondMessageAsEmbed: guildConfig.welcomeSecondMessageAsEmbed ?? false
    };

    const jsonString = JSON.stringify(rawConfig, null, 2);
    const embed = new EmbedBuilder()
      .setTitle('⚙️ Automatic Welcome Setup • Raw JSON')
      .setDescription(`\`\`\`json\n${jsonString.slice(0, 4000)}\n\`\`\``)
      .setColor(0x9b59b6)
      .setFooter({ text: 'Riya AI • Welcome Config Matrix' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // --- 6. /welcome test ---
  if (subcommand === 'test') {
    const channelId = guildConfig.welcomeChannelId;
    if (!channelId) {
      return interaction.editReply({
        content: '❌ Execution Block: Please configure an onboarding text channel first using `/welcome channel`.'
      });
    }

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
      return interaction.editReply({
        content: '❌ Route Error: Configured channel could not be found. Please update `/welcome channel`.'
      });
    }

    // Dynamic replacement
    const rawMsg = guildConfig.welcomeMessage || 'Welcome {user} to the {server} matrix!';
    const formattedMsg = rawMsg
      .replace(/{user}/g, interaction.user.toString())
      .replace(/{server}/g, interaction.guild.name)
      .replace(/{member_count}/g, interaction.guild.memberCount.toString());

    const accountAge = interaction.user.createdAt.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    const embed = new EmbedBuilder()
      .setTitle('✨ New Connection Established (Mockup Test)')
      .setDescription(formattedMsg)
      .setColor(0x9b59b6)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Account Age Identity', value: accountAge, inline: true },
        { name: 'Guild Member Count', value: `\`${interaction.guild.memberCount}\` Total`, inline: true }
      )
      .setFooter({ text: `User ID: ${interaction.user.id}` })
      .setTimestamp();

    if (guildConfig.welcomeBannerUrl) {
      embed.setImage(guildConfig.welcomeBannerUrl);
    }

    let channelSuccess = false;
    try {
      await channel.send({ embeds: [embed] });
      channelSuccess = true;
    } catch (err) {
      logger.warn(`Failed to send test welcome embed to channel: ${err.message}`);
    }

    // Send second message if enabled
    if (guildConfig.welcomeSecondMessageEnabled && guildConfig.welcomeSecondMessage) {
      const rawSecond = guildConfig.welcomeSecondMessage;
      const formattedSecond = rawSecond
        .replace(/{user}/g, interaction.user.toString())
        .replace(/{server}/g, interaction.guild.name)
        .replace(/{member_count}/g, interaction.guild.memberCount.toString());

      try {
        if (guildConfig.welcomeSecondMessageAsEmbed) {
          const secondEmbed = new EmbedBuilder()
            .setDescription(formattedSecond)
            .setColor(0xffd700);
          await channel.send({ embeds: [secondEmbed] });
        } else {
          await channel.send({ content: formattedSecond });
        }
      } catch (err) {
        logger.warn(`Failed to send test second message: ${err.message}`);
      }
    }

    // Direct Message Test if enabled
    let dmStatus = '';
    if (guildConfig.welcomeSendDm) {
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle(`✨ Welcome to ${interaction.guild.name}! (Mockup DM)`)
          .setDescription(formattedMsg)
          .setColor(0x9b59b6)
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: 'Sent dynamically via welcome configurations' })
          .setTimestamp();

        if (guildConfig.welcomeBannerUrl) {
          dmEmbed.setImage(guildConfig.welcomeBannerUrl);
        }

        await interaction.user.send({ embeds: [dmEmbed] });
        dmStatus = '\n📩 **DM Mockup Dispatch:** Sent successfully to your direct messages!';
      } catch {
        dmStatus = '\n⚠️ **DM Mockup Dispatch Failed:** Your direct messages are locked; cannot send welcome mockup.';
      }
    }

    if (channelSuccess) {
      const secondMsgNotice = guildConfig.welcomeSecondMessageEnabled && guildConfig.welcomeSecondMessage
        ? '\n📬 **Second Message Dispatch:** Included in broadcast!'
        : '';

      return interaction.editReply({
        content: `✅ Dynamic Test Broadcast: Onboarding greeting sent successfully to <#${channel.id}>.${secondMsgNotice}${dmStatus}`
      });
    } else {
      return interaction.editReply({
        content: `❌ Permissions Error: Missing permission settings to send embeds inside configured channel.${dmStatus}`
      });
    }
  }
};
