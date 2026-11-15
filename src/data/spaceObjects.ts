export type OrbitalRegime =
  | 'L1 / L2'
  | 'LEO / MEO / GEO'
  | 'Lunar & Solar'
  | 'Mars & Asteroids'
  | 'Outer & Interstellar';

export type MissionCategory =
  | 'Observatory'
  | 'Crewed Station'
  | 'Planetary Probe'
  | 'Rover & Orbiter'
  | 'Solar Probe'
  | 'Constellation';

export type AtlasScale = 'earth-l2' | 'inner-solar' | 'outer-solar';

export type SpacecraftModelType =
  | 'telescope-roman'
  | 'telescope-jwst'
  | 'telescope-hubble'
  | 'station-iss'
  | 'station-tiangong'
  | 'probe-voyager'
  | 'probe-solar'
  | 'rover-mars'
  | 'orbiter-standard';

export interface InstrumentSpec {
  name: string;
  role: string;
  detail: string;
}

export interface MissionMilestone {
  date: string;
  event: string;
}

export interface OrbitConfig {
  scale: AtlasScale;
  center: 'earth' | 'sun' | 'moon' | 'mars' | 'jupiter';
  radius: number;
  eccentricity: number;
  inclinationDeg: number;
  speed: number;
  initialAngle: number;
  color: string;
  modelType: SpacecraftModelType;
  isL2Halo?: boolean;
  isL1Halo?: boolean;
}

export interface KeplerianElements {
  periapsis: string;
  apoapsis: string;
  inclination: string;
  eccentricity: string;
  commsBand: string;
  oneWayLightTime: string;
}

export interface SpaceObject {
  id: string;
  name: string;
  shortName: string;
  agency: string;
  regime: OrbitalRegime;
  orbitLabel: string;
  category: MissionCategory;
  status: string;
  launchDate: string;
  launchVehicle: string;
  launchSite: string;
  distanceLabel: string;
  distanceKm: number;
  velocityKmS: number;
  orbitalPeriod: string;
  massKg: string;
  powerSource: string;
  featuredImage?: string;
  nasaEyesHash?: string;
  summary: string;
  whyItMatters: string;
  orbitExplanation: string;
  keplerianElements?: KeplerianElements;
  instruments: InstrumentSpec[];
  milestones: MissionMilestone[];
  orbitConfig: OrbitConfig;
}

export interface LiveStreamChannel {
  id: string;
  title: string;
  source: string;
  category: 'Live Video' | 'Live Telemetry' | 'Interactive 3D';
  embedUrl: string;
  externalUrl: string;
  description: string;
  notes: string;
}

export const LIVE_STREAMS: LiveStreamChannel[] = [
  {
    id: 'iss-hd-earth',
    title: 'ISS High-Definition Earth Viewing',
    source: 'NASA Official Stream',
    category: 'Live Video',
    embedUrl: 'https://www.youtube.com/embed/aba43qP2-zc?rel=0',
    externalUrl: 'https://www.youtube.com/watch?v=aba43qP2-zc',
    description:
      'Continuous live high-definition video from external cameras mounted on the International Space Station as it orbits 408 km above Earth.',
    notes:
      'During orbital night (45 minutes of every 90-minute orbit) or Tracking and Data Relay Satellite handoffs, the video feed may appear dark or display a NASA slate.',
  },
  {
    id: 'nasa-live',
    title: 'NASA Live Broadcast & Coverage',
    source: 'NASA+ / NASA TV',
    category: 'Live Video',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCLA_WYROkxy8SZDJn4z70A',
    externalUrl: 'https://plus.nasa.gov/',
    description:
      'Official NASA television broadcast featuring live rocket launches, spacewalks, mission briefings, and orbital science updates.',
    notes:
      'Automatically switches to active live NASA events; if no active live broadcast is airing, use NASA+ directly.',
  },
  {
    id: 'nasa-eyes-3d',
    title: 'NASA Eyes on the Solar System',
    source: 'NASA JPL Real-Time Visualization',
    category: 'Interactive 3D',
    embedUrl: 'https://eyes.nasa.gov/apps/solar-system/#/sc_roman_space_telescope?embed=true',
    externalUrl: 'https://eyes.nasa.gov/apps/solar-system/',
    description:
      'Live NASA JPL ephemeris visualization tracking active spacecraft positions in real time—including the Nancy Grace Roman Space Telescope, JWST, and Voyager.',
    notes:
      'Select any spacecraft from the target switcher above the player to jump NASA Eyes directly to that mission.',
  },
  {
    id: 'dsn-now',
    title: 'Deep Space Network (DSN Now)',
    source: 'NASA JPL Antenna Telemetry',
    category: 'Live Telemetry',
    embedUrl: 'https://eyes.nasa.gov/apps/dsn-now/index.html',
    externalUrl: 'https://eyes.nasa.gov/apps/dsn-now/index.html',
    description:
      'Real-time dish telemetry from Goldstone, Madrid, and Canberra showing which deep-space missions are actively transmitting or receiving commands right now.',
    notes:
      'Click any active 70-meter or 34-meter dish inside the frame to inspect carrier frequencies, round-trip light time, and data rates.',
  },
  {
    id: 'esa-live',
    title: 'ESA Official Mission Stream',
    source: 'European Space Agency',
    category: 'Live Video',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCIBu6UYWbW382l457o0_r8Q',
    externalUrl: 'https://www.youtube.com/@EuropeanSpaceAgency/live',
    description:
      'European Space Agency live mission broadcasts covering Euclid, JUICE, Ariane 6 operations, and Columbus laboratory activities.',
    notes:
      'Active during scheduled ESA press briefings, orbital maneuvers, and launch campaigns.',
  },
  {
    id: 'nsf-starbase',
    title: 'Starbase & Launch Pad Operations 24/7',
    source: 'NASASpaceflight',
    category: 'Live Video',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCtI0HBCSbKGwN0T_jCJmQrg',
    externalUrl: 'https://www.youtube.com/@NASASpaceflight/live',
    description:
      'Round-the-clock multi-camera coverage of orbital launch pads, booster static fires, and next-generation spacecraft integration.',
    notes:
      'Continuous 24/7 pad monitoring with live commentary during testing and launch windows.',
  },
];

