export type LaunchOutcome =
  | 'Mission Success'
  | 'Partial Failure / Safe Return'
  | 'Cancelled Hardware'
  | 'Loss of Vehicle'
  | 'Active Operations'
  | 'Scheduled Future'
  | 'Concept Study';

export type LaunchProgram = 'Apollo & Saturn' | 'Artemis Program' | 'Shuttle & Probes' | 'Future Missions';

export interface FlightStage {
  tPlus: string;
  altitudeKm: number;
  velocityKmS: number;
  phase: string;
  detail: string;
}

export interface LaunchRecord {
  id: string;
  missionName: string;
  vehicle: string;
  program: LaunchProgram;
  year: number;
  dateLabel: string;
  launchSite: string;
  outcome: LaunchOutcome;
  summary: string;
  whatHappened: string;
  legacyImpact: string;
  imageUrl?: string;
  stages: FlightStage[];
}

export const LAUNCH_ARCHIVE: LaunchRecord[] = [
  {
    id: 'apollo-11',
    missionName: 'Apollo 11',
    vehicle: 'Saturn V (SA-506)',
    program: 'Apollo & Saturn',
    year: 1969,
    dateLabel: 'July 16, 1969',
    launchSite: 'Kennedy Space Center LC-39A',
    outcome: 'Mission Success',
    imageUrl: '/src/assets/images/saturn_v_liftoff_1794767564847.jpg',
    summary:
      'First crewed mission to land humans on the Moon and return lunar samples safely to Earth.',
    whatHappened:
      'All three Saturn V stages performed nominally, inserting Apollo 11 into Translunar Injection. Neil Armstrong and Buzz Aldrin landed Eagle at Tranquility Base on July 20, 1969, returning 21.5 kg of basaltic Moon rock.',
    legacyImpact:
      'Proved precision deep-space rendezvous, cryogenic liquid-hydrogen upper stages (J-2), and human planetary surface exploration.',
    stages: [
      { tPlus: 'T+00:00', altitudeKm: 0, velocityKmS: 0, phase: 'Liftoff (5× F-1 Engines)', detail: '34.5 MN thrust clears LC-39A tower.' },
      { tPlus: 'T+02:41', altitudeKm: 67, velocityKmS: 2.3, phase: 'S-IC / S-II Staging', detail: 'First stage drops into Atlantic; 5× J-2 LH2 engines ignite.' },
      { tPlus: 'T+11:39', altitudeKm: 190, velocityKmS: 7.79, phase: 'Parking Orbit Insertion', detail: 'S-IVB reaches 190 km circular Earth parking orbit.' },
      { tPlus: 'T+02:44:16', altitudeKm: 320, velocityKmS: 10.84, phase: 'Translunar Injection (TLI)', detail: 'S-IVB restarts to boost spacecraft toward the Moon.' },
      { tPlus: 'Day 4', altitudeKm: 384400, velocityKmS: 0.0, phase: 'Sea of Tranquility Touchdown', detail: 'Lunar Module Eagle lands with ~25 seconds of hover propellant remaining.' },
    ],
  },
  {
    id: 'apollo-13',
    missionName: 'Apollo 13',
    vehicle: 'Saturn V (SA-508)',
    program: 'Apollo & Saturn',
    year: 1970,
    dateLabel: 'April 11, 1970',
    launchSite: 'Kennedy Space Center LC-39A',
    outcome: 'Partial Failure / Safe Return',
    imageUrl: '/src/assets/images/saturn_v_liftoff_1794767564847.jpg',
    summary:
      'Third lunar landing attempt aborted en route to Fra Mauro after a cryogenic oxygen tank ruptured inside the Service Module.',
    whatHappened:
      'During ascent, an S-II center engine pogo oscillation forced an early center-engine cutoff compensated by longer outer-engine burn. At 55h 55m into flight, damaged wiring inside Service Module O2 Tank #2 caused an explosion that vented oxygen and disabled the Command Module fuel cells. The crew used Lunar Module Aquarius as a lifeboat around the Moon and splashed down safely.',
    legacyImpact:
      'Redesigned cryogenic tank thermostatic safety, added a third O2 tank and battery, and defined modern spacecraft failure-recovery engineering.',
    stages: [
      { tPlus: 'T+00:00', altitudeKm: 0, velocityKmS: 0, phase: 'Saturn V Liftoff', detail: 'Nominal launch despite S-II center engine early cutoff at T+05:32.' },
      { tPlus: 'T+02:35:46', altitudeKm: 280, velocityKmS: 10.82, phase: 'Translunar Injection', detail: 'S-IVB sends Odyssey + Aquarius toward the Moon.' },
      { tPlus: 'T+55:54:53', altitudeKm: 321860, velocityKmS: 1.4, phase: 'O2 Tank #2 Rupture', detail: '"Houston, we’ve had a problem"—Service Module power and oxygen lost.' },
      { tPlus: 'T+79:27:39', altitudeKm: 384400, velocityKmS: 2.2, phase: 'Lunar Free-Return Swing', detail: 'Aquarius descent engine executes PC+2 burn behind Moon for Earth return.' },
      { tPlus: 'Day 6', altitudeKm: 0, velocityKmS: 11.0, phase: 'Pacific Splashdown', detail: 'Crew jettisons damaged SM and LM; splashes down intact near Samoa.' },
    ],
  },
  {
    id: 'apollo-18',
    missionName: 'Apollo 18 (Cancelled Saturn V)',
    vehicle: 'Saturn V (SA-513)',
    program: 'Apollo & Saturn',
    year: 1973,
    dateLabel: 'Cancelled Sep 1970 (Repurposed May 1973)',
    launchSite: 'Kennedy Space Center LC-39A',
    outcome: 'Cancelled Hardware',
    imageUrl: '/src/assets/images/saturn_v_liftoff_1794767564847.jpg',
    summary:
      'Originally slated to land at Copernicus Crater or Schröter’s Valley with Harrison Schmitt before budgetary cancellations ended Apollo after Apollo 17.',
    whatHappened:
      'Congressional budget cuts cancelled Apollo 18, 19, and 20 in 1970—while the massive Saturn V (SA-513) rocket was already manufactured! Rather than scrapping it, NASA converted the SA-513 third stage (S-IVB) into the Skylab orbital workshop and used SA-513’s first two stages to launch Skylab into orbit on May 14, 1973. The Apollo 18 crew designation was later informally associated with the 1975 Apollo-Soyuz Test Project.',
    legacyImpact:
      'SA-513 became the final Saturn V ever launched, birthing America’s first space station (Skylab) and proving long-duration crewed microgravity living.',
    stages: [
      { tPlus: '1970 Plan', altitudeKm: 0, velocityKmS: 0, phase: 'Cancelled Lunar Mission', detail: 'Apollo 18 lunar surface mission cancelled Sep 2, 1970 due to funding cuts.' },
      { tPlus: 'May 14, 1973', altitudeKm: 0, velocityKmS: 0, phase: 'SA-513 Launches Skylab', detail: 'Two-stage Saturn V lifts 77-ton Skylab dry-workshop S-IVB into orbit.' },
      { tPlus: 'T+01:03', altitudeKm: 12, velocityKmS: 0.45, phase: 'Micrometeoroid Shield Tear', detail: 'Aerodynamic pressure rips off Skylab shield and jams one solar wing.' },
      { tPlus: 'T+09:55', altitudeKm: 435, velocityKmS: 7.66, phase: 'Skylab Orbit Achieved', detail: 'Saturn IB crews later repair thermal parasol & solar array in space.' },
    ],
  },
  {
    id: 'saturn-1b-skylab',
    missionName: 'Saturn IB · Skylab 2–4 & ASTP',
    vehicle: 'Saturn IB (SA-206 / SA-210)',
    program: 'Apollo & Saturn',
    year: 1973,
    dateLabel: '1973 – 1975',
    launchSite: 'Kennedy Space Center LC-39B (Milkstool)',
    outcome: 'Mission Success',
    imageUrl: '/src/assets/images/saturn_v_liftoff_1794767564847.jpg',
    summary:
      'Bridge-era Saturn rocket using clustered Redstone/Jupiter tankage (S-IB) and a single-J2 S-IVB upper stage to ferry crews to Skylab and Apollo-Soyuz.',
    whatHappened:
      'Mounted atop a 39-meter steel "milkstool" pedestal on LC-39B so Saturn V towers could reach it, Saturn IB achieved a 100% flight record across 9 launches—including Pete Conrad’s emergency Skylab rescue mission and the historic 1975 US-Soviet Apollo-Soyuz orbital handshake.',
    legacyImpact:
      'Demonstrated in-space station repair and international orbital docking standards still reflected on the ISS today.',
    stages: [
      { tPlus: 'T+00:00', altitudeKm: 0, velocityKmS: 0, phase: '8× H-1 Engine Liftoff', detail: '7.1 MN cluster lifts off the LC-39B milkstool pedestal.' },
      { tPlus: 'T+02:21', altitudeKm: 58, velocityKmS: 1.9, phase: 'S-IB / S-IVB Separation', detail: 'Single J-2 engine pushes Apollo CSM to LEO.' },
      { tPlus: 'T+09:40', altitudeKm: 435, velocityKmS: 7.66, phase: 'Skylab Rendezvous', detail: 'Crew performs EVA to free jammed solar wing and save station.' },
    ],
  },
  {
    id: 'voyager-titan',
    missionName: 'Voyager 1 & 2',
    vehicle: 'Titan IIIE / Centaur D-1T',
    program: 'Shuttle & Probes',
    year: 1977,
    dateLabel: 'Aug 20 & Sep 5, 1977',
    launchSite: 'Cape Canaveral LC-41',
    outcome: 'Active Operations',
    imageUrl: '/src/assets/images/voyager_interstellar_probe_1794758745323.jpg',
    summary:
      'Launched to exploit a once-every-176-year geometric alignment of Jupiter, Saturn, Uranus, and Neptune.',
    whatHappened:
      'Both Titan IIIE rockets plus high-energy Centaur cryogenic upper stages and Star 37E kick motors accelerated Voyager 1 & 2 cleanly onto escape trajectories. Nearly 49 years later in Nov 2026, both remain the farthest active spacecraft in interstellar space.',
    legacyImpact:
      'Delivered humanity’s first close-up data of all four giant planets and the local interstellar medium.',
    stages: [
      { tPlus: 'T+00:00', altitudeKm: 0, velocityKmS: 0, phase: 'Solid Rocket Boosters', detail: 'Dual 5-segment SRBs lift Titan IIIE core off LC-41.' },
      { tPlus: 'T+09:45', altitudeKm: 185, velocityKmS: 7.8, phase: 'Centaur LH2/LOX Burn', detail: 'Centaur fires twice to reach hyperbolic solar escape velocity.' },
      { tPlus: '1979–1989', altitudeKm: 4500000000, velocityKmS: 19.0, phase: 'Outer Planet Grand Tour', detail: 'Gravity assists fling probes beyond Uranus, Neptune, and the heliopause.' },
    ],
  },
  {
    id: 'shuttle-sts',
    missionName: 'Space Shuttle Program (STS-1 to STS-135)',
    vehicle: 'Space Transportation System',
    program: 'Shuttle & Probes',
    year: 1981,
    dateLabel: 'Apr 1981 – Jul 2011',
    launchSite: 'Kennedy Space Center LC-39A/B',
    outcome: 'Partial Failure / Safe Return',
    imageUrl: '/src/assets/images/hubble_earth_limb_1794767567005.jpg',
    summary:
      '135 orbital flights of winged reusable orbiters that deployed Hubble, Chandra, Magellan, Galileo, and built the International Space Station.',
    whatHappened:
      'Achieved 133 successful missions including five Hubble servicing flights and ISS assembly, but suffered two catastrophic losses: Challenger (STS-51L, 1986 SRB O-ring burn-through) and Columbia (STS-107, 2003 foam-strike wing breach during reentry).',
    legacyImpact:
      'Transformed modular orbital construction and led directly to modern commercial crew vehicles and heavy-lift Artemis SLS.',
    stages: [
      { tPlus: 'T+00:00', altitudeKm: 0, velocityKmS: 0, phase: '3× RS-25 + Dual SRB Liftoff', detail: '30.5 MN combined thrust accelerates winged orbiter vertically.' },
      { tPlus: 'T+02:04', altitudeKm: 45, velocityKmS: 1.38, phase: 'SRB Separation', detail: 'Solid boosters parachute to Atlantic for recovery.' },
      { tPlus: 'T+08:30', altitudeKm: 110, velocityKmS: 7.78, phase: 'MECO & External Tank Drop', detail: 'OMS engines circularize orbit at 300–550 km.' },
    ],
  },
  {
    id: 'artemis-1',
    missionName: 'Artemis I',
    vehicle: 'SLS Block 1 + ICPS',
    program: 'Artemis Program',
    year: 2022,
    dateLabel: 'November 16, 2022',
    launchSite: 'Kennedy Space Center LC-39B',
    outcome: 'Mission Success',
    imageUrl: '/src/assets/images/artemis_orion_moon_1794767565804.jpg',
    summary:
      'Uncrewed maiden flight test of NASA’s Space Launch System super-heavy rocket and Orion spacecraft around the Moon.',
    whatHappened:
      'SLS lifted off cleanly at 39.1 MN thrust, sending Orion into a 25.5-day Distant Retrograde Orbit 432,210 km from Earth before executing a skip-entry splashdown at 40,000 km/h.',
    legacyImpact:
      'Qualified the SLS launch vehicle and heat-shield entry architecture (with subsequent heat-shield char tuning) for Artemis II.',
    stages: [
      { tPlus: 'T+00:00', altitudeKm: 0, velocityKmS: 0, phase: 'SLS Core + 5-Seg SRBs', detail: '39.1 MN thrust—most powerful operational NASA rocket since Saturn V.' },
      { tPlus: 'T+08:04', altitudeKm: 160, velocityKmS: 7.82, phase: 'MECO & ICPS Staging', detail: 'Core stage separates; RL10 upper stage executes TLI.' },
      { tPlus: 'Day 13', altitudeKm: 432210, velocityKmS: 1.0, phase: 'Distant Lunar Retrograde', detail: 'Set distance record for human-rated spacecraft.' },
    ],
  },
  {
    id: 'artemis-2',
    missionName: 'Artemis II',
    vehicle: 'SLS Block 1 + Orion',
    program: 'Artemis Program',
    year: 2026,
    dateLabel: 'April 1, 2026',
    launchSite: 'Kennedy Space Center LC-39B',
    outcome: 'Mission Success',
    imageUrl: '/src/assets/images/artemis_orion_moon_1794767565804.jpg',
    summary:
      'First crewed flight beyond Earth orbit since Apollo 17—carrying Reid Wiseman, Victor Glover, Christina Koch, and Jeremy Hansen around the Moon.',
    whatHappened:
      'Successfully launched April 1, 2026, verified Orion life support during a 24-hour high-Earth elliptical check-out, looped behind the lunar far side on a free-return trajectory, and splashed down safely after ~10 days.',
    legacyImpact:
      'Validated crewed deep-space Orion life support, manual proximity handling, and optical communications for Artemis III and IV.',
    stages: [
      { tPlus: 'T+00:00', altitudeKm: 0, velocityKmS: 0, phase: 'Crewed SLS Liftoff', detail: 'Four astronauts depart LC-39B atop SLS Block 1.' },
      { tPlus: 'T+01:50:00', altitudeKm: 70000, velocityKmS: 9.8, phase: 'High-Earth Orbit Check', detail: 'Crew tests manual Orion rendezvous handling and ECLSS life support.' },
      { tPlus: 'Day 6', altitudeKm: 392000, velocityKmS: 2.1, phase: 'Lunar Far-Side Flyby', detail: 'Crew sets new record distance from Earth for humans in space.' },
    ],
  },
  {
    id: 'roman-launch',
    missionName: 'Nancy Grace Roman Space Telescope Launch',
    vehicle: 'SpaceX Falcon Heavy',
    program: 'Shuttle & Probes',
    year: 2026,
    dateLabel: 'August 30, 2026',
    launchSite: 'Kennedy Space Center LC-39A',
    outcome: 'Active Operations',
    imageUrl: '/src/assets/images/roman_telescope_l2_1794758744313.jpg',
    summary:
      'Direct Sun-Earth L2 transfer launch placing NASA’s 300.8-megapixel wide-field infrared observatory into deep space.',
    whatHappened:
      'Falcon Heavy launched cleanly from LC-39A on August 30, 2026, inserting Roman onto its 100-day ballistic L2 transfer. As of November 2026, Roman has arrived in the L2 halo region and is actively commissioning its Wide Field and Coronagraph instruments.',
    legacyImpact:
      'Pairs with JWST and Euclid at L2 to map billions of galaxies and thousands of distant exoplanets.',
    stages: [
      { tPlus: 'T+00:00', altitudeKm: 0, velocityKmS: 0, phase: '27× Merlin 1D Liftoff', detail: 'Three Falcon 9 cores lift off from historic LC-39A.' },
      { tPlus: 'T+02:30', altitudeKm: 72, velocityKmS: 2.1, phase: 'Side Booster Separation', detail: 'Side cores return for landing; center core propels second stage.' },
      { tPlus: 'Nov 2026', altitudeKm: 1500000, velocityKmS: 1.02, phase: 'L2 Halo Commissioning', detail: 'Operating 1.5M km beyond Earth alongside JWST.' },
    ],
  },
  {
    id: 'artemis-3',
    missionName: 'Artemis III (LEO HLS Docking Demo)',
    vehicle: 'SLS Block 1 + Commercial HLS',
    program: 'Artemis Program',
    year: 2027,
    dateLabel: 'Target 2027',
    launchSite: 'Kennedy Space Center LC-39B',
    outcome: 'Scheduled Future',
    imageUrl: '/src/assets/images/artemis_orion_moon_1794767565804.jpg',
    summary:
      'Restructured crewed Earth-orbit demonstration testing Orion rendezvous, proximity operations, and docking with commercial Human Landing Systems.',
    whatHappened:
      'Upcoming in 2027 with crew Randy Bresnik, Frank Rubio, Andre Douglas, and ESA’s Luca Parmitano. Hardware stacking is underway at KSC in late 2026 to validate HLS life-support interfaces before lunar surface descent.',
    legacyImpact:
      'De-risks multi-vehicle orbital refueling and crew transfer between Orion and SpaceX/Blue Origin lunar landers.',
    stages: [
      { tPlus: 'T+00:00', altitudeKm: 0, velocityKmS: 0, phase: 'SLS Launch to LEO', detail: 'Orion launches to meet uncrewed commercial HLS in Earth orbit.' },
      { tPlus: 'Day 2', altitudeKm: 420, velocityKmS: 7.66, phase: 'Orion–HLS Docking Demo', detail: 'Crew tests hatch docking, power transfer, and lander cabin systems.' },
      { tPlus: 'Day 8', altitudeKm: 0, velocityKmS: 7.8, phase: 'Return & Certification', detail: 'Certifies integrated lander stack for Artemis IV lunar landing.' },
    ],
  },
  {
    id: 'artemis-4',
    missionName: 'Artemis IV (Crewed Lunar Landing)',
    vehicle: 'SLS + Commercial HLS Lander',
    program: 'Artemis Program',
    year: 2028,
    dateLabel: 'Target 2028',
    launchSite: 'Kennedy Space Center LC-39B',
    outcome: 'Scheduled Future',
    imageUrl: '/src/assets/images/artemis_orion_moon_1794767565804.jpg',
    summary:
      'Planned first crewed lunar surface landing of the Artemis era at the Moon’s South Pole.',
    whatHappened:
      'Scheduled for 2028 following Artemis III’s docking certification, transporting astronauts from Orion in lunar orbit down to South Pole ice-bearing craters.',
    legacyImpact:
      'Establishes recurring annual surface expeditions and begins permanent lunar south polar science infrastructure.',
    stages: [
      { tPlus: 'T+00:00', altitudeKm: 0, velocityKmS: 0, phase: 'SLS Translunar Launch', detail: 'Crewed Orion departs toward lunar near-rectilinear halo orbit.' },
      { tPlus: 'Day 6', altitudeKm: 384400, velocityKmS: 1.6, phase: 'Lunar Orbit Transfer', detail: 'Two astronauts board pre-positioned HLS lander.' },
      { tPlus: 'Day 7', altitudeKm: 384400, velocityKmS: 0.0, phase: 'South Pole Touchdown', detail: 'First human footsteps near lunar South Pole water-ice regions.' },
    ],
  },
  {
    id: 'dragonfly',
    missionName: 'Dragonfly Titan Rotorcraft',
    vehicle: 'SpaceX Falcon Heavy',
    program: 'Future Missions',
    year: 2028,
    dateLabel: 'Target July 2028',
    launchSite: 'Kennedy Space Center LC-39A',
    outcome: 'Scheduled Future',
    imageUrl: '/src/assets/images/bennu_asteroid_closeup_1794767566329.jpg',
    summary:
      'Nuclear-powered eight-rotor octocopter flying through the dense nitrogen-methane atmosphere of Saturn’s largest moon, Titan.',
    whatHappened:
      'Scheduled to launch July 2028 on Falcon Heavy and arrive at Titan in 2034, hopping kilometers at a time across organic sand dunes to Selk impact crater.',
    legacyImpact:
      'First multi-rotor science craft on an outer-planet moon, sampling prebiotic organic chemistry directly.',
    stages: [
      { tPlus: 'Jul 2028', altitudeKm: 0, velocityKmS: 0, phase: 'Falcon Heavy Departure', detail: 'Direct high-energy interplanetary injection toward outer solar system.' },
      { tPlus: '2034', altitudeKm: 1400000000, velocityKmS: 7.0, phase: 'Titan Atmospheric Entry', detail: 'Parachute descent into Shangri-La dune field beneath thick orange haze.' },
      { tPlus: '2034–2037', altitudeKm: 1400000000, velocityKmS: 0.01, phase: 'Autonomous Rotor Flights', detail: '30+ science hops sampling water-ice bedrock and complex organics.' },
    ],
  },
  {
    id: 'habitable-worlds',
    missionName: 'Habitable Worlds Observatory (HWO)',
    vehicle: 'Next-Gen Heavy Lift (L2)',
    program: 'Future Missions',
    year: 2041,
    dateLabel: 'Target 2040s',
    launchSite: 'TBD',
    outcome: 'Concept Study',
    imageUrl: '/src/assets/images/jwst_mirror_space_1794758745001.jpg',
    summary:
      'NASA’s planned post-Roman flagship 6-meter UV/Optical/IR space telescope designed to directly photograph and search for biosignatures on 25+ Earth-like exoplanets.',
    whatHappened:
      'Building directly on JWST’s segmented mirror heritage and Roman’s Coronagraph Instrument technology demonstration, HWO is engineered for robotic servicing at Sun-Earth L2.',
    legacyImpact:
      'Aims to answer whether temperate rocky planets around Sun-like stars harbor oxygen, water vapor, and methane signatures of life.',
    stages: [
      { tPlus: '2040s', altitudeKm: 0, velocityKmS: 0, phase: 'Heavy-Lift Launch', detail: 'Serviceable modular observatory launches to Sun-Earth L2.' },
      { tPlus: 'L2 Station', altitudeKm: 1500000, velocityKmS: 1.0, phase: '10⁻¹⁰ Contrast Coronagraphy', detail: 'Blocks host starlight by ten billion to resolve Earth-twin spectra.' },
    ],
  },
];
