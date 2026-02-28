const storms = [
  {
    id: 'vx-201',
    name: 'Cyclone Vortex-201',
    intensity: 'EF-3 (fictional)',
    speed: '39 mph NE',
    county: 'Red Mesa County',
    warning: 'Tornado Emergency',
    dangerRadius: 38,
    fatalityChanceOnHit: 0.3,
    path: [
      [82, 390],
      [180, 350],
      [265, 300],
      [340, 262],
      [430, 235],
      [510, 190],
      [590, 162]
    ],
    chasers: [
      { team: 'Team SkyLance', role: 'Lead Intercept', coords: [530, 220], vehicleSpeed: 52 },
      { team: 'Prairie Pulse', role: 'Drone Unit', coords: [460, 250], vehicleSpeed: 48 },
      { team: 'Windwatch Echo', role: 'Safety Lead', coords: [390, 276], vehicleSpeed: 45 }
    ],
    report: {
      meteorologist: 'Dr. Aria North',
      station: 'StormCast 8',
      time: '7:42 PM Local',
      text: 'Rotation remains violent and rain-wrapped on the south flank. SkyLance confirms intermittent debris signature near Granite Crossroads. Residents north of Hollow Creek should shelter immediately.'
    }
  },
  {
    id: 'qt-090',
    name: 'Quasar Twister-090',
    intensity: 'EF-2 (fictional)',
    speed: '22 mph E',
    county: 'Lark Prairie District',
    warning: 'Considerable Damage Threat',
    dangerRadius: 28,
    fatalityChanceOnHit: 0.2,
    path: [
      [120, 200],
      [205, 210],
      [290, 212],
      [360, 220],
      [440, 235],
      [520, 245],
      [602, 262]
    ],
    chasers: [
      { team: 'Delta Funnel Crew', role: 'Probe Deployment', coords: [502, 236], vehicleSpeed: 35 },
      { team: 'Cloudline Nomads', role: 'Visual Confirm', coords: [452, 226], vehicleSpeed: 40 },
      { team: 'Thermal Trackers', role: 'Escape Route Spotter', coords: [388, 221], vehicleSpeed: 38 }
    ],
    report: {
      meteorologist: 'Prof. Miles Vento',
      station: 'Plains WX Network',
      time: '6:58 PM Local',
      text: 'This tornado has broadened but slowed, with stronger inflow to the southeast. Delta Funnel Crew reports power flashes near Lark Junction. Move to a sturdy interior shelter now.'
    }
  },
  {
    id: 'hn-777',
    name: 'Helix Nightfall-777',
    intensity: 'EF-4 (fictional)',
    speed: '47 mph NNE',
    county: 'Iron Valley Corridor',
    warning: 'Catastrophic Potential',
    dangerRadius: 46,
    fatalityChanceOnHit: 0.45,
    path: [
      [260, 430],
      [302, 361],
      [350, 300],
      [388, 240],
      [420, 188],
      [466, 142],
      [518, 102]
    ],
    chasers: [
      { team: 'Ridge Runner Ops', role: 'North Perimeter', coords: [450, 165], vehicleSpeed: 58 },
      { team: 'Sonic Anvil', role: 'Radar Van', coords: [410, 210], vehicleSpeed: 54 },
      { team: 'Dustline Atlas', role: 'Route Scout', coords: [370, 258], vehicleSpeed: 50 }
    ],
    report: {
      meteorologist: 'Nina Gale, CCM',
      station: 'Velocity Weather Center',
      time: '9:11 PM Local',
      text: 'Nightfall-777 is maintaining a tight debris ball and accelerating toward Iron Valley. Sonic Anvil confirms multiple vortices. This is a life-threatening storm; seek underground shelter if possible.'
    }
  }
];

const MILES_PER_PIXEL = 0.2;
const SIMULATION_TIME_SCALE = 120;
const DEFAULT_MANUAL_TORNADO_SPEED_MPH = 35;
const FASTEST_RECORDED_TORNADO_MOVEMENT_MPH = 73;
const MAP_WIDTH = 900;
const MAP_HEIGHT = 480;
const TORNADO_PADDING = 12;

