/**
 * Logger utility for clean formatted console logs with timestamps and log levels.
 */
export const logger = {
  info: (msg) => console.log(`[INFO] [${new Date().toISOString()}] ${msg}`),
  warn: (msg) => console.warn(`[WARN] [${new Date().toISOString()}] ${msg}`),
  error: (msg, err) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`);
    if (err) console.error(err);
  },
  debug: (msg) => {
    if (process.env.DEBUG === 'true') {
      console.log(`[DEBUG] [${new Date().toISOString()}] ${msg}`);
    }
  }
};
