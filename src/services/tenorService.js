import axios from 'axios';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const FALLBACK_GIFS = {
  happy: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3g1M2I0aTVocWNxb2x1bnBzN29yYzVpd2UycTN2Nmdia2RydmdqZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/10tIxdz3eYQDra/giphy.gif',
  crying: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3NueHNvMWI2azBldWVxYXZ0eHpjNDRxejUzaTBldnlxeXZhNXFvbSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/d22NqpjOcXZ8Q/giphy.gif',
  blushing: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWVjcmliNmJ5c3FmOGs3ZG81eThoYmo5ZXlxbWxocXBlaWZ5ZTZiYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26hpKMTa5Hg1XUA12/giphy.gif',
  angry: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzNuMzlybW9lajNsdnd4ODg1Z3JxdmdvMjNnczFwbnkxbjE4am05MCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/13EYy6N0us2812/giphy.gif',
  hug: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJqbjRhZjA3bXNrdmt4d3kyZ2dseGFvZ2J6bjRxcWVmcnlhNDlnYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/vVA8U5oad1SCQ/giphy.gif',
  kiss: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3NmdHRvYnFkcmQ0eXRuaWRsNzZ3YmFlOWptYm5uNGF6OHk0OWpnaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/G3va31oEEnIkM/giphy.gif',
  date: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbms3aGpsNHBqZ3EzbTVjZHQ1YXBxbXRicHhxdHRqN3gza3YyMnFqNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlU0G73q00qjGjm/giphy.gif'
};

export const fetchGif = async (searchTag) => {
  if (!config.tenorApiKey || config.tenorApiKey.includes('your_tenor_api_key')) {
    logger.debug(`Tenor API key not configured. Using fallback GIF for: ${searchTag}`);
    return FALLBACK_GIFS[searchTag.toLowerCase()] || FALLBACK_GIFS.happy;
  }

  try {
    const url = `https://tenor.googleapis.com/v2/search?q=anime+${encodeURIComponent(searchTag)}&key=${config.tenorApiKey}&limit=10&media_filter=gif`;
    const response = await axios.get(url);

    if (response.data && response.data.results && response.data.results.length > 0) {
      const results = response.data.results;
      const randomItem = results[Math.floor(Math.random() * results.length)];
      return randomItem.media_formats.gif.url;
    }
  } catch (error) {
    logger.warn(`Failed to fetch GIF from Tenor API for tag "${searchTag}": ${error.message}`);
  }

  return FALLBACK_GIFS[searchTag.toLowerCase()] || FALLBACK_GIFS.happy;
};
