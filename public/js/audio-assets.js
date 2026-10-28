export const screamingUrls = [
  "/audio/screams/132106__sironboy__woman-scream.aac",
  "/audio/screams/13797__sweetneo85__wilhelm.aac",
  "/audio/screams/173088__vitouliss__screaming-into-the-microphone.aac",
  "/audio/screams/179320__jorickhoofd__male-scream-6.aac",
  "/audio/screams/220365__alsarcoli007__scream-01.aac",
  "/audio/screams/220369__alsarcoli007__scream-05.aac",
  "/audio/screams/220655__marionagm90__scream.aac",
  "/audio/screams/222586__queen_westeros__boy-scream.aac",
  "/audio/screams/235592__tcrocker68__girl_scream.aac",
  "/audio/screams/239900__thesubber13__scream-1.aac",
  "/audio/screams/253771__reitanna__dat-scream.aac",
  "/audio/screams/400183__tomattka__girl-screaming_01.aac",
  "/audio/screams/415352__owly-bee__screaming1.aac",
  "/audio/screams/416541__tonsil5__male_scream_5.aac",
  "/audio/screams/42847__freqman__psycho-scream-1.aac",
  "/audio/screams/457573__bluefairy311__screaming.aac",
  "/audio/screams/547961__klangkobold__panic-stricken-screaming-1.aac",
  "/audio/screams/747831__roryshea__paul-scream.aac",
  "/audio/screams/758591__demensdeum__scream.aac",
  "/audio/screams/759454__akridiy__a-single-scream-of-a-young-male.aac",
  "/audio/screams/767890__valerie-vivegnis__scream-woman-pain-4.aac",
  "/audio/screams/9703__lithe-fider__fl_scream-1.aac",
];

export const trafficUrls = [
  "/audio/traffic/106785__robinhood76__02229-car-claxons.aac",
  "/audio/traffic/164625__deleted_user_2104797__car_horn_short.aac",
  "/audio/traffic/164627__deleted_user_2104797__car_horn_long.aac",
  "/audio/traffic/176003__debsound__nissan-almera-15-horn.aac",
  "/audio/traffic/182474__keweldog__car-horn.aac",
  "/audio/traffic/268809__hyderpotter__police-car-siren-in-traffic.aac",
  "/audio/traffic/349922__devern__car-horn-honk.aac",
  "/audio/traffic/435497__etcd_09__car-horn-honk.aac",
  "/audio/traffic/513527__g_m_d_three__truck_backing_up_04_14_2020_010.aac",
  "/audio/traffic/569613__wanaki__car-horn_irritated-driver-stuck-in-traffic.aac",
  "/audio/traffic/571348__99021905683__car-horn-honking.aac",
  "/audio/traffic/635681__laurenponder__bushorn_laurenpond.aac",
  "/audio/traffic/643125__iainmccurdy__car-horn-3-blasts-medium-short-long.aac",
  "/audio/traffic/658724__tlabrant1__sirens.aac",
  "/audio/traffic/708707__akahukas__car-013.aac",
  "/audio/traffic/716552__audiopapkin__ambulance-sirens.aac",
  "/audio/traffic/770985__jorgens__car_10.aac",
];

export const buildingUrls = [
  "/audio/construction/118042__glamont__construction-site.aac",
  "/audio/construction/118972__esperri__chainsaw.aac",
  "/audio/construction/121531__cognito-perceptu__tracked-vehicle.aac",
  "/audio/construction/160045__jorickhoofd__metal-hit-with-metal-bar-resonance.aac",
  "/audio/construction/169127__fkurz__cutting_tree.aac",
  "/audio/construction/17012__cognito-perceptu__hammering-2.aac",
  "/audio/construction/17908__wim__hammering12.aac",
  "/audio/construction/22584__heigh-hoo__road_construction.aac",
  "/audio/construction/273722__lextrack__angle-grinder.aac",
  "/audio/construction/386239__ldezem__pneumatic-chipping-hammer-holman-nc4-start-1-short.aac",
  "/audio/construction/386300__ldezem__pneumatic-hammer-deprag-zn231-forging-4.aac",
  "/audio/construction/400991__inspectorj__construction-jackhammer-excavator-a.aac",
  "/audio/construction/40158__moxobna__crash.aac",
  "/audio/construction/50506__sparrer__crash.aac",
  "/audio/construction/592111__pablodavilla__hammer_2.aac",
  "/audio/construction/59263__rock-savage__crash-glass.aac",
  "/audio/construction/69891__costamonteiro__metro_under_construction.aac",
];

export const NOISE_MODES = new Map([
  [
    "white",
    {
      id: "white",
      title: "White",
      kind: "coloured",
      artwork: "/img/white.jpg",
    },
  ],
  [
    "pink",
    { id: "pink", title: "Pink", kind: "coloured", artwork: "/img/pink.jpg" },
  ],
  [
    "brown",
    {
      id: "brown",
      title: "Brown",
      kind: "coloured",
      artwork: "/img/brown.jpg",
    },
  ],
  [
    "screaming",
    {
      id: "screaming",
      title: "Screaming",
      kind: "sampled",
      urls: screamingUrls,
      artwork: "/img/screaming.jpg",
    },
  ],
  [
    "building",
    {
      id: "building",
      title: "Building",
      kind: "sampled",
      urls: buildingUrls,
      artwork: "/img/building.jpg",
    },
  ],
  [
    "traffic",
    {
      id: "traffic",
      title: "Traffic",
      kind: "traffic",
      urls: trafficUrls,
      artwork: "/img/traffic.jpg",
    },
  ],
  [
    "beeping",
    {
      id: "beeping",
      title: "Beeping",
      kind: "beeping",
      artwork: "/img/beeping.jpg",
    },
  ],
]);

export const NOISE_TYPES = Array.from(NOISE_MODES.keys());
