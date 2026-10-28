import { NOISE_MODES, NOISE_TYPES } from "./audio-assets.js";
import { NoiseEngine } from "./noise-engine.js";

export function updateLcd(newText, root = document) {
  const lcdOn = root.querySelector(".lcd-on");
  const lcdOff = root.querySelector(".lcd-off");
  if (!lcdOn || !lcdOff || lcdOn.textContent === newText) return;

  lcdOff.textContent = newText;
  lcdOff.removeAttribute("aria-hidden");
  lcdOff.classList.add("lcd-on");
  lcdOff.classList.remove("lcd-off");

  lcdOn.setAttribute("aria-hidden", "true");
  lcdOn.classList.add("lcd-off");
  lcdOn.classList.remove("lcd-on");
}

function updateMediaSessionMetadata(mode) {
  if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") {
    return;
  }
  navigator.mediaSession.metadata = new MediaMetadata({
    title: `${mode.title} noise`,
    artist: "Modern noise machine",
    artwork: [{ src: mode.artwork, sizes: "1024x1024", type: "image/jpeg" }],
  });
}

function updateMediaSessionPlayback(isPlaying) {
  if (!("mediaSession" in navigator)) return;

  navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  if (isPlaying) {
    navigator.mediaSession.setPositionState?.({
      duration: 1,
      playbackRate: 1,
      position: 1,
    });
  }
}

export function initApp({ root = document, engineOptions = {} } = {}) {
  const backgroundAudio = root.querySelector("audio");
  if (backgroundAudio) {
    backgroundAudio.loop = true;
  }

  let isLoadingSamples = false;

  const engine = new NoiseEngine({
    ...engineOptions,
    onLoadingChange: (loading) => {
      if (isLoadingSamples === loading) return;
      isLoadingSamples = loading;
      const mode = NOISE_MODES.get(engine.noiseType);
      if (mode) {
        updateLcd(loading ? "Loading" : mode.title, root);
      }
    },
  });

  const syncTransportUi = () => {
    const playIcon = root.querySelector("#play-icon");
    playIcon?.classList.toggle("lcd-icon-on", engine.isPlaying);

    root
      .querySelectorAll(".lcd-icon-pulsing")
      .forEach((icon) => icon.classList.remove("lcd-icon-pulsing"));

    if (engine.isPlaying) {
      root
        .querySelector(`#${engine.noiseType}-icon`)
        ?.classList.add("lcd-icon-pulsing");
    }

    root
      .querySelector("#play")
      ?.setAttribute("aria-pressed", String(engine.isPlaying));
    root
      .querySelector("#pause")
      ?.setAttribute("aria-pressed", String(!engine.isPlaying));
  };

  const syncModeUi = (noiseType) => {
    const mode = NOISE_MODES.get(noiseType);
    if (!mode) return;

    if (!isLoadingSamples) {
      updateLcd(mode.title, root);
    }

    for (const type of NOISE_TYPES) {
      const isSelected = type === noiseType;
      root
        .querySelector(`#${type}-icon`)
        ?.classList.toggle("lcd-icon-on", isSelected);
      root
        .querySelector(`#${type}`)
        ?.setAttribute("aria-pressed", String(isSelected));
    }

    syncTransportUi();
    updateMediaSessionMetadata(mode);
  };

  const startPlayback = () => {
    if (!engine.start()) return;
    syncTransportUi();
    updateMediaSessionPlayback(true);
    backgroundAudio?.play().catch((error) => {
      console.error("Error playing background audio:", error);
    });
  };

  const stopPlayback = () => {
    if (!engine.stop()) return;
    syncTransportUi();
    updateMediaSessionPlayback(false);
    backgroundAudio?.pause();
  };

  const selectNoiseType = (type) => {
    if (!engine.setNoiseType(type)) return;
    syncModeUi(type);
  };

  root.querySelector("#play")?.addEventListener("click", startPlayback);
  root.querySelector("#pause")?.addEventListener("click", stopPlayback);

  for (const type of NOISE_TYPES) {
    root
      .querySelector(`#${type}`)
      ?.addEventListener("click", () => selectNoiseType(type));
  }

  const volumeSlider = root.querySelector("#volume-slider");
  volumeSlider?.addEventListener("input", (ev) => {
    const gainLevel = 2 - Number(ev.target.value);
    engine.setVolume(gainLevel);
  });

  if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("play", startPlayback);
    navigator.mediaSession.setActionHandler("pause", stopPlayback);
    navigator.mediaSession.setActionHandler("stop", stopPlayback);
  }

  syncModeUi(engine.noiseType);

  return {
    engine,
    startPlayback,
    stopPlayback,
    selectNoiseType,
  };
}
