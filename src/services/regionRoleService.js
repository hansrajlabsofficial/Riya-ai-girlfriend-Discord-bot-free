import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getGuildConfig, saveGuildConfig } from '../database/models/GuildConfig.js';
import { findExistingGuildRole } from '../utils/roleMatcher.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_MAP_PATH = path.resolve(__dirname, '../assets/region_map.png');

export const REGIONS_CONFIG = [
  { key: 'north_america', name: 'North America', emoji: '🟥', style: ButtonStyle.Danger, defaultColor: '#E74C3C', aliases: ['north america', 'na', 'usa', 'canada'], row: 1 },
  { key: 'south_america', name: 'South America', emoji: '🟥', style: ButtonStyle.Danger, defaultColor: '#E74C3C', aliases: ['south america', 'sa', 'brazil', 'latam'], row: 1 },
  { key: 'east_europe', name: 'East Europe', emoji: '🟦', style: ButtonStyle.Primary, defaultColor: '#3498DB', aliases: ['east europe', 'eastern europe', 'ee'], row: 1 },
  { key: 'west_europe', name: 'West Europe', emoji: '🟦', style: ButtonStyle.Primary, defaultColor: '#2980B9', aliases: ['west europe', 'western europe', 'we', 'eu', 'europe'], row: 1 },
  { key: 'oceania', name: 'Oceania', emoji: '⬜', style: ButtonStyle.Secondary, defaultColor: '#95A5A6', aliases: ['oceania', 'oce', 'australia', 'nz', 'new zealand'], row: 1 },
  { key: 'asia', name: 'Asia', emoji: '🟩', style: ButtonStyle.Success, defaultColor: '#2ECC71', aliases: ['asia', 'india', 'sea', 'japan', 'korea'], row: 2 },
  { key: 'africa', name: 'Africa', emoji: '🟩', style: ButtonStyle.Success, defaultColor: '#27AE60', aliases: ['africa', 'south africa'], row: 2 },
  { key: 'rather_not_say', name: 'Rather not say', emoji: '⛔', style: ButtonStyle.Secondary, defaultColor: '#7F8C8D', aliases: ['rather not say', 'no region', 'other', 'none'], row: 2 }
];

export const DEFAULT_REGION_DESCRIPTION = 
`Here we allow you to choose your continent so that you are only alerted for region-restricted tests that apply to your location.

Below is a map of how countries are separated by regions on the website.

Roles do not impact how many tests you are invited to, only which ones you are alerted of in this server.

If you select "Rather not say" you may be alerted of tests you do not qualify for.`;

/**
 * Builds the Region Selection Embed and ActionRow components
 */
export const buildRegionPanel = ({ title = 'Region Selection', description = DEFAULT_REGION_DESCRIPTION, mapImageUrl = null, regionRolesMap = {} } = {}) => {
  const embed = new EmbedBuilder()
    .setColor('#F1C40F')
    .setTitle(title)
    .setDescription(description);

  const files = [];
  if (mapImageUrl) {
    embed.setImage(mapImageUrl);
  } else if (fs.existsSync(DEFAULT_MAP_PATH)) {
    files.push(new AttachmentBuilder(DEFAULT_MAP_PATH, { name: 'region_map.png' }));
    embed.setImage('attachment://region_map.png');
  }

  const row1 = new ActionRowBuilder();
  const row2 = new ActionRowBuilder();

  for (const reg of REGIONS_CONFIG) {
    const roleId = regionRolesMap[reg.key] || 'none';
    const button = new ButtonBuilder()
      .setCustomId(`region_role:${reg.key}:${roleId}`)
      .setLabel(reg.name)
      .setStyle(reg.style);

    if (reg.emoji) {
      try {
        button.setEmoji(reg.emoji);
      } catch (err) {
        logger.warn(`Could not set emoji ${reg.emoji} on button ${reg.name}`);
      }
    }

    if (reg.row === 1) {
      row1.addComponents(button);
    } else {
      row2.addComponents(button);
    }
  }

  return {
    embeds: [embed],
    components: [row1, row2],
    files
  };
};

/**
 * Handles button interactions when a member clicks a region role button
 */
