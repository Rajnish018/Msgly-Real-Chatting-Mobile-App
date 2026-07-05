// Local asset imports
const SEND_SOUND = require("../assets/sounds/send.mp3");
const TICK_SOUND = require("../assets/sounds/tick.mp3");
const CHIME_SOUND = require("../assets/sounds/chime.mp3");
const RINGTONE_SOUND = require("../assets/sounds/ringtone.mp3");

const TONES_MAP: Record<string, any> = {
  default: SEND_SOUND,
  chime: CHIME_SOUND,
  reflection: CHIME_SOUND,
};

const RINGTONES_MAP: Record<string, any> = {
  default: RINGTONE_SOUND,
  chime: CHIME_SOUND,
  reflection: RINGTONE_SOUND,
};

let isAudioEnabled = true;
let isNativeModuleChecked = false;
let isExpoAudioAvailable = false;
let isExpoAvAvailable = false;

let expoAudioModule: any = null;
let expoAvModule: any = null;

export const setAudioEnabled = (enabled: boolean) => {
  isAudioEnabled = enabled;
};

const loadAudioModules = async () => {
  if (isNativeModuleChecked) {
    return;
  }
  
  // Try importing the new expo-audio package (SDK 54+)
  // try {
  //   // @ts-ignore
  //   expoAudioModule = await import("expo-audio");
  //   isExpoAudioAvailable = !!expoAudioModule && typeof expoAudioModule.createAudioPlayer === "function";
  // } catch (error) {
  //   // expo-audio not installed/available
  // }

  // Try importing the legacy expo-av package as a fallback
  try {
    // @ts-ignore
    const expoAv = await import("expo-av");
    expoAvModule = expoAv.Audio;
    isExpoAvAvailable = !!expoAvModule;
  } catch (error) {
    // expo-av not installed/available
  }

  isNativeModuleChecked = true;
};

/**
 * Internal helper to play a local audio asset using either expo-audio or expo-av fallback
 */
const playSoundAsset = async (asset: any, volume = 0.6, autoStopMs?: number) => {
  if (!isAudioEnabled) return;
  try {
    await loadAudioModules();

    // 1. Try playing using the modern expo-audio API (SDK 54+)
    if (isExpoAudioAvailable && expoAudioModule) {
      const player = expoAudioModule.createAudioPlayer(asset);
      player.volume = volume;
      player.play();
      
      // Release player resources after playback to prevent memory leaks
      const duration = autoStopMs || 3000;
      setTimeout(() => {
        try {
          player.release();
        } catch (e) {}
      }, duration);
      return;
    }

    // 2. Fall back to the legacy expo-av API
    if (isExpoAvAvailable && expoAvModule) {
      const { sound } = await expoAvModule.Sound.createAsync(
        asset,
        { shouldPlay: true, volume }
      );
      
      if (autoStopMs) {
        setTimeout(() => {
          sound.unloadAsync().catch(() => {});
        }, autoStopMs);
      } else {
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
          }
        });
      }
      return;
    }
    
    console.warn("No native audio module available (neither expo-audio nor expo-av is loaded).");
  } catch (error) {
    console.warn("Failed to play sound asset:", error);
  }
};

export const playSendSound = async () => {
  await playSoundAsset(SEND_SOUND, 0.6);
};

export const playDoubleTickSound = async () => {
  await playSoundAsset(TICK_SOUND, 0.6);
};

export const playTonePreview = async (toneName: string) => {
  if (toneName === "none") return;
  const asset = TONES_MAP[toneName] || TONES_MAP.default;
  await playSoundAsset(asset, 0.7);
};

export const playRingtonePreview = async (ringtoneName: string) => {
  if (ringtoneName === "none") return;
  const asset = RINGTONES_MAP[ringtoneName] || RINGTONES_MAP.default;
  // Auto stop after 4 seconds so ringtone previews don't play forever!
  await playSoundAsset(asset, 0.7, 4000);
};
