'use strict';

// Initialise shared variables
let audioContext = null;
let noiseNode = null;
let gainNode = null;
let gainLevel = 1;

const screamingUrls = [
  '/audio/screams/132106__sironboy__woman-scream.aac',
  '/audio/screams/13797__sweetneo85__wilhelm.aac',
  '/audio/screams/173088__vitouliss__screaming-into-the-microphone.aac',
  '/audio/screams/179320__jorickhoofd__male-scream-6.aac',
  '/audio/screams/220365__alsarcoli007__scream-01.aac',
  '/audio/screams/220369__alsarcoli007__scream-05.aac',
  '/audio/screams/220655__marionagm90__scream.aac',
  '/audio/screams/222586__queen_westeros__boy-scream.aac',
  '/audio/screams/235592__tcrocker68__girl_scream.aac',
  '/audio/screams/239900__thesubber13__scream-1.aac',
  '/audio/screams/253771__reitanna__dat-scream.aac',
  '/audio/screams/400183__tomattka__girl-screaming_01.aac',
  '/audio/screams/415352__owly-bee__screaming1.aac',
  '/audio/screams/416541__tonsil5__male_scream_5.aac',
  '/audio/screams/42847__freqman__psycho-scream-1.aac',
  '/audio/screams/457573__bluefairy311__screaming.aac',
  '/audio/screams/547961__klangkobold__panic-stricken-screaming-1.aac',
  '/audio/screams/747831__roryshea__paul-scream.aac',
  '/audio/screams/758591__demensdeum__scream.aac',
  '/audio/screams/759454__akridiy__a-single-scream-of-a-young-male.aac',
  '/audio/screams/767890__valerie-vivegnis__scream-woman-pain-4.aac',
  '/audio/screams/9703__lithe-fider__fl_scream-1.aac',
];

const trafficUrls = [
  '/audio/traffic/106785__robinhood76__02229-car-claxons.aac',
  '/audio/traffic/164625__deleted_user_2104797__car_horn_short.aac',
  '/audio/traffic/164627__deleted_user_2104797__car_horn_long.aac',
  '/audio/traffic/176003__debsound__nissan-almera-15-horn.aac',
  '/audio/traffic/182474__keweldog__car-horn.aac',
  '/audio/traffic/268809__hyderpotter__police-car-siren-in-traffic.aac',
  '/audio/traffic/349922__devern__car-horn-honk.aac',
  '/audio/traffic/435497__etcd_09__car-horn-honk.aac',
  '/audio/traffic/513527__g_m_d_three__truck_backing_up_04_14_2020_010.aac',
  '/audio/traffic/569613__wanaki__car-horn_irritated-driver-stuck-in-traffic.aac',
  '/audio/traffic/571348__99021905683__car-horn-honking.aac',
  '/audio/traffic/635681__laurenponder__bushorn_laurenpond.aac',
  '/audio/traffic/643125__iainmccurdy__car-horn-3-blasts-medium-short-long.aac',
  '/audio/traffic/658724__tlabrant1__sirens.aac',
  '/audio/traffic/708707__akahukas__car-013.aac',
  '/audio/traffic/716552__audiopapkin__ambulance-sirens.aac',
  '/audio/traffic/770985__jorgens__car_10.aac',
];

const buildingUrls = [
  '/audio/construction/118042__glamont__construction-site.aac',
  '/audio/construction/118972__esperri__chainsaw.aac',
  '/audio/construction/121531__cognito-perceptu__tracked-vehicle.aac',
  '/audio/construction/160045__jorickhoofd__metal-hit-with-metal-bar-resonance.aac',
  '/audio/construction/169127__fkurz__cutting_tree.aac',
  '/audio/construction/17012__cognito-perceptu__hammering-2.aac',
  '/audio/construction/17908__wim__hammering12.aac',
  '/audio/construction/22584__heigh-hoo__road_construction.aac',
  '/audio/construction/273722__lextrack__angle-grinder.aac',
  '/audio/construction/386239__ldezem__pneumatic-chipping-hammer-holman-nc4-start-1-short.aac',
  '/audio/construction/386300__ldezem__pneumatic-hammer-deprag-zn231-forging-4.aac',
  '/audio/construction/400991__inspectorj__construction-jackhammer-excavator-a.aac',
  '/audio/construction/40158__moxobna__crash.aac',
  '/audio/construction/50506__sparrer__crash.aac',
  '/audio/construction/592111__pablodavilla__hammer_2.aac',
  '/audio/construction/59263__rock-savage__crash-glass.aac',
  '/audio/construction/69891__costamonteiro__metro_under_construction.aac',
];

