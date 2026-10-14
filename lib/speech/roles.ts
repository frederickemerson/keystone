// Who is speaking. Shared by the server chain (lib/speech/tts) and the client
// (lib/speech/manifest, the voice hook), so it lives in a module with no
// `server-only` import and no secrets.
//
// Roles rather than provider voice ids: swapping provider must not be able to
// change who is who.

export const TTS_ROLES = ['expert', 'interviewer'] as const;
export type TtsRole = (typeof TTS_ROLES)[number];

export function isTtsRole(value: string): value is TtsRole {
  return (TTS_ROLES as readonly string[]).includes(value);
}