export const handleRegionRoleClick = async (interaction) => {
  if (!interaction.inGuild() || !interaction.guild) {
    return await interaction.reply({
      content: '❌ This button can only be used inside a Discord server.',
      ephemeral: true
    }).catch(() => {});
  }

  const parts = interaction.customId.split(':');
  const regionKey = parts[1];
  let targetRoleId = parts[2];

  const regionDef = REGIONS_CONFIG.find(r => r.key === regionKey);
  if (!regionDef) {
    return await interaction.reply({
      content: '❌ Unknown region selection.',
      ephemeral: true
    }).catch(() => {});
  }

  // Check bot permissions
  const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe().catch(() => null);
  if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return await interaction.reply({
      content: '❌ **Permission Error:** I need the **Manage Roles** permission to give or remove region roles. Please ask a server admin to grant me this permission!',
      ephemeral: true
    }).catch(() => {});
  }

  // Resolve role from cache/GuildConfig
  let role = null;
  if (targetRoleId && targetRoleId !== 'none') {
    role = interaction.guild.roles.cache.get(targetRoleId) || await interaction.guild.roles.fetch(targetRoleId).catch(() => null);
  }

  if (!role) {
    // Try GuildConfig fallback
    const guildConfig = await getGuildConfig(interaction.guildId).catch(() => null);
    if (guildConfig?.regionRoles?.[regionKey]) {
      const cfgRoleId = guildConfig.regionRoles[regionKey];
      role = interaction.guild.roles.cache.get(cfgRoleId) || await interaction.guild.roles.fetch(cfgRoleId).catch(() => null);
    }
  }

  if (!role) {
    role = await findExistingGuildRole(interaction.guild, regionDef);
  }

  if (!role) {
    return await interaction.reply({
      content: `❌ **Role Not Found:** The role for **${regionDef.name}** was not found on this server. Please ask a server admin to run \`/setup_region_roles\` to configure it.`,
      ephemeral: true
    }).catch(() => {});
  }

  // Role hierarchy check
  if (role.position >= botMember.roles.highest.position) {
    return await interaction.reply({
      content: `❌ **Hierarchy Error:** The role **${role.name}** is positioned higher than (or equal to) my highest role in Server Settings > Roles. Please ask an admin to drag my bot role above **${role.name}**!`,
      ephemeral: true
    }).catch(() => {});
  }

  const member = interaction.member;
  const hasRole = member.roles.cache.has(role.id);

  try {
    if (hasRole) {
      // Toggle OFF: Remove role
      await member.roles.remove(role, 'User removed region role via region selection panel');
      return await interaction.reply({
        content: `❌ **Removed role:** <@&${role.id}> (\`${role.name}\`)\nYou will no longer receive alerts for this region.`,
        ephemeral: true
      });
    } else {
      // Toggle ON: Add role
      const guildConfig = await getGuildConfig(interaction.guildId).catch(() => null);
      const allRegionRoles = guildConfig?.regionRoles || {};

      if (regionKey === 'rather_not_say') {
        // If selecting "Rather not say", remove any specific continent roles they might have
        const rolesToRemove = [];
        for (const reg of REGIONS_CONFIG) {
          if (reg.key === 'rather_not_say') continue;
          const regRoleId = allRegionRoles[reg.key];
          if (regRoleId && member.roles.cache.has(regRoleId)) {
            rolesToRemove.push(regRoleId);
          } else {
            const foundRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === reg.name.toLowerCase());
            if (foundRole && member.roles.cache.has(foundRole.id)) {
              rolesToRemove.push(foundRole.id);
            }
          }
        }
        if (rolesToRemove.length > 0) {
          await member.roles.remove(rolesToRemove, 'Replaced continent roles with Rather not say').catch(() => {});
        }

        await member.roles.add(role, 'User selected Rather not say region role');
        return await interaction.reply({
          content: `✅ **Added role:** <@&${role.id}> (\`${role.name}\`)\nYou have selected **Rather not say**. You may be alerted for tests across all regions! 🌍`,
          ephemeral: true
        });
      } else {
        // If selecting a specific continent, remove "Rather not say" if they had it
        const ratherRoleId = allRegionRoles['rather_not_say'];
        let ratherRole = ratherRoleId ? (interaction.guild.roles.cache.get(ratherRoleId) || null) : null;
        if (!ratherRole) {
          ratherRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'rather not say');
        }

        if (ratherRole && member.roles.cache.has(ratherRole.id)) {
          await member.roles.remove(ratherRole.id, 'Removed Rather not say upon continent selection').catch(() => {});
        }

        await member.roles.add(role, 'User selected continent region role');
        return await interaction.reply({
          content: `✅ **Added role:** <@&${role.id}> (\`${role.name}\`)\nYou will now be alerted for tests in **${regionDef.name}**! 🔔✨`,
          ephemeral: true
        });
      }
    }
  } catch (err) {
    logger.error(`Error toggling region role ${role.name} for user ${interaction.user.tag}:`, err);
    return await interaction.reply({
      content: `❌ **Failed to update role:** ${err.message}`,
      ephemeral: true
    }).catch(() => {});
  }
};
