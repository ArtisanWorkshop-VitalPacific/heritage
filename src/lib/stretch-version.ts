/**
 * Version of the stretched lesson-word audio, shared by the client and /api/tts/word.
 * Bump it after a change to the pronunciations, the spoken template or the voices: every word is
 * then generated again, and the old answers drop out of the browser, CDN and runtime caches.
 */
export const STRETCH_VERSION = "2";