export const SPACE_OBJECTS: SpaceObject[] = [
  {
    id: 'roman',
    name: 'Nancy Grace Roman Space Telescope',
    shortName: 'Roman',
    agency: 'NASA',
    regime: 'L1 / L2',
    orbitLabel: 'Sun-Earth L2 Halo Orbit',
    category: 'Observatory',
    status: 'Commissioning at L2',
    launchDate: 'August 30, 2026',
    launchVehicle: 'SpaceX Falcon Heavy',
    launchSite: 'Kennedy Space Center LC-39A',
    distanceLabel: '1.50M km',
    distanceKm: 1500000,
    velocityKmS: 1.02,
    orbitalPeriod: '~180 days (L2 Halo)',
    massKg: '4,166 kg',
    powerSource: 'Deployable Solar Arrays (4.2 kW)',
    featuredImage: '/src/assets/images/roman_telescope_l2_1794758744313.jpg',
    nasaEyesHash: 'sc_roman_space_telescope',
    summary:
      'NASA’s newest flagship infrared observatory featuring a 2.4-meter primary mirror with a panoramic field of view 200 times larger than Hubble’s infrared camera.',
    whyItMatters:
      'Roman is built to solve the mystery of dark energy, conduct the deepest wide-field exoplanet microlensing census ever attempted, and test starlight-blocking coronagraph technology needed for future Earth-like planet imaging.',
    orbitExplanation:
      'Following its August 30, 2026 Falcon Heavy launch, Roman executed a ~100-day cruise to a halo orbit around Sun-Earth L2—1.5 million km behind Earth relative to the Sun. At L2, Earth, Moon, and Sun stay in one direction so the telescope’s sunshade keeps its 300.8-megapixel detectors cryogenically stable.',
    instruments: [
      {
        name: 'Wide Field Instrument (WFI)',
        role: '300.8 MP Near-IR & Optical Camera',
        detail:
          '18 H4RG-10 mercury-cadmium-telluride detectors covering 0.281 square degrees per exposure across 0.48–2.30 micrometers.',
      },
      {
        name: 'Coronagraph Instrument (CGI)',
        role: 'High-Contrast Exoplanet Imaging Tech Demo',
        detail:
          'Uses deformable mirrors and precision masks to suppress host starlight by a factor of up to 100 million to directly image gas giants and dust disks.',
      },
    ],
    milestones: [
      { date: 'Aug 30, 2026', event: 'Launched aboard Falcon Heavy from LC-39A, Kennedy Space Center.' },
      { date: 'Sep 2026', event: 'Deployed solar wings, high-gain antenna, and aperture cover during L2 transfer.' },
      { date: 'Nov 2026', event: 'L2 halo insertion and precision optical alignment commissioning.' },
      { date: '2027+', event: 'Commences High-Latitude Wide-Area Survey and Galactic Bulge Time-Domain Survey.' },
    ],
    keplerianElements: {
      periapsis: '235,000 km (L2 Halo)',
      apoapsis: '800,000 km (L2 Halo)',
      inclination: '11.0° (Ecliptic Z)',
      eccentricity: '0.04 (Quasi-Periodic)',
      commsBand: 'Ka-band 25.9 GHz (500 Mbps) + S-band',
      oneWayLightTime: '5.00 s',
    },
    orbitConfig: {
      scale: 'earth-l2',
      center: 'earth',
      radius: 17.5,
      eccentricity: 0.04,
      inclinationDeg: 11,
      speed: 0.14,
      initialAngle: 0.45,
      color: '#06B6D4',
      modelType: 'telescope-roman',
      isL2Halo: true,
    },
  },
  {
    id: 'jwst',
    name: 'James Webb Space Telescope',
    shortName: 'JWST',
    agency: 'NASA · ESA · CSA',
    regime: 'L1 / L2',
    orbitLabel: 'Sun-Earth L2 Halo Orbit',
    category: 'Observatory',
    status: 'Science Operations',
    launchDate: 'December 25, 2021',
    launchVehicle: 'Ariane 5 ECA',
    launchSite: 'Guiana Space Centre ELA-3',
    distanceLabel: '1.51M km',
    distanceKm: 1510000,
    velocityKmS: 1.01,
    orbitalPeriod: '180 days (L2 Halo)',
    massKg: '6,161 kg',
    powerSource: 'Solar Array (2 kW)',
    featuredImage: '/src/assets/images/jwst_mirror_space_1794758745001.jpg',
    nasaEyesHash: 'sc_jwst',
    summary:
      'The largest optical/infrared telescope ever flown in space, using an unfolded 6.5-meter gold-coated beryllium mirror behind a tennis-court-sized sunshield.',
    whyItMatters:
      'JWST peers back to the Cosmic Dawn—observing the first galaxies formed less than 300 million years after the Big Bang—and resolves atmospheric chemistry on temperate exoplanets.',
    orbitExplanation:
      'Orbiting Sun-Earth L2 keeps the spacecraft outside Earth’s thermal shadow while allowing its five-layer Kapton sunshield to continuously block radiation from the Sun, Earth, and Moon, cooling MIRI to 6.7 Kelvin.',
    instruments: [
      {
        name: 'NIRCam & NIRSpec',
        role: 'Near-Infrared Imaging & Multi-Object Spectroscopy',
        detail: 'Captures 0.6–5.0 micron spectra for up to 100 galaxies simultaneously using microshutters.',
      },
      {
        name: 'MIRI',
        role: 'Mid-Infrared Instrument (5–28 microns)',
        detail: 'Actively cooled by a pulse-tube cryocooler to study protostellar disks, dust, and early active galactic nuclei.',
      },
      {
        name: 'FGS / NIRISS',
        role: 'Fine Guidance & Slitless Spectroscopy',
        detail: 'Maintains milliarcsecond pointing stability and performs exoplanet transmission spectroscopy.',
      },
    ],
    milestones: [
      { date: 'Dec 25, 2021', event: 'Precision Ariane 5 launch doubled expected propellant life beyond 20 years.' },
      { date: 'Jan 2022', event: 'Sunshield tensioned and all 18 primary mirror segments deployed at L2.' },
      { date: 'Jul 2022', event: 'First Deep Field and exoplanet atmospheric spectra released.' },
      { date: '2026', event: 'Cycle 5 deep-field cosmology and coordinated surveys alongside Roman.' },
    ],
    keplerianElements: {
      periapsis: '250,000 km (L2 Halo)',
      apoapsis: '832,000 km (L2 Halo)',
      inclination: '5.5° (Ecliptic)',
      eccentricity: '0.05 (Quasi-Periodic)',
      commsBand: 'Ka-band 25.9 GHz (28 Mbps) + S-band',
      oneWayLightTime: '5.04 s',
    },
    orbitConfig: {
      scale: 'earth-l2',
      center: 'earth',
      radius: 17.5,
      eccentricity: 0.05,
      inclinationDeg: -8,
      speed: 0.14,
      initialAngle: 2.35,
      color: '#F59E0B',
      modelType: 'telescope-jwst',
      isL2Halo: true,
    },
  },
  {
    id: 'iss',
    name: 'International Space Station',
    shortName: 'ISS',
    agency: 'NASA · Roscosmos · ESA · JAXA · CSA',
    regime: 'LEO / MEO / GEO',
    orbitLabel: 'Low Earth Orbit (408 km)',
    category: 'Crewed Station',
    status: 'Crewed Operations',
    launchDate: 'November 20, 1998',
    launchVehicle: 'Proton-K / Space Shuttle / Soyuz / Falcon 9',
    launchSite: 'Baikonur & Kennedy Space Center',
    distanceLabel: '408 km',
    distanceKm: 408,
    velocityKmS: 7.66,
    orbitalPeriod: '92.9 minutes',
    massKg: '419,725 kg',
    powerSource: '8 iROSA + Legacy Solar Arrays (240 kW)',
    featuredImage: '/src/assets/images/iss_earth_horizon_1794758745076.jpg',
    nasaEyesHash: 'sc_iss',
    summary:
      'Humanity’s flagship modular orbital laboratory continuously inhabited since November 2000, completing 16 sunrises and sunsets every 24 hours.',
    whyItMatters:
      'Tests closed-loop life support, microgravity materials science, human physiology for deep-space Artemis missions, and hosts external Earth-observing payloads.',
    orbitExplanation:
      'Inclined at 51.6 degrees to the equator so launch vehicles from both Baikonur and Cape Canaveral can reach it efficiently while passing over 90% of Earth’s populated surface.',
    instruments: [
      {
        name: 'Alpha Magnetic Spectrometer (AMS-02)',
        role: 'Cosmic Ray & Antimatter Particle Detector',
        detail: 'Measures high-energy cosmic rays to search for dark matter signatures and primordial antimatter.',
      },
      {
        name: 'Cold Atom Lab & Microgravity Racks',
        role: 'Quantum & Biomedical Research',
        detail: 'Produces Bose-Einstein condensates in microgravity and supports crystal growth and tissue printing.',
      },
    ],
    milestones: [
      { date: 'Nov 1998', event: 'Zarya functional cargo block placed into orbit.' },
      { date: 'Nov 2000', event: 'Expedition 1 began uninterrupted human presence in space.' },
      { date: '2021–2026', event: 'Roll-out Solar Arrays (iROSA) upgraded station electrical capacity.' },
    ],
    keplerianElements: {
      periapsis: '408 km alt (6,779 km)',
      apoapsis: '418 km alt (6,789 km)',
      inclination: '51.64°',
      eccentricity: '0.0007',
      commsBand: 'Ku/S-band via TDRS (600 Mbps)',
      oneWayLightTime: '1.4 ms',
    },
    orbitConfig: {
      scale: 'earth-l2',
      center: 'earth',
      radius: 5.2,
      eccentricity: 0.001,
      inclinationDeg: 51.6,
      speed: 0.72,
      initialAngle: 0.2,
      color: '#38BDF8',
      modelType: 'station-iss',
    },
  },
  {
    id: 'voyager-1',
    name: 'Voyager 1',
    shortName: 'Voyager 1',
    agency: 'NASA JPL',
    regime: 'Outer & Interstellar',
    orbitLabel: 'Interstellar Space (Hyperbolic Escape)',
    category: 'Planetary Probe',
    status: 'Active Interstellar Telemetry',
    launchDate: 'September 5, 1977',
    launchVehicle: 'Titan IIIE / Centaur',
    launchSite: 'Cape Canaveral LC-41',
    distanceLabel: '25.4B km (170.0 AU)',
    distanceKm: 25400000000,
    velocityKmS: 16.99,
    orbitalPeriod: 'Hyperbolic (Escaping Solar System)',
    massKg: '721.9 kg',
    powerSource: '3 Plutonium-238 RTGs (~218 W remaining)',
    featuredImage: '/src/assets/images/voyager_interstellar_probe_1794758745323.jpg',
    nasaEyesHash: 'sc_voyager_1',
    summary:
      'The farthest human-made object in existence, operating beyond the Sun’s heliopause inside the local interstellar medium nearly half a century after launch.',
    whyItMatters:
      'Voyager 1 provides the only direct in-situ measurements of interstellar plasma, cosmic rays, and magnetic fields outside the Sun’s protective bubble, while carrying the Voyager Golden Record.',
    orbitExplanation:
      'After gravity assists at Jupiter (1979) and Saturn (1980), Voyager 1’s trajectory angled 35.7 degrees north of the ecliptic plane, crossing the heliopause in August 2012.',
    keplerianElements: {
      periapsis: '1.00 AU (1977 Launch)',
      apoapsis: 'Unbound (v∞ = 16.6 km/s)',
      inclination: '35.7° N of Ecliptic',
      eccentricity: '1.26 (Hyperbolic)',
      commsBand: 'X-band 8.4 GHz (160 bps via 70m DSN)',
      oneWayLightTime: '23h 32m',
    },
    instruments: [
      {
        name: 'Plasma Wave Subsystem (PWS)',
        role: 'Interstellar Electron Density',
        detail: 'Detects electron plasma oscillations that pinpoint the density of interstellar gas.',
      },
      {
        name: 'Magnetometer & Cosmic Ray Subsystem',
        role: 'Galactic Magnetic Field & Particles',
        detail: 'Measures galactic cosmic rays shielded out from the inner solar system by the heliosphere.',
      },
    ],
    milestones: [
      { date: 'Sep 1977', event: 'Launched 16 days after Voyager 2 on a faster Grand Tour arc.' },
      { date: 'Feb 1990', event: 'Captured the iconic Pale Blue Dot portrait of Earth from 6 billion km.' },
      { date: 'Aug 2012', event: 'Crossed the heliopause into interstellar space.' },
      { date: '2024–2026', event: 'Flight data system restored; surpasses 170 AU transmitting X-band telemetry.' },
    ],
    orbitConfig: {
      scale: 'outer-solar',
      center: 'sun',
      radius: 39,
      eccentricity: 0.0,
      inclinationDeg: 35,
      speed: 0.02,
      initialAngle: 0.85,
      color: '#F59E0B',
      modelType: 'probe-voyager',
    },
  },
  {
    id: 'hubble',
    name: 'Hubble Space Telescope',
    shortName: 'Hubble',
    agency: 'NASA · ESA',
    regime: 'LEO / MEO / GEO',
    orbitLabel: 'Low Earth Orbit (535 km)',
    category: 'Observatory',
    status: 'Science Operations',
    launchDate: 'April 24, 1990',
    launchVehicle: 'Space Shuttle Discovery (STS-31)',
    launchSite: 'Kennedy Space Center LC-39B',
    distanceLabel: '535 km',
    distanceKm: 535,
    velocityKmS: 7.59,
    orbitalPeriod: '95.4 minutes',
    massKg: '11,110 kg',
    powerSource: 'Solar Arrays (2.8 kW)',
    featuredImage: '/src/assets/images/hubble_earth_limb_1794767567005.jpg',
    nasaEyesHash: 'sc_hubble_space_telescope',
    summary:
      'Over 36 years in orbit, Hubble remains humanity’s premier ultraviolet and visible-light observatory, working in tandem with JWST and Roman.',
    whyItMatters:
      'Unique ultraviolet sensitivity—unreachable from the ground or by JWST/Roman—makes Hubble indispensable for studying star formation, exoplanet atmospheric escape, and active galaxies.',
    orbitExplanation:
      'Circles Earth in a nearly circular 28.5-degree inclined orbit at ~535 km altitude; operating in reduced-gyro mode since 2024 to extend science life well into the late 2020s.',
    instruments: [
      {
        name: 'Wide Field Camera 3 (WFC3)',
        role: 'UV, Visible & Near-IR Imaging',
        detail: 'Provides high-resolution panchromatic imaging across 200–1700 nm.',
      },
      {
        name: 'Cosmic Origins Spectrograph (COS)',
        role: 'Ultraviolet Spectroscopy',
        detail: 'Maps the cosmic web and intergalactic medium via faint quasar UV absorption lines.',
      },
    ],
    milestones: [
      { date: 'Apr 1990', event: 'Deployed into orbit by Space Shuttle Discovery.' },
      { date: '1993–2009', event: 'Upgraded across five Space Shuttle servicing missions.' },
      { date: '2024–2026', event: 'Transitioned to one-gyro precision pointing for coordinated Roman/JWST campaigns.' },
    ],
    keplerianElements: {
      periapsis: '522 km alt',
      apoapsis: '526 km alt',
      inclination: '28.47°',
      eccentricity: '0.00028',
      commsBand: 'S-band 2.28 GHz via TDRS (1 Mbps)',
      oneWayLightTime: '1.8 ms',
    },
    orbitConfig: {
      scale: 'earth-l2',
      center: 'earth',
      radius: 5.8,
      eccentricity: 0.002,
      inclinationDeg: 28.5,
      speed: 0.65,
      initialAngle: 2.1,
      color: '#60A5FA',
      modelType: 'telescope-hubble',
    },
  },
  {
    id: 'tiangong',
    name: 'Tiangong Space Station',
    shortName: 'Tiangong',
    agency: 'CMSA',
    regime: 'LEO / MEO / GEO',
    orbitLabel: 'Low Earth Orbit (390 km)',
    category: 'Crewed Station',
    status: 'Crewed Operations',
    launchDate: 'April 29, 2021',
    launchVehicle: 'Long March 5B',
    launchSite: 'Wenchang Space Launch Site',
    distanceLabel: '390 km',
    distanceKm: 390,
    velocityKmS: 7.68,
    orbitalPeriod: '92.3 minutes',
    massKg: '100,000 kg',
    powerSource: 'Flexible Gallium-Arsenide Solar Wings',
    summary:
      'China’s T-shaped permanently crewed orbital laboratory comprising the Tianhe core module alongside the Wentian and Mengtian science modules.',
    whyItMatters:
      'Supports continuous 3-person (and 6-person handover) crews conducting fluid physics, combustion, regenerative ecology, and space medicine research.',
    orbitExplanation:
      'Operates at 41.5-degree orbital inclination between 380 and 400 km altitude, regularly resupplied by Tianzhou cargo craft and Shenzhou crewed spacecraft.',
    instruments: [
      {
        name: 'Mengtian & Wentian Science Racks',
        role: 'Microgravity & Optical Atomic Clocks',
        detail: 'Houses cold-atom optical clocks, high-temperature furnaces, and external exposure payloads.',
      },
    ],
    milestones: [
      { date: 'Apr 2021', event: 'Tianhe core module launched into LEO.' },
      { date: 'Nov 2022', event: 'T-shaped three-module configuration completed.' },
      { date: '2026', event: 'Continuous rotating Shenzhou crewed expeditions.' },
    ],
    keplerianElements: {
      periapsis: '389 km alt',
      apoapsis: '394 km alt',
      inclination: '41.47°',
      eccentricity: '0.0005',
      commsBand: 'Ka/S-band via Tianlian Relay',
      oneWayLightTime: '1.3 ms',
    },
    orbitConfig: {
      scale: 'earth-l2',
      center: 'earth',
      radius: 5.0,
      eccentricity: 0.001,
      inclinationDeg: 41.5,
      speed: 0.76,
      initialAngle: 3.9,
      color: '#F43F5E',
      modelType: 'station-tiangong',
    },
  },
  {
    id: 'euclid',
    name: 'Euclid Space Telescope',
    shortName: 'Euclid',
    agency: 'ESA · NASA',
    regime: 'L1 / L2',
    orbitLabel: 'Sun-Earth L2 Lissajous Orbit',
    category: 'Observatory',
    status: '6-Year Cosmic Survey',
    launchDate: 'July 1, 2023',
    launchVehicle: 'SpaceX Falcon 9',
    launchSite: 'Cape Canaveral SLC-40',
    distanceLabel: '1.50M km',
    distanceKm: 1500000,
    velocityKmS: 1.02,
    orbitalPeriod: '180 days (L2)',
    massKg: '2,100 kg',
    powerSource: 'Sunshield Solar Array',
    nasaEyesHash: 'sc_euclid',
    summary:
      'ESA’s wide-angle dark-universe surveyor mapping one-third of the entire sky to trace how dark energy and dark matter shaped cosmic structure over 10 billion years.',
    whyItMatters:
      'Measures weak gravitational lensing shapes of 1.5 billion galaxies to test Einstein’s general relativity at cosmological scales.',
    orbitExplanation:
      'Shares the Sun-Earth L2 Lagrange region with Roman and JWST, keeping Earth and the Sun behind its thermal sunshield for ultra-stable wide-field imaging.',
    instruments: [
      {
        name: 'VIS (Visible Instrument)',
        role: '600-Megapixel Shape Imager',
        detail: 'Measures subtle galaxy distortions caused by intervening dark matter filaments.',
      },
      {
        name: 'NISP',
        role: 'Near-Infrared Spectrometer & Photometer',
        detail: 'Determines exact galaxy redshifts to reconstruct 3D baryon acoustic oscillations.',
      },
    ],
    milestones: [
      { date: 'Jul 2023', event: 'Launched aboard Falcon 9 to Sun-Earth L2.' },
      { date: 'May 2024', event: 'Released Early Release Observations of galaxy clusters and nurseries.' },
      { date: '2026', event: 'Deepening multi-terabyte wide-sky survey catalog.' },
    ],
    keplerianElements: {
      periapsis: '420,000 km (L2 Loop)',
      apoapsis: '780,000 km (L2 Loop)',
      inclination: '18.0°',
      eccentricity: '0.04 (Halo)',
      commsBand: 'K-band 26 GHz (75 Mbps) + X-band',
      oneWayLightTime: '5.00 s',
    },
    orbitConfig: {
      scale: 'earth-l2',
      center: 'earth',
      radius: 17.5,
      eccentricity: 0.04,
      inclinationDeg: 18,
      speed: 0.14,
      initialAngle: 4.1,
      color: '#3B82F6',
      modelType: 'telescope-roman',
      isL2Halo: true,
    },
  },
  {
    id: 'gaia',
    name: 'Gaia Astrometry Observatory',
    shortName: 'Gaia',
    agency: 'ESA',
    regime: 'L1 / L2',
    orbitLabel: 'Sun-Earth L2 Lissajous',
    category: 'Observatory',
    status: 'Retired to Heliocentric Archive (2025)',
    launchDate: 'December 19, 2013',
    launchVehicle: 'Soyuz-STB / Fregat',
    launchSite: 'Guiana Space Centre',
    distanceLabel: '1.50M+ km (Heliocentric Drift)',
    distanceKm: 1500000,
    velocityKmS: 1.0,
    orbitalPeriod: '180 days (L2 Legacy)',
    massKg: '2,029 kg',
    powerSource: 'Deployable Sunshield Solar Array',
    summary:
      'ESA’s precision galactic cartographer that built the largest, most accurate 3D map of nearly two billion stars in the Milky Way before passivation in 2025.',
    whyItMatters:
      'Microarcsecond parallax and radial-velocity data revealed ancient Milky Way galactic mergers, stellar black holes, and asteroid orbits—with Data Release 4/5 continuing through 2030.',
    orbitExplanation:
      'Operated for 11 years in a Lissajous orbit around Sun-Earth L2 before executing its end-of-mission disposal burn into a stable heliocentric orbit in March 2025.',
    keplerianElements: {
      periapsis: '1.01 AU (Post-L2 Disposal)',
      apoapsis: '1.03 AU',
      inclination: '16.0° (L2 Legacy)',
      eccentricity: '0.03',
      commsBand: 'X-band 8.4 GHz (Archived Telemetry)',
      oneWayLightTime: '5.0 s (L2 Reference)',
    },
    instruments: [
      {
        name: 'Twin 1.45m Silicon Carbide Telescopes',
        role: '1-Gigapixel Focal Plane Astrometry',
        detail: '106 CCD detectors measuring angular separations separated by a fixed 106.5-degree basic angle.',
      },
    ],
    milestones: [
      { date: 'Dec 2013', event: 'Launched to Sun-Earth L2.' },
      { date: 'Jun 2022', event: 'Data Release 3 mapped 1.8 billion Milky Way stars.' },
      { date: 'Mar 2025', event: 'Completed sky scanning and retired safely into a heliocentric disposal orbit.' },
    ],
    orbitConfig: {
      scale: 'earth-l2',
      center: 'earth',
      radius: 17.5,
      eccentricity: 0.03,
      inclinationDeg: -16,
      speed: 0.14,
      initialAngle: 5.4,
      color: '#818CF8',
      modelType: 'orbiter-standard',
      isL2Halo: true,
    },
  },
  {
    id: 'chandra',
    name: 'Chandra X-ray Observatory',
    shortName: 'Chandra',
    agency: 'NASA',
    regime: 'LEO / MEO / GEO',
    orbitLabel: 'High Elliptical Orbit (16,000 × 133,000 km)',
    category: 'Observatory',
    status: 'Science Operations',
    launchDate: 'July 23, 1999',
    launchVehicle: 'Space Shuttle Columbia (STS-93)',
    launchSite: 'Kennedy Space Center LC-39B',
    distanceLabel: '88,000 km (avg)',
    distanceKm: 88000,
    velocityKmS: 2.1,
    orbitalPeriod: '64.2 hours',
    massKg: '4,790 kg',
    powerSource: 'Solar Arrays (2.35 kW)',
    featuredImage: '/src/assets/images/hubble_earth_limb_1794767567005.jpg',
    nasaEyesHash: 'sc_chandra_x-ray_observatory',
    summary:
      'NASA’s Great Observatory for high-energy X-ray astrophysics, resolving supermassive black hole jets, supernova remnants, and hot galaxy-cluster gas.',
    whyItMatters:
      'Chandra’s sub-arcsecond X-ray mirrors remain unmatched in angular resolution, catching relativistic matter spiraling into black holes.',
    orbitExplanation:
      'A highly eccentric 64-hour orbit carries Chandra more than one-third of the way to the Moon, keeping it above Earth’s Van Allen radiation belts for 85% of each orbit.',
    instruments: [
      {
        name: 'ACIS & HRC',
        role: 'X-ray Imaging Spectrometers',
        detail: 'Grazing-incidence iridium-coated nested mirrors focus 0.1–10 keV X-ray photons.',
      },
    ],
    milestones: [
      { date: 'Jul 1999', event: 'Deployed from Columbia—heaviest payload ever carried by a Space Shuttle.' },
      { date: '2026', event: 'Over 27 years of active X-ray discovery.' },
    ],
    keplerianElements: {
      periapsis: '16,000 km alt (Evolving)',
      apoapsis: '133,000 km alt',
      inclination: '28.5° (Precessing)',
      eccentricity: '0.72',
      commsBand: 'S-band 2.25 GHz (1 Mbps via DSN)',
      oneWayLightTime: '0.30 s',
    },
    orbitConfig: {
      scale: 'earth-l2',
      center: 'earth',
      radius: 10.5,
      eccentricity: 0.55,
      inclinationDeg: 35,
      speed: 0.25,
      initialAngle: 1.2,
      color: '#A78BFA',
      modelType: 'telescope-hubble',
    },
  },
  {
    id: 'tess',
    name: 'Transiting Exoplanet Survey Satellite',
    shortName: 'TESS',
    agency: 'NASA · MIT',
    regime: 'LEO / MEO / GEO',
    orbitLabel: '2:1 Lunar Resonant High Earth Orbit',
    category: 'Observatory',
    status: 'Extended All-Sky Survey',
    launchDate: 'April 18, 2018',
    launchVehicle: 'SpaceX Falcon 9',
    launchSite: 'Cape Canaveral SLC-40',
    distanceLabel: '240,000 km (avg)',
    distanceKm: 240000,
    velocityKmS: 1.4,
    orbitalPeriod: '13.7 days',
    massKg: '362 kg',
    powerSource: 'Twin Solar Arrays (433 W)',
    nasaEyesHash: 'sc_tess',
    summary:
      'All-sky exoplanet hunter monitoring hundreds of thousands of bright nearby stars for tiny periodic dips in brightness caused by transiting planets.',
    whyItMatters:
      'Identifies the prime nearby exoplanet targets for atmospheric follow-up by JWST and Roman.',
    orbitExplanation:
      'Uses an unprecedented 2:1 lunar-resonant P/2 orbit ranging from 108,000 km to 375,000 km—gravitationally stabilized by the Moon for decades without station-keeping burns.',
    instruments: [
      {
        name: 'Four Wide-Field Optical Cameras',
        role: '24° × 96° Strip Photometry',
        detail: 'Each camera uses four back-illuminated MIT Lincoln Lab CCDs.',
      },
    ],
    milestones: [
      { date: 'Apr 2018', event: 'Inserted into 2:1 lunar-resonant orbit via lunar flyby.' },
      { date: '2026', event: 'Cataloged 7,000+ candidate exoplanets and 500+ confirmed worlds.' },
    ],
    keplerianElements: {
      periapsis: '108,000 km alt',
      apoapsis: '375,000 km alt',
      inclination: '37.0° (2:1 Lunar Resonant)',
      eccentricity: '0.55',
      commsBand: 'Ka-band (100 Mbps) + S-band',
      oneWayLightTime: '0.80 s',
    },
    orbitConfig: {
      scale: 'earth-l2',
      center: 'earth',
      radius: 12.8,
      eccentricity: 0.42,
      inclinationDeg: 37,
      speed: 0.19,
      initialAngle: 4.8,
      color: '#2DD4BF',
      modelType: 'orbiter-standard',
    },
  },
  {
    id: 'soho',
    name: 'SOHO (Solar & Heliospheric Observatory)',
    shortName: 'SOHO',
    agency: 'ESA · NASA',
    regime: 'L1 / L2',
    orbitLabel: 'Sun-Earth L1 Halo Orbit',
    category: 'Solar Probe',
    status: 'Space Weather Sentinel',
    launchDate: 'December 2, 1995',
    launchVehicle: 'Atlas IIAS',
    launchSite: 'Cape Canaveral LC-36B',
    distanceLabel: '1.50M km (Sunward)',
    distanceKm: 1500000,
    velocityKmS: 1.0,
    orbitalPeriod: '178 days (L1 Halo)',
    massKg: '1,850 kg',
    powerSource: 'Solar Panels (1.5 kW)',
    nasaEyesHash: 'sc_soho',
    summary:
      'Iconic 31-year solar sentinel stationed between Earth and the Sun at L1, monitoring coronal mass ejections and having discovered over 5,000 sungrazing comets.',
    whyItMatters:
      'Provides critical early warning of Earth-directed solar storms that affect satellites, power grids, and astronauts.',
    orbitExplanation:
      'Orbits Sun-Earth L1 1.5 million km sunward of Earth, giving an uninterrupted 24/7 view of the Sun’s disk and outer corona.',
    instruments: [
      {
        name: 'LASCO C2 / C3 Coronagraphs',
        role: 'Artificial Eclipse Corona Imaging',
        detail: 'Blocks the solar disk to image Earth-directed coronal mass ejections out to 30 solar radii.',
      },
    ],
    milestones: [
      { date: 'Dec 1995', event: 'Launched to Sun-Earth L1.' },
      { date: 'Mar 2024', event: 'Surpassed 5,000 comet discoveries.' },
    ],
    keplerianElements: {
      periapsis: '0.985 AU (L1 Halo)',
      apoapsis: '0.995 AU (L1 Halo)',
      inclination: '9.0° (Halo Out-of-Plane)',
      eccentricity: '0.03',
      commsBand: 'S-band 2.2 GHz (240 kbps via DSN)',
      oneWayLightTime: '4.98 s',
    },
    orbitConfig: {
      scale: 'earth-l2',
      center: 'earth',
      radius: 16.5,
      eccentricity: 0.03,
      inclinationDeg: 9,
      speed: 0.14,
      initialAngle: 0.2,
      color: '#FBBF24',
      modelType: 'orbiter-standard',
      isL1Halo: true,
    },
  },
  {
    id: 'goes-east',
    name: 'GOES-East (GOES-16 / GOES-19)',
    shortName: 'GOES-East',
    agency: 'NOAA · NASA',
    regime: 'LEO / MEO / GEO',
    orbitLabel: 'Geostationary Orbit (35,786 km)',
    category: 'Constellation',
    status: 'Operational Weather Watch',
    launchDate: 'June 25, 2024 (GOES-19)',
    launchVehicle: 'SpaceX Falcon Heavy',
    launchSite: 'Kennedy Space Center LC-39A',
    distanceLabel: '35,786 km',
    distanceKm: 35786,
    velocityKmS: 3.07,
    orbitalPeriod: '23h 56m (Geostationary)',
    massKg: '5,192 kg',
    powerSource: 'Single-Wing Solar Array (3.6 kW)',
    summary:
      'Geostationary weather and space-weather observatory stationed at 75.2° West, continuously imaging hurricanes, severe storms, wildfires, and solar flares.',
    whyItMatters:
      'Provides 30-second rapid-scan storm tracking and real-time lightning mapping across the Americas and Atlantic Ocean.',
    orbitExplanation:
      'Circles Earth above the equator at 35,786 km—matching Earth’s rotation period so the satellite hovers permanently over the same longitude.',
    instruments: [
      {
        name: 'ABI (Advanced Baseline Imager)',
        role: '16-Band Weather & Climate Radiometer',
        detail: 'Scans the Western Hemisphere every 10 minutes and mesoscale storm sectors every 30 seconds.',
      },
      {
        name: 'CCOR-1 Compact Coronagraph',
        role: 'Operational CME Space Weather Monitor',
        detail: 'First operational coronagraph flying on a geostationary weather satellite.',
      },
    ],
    milestones: [
      { date: 'Jun 2024', event: 'GOES-19 launched on Falcon Heavy to replace GOES-16 at GOES-East.' },
      { date: '2025–2026', event: 'Assumed operational GOES-East 75.2° W duties.' },
    ],
    keplerianElements: {
      periapsis: '35,786 km alt (75.2° W)',
      apoapsis: '35,786 km alt',
      inclination: '0.05° (Geostationary)',
      eccentricity: '0.0001',
      commsBand: 'X-band GRB / L-band (150 Mbps)',
      oneWayLightTime: '0.12 s',
    },
    orbitConfig: {
      scale: 'earth-l2',
      center: 'earth',
      radius: 8.6,
      eccentricity: 0.0,
      inclinationDeg: 0.1,
      speed: 0.34,
      initialAngle: 5.1,
      color: '#22D3EE',
      modelType: 'orbiter-standard',
    },
  },
  {
    id: 'starlink',
    name: 'Starlink Broadband Constellation',
    shortName: 'Starlink Fleet',
    agency: 'SpaceX',
    regime: 'LEO / MEO / GEO',
    orbitLabel: 'LEO Shells (540–570 km)',
    category: 'Constellation',
    status: '6,700+ Active Satellites',
    launchDate: 'May 2019 – Ongoing',
    launchVehicle: 'Falcon 9',
    launchSite: 'Cape Canaveral & Vandenberg',
    distanceLabel: '550 km',
    distanceKm: 550,
    velocityKmS: 7.58,
    orbitalPeriod: '95.6 minutes',
    massKg: '260–800 kg per satellite',
    powerSource: 'Single Solar Array + Krypton/Argon Hall Thrusters',
    summary:
      'The largest satellite constellation in history—thousands of optical-interlink LEO satellites delivering low-latency global broadband across land, sea, and aviation.',
    whyItMatters:
      'Reshaped orbital traffic management and demonstrated mass satellite manufacturing with autonomous collision-avoidance maneuvering.',
    orbitExplanation:
      'Distributed across multiple inclined Walker-Delta shells near 550 km altitude; satellites de-orbit naturally via atmospheric drag within 5 years at end-of-life.',
    instruments: [
      {
        name: 'Phased-Array Ku/Ka Antennas & Laser Links',
        role: 'High-Throughput Optical Mesh',
        detail: 'Inter-satellite laser links route terabits per second directly in vacuum without ground hops.',
      },
    ],
    milestones: [
      { date: 'May 2019', event: 'First operational 60-satellite batch deployed.' },
      { date: '2024–2026', event: 'Direct-to-Cell and V2 Mini laser-linked constellation expanded worldwide.' },
    ],
    keplerianElements: {
      periapsis: '540 km alt (Main Shell)',
      apoapsis: '570 km alt',
      inclination: '53.2° / 43.0° / 70.0°',
      eccentricity: '0.0002',
      commsBand: 'Ku/Ka/E-band + Optical Laser ISL',
      oneWayLightTime: '1.8 ms',
    },
    orbitConfig: {
      scale: 'earth-l2',
      center: 'earth',
      radius: 6.1,
      eccentricity: 0.0,
      inclinationDeg: 53,
      speed: 0.62,
      initialAngle: 1.0,
      color: '#94A3B8',
      modelType: 'orbiter-standard',
    },
  },
  {
    id: 'gps',
    name: 'GPS III / Navstar Constellation',
    shortName: 'GPS Fleet',
    agency: 'U.S. Space Force',
    regime: 'LEO / MEO / GEO',
    orbitLabel: 'Medium Earth Orbit (20,200 km)',
    category: 'Constellation',
    status: '31 Operational Satellites',
    launchDate: '1978 – Ongoing (GPS III)',
    launchVehicle: 'Falcon 9 / Vulcan / Delta IV',
    launchSite: 'Cape Canaveral',
    distanceLabel: '20,200 km',
    distanceKm: 20200,
    velocityKmS: 3.87,
    orbitalPeriod: '11h 58m',
    massKg: '2,161 kg (GPS III)',
    powerSource: 'Dual Solar Arrays + Rubidium/Cesium Atomic Clocks',
    summary:
      'Medium Earth Orbit positioning, navigation, and timing network providing nanosecond-level synchronization for global aviation, finance, science, and smartphones.',
    whyItMatters:
      'Demonstrates Einstein’s special and general relativity daily—onboard atomic clocks must be calibrated by 38 microseconds per day to remain accurate.',
    orbitExplanation:
      'Six orbital planes inclined at 55 degrees at 20,200 km altitude ensure at least four satellites are visible simultaneously from any point on Earth.',
    instruments: [
      {
        name: 'Rubidium Atomic Frequency Standards',
        role: 'Picosecond Orbital Timekeeping',
        detail: 'Broadcasts L1, L2, and L5 civil navigation signals with 3x higher accuracy on GPS III.',
      },
    ],
    milestones: [
      { date: '1995', event: 'Full Operational Capability declared.' },
      { date: '2018–2026', event: 'Next-generation GPS III satellites deployed with L1C signal.' },
    ],
    keplerianElements: {
      periapsis: '20,180 km alt (MEO)',
      apoapsis: '20,200 km alt',
      inclination: '55.0° (6 Planes)',
      eccentricity: '0.002',
      commsBand: 'L1 / L2 / L5 L-Band Navigation',
      oneWayLightTime: '67 ms',
    },
    orbitConfig: {
      scale: 'earth-l2',
      center: 'earth',
      radius: 7.4,
      eccentricity: 0.0,
      inclinationDeg: 55,
      speed: 0.44,
      initialAngle: 2.9,
      color: '#34D399',
      modelType: 'orbiter-standard',
    },
  },
  {
    id: 'landsat-9',
    name: 'Landsat 9',
    shortName: 'Landsat 9',
    agency: 'NASA · USGS',
    regime: 'LEO / MEO / GEO',
    orbitLabel: 'Sun-Synchronous LEO (705 km)',
    category: 'Observatory',
    status: 'Earth Observation Operations',
    launchDate: 'September 27, 2021',
    launchVehicle: 'Atlas V 401',
    launchSite: 'Vandenberg Space Force Base SLC-3E',
    distanceLabel: '705 km',
    distanceKm: 705,
    velocityKmS: 7.5,
    orbitalPeriod: '98.9 minutes',
    massKg: '2,711 kg',
    powerSource: 'Deployable Solar Array',
    nasaEyesHash: 'sc_landsat_9',
    summary:
      'Continuing an unbroken 54-year environmental record of Earth’s forests, glaciers, coastlines, and agricultural water consumption.',
    whyItMatters:
      'Pairs with Landsat 8 to image the entire planetary landmass every 8 days in 11 spectral and thermal bands.',
    orbitExplanation:
      'A 98.2-degree retrograde sun-synchronous orbit guarantees the satellite crosses the equator at the exact same local solar time (10:00 AM) each pass for consistent shadows.',
    instruments: [
      {
        name: 'OLI-2 & TIRS-2',
        role: 'Optical & Thermal Infrared Imagers',
        detail: 'Captures 14-bit radiometric resolution across coastal aerosol, SWIR, and two thermal bands.',
      },
    ],
    milestones: [
      { date: 'Sep 2021', event: 'Launched from Vandenberg into polar sun-synchronous orbit.' },
      { date: '2026', event: 'Sustaining global open-data climate and agricultural telemetry.' },
    ],
    keplerianElements: {
      periapsis: '705 km alt (SSO)',
      apoapsis: '706 km alt',
      inclination: '98.2° (Retrograde)',
      eccentricity: '0.0001',
      commsBand: 'X-band 8.2 GHz (384 Mbps) + S-band',
      oneWayLightTime: '2.4 ms',
    },
    orbitConfig: {
      scale: 'earth-l2',
      center: 'earth',
      radius: 6.4,
      eccentricity: 0.0,
      inclinationDeg: 98.2,
      speed: 0.56,
      initialAngle: 4.4,
      color: '#10B981',
      modelType: 'orbiter-standard',
    },
  },
  {
    id: 'lro',
    name: 'Lunar Reconnaissance Orbiter',
    shortName: 'LRO',
    agency: 'NASA',
    regime: 'Lunar & Solar',
    orbitLabel: 'Lunar Polar Orbit (50 km avg)',
    category: 'Planetary Probe',
    status: 'Artemis Site Mapping',
    launchDate: 'June 18, 2009',
    launchVehicle: 'Atlas V 401',
    launchSite: 'Cape Canaveral SLC-41',
    distanceLabel: '384,400 km',
    distanceKm: 384400,
    velocityKmS: 1.68,
    orbitalPeriod: '113 minutes (around Moon)',
    massKg: '1,916 kg',
    powerSource: 'Solar Array (800 W)',
    featuredImage: '/src/assets/images/artemis_orion_moon_1794767565804.jpg',
    nasaEyesHash: 'sc_lro',
    summary:
      'NASA’s 17-year lunar cartographer still orbiting the Moon, providing sub-meter imagery of permanently shadowed polar craters and Artemis landing zones.',
    whyItMatters:
      'Confirmed lunar polar water-ice signatures and imaged historic Apollo sites plus recent commercial and international lunar landers.',
    orbitExplanation:
      'Occupies a fuel-efficient quasi-frozen elliptical polar orbit around the Moon passing low over the lunar South Pole.',
    instruments: [
      {
        name: 'LROC (Lunar Reconnaissance Orbiter Camera)',
        role: '0.5-Meter Narrow-Angle Imager',
        detail: 'Maps boulders, crater slopes, and landing hazards for crewed Artemis landings.',
      },
      {
        name: 'LOLA Laser Altimeter',
        role: '3D Topographic Mapping',
        detail: 'Fires five laser pulses simultaneously to measure lunar elevation down to 10 cm.',
      },
    ],
    milestones: [
      { date: 'Jun 2009', event: 'Entered lunar orbit to begin high-resolution cartography.' },
      { date: '2023–2026', event: 'Primary reconnaissance asset supporting Artemis South Pole planning.' },
    ],
    keplerianElements: {
      periapsis: '50 km (Lunar South Pole)',
      apoapsis: '165 km (Lunar Polar)',
      inclination: '89.2°',
      eccentricity: '0.032',
      commsBand: 'Ka-band (100 Mbps) + S-band',
      oneWayLightTime: '1.28 s',
    },
    orbitConfig: {
      scale: 'earth-l2',
      center: 'moon',
      radius: 2.0,
      eccentricity: 0.08,
      inclinationDeg: 89,
      speed: 1.25,
      initialAngle: 0.6,
      color: '#E2E8F0',
      modelType: 'orbiter-standard',
    },
  },
  {
    id: 'parker-solar-probe',
    name: 'Parker Solar Probe',
    shortName: 'Parker Solar',
    agency: 'NASA · JHUAPL',
    regime: 'Lunar & Solar',
    orbitLabel: 'Eccentric Solar Corona Orbit',
    category: 'Solar Probe',
    status: 'Perihelion Science Passes',
    launchDate: 'August 12, 2018',
    launchVehicle: 'Delta IV Heavy',
    launchSite: 'Cape Canaveral SLC-37B',
    distanceLabel: '0.046 AU (at perihelion)',
    distanceKm: 6160000,
    velocityKmS: 191.7,
    orbitalPeriod: '88 days',
    massKg: '685 kg',
    powerSource: 'Liquid-Cooled Retractable Solar Arrays',
    nasaEyesHash: 'sc_parker_solar_probe',
    summary:
      'The fastest spacecraft ever built—plunging directly through the Sun’s million-degree corona at 690,000 km/h behind a 11.4-cm carbon-composite heat shield.',
    whyItMatters:
      'Solved how magnetic switchbacks accelerate the solar wind and directly sampled coronal plasma only 6.1 million km above the Sun’s photosphere.',
    orbitExplanation:
      'Executed seven Venus gravity assists between 2018 and November 2024 to tighten its perihelion down to 9.86 solar radii, where it now remains in a stable 88-day orbit.',
    instruments: [
      {
        name: 'FIELDS & SWEAP',
        role: 'Electric/Magnetic Fields & Solar Wind Plasma',
        detail: 'Uses a Faraday cup built from titanium-zirconium-molybdenum glowing red-hot in direct sunlight.',
      },
      {
        name: 'WISPR',
        role: 'Wide-Field Coronal Imager',
        detail: 'Captures visible-light dust and plasma shockwaves inside the solar corona.',
      },
    ],
    milestones: [
      { date: 'Dec 2024', event: 'Achieved closest solar approach (6.1M km) at 191.7 km/s.' },
      { date: '2025–2026', event: 'Continuing repeated closest-approach perihelion dives near solar maximum.' },
    ],
    keplerianElements: {
      periapsis: '0.0459 AU (9.86 R☉)',
      apoapsis: '0.73 AU (Venus Orbit)',
      inclination: '3.39°',
      eccentricity: '0.88',
      commsBand: 'Ka-band (555 kbps) + X-band',
      oneWayLightTime: '~8m 15s (avg)',
    },
    orbitConfig: {
      scale: 'inner-solar',
      center: 'sun',
      radius: 6.2,
      eccentricity: 0.72,
      inclinationDeg: 3.4,
      speed: 0.9,
      initialAngle: 0.9,
      color: '#F97316',
      modelType: 'probe-solar',
    },
  },
  {
    id: 'solar-orbiter',
    name: 'Solar Orbiter (SolO)',
    shortName: 'Solar Orbiter',
    agency: 'ESA · NASA',
    regime: 'Lunar & Solar',
    orbitLabel: 'Inclined Heliocentric (0.28 AU perihelion)',
    category: 'Solar Probe',
    status: 'High-Latitude Solar Imaging',
    launchDate: 'February 10, 2020',
    launchVehicle: 'Atlas V 411',
    launchSite: 'Cape Canaveral SLC-41',
    distanceLabel: '0.3–0.9 AU',
    distanceKm: 75000000,
    velocityKmS: 48.0,
    orbitalPeriod: '168 days',
    massKg: '1,800 kg',
    powerSource: 'Tilting High-Temp Solar Arrays',
    nasaEyesHash: 'sc_solar_orbiter',
    summary:
      'ESA-NASA spacecraft climbing above the ecliptic plane via Venus gravity assists to capture humanity’s first direct images of the Sun’s uncharted north and south poles.',
    whyItMatters:
      'Understanding the polar magnetic field flips of the Sun is the missing key to forecasting the 11-year solar cycle.',
    orbitExplanation:
      'Periodic Venus flybys progressively tilt Solar Orbiter’s inclination above 17–33 degrees out of Earth’s orbital plane while diving inside Mercury’s orbit.',
    instruments: [
      {
        name: 'EUI & PHI',
        role: 'Extreme UV & Polarimetric Helioseismic Imagers',
        detail: 'Looks through tiny sliding heat-shield peepholes to map solar magnetic poles.',
      },
    ],
    milestones: [
      { date: 'Feb 2025', event: 'Venus gravity assist tilted orbit to 17° for first polar views.' },
      { date: '2026', event: 'Executing high-latitude solar polar passes.' },
    ],
    keplerianElements: {
      periapsis: '0.284 AU (61 R☉)',
      apoapsis: '0.91 AU',
      inclination: '17°–24° (Climbing)',
      eccentricity: '0.52',
      commsBand: 'X-band 8.4 GHz (150 kbps)',
      oneWayLightTime: '~4m 10s',
    },
    orbitConfig: {
      scale: 'inner-solar',
      center: 'sun',
      radius: 9.2,
      eccentricity: 0.45,
      inclinationDeg: 18,
      speed: 0.54,
      initialAngle: 3.1,
      color: '#FB923C',
      modelType: 'probe-solar',
    },
  },
  {
    id: 'bepicolombo',
    name: 'BepiColombo',
    shortName: 'BepiColombo',
    agency: 'ESA · JAXA',
    regime: 'Mars & Asteroids',
    orbitLabel: 'Mercury Polar Orbit Insertion (Nov 2026)',
    category: 'Planetary Probe',
    status: 'Mercury Orbit Insertion (Nov 2026)',
    launchDate: 'October 20, 2018',
    launchVehicle: 'Ariane 5 ECA',
    launchSite: 'Guiana Space Centre',
    distanceLabel: '0.39 AU (Mercury)',
    distanceKm: 135000000,
    velocityKmS: 42.0,
    orbitalPeriod: '2.3h / 9.3h (MPO & Mio)',
    massKg: '4,100 kg (stack)',
    powerSource: 'Solar Electric Xenon Ion Propulsion',
    nasaEyesHash: 'sc_bepicolombo',
    summary:
      'Dual-orbiter European and Japanese mission arriving at Mercury in November 2026 after nine planetary flybys to unlock the origin of the innermost planet.',
    whyItMatters:
      'Separates into ESA’s Mercury Planetary Orbiter and JAXA’s Mio magnetospheric orbiter to study Mercury’s giant iron core and dynamic magnetic field.',
    orbitExplanation:
      'Following six Mercury flybys and solar-electric ion braking arcs, BepiColombo enters Mercury orbit in November 2026 and releases MPO and Mio into complementary polar science orbits.',
    keplerianElements: {
      periapsis: '0.31 AU / 480 km MPO',
      apoapsis: '0.47 AU / 1,500 km MPO',
      inclination: '7.0° (Helio) / 90° (MPO Polar)',
      eccentricity: '0.205 (Mercury-matched)',
      commsBand: 'Ka/X-band via Cebreros & Malargüe',
      oneWayLightTime: '~7m 30s',
    },
    instruments: [
      {
        name: 'MPO & Mio Science Suites',
        role: 'Dual Planetary & Magnetospheric Mapping',
        detail: '20 combined instruments measuring surface mineralogy, gravity anomalies, and solar wind interaction.',
      },
    ],
    milestones: [
      { date: 'Oct 2018', event: 'Launched on an 8-year interplanetary cruise.' },
      { date: 'Jan 2025', event: 'Completed sixth and final Mercury flyby.' },
      { date: 'Nov 2026', event: 'Mercury Orbit Insertion and separation of MPO and Mio orbiters.' },
    ],
    orbitConfig: {
      scale: 'inner-solar',
      center: 'sun',
      radius: 6.8,
      eccentricity: 0.2,
      inclinationDeg: 7,
      speed: 0.82,
      initialAngle: 2.2,
      color: '#CBD5E1',
      modelType: 'orbiter-standard',
    },
  },
  {
    id: 'perseverance',
    name: 'Mars 2020 Perseverance Rover',
    shortName: 'Perseverance',
    agency: 'NASA JPL',
    regime: 'Mars & Asteroids',
    orbitLabel: 'Jezero Crater Rim, Mars',
    category: 'Rover & Orbiter',
    status: 'Surface Science Operations',
    launchDate: 'July 30, 2020',
    launchVehicle: 'Atlas V 541',
    launchSite: 'Cape Canaveral SLC-41',
    distanceLabel: '1.52 AU (Mars)',
    distanceKm: 228000000,
    velocityKmS: 24.07,
    orbitalPeriod: '687 Earth days (with Mars)',
    massKg: '1,025 kg',
    powerSource: 'MMRTG Plutonium-238 Radioisotope',
    featuredImage: '/src/assets/images/mars_jezero_panorama_1794767565081.jpg',
    nasaEyesHash: 'sc_perseverance',
    summary:
      'Nuclear-powered astrobiology rover exploring ancient river deltas and crater-rim bedrock at Jezero Crater on Mars while sealing core samples in titanium tubes.',
    whyItMatters:
      'Searches for preserved biosignatures of ancient Martian microbial life and tested MOXIE oxygen production for future human crews.',
    orbitExplanation:
      'Travels across Jezero Crater’s western rim alongside Mars’s 687-day heliocentric orbit, relaying high-rate science through MRO and MAVEN.',
    instruments: [
      {
        name: 'SHERLOC & PIXL',
        role: 'UV Raman & X-ray Fluorescence Spectrometers',
        detail: 'Detects organic carbon molecules and sub-millimeter mineral textures in ancient lakebed rocks.',
      },
      {
        name: 'Mastcam-Z & SuperCam',
        role: 'Zoom Stereo Cameras & Laser Micro-Imager',
        detail: 'Vaporizes rock targets from 7 meters away to read elemental chemistry.',
      },
    ],
    milestones: [
      { date: 'Feb 2021', event: 'Sky-crane touchdown inside Jezero Crater.' },
      { date: '2024–2026', event: 'Climbed out of Jezero Crater to sample 4-billion-year-old Noachian crust.' },
    ],
    keplerianElements: {
      periapsis: '1.381 AU (Mars Orbit)',
      apoapsis: '1.666 AU (Mars Orbit)',
      inclination: '1.85° (Ecliptic)',
      eccentricity: '0.0934',
      commsBand: 'UHF (2 Mbps via MRO/MAVEN) + X-band',
      oneWayLightTime: '~12m 40s (avg)',
    },
    orbitConfig: {
      scale: 'inner-solar',
      center: 'sun',
      radius: 17.8,
      eccentricity: 0.09,
      inclinationDeg: 1.85,
      speed: 0.24,
      initialAngle: 1.15,
      color: '#EF4444',
      modelType: 'rover-mars',
    },
  },
  {
    id: 'curiosity',
    name: 'Mars Science Laboratory (Curiosity)',
    shortName: 'Curiosity',
    agency: 'NASA JPL',
    regime: 'Mars & Asteroids',
    orbitLabel: 'Mount Sharp, Gale Crater, Mars',
    category: 'Rover & Orbiter',
    status: 'Surface Science Operations',
    launchDate: 'November 26, 2011',
    launchVehicle: 'Atlas V 541',
    launchSite: 'Cape Canaveral SLC-41',
    distanceLabel: '1.52 AU (Mars)',
    distanceKm: 228000000,
    velocityKmS: 24.07,
    orbitalPeriod: '687 Earth days (with Mars)',
    massKg: '899 kg',
    powerSource: 'MMRTG Radioisotope',
    featuredImage: '/src/assets/images/mars_jezero_panorama_1794767565081.jpg',
    nasaEyesHash: 'sc_curiosity',
    summary:
      '14-year Mars veteran climbing Mount Sharp in Gale Crater, reading billions of years of climate transition from habitable freshwater lakes to arid sulfate deserts.',
    whyItMatters:
      'Proved ancient Mars possessed liquid water, essential chemical building blocks, and energy gradients capable of sustaining microbial life.',
    orbitExplanation:
      'Operates on the surface of Mars at 4.6° S, 137.4° E, communicating directly with Earth and orbital relays.',
    instruments: [
      {
        name: 'SAM & CheMin',
        role: 'Onboard Gas Chromatograph & X-ray Diffraction Lab',
        detail: 'Bakes powdered rock drills to 1,000°C to detect organic compounds and isotopic ratios.',
      },
    ],
    milestones: [
      { date: 'Aug 2012', event: 'First sky-crane landing in Gale Crater.' },
      { date: '2026', event: 'Over 5,000 sols exploring sulfate-bearing boxwork formations on Mount Sharp.' },
    ],
    keplerianElements: {
      periapsis: '1.381 AU (Mars Orbit)',
      apoapsis: '1.666 AU (Mars Orbit)',
      inclination: '1.85° (Ecliptic)',
      eccentricity: '0.0934',
      commsBand: 'UHF (2 Mbps via MRO/Odyssey) + X-band',
      oneWayLightTime: '~12m 40s (avg)',
    },
    orbitConfig: {
      scale: 'inner-solar',
      center: 'sun',
      radius: 17.8,
      eccentricity: 0.09,
      inclinationDeg: 1.85,
      speed: 0.24,
      initialAngle: 1.19,
      color: '#F87171',
      modelType: 'rover-mars',
    },
  },
  {
    id: 'mro',
    name: 'Mars Reconnaissance Orbiter (MRO)',
    shortName: 'MRO',
    agency: 'NASA JPL',
    regime: 'Mars & Asteroids',
    orbitLabel: 'Mars Polar Orbit (250 × 316 km)',
    category: 'Rover & Orbiter',
    status: 'Imaging & Data Relay',
    launchDate: 'August 12, 2005',
    launchVehicle: 'Atlas V 401',
    launchSite: 'Cape Canaveral SLC-41',
    distanceLabel: '1.52 AU (Mars)',
    distanceKm: 228000000,
    velocityKmS: 3.4,
    orbitalPeriod: '112 minutes (around Mars)',
    massKg: '2,180 kg',
    powerSource: 'Twin Solar Arrays (2 kW at Mars)',
    featuredImage: '/src/assets/images/mars_jezero_panorama_1794767565081.jpg',
    nasaEyesHash: 'sc_mars_reconnaissance_orbiter',
    summary:
      'High-resolution orbital eye and primary telecommunications relay at Mars for over 20 years, having transmitted more data from Mars than all other missions combined.',
    whyItMatters:
      'HiRISE resolves 30-cm boulders from orbit, scouting every landing zone and monitoring active seasonal gullies and dust storms.',
    orbitExplanation:
      'Sun-synchronous near-polar Mars orbit synchronized to pass over equatorial targets at ~3:00 PM local Mars time.',
    instruments: [
      {
        name: 'HiRISE',
        role: '0.5m Telescope Camera',
        detail: '30 cm/pixel surface resolution capable of spotting rovers, tracks, and layered cliff stratigraphy.',
      },
      {
        name: 'SHARAD',
        role: 'Subsurface Ground-Penetrating Radar',
        detail: 'Probes 1 km beneath Martian polar caps and mid-latitude glaciers to map buried water ice.',
      },
    ],
    milestones: [
      { date: 'Mar 2006', event: 'Entered Mars orbit and aerobraked into science mapping orbit.' },
      { date: '2026', event: '20th anniversary operating as Mars’s primary high-rate relay.' },
    ],
    keplerianElements: {
      periapsis: '250 km alt (Mars)',
      apoapsis: '316 km alt (Mars)',
      inclination: '93.0° (Mars SSO)',
      eccentricity: '0.009',
      commsBand: 'X/Ka-band DSN + Electra UHF Relay',
      oneWayLightTime: '~12m 40s (avg)',
    },
    orbitConfig: {
      scale: 'inner-solar',
      center: 'sun',
      radius: 17.8,
      eccentricity: 0.09,
      inclinationDeg: 1.85,
      speed: 0.24,
      initialAngle: 1.24,
      color: '#FCA5A5',
      modelType: 'orbiter-standard',
    },
  },
  {
    id: 'psyche',
    name: 'Psyche Asteroid Mission',
    shortName: 'Psyche',
    agency: 'NASA · ASU',
    regime: 'Mars & Asteroids',
    orbitLabel: 'Interplanetary Cruise (Post-Mars Assist)',
    category: 'Planetary Probe',
    status: 'Asteroid Belt Cruise',
    launchDate: 'October 13, 2023',
    launchVehicle: 'SpaceX Falcon Heavy',
    launchSite: 'Kennedy Space Center LC-39A',
    distanceLabel: '2.4 AU (Cruise)',
    distanceKm: 360000000,
    velocityKmS: 23.0,
    orbitalPeriod: 'Cruise to 2029 Arrival',
    massKg: '2,747 kg',
    powerSource: '5-Panel Cross Solar Arrays + Hall Thrusters',
    featuredImage: '/src/assets/images/bennu_asteroid_closeup_1794767566329.jpg',
    nasaEyesHash: 'sc_psyche',
    summary:
      'Electric-propulsion spacecraft cruising toward 16 Psyche—a 280-km metal-rich asteroid believed to be the exposed iron-nickel core of a failed early planet.',
    whyItMatters:
      'Humanity has never visited a metal world; Psyche offers a direct window into the planetary cores hidden thousands of kilometers beneath Earth’s crust.',
    orbitExplanation:
      'Utilized a May 2026 Mars gravity assist combined with continuous solar-electric xenon thrusters to match the outer asteroid belt orbit of 16 Psyche.',
    instruments: [
      {
        name: 'Gamma Ray & Neutron Spectrometer',
        role: 'Elemental Metal Composition',
        detail: 'Measures iron, nickel, silicate, and gold/platinum-group abundances without touching down.',
      },
      {
        name: 'DSOC (Deep Space Optical Comms)',
        role: 'Laser Data Link Demo',
        detail: 'Demonstrated record-breaking 267 Mbps laser communication across hundreds of millions of kilometers.',
      },
    ],
    milestones: [
      { date: 'Oct 2023', event: 'Launched aboard Falcon Heavy.' },
      { date: 'May 2026', event: 'Executed Mars gravity-assist slingshot toward the main belt.' },
      { date: 'Aug 2029', event: 'Scheduled orbital arrival at asteroid 16 Psyche.' },
    ],
    keplerianElements: {
      periapsis: '1.65 AU (Spiral Thrust)',
      apoapsis: '3.28 AU (Outer Belt)',
      inclination: '3.1°',
      eccentricity: '0.14',
      commsBand: 'X-band DSN + DSOC Optical Laser (267 Mbps)',
      oneWayLightTime: '~20m 00s',
    },
    orbitConfig: {
      scale: 'inner-solar',
      center: 'sun',
      radius: 21.5,
      eccentricity: 0.14,
      inclinationDeg: 3.1,
      speed: 0.17,
      initialAngle: 4.5,
      color: '#C084FC',
      modelType: 'orbiter-standard',
    },
  },
  {
    id: 'lucy',
    name: 'Lucy Trojan Asteroid Explorer',
    shortName: 'Lucy',
    agency: 'NASA · SwRI',
    regime: 'Mars & Asteroids',
    orbitLabel: 'Outer Main Belt / L4 Trojan Cruise',
    category: 'Planetary Probe',
    status: 'Trojan Tour Cruise',
    launchDate: 'October 16, 2021',
    launchVehicle: 'Atlas V 401',
    launchSite: 'Cape Canaveral SLC-41',
    distanceLabel: '3.1 AU (Cruise)',
    distanceKm: 465000000,
    velocityKmS: 19.5,
    orbitalPeriod: '6-year resonant loops',
    massKg: '1,550 kg',
    powerSource: 'Twin 7.3m Circular Solar Arrays',
    featuredImage: '/src/assets/images/bennu_asteroid_closeup_1794767566329.jpg',
    nasaEyesHash: 'sc_lucy',
    summary:
      'A 12-year reconnaissance odyssey visiting two main-belt asteroids and eight Jupiter Trojan asteroids—primordial fossils trapped at Jupiter’s L4 and L5 points.',
    whyItMatters:
      'Trojan asteroids preserve untouched building blocks from the outer solar system’s planetary migration 4.5 billion years ago.',
    orbitExplanation:
      'Flies a figure-eight resonant trajectory between Earth and Jupiter’s L4/L5 Lagrange swarms, having visited Dinkinesh (2023) and Donaldjohanson (2025).',
    instruments: [
      {
        name: 'L’LORRI & L’Ralph',
        role: 'High-Res Optical & IR Spectral Mapping',
        detail: 'Maps craters, water-ice organics, and binary moonlets on each flyby target.',
      },
    ],
    milestones: [
      { date: 'Apr 2025', event: 'Flew past main-belt asteroid 52246 Donaldjohanson.' },
      { date: 'Aug 2027', event: 'Arrives at first Jupiter L4 Trojan asteroid Eurybates.' },
    ],
    keplerianElements: {
      periapsis: '0.98 AU',
      apoapsis: '5.65 AU (L4/L5 Trojans)',
      inclination: '10.4°',
      eccentricity: '0.25',
      commsBand: 'X-band 8.4 GHz (via 70m DSN)',
      oneWayLightTime: '~25m 50s',
    },
    orbitConfig: {
      scale: 'outer-solar',
      center: 'sun',
      radius: 13.5,
      eccentricity: 0.25,
      inclinationDeg: 10,
      speed: 0.15,
      initialAngle: 2.7,
      color: '#EAB308',
      modelType: 'orbiter-standard',
    },
  },
  {
    id: 'juno',
    name: 'Juno Jupiter Orbiter',
    shortName: 'Juno',
    agency: 'NASA JPL',
    regime: 'Outer & Interstellar',
    orbitLabel: 'Jupiter Polar Orbit (33-day perijove)',
    category: 'Planetary Probe',
    status: 'Extended Jovian System Science',
    launchDate: 'August 5, 2011',
    launchVehicle: 'Atlas V 551',
    launchSite: 'Cape Canaveral SLC-41',
    distanceLabel: '5.2 AU (Jupiter)',
    distanceKm: 778000000,
    velocityKmS: 57.8,
    orbitalPeriod: '33 days (around Jupiter)',
    massKg: '3,625 kg',
    powerSource: '3 Giant 9m Solar Wings (486 W at Jupiter)',
    nasaEyesHash: 'sc_juno',
    summary:
      'First solar-powered spacecraft at Jupiter, diving just 4,000 km above swirling polar cyclones and conducting close flybys of Ganymede, Europa, and volcanic Io.',
    whyItMatters:
      'Discovered Jupiter’s fuzzy diluted core, mapped deep ammonia storms, and captured unprecedented close-ups of Io’s active lava lakes.',
    orbitExplanation:
      'Loops high over Jupiter’s poles in an eccentric 33-day orbit that skirts outside the deadliest radiation belts between brief perijove dives.',
    instruments: [
      {
        name: 'MWR (Microwave Radiometer)',
        role: 'Deep Atmospheric Water & Ammonia Probe',
        detail: 'Peers 500 km beneath Jupiter’s cloud decks in six microwave frequencies.',
      },
      {
        name: 'JunoCam',
        role: 'Citizen-Science Public Camera',
        detail: 'Captures raw polar cyclone imagery processed worldwide.',
      },
    ],
    milestones: [
      { date: 'Jul 2016', event: 'Entered polar orbit around Jupiter.' },
      { date: '2024–2026', event: 'Extended mission exploring Jupiter’s inner moons and gossamer rings.' },
    ],
    keplerianElements: {
      periapsis: '4,200 km (Jovian Perijove)',
      apoapsis: '8,100,000 km (Apoves)',
      inclination: '90.0° (Jovian Polar)',
      eccentricity: '0.946',
      commsBand: 'Ka/X-band 8.4 GHz (70m DSN)',
      oneWayLightTime: '~43m 15s',
    },
    orbitConfig: {
      scale: 'outer-solar',
      center: 'sun',
      radius: 17.2,
      eccentricity: 0.05,
      inclinationDeg: 1.3,
      speed: 0.11,
      initialAngle: 0.4,
      color: '#F59E0B',
      modelType: 'orbiter-standard',
    },
  },
  {
    id: 'europa-clipper',
    name: 'Europa Clipper',
    shortName: 'Europa Clipper',
    agency: 'NASA JPL',
    regime: 'Outer & Interstellar',
    orbitLabel: 'Earth Flyby Gravity Assist Approach (Dec 2026)',
    category: 'Planetary Probe',
    status: 'Deep Space Cruise (Pre-EGA)',
    launchDate: 'October 14, 2024',
    launchVehicle: 'SpaceX Falcon Heavy',
    launchSite: 'Kennedy Space Center LC-39A',
    distanceLabel: '1.05 AU (Approaching EGA)',
    distanceKm: 158000000,
    velocityKmS: 29.8,
    orbitalPeriod: '5.5-year cruise to 2030',
    massKg: '6,065 kg',
    powerSource: 'Massive 30.5m Solar Array Span',
    nasaEyesHash: 'sc_europa_clipper',
    summary:
      'NASA’s largest planetary science spacecraft ever built, returning toward Earth for its December 2026 gravity-assist slingshot out to Jupiter’s ocean moon Europa.',
    whyItMatters:
      'Beneath Europa’s fractured ice shell lies a salty global ocean holding twice as much liquid water as all of Earth’s oceans combined—a prime candidate for extraterrestrial habitability.',
    orbitExplanation:
      'Executed a Mars gravity assist in March 2025 and loops back for a crucial Earth flyby in December 2026 to boost aphelion out to Jupiter arrival in April 2030.',
    keplerianElements: {
      periapsis: '0.98 AU (EGA Transfer)',
      apoapsis: '5.20 AU (Post-EGA Jovian)',
      inclination: '2.0°',
      eccentricity: '0.22 -> 0.68 (Post-EGA)',
      commsBand: 'Ka/X-band (3.0 m High-Gain Dish)',
      oneWayLightTime: '~8m 45s (Nov 2026)',
    },
    instruments: [
      {
        name: 'REASON Ice-Penetrating Radar',
        role: 'Ice Shell & Subsurface Water Mapping',
        detail: 'Measures ice thickness and detects perched subsurface water pockets.',
      },
      {
        name: 'MASPEX & SUDA',
        role: 'Plume & Dust Mass Spectrometers',
        detail: 'Sniffs sputtered surface salts and organic molecules during 25-km flybys.',
      },
    ],
    milestones: [
      { date: 'Oct 2024', event: 'Launched on Falcon Heavy with 14-meter solar wings.' },
      { date: 'Mar 2025', event: 'Mars gravity-assist flyby calibrated radar antennas.' },
      { date: 'Dec 2026', event: 'Final Earth gravity-assist slingshot toward Jupiter.' },
    ],
    orbitConfig: {
      scale: 'outer-solar',
      center: 'sun',
      radius: 11.2,
      eccentricity: 0.22,
      inclinationDeg: 2.0,
      speed: 0.16,
      initialAngle: 5.5,
      color: '#38BDF8',
      modelType: 'orbiter-standard',
    },
  },
  {
    id: 'juice',
    name: 'JUICE (Jupiter Icy Moons Explorer)',
    shortName: 'JUICE',
    agency: 'ESA',
    regime: 'Outer & Interstellar',
    orbitLabel: 'Inner Solar Cruise to Jupiter',
    category: 'Planetary Probe',
    status: 'Deep Space Cruise',
    launchDate: 'April 14, 2023',
    launchVehicle: 'Ariane 5 ECA',
    launchSite: 'Guiana Space Centre',
    distanceLabel: '1.4 AU (Cruise)',
    distanceKm: 210000000,
    velocityKmS: 31.2,
    orbitalPeriod: 'Cruise to 2031',
    massKg: '6,070 kg',
    powerSource: '85 m² Cross Solar Arrays',
    nasaEyesHash: 'sc_juice',
    summary:
      'ESA’s flagship outer-planet mission traveling to orbit Ganymede—becoming the first spacecraft ever to orbit a moon other than Earth’s.',
    whyItMatters:
      'Investigates whether subsurface oceans on Ganymede, Callisto, and Europa contain the energy, chemistry, and stability required for life.',
    orbitExplanation:
      'Combines Moon-Earth, Venus (2025), and Earth (September 2026 & 2029) gravity assists to reach the Jovian system in July 2031.',
    instruments: [
      {
        name: 'RIME Radar & JANUS Camera',
        role: 'Subsurface Ice & Surface Tectonics',
        detail: 'Probes 9 km deep into icy moon crusts while mapping tidal deformation.',
      },
    ],
    milestones: [
      { date: 'Aug 2025', event: 'Venus gravity-assist flyby.' },
      { date: 'Sep 2026', event: 'Second Earth gravity-assist slingshot.' },
      { date: 'Jul 2031', event: 'Jupiter arrival and 35 icy-moon flybys.' },
    ],
    keplerianElements: {
      periapsis: '0.72 AU (Post-Venus)',
      apoapsis: '1.58 AU (2026–2029 Loop)',
      inclination: '2.5°',
      eccentricity: '0.15',
      commsBand: 'Ka/X-band via Malargüe & Cebreros',
      oneWayLightTime: '~11m 40s',
    },
    orbitConfig: {
      scale: 'outer-solar',
      center: 'sun',
      radius: 8.6,
      eccentricity: 0.15,
      inclinationDeg: 2.5,
      speed: 0.2,
      initialAngle: 3.7,
      color: '#60A5FA',
      modelType: 'orbiter-standard',
    },
  },
  {
    id: 'new-horizons',
    name: 'New Horizons',
    shortName: 'New Horizons',
    agency: 'NASA · JHUAPL',
    regime: 'Outer & Interstellar',
    orbitLabel: 'Kuiper Belt (> 65 AU)',
    category: 'Planetary Probe',
    status: 'Kuiper Belt & Heliosphere Science',
    launchDate: 'January 19, 2006',
    launchVehicle: 'Atlas V 551',
    launchSite: 'Cape Canaveral SLC-41',
    distanceLabel: '9.8B km (65.6 AU)',
    distanceKm: 9800000000,
    velocityKmS: 13.7,
    orbitalPeriod: 'Hyperbolic Solar Escape',
    massKg: '478 kg',
    powerSource: 'Plutonium-238 RTG (~180 W)',
    nasaEyesHash: 'sc_new_horizons',
    summary:
      'Revealed Pluto’s nitrogen-ice glaciers and Arrokoth’s primordial contact-binary shape; now mapping Kuiper Belt dust and cosmic optical background far beyond Neptune.',
    whyItMatters:
      'Operates in the second extended Kuiper Belt mission, measuring interplanetary dust and distant Kuiper Belt Objects from a uniquely dark vantage point.',
    orbitExplanation:
      'Crossed Pluto in 2015 and Arrokoth in 2019 on a solar-system escape trajectory heading toward the outer heliosphere.',
    instruments: [
      {
        name: 'LORRI & Alice',
        role: 'Long-Range Telescope & UV Spectrometer',
        detail: 'Measures the faintness of the extragalactic background sky free from inner-system zodiacal dust.',
      },
    ],
    milestones: [
      { date: 'Jul 2015', event: 'Historic flyby of the Pluto-Charon system.' },
      { date: 'Jan 2019', event: 'Farthest planetary flyby ever at KBO Arrokoth.' },
      { date: '2026', event: 'Extending outer-heliosphere dust and sky-brightness surveys.' },
    ],
    keplerianElements: {
      periapsis: '1.00 AU (2006 Launch)',
      apoapsis: 'Unbound (v∞ = 13.7 km/s)',
      inclination: '2.2° (Ecliptic)',
      eccentricity: '1.42 (Hyperbolic)',
      commsBand: 'X-band 8.4 GHz (1 kbps via 70m DSN)',
      oneWayLightTime: '9h 05m',
    },
    orbitConfig: {
      scale: 'outer-solar',
      center: 'sun',
      radius: 33.0,
      eccentricity: 0.0,
      inclinationDeg: 2.2,
      speed: 0.03,
      initialAngle: 4.9,
      color: '#34D399',
      modelType: 'orbiter-standard',
    },
  },
  {
    id: 'voyager-2',
    name: 'Voyager 2',
    shortName: 'Voyager 2',
    agency: 'NASA JPL',
    regime: 'Outer & Interstellar',
    orbitLabel: 'Interstellar Space (142.4 AU)',
    category: 'Planetary Probe',
    status: 'Active Interstellar Telemetry',
    launchDate: 'August 20, 1977',
    launchVehicle: 'Titan IIIE / Centaur',
    launchSite: 'Cape Canaveral LC-41',
    distanceLabel: '21.3B km (142.4 AU)',
    distanceKm: 21300000000,
    velocityKmS: 15.37,
    orbitalPeriod: 'Hyperbolic Solar Escape',
    massKg: '721.9 kg',
    powerSource: '3 Plutonium-238 RTGs (~212 W remaining)',
    featuredImage: '/src/assets/images/voyager_interstellar_probe_1794758745323.jpg',
    nasaEyesHash: 'sc_voyager_2',
    summary:
      'The only spacecraft in history to visit all four giant planets—Jupiter, Saturn, Uranus, and Neptune—and now sampling interstellar space in the southern celestial hemisphere.',
    whyItMatters:
      'Carries a working plasma-wave and cosmic-ray suite southward out of the heliosphere, complementing Voyager 1’s northern interstellar measurements.',
    orbitExplanation:
      'Following its 1989 Triton/Neptune flyby, Voyager 2 dived 48 degrees south of the ecliptic, entering interstellar space in November 2018.',
    keplerianElements: {
      periapsis: '1.00 AU (1977 Launch)',
      apoapsis: 'Unbound (v∞ = 14.9 km/s)',
      inclination: '-48.0° S of Ecliptic',
      eccentricity: '1.22 (Hyperbolic)',
      commsBand: 'X-band 8.4 GHz (160 bps via DSS-43)',
      oneWayLightTime: '19h 44m',
    },
    instruments: [
      {
        name: 'Low-Energy Charged Particle & Cosmic Ray Suites',
        role: 'Interstellar Ion & Cosmic Ray Physics',
        detail: 'Communicates via NASA Canberra’s 70-meter Deep Space Station 43 antenna.',
      },
    ],
    milestones: [
      { date: '1979–1989', event: 'Completed the Planetary Grand Tour past Jupiter, Saturn, Uranus, and Neptune.' },
      { date: 'Nov 2018', event: 'Became second human-made object to enter interstellar space.' },
      { date: '2026', event: 'Exceeds 142 AU southward in interstellar plasma.' },
    ],
    orbitConfig: {
      scale: 'outer-solar',
      center: 'sun',
      radius: 37.0,
      eccentricity: 0.0,
      inclinationDeg: -48,
      speed: 0.022,
      initialAngle: 3.4,
      color: '#FBBF24',
      modelType: 'probe-voyager',
    },
  },
];