let audioBuffers = [];

let isPlaying = false;
let noiseType = 'white';
let scheduledTimeout = null;

// Grab elements and set up listeners
const backgroundAudio = document.querySelector('audio');
backgroundAudio.loop = true;

function startNoise() {
  if (isPlaying) {
    return;
  }

  if (!audioContext) {
    audioContext = new window.AudioContext();
  }

  if (!gainNode) {
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination)
  }

  gainNode.gain.value = 0;
  gainNode.gain.linearRampToValueAtTime(gainLevel, audioContext.currentTime + 1);

  buildNoiseType();

  document.querySelector(`#${noiseType}-icon`).classList.add('lcd-icon-pulsing');
  document.querySelector(`#play-icon`).classList.add('lcd-icon-on');

  navigator.mediaSession.playbackState = 'playing';
  navigator.mediaSession.setPositionState({
    duration: 1,
    playbackRate: 1,
    position: 1,
  });
  backgroundAudio.play();
  isPlaying = true;
}

function stopNoise() {
  if (!isPlaying) {
    return;
  }

  gainNode.gain.value = 0;
  destructNoiseType();

  document.querySelectorAll('.lcd-icon-pulsing').forEach(icon => icon.classList.remove('lcd-icon-pulsing'));
  document.querySelector(`#play-icon`).classList.remove('lcd-icon-on');

  backgroundAudio.pause();
  navigator.mediaSession.playbackState = 'paused';
  isPlaying = false;
}

function restartNoise() {
  if (isPlaying) {
    stopNoise();
    startNoise();
  }
}

function buildNoiseType() {
  destructNoiseType();

  switch (noiseType) {
    case 'white':
      createColouredNoise(whiteNoiseBuffer);
      break;
    case 'pink':
      createColouredNoise(pinkNoiseBuffer);
      break;
    case 'brown':
      createColouredNoise(brownNoiseBuffer);
      break;
    case 'screaming':
      createScreamingNoise();
      break;
    case 'traffic':
      createTrafficNoise();
      break;
    case 'building':
      createBuildingNoise();
      break;
    case 'beeping':
      createBeepingNoise();
      break;
    default:
      break;
  }
}

function createColouredNoise(createBufferFunction) {
  const bufferSize = audioContext.sampleRate * 10;
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  createBufferFunction(bufferSize, output);

  noiseNode = audioContext.createBufferSource();
  noiseNode.buffer = noiseBuffer;
  noiseNode.loop = true;
  noiseNode.connect(gainNode);
  noiseNode.start();
}

function whiteNoiseBuffer(bufferSize, output) {
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
}

function pinkNoiseBuffer(bufferSize, output) {
  let b0, b1, b2, b3, b4, b5, b6, white;
  b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;

  for (var i = 0; i < bufferSize; i++) {
    white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    output[i] *= 0.11; // (roughly) compensate for gain
    b6 = white * 0.115926;
  }
}

function brownNoiseBuffer(bufferSize, output) {
  let lastOut = 0.0;
  let white;

  for (var i = 0; i < bufferSize; i++) {
    white = Math.random() * 2 - 1;
    output[i] = (lastOut + (0.02 * white)) / 1.02;
    lastOut = output[i];
    output[i] *= 3.5; // (roughly) compensate for gain
  }
}

async function createScreamingNoise() {
  audioBuffers = [];
  await loadAudioBuffers(screamingUrls);
  scheduleNextAudioClip();
}

async function createTrafficNoise() {
  const bufferSize = audioContext.sampleRate * 10;
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  pinkNoiseBuffer(bufferSize, output);
  output.forEach((v, i) => {
    output[i] *= 1.5;
  });

  // Apply a low-pass filter to simulate low-frequency rumble
  const lowPassFilter = audioContext.createBiquadFilter();
  lowPassFilter.type = 'lowpass';
  lowPassFilter.frequency.value = 200; // Cutoff frequency for the low-pass filter

  noiseNode = audioContext.createBufferSource();
  noiseNode.buffer = noiseBuffer;
  noiseNode.loop = true;

  noiseNode.connect(lowPassFilter);
  lowPassFilter.connect(gainNode);

  noiseNode.start();

  audioBuffers = [];
  await loadAudioBuffers(trafficUrls);
  scheduleNextAudioClip();
}

async function createBuildingNoise() {
  audioBuffers = [];
  await loadAudioBuffers(buildingUrls);
  scheduleNextAudioClip();
}

let beepingTimeout = null;