const stormSelect = document.getElementById('stormSelect');
const createControlBtn = document.getElementById('createControlBtn');
const controlHint = document.getElementById('controlHint');
const manualSpeed = document.getElementById('manualSpeed');
const speedValue = document.getElementById('speedValue');
const speedCapNote = document.getElementById('speedCapNote');
const stormMap = document.getElementById('stormMap');
const pathLine = document.getElementById('pathLine');
const tornadoMarker = document.getElementById('tornadoMarker');
const tornadoLabel = document.getElementById('tornadoLabel');
const chaserMarkers = document.getElementById('chaserMarkers');
const stormDetails = document.getElementById('stormDetails');
const chaserList = document.getElementById('chaserList');
const reportText = document.getElementById('reportText');
const reporterMeta = document.getElementById('reporterMeta');
const grid = document.getElementById('grid');
const incidentLog = document.getElementById('incidentLog');

let simulationFrame;
let lastFrameTime;
let currentSimulation;
const pressedKeys = new Set();

const FOLLOW_VIEW_WIDTH = 560;
const FOLLOW_VIEW_HEIGHT = 300;
const MAX_TORNADO_WIND_MPH = 220;

function resetMapView() {
  stormMap.setAttribute('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`);
}

function updateFollowView(tornadoPoint) {
  const halfW = FOLLOW_VIEW_WIDTH / 2;
  const halfH = FOLLOW_VIEW_HEIGHT / 2;
  const viewX = clamp(tornadoPoint.x - halfW, 0, MAP_WIDTH - FOLLOW_VIEW_WIDTH);
  const viewY = clamp(tornadoPoint.y - halfH, 0, MAP_HEIGHT - FOLLOW_VIEW_HEIGHT);
  stormMap.setAttribute('viewBox', `${viewX} ${viewY} ${FOLLOW_VIEW_WIDTH} ${FOLLOW_VIEW_HEIGHT}`);
}

function mphToPixelsPerSecond(mph) {
  return (mph / MILES_PER_PIXEL / 3600) * SIMULATION_TIME_SCALE;
}

function extractMph(speedText) {
  const match = speedText.match(/(\d+(?:\.\d+)?)/);
  return match ? Number.parseFloat(match[1]) : 25;
}

function toPointString(path) {
  return path.map(([x, y]) => `${x},${y}`).join(' ');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function nwsRatingFromWind(estimatedWindMph) {
  if (estimatedWindMph < 86) return 'EF-0';
  if (estimatedWindMph < 111) return 'EF-1';
  if (estimatedWindMph < 136) return 'EF-2';
  if (estimatedWindMph < 166) return 'EF-3';
  if (estimatedWindMph < 201) return 'EF-4';
  return 'EF-5';
}

function baseWindFromIntensityText(intensityText) {
  const match = intensityText.match(/EF-(\d)/i);
  const ef = match ? Number.parseInt(match[1], 10) : 1;
  const representativeWinds = [80, 100, 125, 155, 185, 210];
  return representativeWinds[clamp(ef, 0, 5)];
}

function scheduleNextIntensificationCheck(now) {
  return now + 1200 + Math.random() * 3800;
}

function maybeIntensifyStorm(now) {
  if (now < currentSimulation.nextIntensificationCheckAt) {
    return;
  }

  currentSimulation.nextIntensificationCheckAt = scheduleNextIntensificationCheck(now);

  if (Math.random() > 0.35 || currentSimulation.currentWindMph >= MAX_TORNADO_WIND_MPH) {
    return;
  }

  const increase = 6 + Math.random() * 16;
  currentSimulation.currentWindMph = clamp(
    Math.round(currentSimulation.currentWindMph + increase),
    70,
    MAX_TORNADO_WIND_MPH
  );
  currentSimulation.currentRating = nwsRatingFromWind(currentSimulation.currentWindMph);

  if (currentSimulation.mode === 'manual') {
    currentSimulation.manualRating = currentSimulation.currentRating;
    currentSimulation.manualWindMph = currentSimulation.currentWindMph;
    renderManualStormDetails();
  } else {
    renderAutoStormDetails(currentSimulation.storm);
  }

  const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  reportText.textContent = `⚠️ Intensification update (${stamp}): ${currentSimulation.currentRating} strength with estimated winds near ${currentSimulation.currentWindMph} mph.`;
}

function drawGrid() {
  for (let x = 0; x <= MAP_WIDTH; x += 75) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('x2', x);
    line.setAttribute('y1', 0);
    line.setAttribute('y2', MAP_HEIGHT);
    line.setAttribute('class', 'grid-line');
    grid.appendChild(line);
  }

  for (let y = 0; y <= MAP_HEIGHT; y += 60) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', 0);
    line.setAttribute('x2', MAP_WIDTH);
    line.setAttribute('y1', y);
    line.setAttribute('y2', y);
    line.setAttribute('class', 'grid-line');
    grid.appendChild(line);
  }
}

