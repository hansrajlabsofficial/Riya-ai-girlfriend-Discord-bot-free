import OpenAI, { toFile } from 'openai';
import axios from 'axios';
import { AttachmentBuilder } from 'discord.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

let openaiClient = null;

const getOpenAIClient = () => {
  if (!openaiClient && config.openaiApiKey && !config.openaiApiKey.includes('your_openai_api_key')) {
    openaiClient = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return openaiClient;
};

/**
 * Transcribes a Discord audio attachment using OpenAI Whisper API
 */
export const transcribeVoiceAttachment = async (attachmentUrl) => {
  const openai = getOpenAIClient();
  if (!openai) {
    throw new Error('OpenAI API key is missing or not configured.');
  }

  try {
    logger.info(`Downloading voice message attachment from: ${attachmentUrl}`);
    const response = await axios.get(attachmentUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    // Create file wrapper for OpenAI SDK
    const file = await toFile(buffer, 'voice_message.ogg', { type: 'audio/ogg' });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en'
    });

    return transcription.text;
  } catch (error) {
    logger.error('Error transcribing voice message with Whisper API:', error);
    throw error;
  }
};

/**
 * Generates TTS Audio from text response using OpenAI TTS API
 */
export const generateTextToSpeech = async (text) => {
  const openai = getOpenAIClient();
  if (!openai) return null;

  try {
    // Truncate text if very long for TTS performance
    const cleanedText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ''); // strip emojis for cleaner audio
    const speechInput = cleanedText.slice(0, 300);

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova', // Soft, sweet feminine voice suited for girlfriend persona
      input: speechInput
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    return new AttachmentBuilder(buffer, { name: 'voice_reply.mp3' });
  } catch (error) {
    logger.warn('Failed to generate TTS audio response:', error.message);
    return null;
  }
};