function createBeepingNoise() {
  const beepingOscillator = audioContext.createOscillator();
  beepingOscillator.type = 'sine';
  beepingOscillator.frequency.value = 2400; // Base frequency

  const beepGainNode = audioContext.createGain();
  beepGainNode.gain.value = 0; // Start silent
  beepingOscillator.connect(beepGainNode);
  beepGainNode.connect(gainNode);

  beepingOscillator.start();
  
  const beepInterval = .2;
  const rampTime = 0.01;
  beepGainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + rampTime); // Ramp up quickly
  beepGainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + beepInterval); // Ramp down quickly
  
  beepingTimeout = setTimeout(() => {
    createBeepingNoise();
  }, beepInterval * 3000);
}

async function loadAudioBuffers(audioFileUrls) {
  const promises = audioFileUrls.map(async (url) => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error('Error loading audio file:', error);
      return null;
    }
  });

  const buffers = await Promise.all(promises);
  audioBuffers = buffers.filter(buffer => buffer !== null);
}

function scheduleNextAudioClip() {
  if (!isPlaying) {
    return;
  }
  playRandomAudioClip();
  const nextInterval = Math.random() * .5 + 1;
  scheduledTimeout = setTimeout(scheduleNextAudioClip, nextInterval * 1000);
}

let audioSources = [];

function playRandomAudioClip() {
  if (!audioContext || audioBuffers.length === 0) {
    return;
  }

  const randomIndex = Math.floor(Math.random() * audioBuffers.length);
  const audioBuffer = audioBuffers[randomIndex];

  const audioSource = audioContext.createBufferSource();
  audioSource.buffer = audioBuffer;

  audioSources.push(audioSource);
  audioSource.onended = () => {
    const index = audioSources.indexOf(audioSource);
    if (index > -1) {
      audioSources.splice(index, 1);
    }
  };
  audioSource.connect(gainNode);
  audioSource.start();
}

function destructNoiseType() {
  if (noiseNode) {
    noiseNode.stop();
    noiseNode.disconnect();
    noiseNode = null;
  }

  if (beepingTimeout) {
    clearTimeout(beepingTimeout);
    beepingTimeout = null;
  }

  if (scheduledTimeout) {
    clearTimeout(scheduledTimeout);
    scheduledTimeout = null;
  }

  audioSources.forEach((source) => {
    source.stop();
    source.disconnect();
  });
  audioSources = [];
  audioBuffers = [];
}

function setNoiseType(newNoiseType) {
  if (newNoiseType === noiseType) {
    return;
  }

  noiseType = newNoiseType;
  const title = newNoiseType.charAt(0).toUpperCase() + newNoiseType.slice(1);
  updateLcd(title);

  document.querySelectorAll('.lcd-icon-on').forEach(icon => icon.classList.remove('lcd-icon-on'));
  document.querySelectorAll(`#${noiseType}-icon`).forEach(icon => icon.classList.add('lcd-icon-on'));

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${title} noise`,
      artist: 'Modern noise machine',
      artwork: [
        { src: `img/${noiseType}.jpg`, sizes: '1024x1024', type: 'image/jpg' },
      ],
    });
  }
  restartNoise();
}

function updateLcd(newText) {
  const lcdOn = document.querySelector('.lcd-on');
  const lcdOff = document.querySelector('.lcd-off');
  lcdOff.textContent = newText;
  lcdOff.classList.add('lcd-on');
  lcdOff.classList.remove('lcd-off');
  lcdOn.classList.add('lcd-off');
  lcdOn.classList.remove('lcd-on');
}

document.querySelector('#play').addEventListener('click', () => startNoise());
document.querySelector('#pause').addEventListener('click', () => stopNoise());
document.querySelector('#white').addEventListener('click', () => setNoiseType('white'));
document.querySelector('#pink').addEventListener('click', () => setNoiseType('pink'));
document.querySelector('#brown').addEventListener('click', () => setNoiseType('brown'));
document.querySelector('#screaming').addEventListener('click', () => setNoiseType('screaming'));
document.querySelector('#building').addEventListener('click', () => setNoiseType('building'));
document.querySelector('#traffic').addEventListener('click', () => setNoiseType('traffic'));
document.querySelector('#beeping').addEventListener('click', () => setNoiseType('beeping'));
document.querySelector('#volume-slider').addEventListener('input', (ev) => {
  gainLevel = 2 - ev.target.value;
  if (isPlaying) {
    gainNode.gain.value = gainLevel;
  }
});

navigator.mediaSession.setActionHandler('play', () => startNoise());
navigator.mediaSession.setActionHandler('pause', () => stopNoise());
navigator.mediaSession.setActionHandler('stop', () => stopNoise());

setNoiseType(noiseType);