function updateTornadoMarker(point, stormName) {
  tornadoMarker.setAttribute('cx', point.x);
  tornadoMarker.setAttribute('cy', point.y);
  tornadoLabel.setAttribute('x', point.x + 16);
  tornadoLabel.setAttribute('y', point.y - 12);
  tornadoLabel.textContent = stormName;
}

function updateChaserList(chasers) {
  chaserList.innerHTML = '';

  chasers.forEach((chaser) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${chaser.team}</strong> — ${chaser.role}<br><span class="chaser-status ${
      chaser.deceased ? 'fatal' : chaser.hit ? 'hit' : 'safe'
    }">Status: ${chaser.deceased ? 'Deceased (fictional)' : chaser.hit ? 'Hit - survived' : 'Safe'} | Vehicle: ${
      chaser.vehicleSpeed
    } mph</span>`;
    chaserList.appendChild(li);
  });
}

function renderIncidentLog(chasers) {
  const hitTeams = chasers.filter((chaser) => chaser.hit);
  const fatalTeams = hitTeams.filter((chaser) => chaser.deceased);

  if (hitTeams.length === 0) {
    incidentLog.textContent = 'No active strike reports on storm chaser teams right now.';
    return;
  }

  const hitNames = hitTeams.map((chaser) => chaser.team).join(', ');
  if (fatalTeams.length === 0) {
    incidentLog.textContent = `Impact report: ${hitNames} were caught by the tornado and survived.`;
    return;
  }

  const fatalNames = fatalTeams.map((chaser) => chaser.team).join(', ');
  incidentLog.textContent = `Impact report: ${hitNames} were hit. Fatal outcome recorded for ${fatalNames}.`;
}

function renderChaserMarkers(chasers) {
  chaserMarkers.innerHTML = '';

  chasers.forEach((chaser) => {
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    marker.setAttribute('class', `chaser-marker ${chaser.deceased ? 'chaser-fatal' : chaser.hit ? 'chaser-hit' : ''}`);
    marker.setAttribute('cx', chaser.position.x);
    marker.setAttribute('cy', chaser.position.y);
    marker.setAttribute('r', 8);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('class', 'marker-label');
    label.setAttribute('x', chaser.position.x + 10);
    label.setAttribute('y', chaser.position.y - 10);
    label.textContent = chaser.team;

    chaserMarkers.appendChild(marker);
    chaserMarkers.appendChild(label);
  });
}

function moveToward(current, target, maxDistance) {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= maxDistance || distance === 0) {
    return { x: target.x, y: target.y };
  }

  const ratio = maxDistance / distance;
  return {
    x: current.x + dx * ratio,
    y: current.y + dy * ratio
  };
}

function stopSimulation() {
  if (simulationFrame) {
    cancelAnimationFrame(simulationFrame);
    simulationFrame = undefined;
  }
  lastFrameTime = undefined;
}

function setManualSpeedControlEnabled(isEnabled) {
  manualSpeed.disabled = !isEnabled;
  speedCapNote.textContent = `Max ${FASTEST_RECORDED_TORNADO_MOVEMENT_MPH} mph (fastest recorded tornado movement speed).`;
}

function renderAutoStormDetails(storm) {
  stormDetails.innerHTML = `
    <li><strong>ID:</strong> ${storm.id}</li>
    <li><strong>NWS Rating:</strong> ${currentSimulation.currentRating} (estimated ${currentSimulation.currentWindMph} mph winds)</li>
    <li><strong>Movement:</strong> ${storm.speed}</li>
    <li><strong>Area:</strong> ${storm.county}</li>
    <li><strong>Alert:</strong> ${storm.warning}</li>
  `;
}

function renderManualStormDetails() {
  const currentSpeed = Math.round(currentSimulation.manualSpeedMph);
  stormDetails.innerHTML = `
    <li><strong>ID:</strong> custom-control</li>
    <li><strong>NWS Rating:</strong> ${currentSimulation.manualRating} (estimated ${currentSimulation.manualWindMph} mph winds)</li>
    <li><strong>Movement:</strong> ${currentSpeed} mph controlled translation</li>
    <li><strong>Area:</strong> User-controlled on current map</li>
    <li><strong>Alert:</strong> Manual Control Active</li>
  `;
}

function runChaserUpdates(tornadoPoint, deltaSeconds) {
  currentSimulation.chasers.forEach((chaser) => {
    if (chaser.deceased) {
      return;
    }

    const chaserStep = mphToPixelsPerSecond(chaser.vehicleSpeed) * deltaSeconds;
    chaser.position = moveToward(chaser.position, tornadoPoint, chaserStep);

    const distanceToTornado = Math.hypot(chaser.position.x - tornadoPoint.x, chaser.position.y - tornadoPoint.y);
    if (!chaser.hit && distanceToTornado <= currentSimulation.storm.dangerRadius * 0.4) {
      chaser.hit = true;
      if (Math.random() < currentSimulation.storm.fatalityChanceOnHit) {
        chaser.deceased = true;
      }
    }
  });

  renderChaserMarkers(currentSimulation.chasers);
  updateChaserList(currentSimulation.chasers);
  renderIncidentLog(currentSimulation.chasers);
}

function getManualDirection() {
  const left = pressedKeys.has('arrowleft') || pressedKeys.has('a');
  const right = pressedKeys.has('arrowright') || pressedKeys.has('d');
  const up = pressedKeys.has('arrowup') || pressedKeys.has('w');
  const down = pressedKeys.has('arrowdown') || pressedKeys.has('s');

  let x = 0;
  let y = 0;

  if (left) x -= 1;
  if (right) x += 1;
  if (up) y -= 1;
  if (down) y += 1;

  const magnitude = Math.hypot(x, y);
  if (magnitude === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / magnitude,
    y: y / magnitude
  };
}

function updateSimulation(now) {
  if (!currentSimulation) {
    return;
  }

  if (!lastFrameTime) {
    lastFrameTime = now;
  }

  const deltaSeconds = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  maybeIntensifyStorm(now);

  if (currentSimulation.mode === 'auto') {
    const tornadoStep = currentSimulation.tornadoPixelsPerSecond * deltaSeconds;
    currentSimulation.tornadoDistance += tornadoStep;

    if (currentSimulation.tornadoDistance > currentSimulation.pathLength) {
      currentSimulation.tornadoDistance %= currentSimulation.pathLength;
      currentSimulation.chasers.forEach((chaser) => {
        chaser.hit = false;
        chaser.deceased = false;
      });
    }

    const tornadoPoint = pathLine.getPointAtLength(currentSimulation.tornadoDistance);
    updateTornadoMarker(tornadoPoint, currentSimulation.storm.name);
    resetMapView();
    runChaserUpdates(tornadoPoint, deltaSeconds);
  } else {
    const direction = getManualDirection();
    const moveStep = mphToPixelsPerSecond(currentSimulation.manualSpeedMph) * deltaSeconds;

    currentSimulation.tornadoPosition.x = clamp(
      currentSimulation.tornadoPosition.x + direction.x * moveStep,
      TORNADO_PADDING,
      MAP_WIDTH - TORNADO_PADDING
    );
    currentSimulation.tornadoPosition.y = clamp(
      currentSimulation.tornadoPosition.y + direction.y * moveStep,
      TORNADO_PADDING,
      MAP_HEIGHT - TORNADO_PADDING
    );

    updateTornadoMarker(currentSimulation.tornadoPosition, currentSimulation.manualName);
    updateFollowView(currentSimulation.tornadoPosition);
    runChaserUpdates(currentSimulation.tornadoPosition, deltaSeconds);
  }

  simulationFrame = requestAnimationFrame(updateSimulation);
}

function buildChaserState(chasers) {
  return chasers.map((chaser) => ({
    ...chaser,
    position: {
      x: chaser.coords[0],
      y: chaser.coords[1]
    },
    hit: false,
    deceased: false
  }));
}

function setStorm(stormId) {
  const storm = storms.find((item) => item.id === stormId) ?? storms[0];

  pathLine.setAttribute('points', toPointString(storm.path));
  resetMapView();
  createControlBtn.classList.remove('active');
  createControlBtn.textContent = 'create and control';
  controlHint.textContent = 'Press the button to spawn a controllable tornado (WASD / Arrow Keys).';
  setManualSpeedControlEnabled(false);

  reportText.textContent = storm.report.text;
  reporterMeta.textContent = `${storm.report.meteorologist} • ${storm.report.station} • ${storm.report.time}`;

  stopSimulation();

  currentSimulation = {
    mode: 'auto',
    storm,
    currentWindMph: baseWindFromIntensityText(storm.intensity),
    currentRating: storm.intensity.split(' ')[0],
    nextIntensificationCheckAt: scheduleNextIntensificationCheck(performance.now()),
    pathLength: pathLine.getTotalLength(),
    tornadoDistance: 0,
    tornadoPixelsPerSecond: mphToPixelsPerSecond(extractMph(storm.speed)),
    chasers: buildChaserState(storm.chasers)
  };

  renderAutoStormDetails(storm);
  updateTornadoMarker(pathLine.getPointAtLength(0), storm.name);
  renderChaserMarkers(currentSimulation.chasers);
  updateChaserList(currentSimulation.chasers);
  renderIncidentLog(currentSimulation.chasers);

  simulationFrame = requestAnimationFrame(updateSimulation);
}

function toggleCreateAndControl() {
  if (currentSimulation?.mode === 'manual') {
    pressedKeys.clear();
    setStorm(stormSelect.value);
    return;
  }

  const baseStorm = storms.find((storm) => storm.id === stormSelect.value) ?? storms[0];
  const estimatedWindMph = Math.round(70 + Math.random() * 145);
  const nwsRating = nwsRatingFromWind(estimatedWindMph);

  pathLine.setAttribute('points', '');
  stopSimulation();

  currentSimulation = {
    mode: 'manual',
    storm: {
      ...baseStorm,
      dangerRadius: 40,
      fatalityChanceOnHit: 0.35
    },
    manualName: `Manual Tornado (${nwsRating}, NWS)`,
    manualRating: nwsRating,
    manualWindMph: estimatedWindMph,
    currentWindMph: estimatedWindMph,
    currentRating: nwsRating,
    nextIntensificationCheckAt: scheduleNextIntensificationCheck(performance.now()),
    manualSpeedMph: Number.parseInt(manualSpeed.value, 10),
    tornadoPosition: { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 },
    chasers: buildChaserState(baseStorm.chasers)
  };

  renderManualStormDetails();

  reportText.textContent = 'Control mode is live. Hold Arrow Keys or WASD to steer the tornado with simulation-scaled movement speed.';
  reporterMeta.textContent = 'NWS Survey Placeholder • Fictional Rapid Assessment';

  createControlBtn.classList.add('active');
  createControlBtn.textContent = 'Stop create and control';
  controlHint.textContent = 'Control active: hold Arrow Keys or WASD to move the tornado.';
  setManualSpeedControlEnabled(true);

  updateTornadoMarker(currentSimulation.tornadoPosition, currentSimulation.manualName);
  updateFollowView(currentSimulation.tornadoPosition);
  renderChaserMarkers(currentSimulation.chasers);
  updateChaserList(currentSimulation.chasers);
  renderIncidentLog(currentSimulation.chasers);

  simulationFrame = requestAnimationFrame(updateSimulation);
}

function handleManualSpeedInput() {
  const speed = clamp(Number.parseInt(manualSpeed.value, 10), 1, FASTEST_RECORDED_TORNADO_MOVEMENT_MPH);
  manualSpeed.value = String(speed);
  speedValue.textContent = `${speed} mph`;

  if (currentSimulation?.mode === 'manual') {
    currentSimulation.manualSpeedMph = speed;
    renderManualStormDetails();
  }
}

function handleKeyState(event, isPressed) {
  const key = event.key.toLowerCase();
  const controlKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'];

  if (!controlKeys.includes(key) || currentSimulation?.mode !== 'manual') {
    return;
  }

  if (isPressed) {
    pressedKeys.add(key);
  } else {
    pressedKeys.delete(key);
  }

  event.preventDefault();
}

function init() {
  drawGrid();
  resetMapView();

  manualSpeed.max = String(FASTEST_RECORDED_TORNADO_MOVEMENT_MPH);
  manualSpeed.value = String(DEFAULT_MANUAL_TORNADO_SPEED_MPH);
  setManualSpeedControlEnabled(false);
  handleManualSpeedInput();

  storms.forEach((storm) => {
    const option = document.createElement('option');
    option.value = storm.id;
    option.textContent = `${storm.name} (${storm.intensity})`;
    stormSelect.appendChild(option);
  });

  stormSelect.addEventListener('change', (event) => {
    pressedKeys.clear();
    setStorm(event.target.value);
  });

  createControlBtn.addEventListener('click', () => {
    toggleCreateAndControl();
  });

  manualSpeed.addEventListener('input', () => {
    handleManualSpeedInput();
  });

  window.addEventListener('keydown', (event) => handleKeyState(event, true));
  window.addEventListener('keyup', (event) => handleKeyState(event, false));

  setStorm(storms[0].id);
}

init();
