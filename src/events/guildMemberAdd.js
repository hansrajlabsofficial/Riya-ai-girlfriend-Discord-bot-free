import { sendWelcomeMessage } from '../services/welcomeService.js';
import { logger } from '../utils/logger.js';

export const name = 'guildMemberAdd';

export const execute = async (member) => {
  try {
    if (!member || member.user?.bot) return;
    await sendWelcomeMessage(member);
  } catch (error) {
    logger.error(`Error in guildMemberAdd event: ${error.message}`);
  }
};
