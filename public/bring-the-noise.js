import { initApp } from "./js/ui.js";

export {
  BUTTON_SOUND_URL,
  buildingUrls,
  NOISE_MODES,
  NOISE_TYPES,
  screamingUrls,
  spookyAmbienceUrls,
  spookyUrls,
  trafficUrls,
} from "./js/audio-assets.js";
export {
  BUTTON_SOUND_SPRITES,
  ButtonSoundPlayer,
  wireButtonSounds,
} from "./js/button-sounds.js";
export {
  brownNoiseBuffer,
  pinkNoiseBuffer,
  whiteNoiseBuffer,
} from "./js/dsp.js";
export { NoiseEngine } from "./js/noise-engine.js";
export { initApp, updateLcd } from "./js/ui.js";

if (typeof document !== "undefined" && document.querySelector("#buttons")) {
  initApp();
}
