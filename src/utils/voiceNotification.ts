'use client';

// Helper for Voice & Sound Notifications across HMS Dashboard

const STORAGE_KEY = 'hms_voice_notifications_enabled';
const VOICE_GENDER_KEY = 'hms_voice_gender_preference'; // 'female' | 'male' | 'auto'

export function isVoiceEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(STORAGE_KEY);
  return val === null ? true : val === 'true';
}

export function setVoiceEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('hms-voice-setting-changed', { detail: { enabled } }));
}

export function getVoiceGenderPreference(): string {
  if (typeof window === 'undefined') return 'auto';
  return localStorage.getItem(VOICE_GENDER_KEY) || 'auto';
}

export function setVoiceGenderPreference(gender: 'female' | 'male' | 'auto'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VOICE_GENDER_KEY, gender);
  window.dispatchEvent(new CustomEvent('hms-voice-setting-changed', { detail: { gender } }));
}

// ── Web Audio Chime Generator ───────────────────────────────────────────
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playChime(type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      // Pleasant 2-tone chord (E5 to A5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.12); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'error' || type === 'warning') {
      // Alert chime (A4 to F4)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440.0, now);
      osc.frequency.setValueAtTime(349.23, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else {
      // Gentle notification chime (C5 to G5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (err) {
    // Ignore audio context errors if muted by browser policy
    console.debug('Audio chime failed:', err);
  }
}

// ── Web Speech API Human Voice Generator ───────────────────────────────
function selectBestHumanVoice(voices: SpeechSynthesisVoice[], genderPref: string): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // Filter english voices
  const englishVoices = voices.filter(v => v.lang.startsWith('en'));
  const candidatePool = englishVoices.length > 0 ? englishVoices : voices;

  // Search for premium natural human voice names (Google, Microsoft, Apple natural voices)
  if (genderPref === 'female') {
    const femaleVoice = candidatePool.find(v => 
      /female|zira|samantha|karen|victoria|google us english|jenny|aria|google uk english female/i.test(v.name)
    );
    if (femaleVoice) return femaleVoice;
  } else if (genderPref === 'male') {
    const maleVoice = candidatePool.find(v => 
      /male|david|alex|george|google uk english male|guy|ryan/i.test(v.name)
    );
    if (maleVoice) return maleVoice;
  }

  // Auto/Default voice selection: Prioritize high quality / natural voices
  const topVoice = candidatePool.find(v => 
    /google us english|google uk english|natural|online|samantha|zira|karen|alex|aria/i.test(v.name)
  );

  return topVoice || candidatePool[0] || voices[0] || null;
}

export function speakText(text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!isVoiceEnabled()) return;

  try {
    const synth = window.speechSynthesis;

    // Cancel any ongoing speech so messages don't stack up indefinitely
    synth.cancel();

    // Clean text for speech
    const cleanText = text
      .replace(/[^\w\s.,?!'-]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95; // Natural human speaking pace
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const genderPref = getVoiceGenderPreference();

    const applyVoice = () => {
      const voices = synth.getVoices();
      const bestVoice = selectBestHumanVoice(voices, genderPref);
      if (bestVoice) {
        utterance.voice = bestVoice;
      }
      synth.speak(utterance);
    };

    const availableVoices = synth.getVoices();
    if (availableVoices.length > 0) {
      applyVoice();
    } else {
      // In some browsers (like Chrome), voices load asynchronously
      synth.onvoiceschanged = () => {
        applyVoice();
        synth.onvoiceschanged = null;
      };
    }
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

/**
 * Main function to play human voice sound notification across dashboard events
 */
export function playVoiceNotification(
  title: string,
  message?: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
): void {
  if (typeof window === 'undefined') return;
  if (!isVoiceEnabled()) return;

  // 1. Play subtle audio chime
  playChime(type);

  // 2. Prepare speech text
  let speechText = title;
  if (message && message !== title) {
    // Keep sentence natural for announcements
    const shortMsg = message.length > 300 ? message.substring(0, 300) + '...' : message;
    speechText = `${title}. ${shortMsg}`;
  }

  // 3. Speak in human voice after brief chime delay (100ms)
  setTimeout(() => {
    speakText(speechText, type);
  }, 100);
}
