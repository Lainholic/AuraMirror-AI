// AuraMirror AI Frontend Logic (Strict Live Webcam Mode & Rule-Based Ingredient Suggestions)
let stream = null;
let currentScoreData = null;
let currentMasks = {};
let activeMask = null;
let currentRenderToken = 0;

// DOM Elements
const video = document.getElementById('webcam-video');
const maskCanvas = document.getElementById('mask-canvas');
const captureCanvas = document.getElementById('capture-canvas');
const scanline = document.getElementById('scanline');
const btnScan = document.getElementById('btn-scan');
const faceGuide = document.getElementById('face-guide');
const maskControls = document.getElementById('mask-controls');

// Clock
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('live-clock').innerText = `${h}:${m}`;
  
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  document.getElementById('live-date').innerText = now.toLocaleDateString('en-US', options);
}
setInterval(updateClock, 1000);
updateClock();

// Webcam Management
async function startWebcam() {
  if (stream) return;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false
    });
    video.srcObject = stream;
    video.style.display = 'block';
    if (faceGuide) faceGuide.style.display = 'flex';
    const pill = document.getElementById('camera-status-pill');
    if (pill) {
      pill.innerHTML = '<i class="fa-solid fa-video"></i> Webcam Sensor Active';
      pill.style.color = '#64ffda';
    }
  } catch (err) {
    console.warn('Camera access required:', err);
    const pill = document.getElementById('camera-status-pill');
    if (pill) {
      pill.innerHTML = '<i class="fa-solid fa-video-slash"></i> Camera Access Required';
      pill.style.color = '#ff6b6b';
    }
  }
}

function stopWebcam() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
}

// Wearable Controls
function updateWearable() {
  const sleep = document.getElementById('input-sleep').value;
  const deep = document.getElementById('input-deep').value;
  const uv = document.getElementById('input-uv').value;
  const water = document.getElementById('input-water').value;

  document.getElementById('disp-sleep').innerText = `${sleep} hrs`;
  document.getElementById('disp-deep').innerText = `${deep} min`;
  document.getElementById('disp-uv').innerText = `${uv} hrs`;
  document.getElementById('disp-water').innerText = `${water} ml`;
}

// Per-Scan State Reset
function resetScanState() {
  currentScoreData = null;
  currentMasks = {};
  clearMasks();

  const sourceBadge = document.getElementById('engine-status-badge');
  if (sourceBadge) {
    sourceBadge.textContent = '● WAITING SCAN';
    sourceBadge.className = 'badge-pulse';
  }

  // Reset metrics
  document.getElementById('disp-skin-age').innerHTML = `--<small> yrs</small>`;
  document.getElementById('disp-overall-score').innerHTML = `--<small>/100</small>`;
  ['texture', 'pore', 'oiliness', 'dark-circle', 'moisture', 'redness'].forEach(k => {
    const bar = document.getElementById(`bar-${k}`);
    const num = document.getElementById(`score-${k}`);
    if (bar) bar.style.width = '0%';
    if (num) num.innerText = '--';
  });

  if (maskControls) maskControls.style.display = 'none';

  const pContainer = document.getElementById('products-container');
  if (pContainer) pContainer.innerHTML = '';

  const headlineEl = document.getElementById('disp-headline');
  if (headlineEl) headlineEl.innerText = 'Analyzing camera-based skin scores & mapping rule-based ingredients...';

  const causesUl = document.getElementById('list-causes');
  if (causesUl) causesUl.innerHTML = '<li>Receiving objective telemetry from vision pipeline...</li>';

  const mEl = document.getElementById('disp-routine-morning');
  const eEl = document.getElementById('disp-routine-evening');
  const lEl = document.getElementById('disp-routine-lifestyle');
  if (mEl) mEl.textContent = 'Analyzing...';
  if (eEl) eEl.textContent = 'Analyzing...';
  if (lEl) lEl.textContent = 'Analyzing...';
}

// Trigger Full Pipeline
async function triggerFullPipeline() {
  resetScanState();
  btnScan.disabled = true;
  btnScan.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing Vision & Skincare Guidance...`;
  scanline.classList.add('active');

  try {
    if (!video.srcObject || video.readyState < 2) {
      throw new Error('Webcam feed is not ready. Please verify camera permissions and wait for video display.');
    }

    // Capture frame from webcam
    captureCanvas.width = video.videoWidth || 640;
    captureCanvas.height = video.videoHeight || 480;
    const ctx = captureCanvas.getContext('2d');
    ctx.translate(captureCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    const imageBase64 = captureCanvas.toDataURL('image/jpeg', 0.95);

    // 1. Call Backend /api/analyze
    console.log('[1] Calling /api/analyze...');
    const analyzeResp = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: imageBase64 })
    });

    const analyzeData = await analyzeResp.json();
    if (!analyzeResp.ok) {
      throw new Error(analyzeData.detail || 'Skin analysis failed');
    }

    console.log('[2] Analyze Success:', analyzeData);
    currentScoreData = analyzeData.score_info;
    currentMasks = analyzeData.masks || {};

    renderScores(currentScoreData);
    maskControls.style.display = 'flex';

    // 2. Prepare Metrics
    const skinMetrics = {
      skin_age: (typeof currentScoreData.skin_age === 'number') ? currentScoreData.skin_age : null,
      overall_score: (currentScoreData.all && typeof currentScoreData.all.score === 'number') ? Math.round(currentScoreData.all.score) : null,
      oiliness: currentScoreData.oiliness?.ui_score ?? null,
      pore: currentScoreData.pore?.ui_score ?? null,
      dark_circle: currentScoreData.dark_circle_v2?.ui_score ?? null,
      moisture: currentScoreData.moisture?.ui_score ?? null,
      redness: currentScoreData.redness?.ui_score ?? null,
      texture: currentScoreData.texture?.ui_score ?? null,
      wrinkle: currentScoreData.wrinkle?.ui_score ?? null,
      acne: currentScoreData.acne?.ui_score ?? null
    };

    const stressSelect = document.getElementById('input-stress');
    const wearableData = {
      sleep_hours: parseFloat(document.getElementById('input-sleep').value),
      deep_sleep_min: parseInt(document.getElementById('input-deep').value),
      uv_exposure_hours: parseFloat(document.getElementById('input-uv').value),
      water_intake_ml: parseInt(document.getElementById('input-water').value),
      stress_level: stressSelect ? stressSelect.value : 'Moderate'
    };

    // 3. Call Backend /api/prescribe
    console.log('[3] Calling /api/prescribe...');
    const presResp = await fetch('/api/prescribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skin_metrics: skinMetrics, wearable_data: wearableData })
    });

    if (!presResp.ok) {
      const errPayload = await presResp.json();
      throw new Error(errPayload.detail || `Prescription server error (HTTP ${presResp.status})`);
    }

    const presData = await presResp.json();
    console.log('[4] Prescribe Success:', presData);

    renderPrescription(presData);

  } catch (err) {
    console.warn('[Error]', err.message);
    const headlineEl = document.getElementById('disp-headline');
    if (headlineEl) {
      headlineEl.innerText = `[Status Alert] ${err.message}`;
    }
    const mEl = document.getElementById('disp-routine-morning');
    const eEl = document.getElementById('disp-routine-evening');
    const lEl = document.getElementById('disp-routine-lifestyle');
    if (mEl) mEl.textContent = 'Scan interrupted';
    if (eEl) eEl.textContent = 'Scan interrupted';
    if (lEl) lEl.textContent = 'Scan interrupted';
    const causesUl = document.getElementById('list-causes');
    if (causesUl) causesUl.innerHTML = '<li>Please check camera framing and retry.</li>';
  } finally {
    btnScan.disabled = false;
    btnScan.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Scan Face & Get Skincare Suggestions`;
    scanline.classList.remove('active');
  }
}

// Render Scores
function renderScores(data) {
  const ageVal = (typeof data.skin_age === 'number') ? `${data.skin_age}<small> yrs</small>` : `--<small> yrs</small>`;
  const scoreVal = (data.all && typeof data.all.score === 'number') ? `${Math.round(data.all.score)}<small>/100</small>` : `--<small>/100</small>`;
  
  document.getElementById('disp-skin-age').innerHTML = ageVal;
  document.getElementById('disp-overall-score').innerHTML = scoreVal;

  const metrics = [
    { key: 'texture', score: data.texture?.ui_score },
    { key: 'pore', score: data.pore?.ui_score },
    { key: 'oiliness', score: data.oiliness?.ui_score },
    { key: 'dark-circle', score: data.dark_circle_v2?.ui_score },
    { key: 'moisture', score: data.moisture?.ui_score },
    { key: 'redness', score: data.redness?.ui_score }
  ];

  metrics.forEach(m => {
    const bar = document.getElementById(`bar-${m.key}`);
    const num = document.getElementById(`score-${m.key}`);
    if (bar && num) {
      if (typeof m.score === 'number') {
        bar.style.width = `${Math.min(100, Math.max(0, m.score))}%`;
        num.innerText = m.score;
      } else {
        bar.style.width = `0%`;
        num.innerText = `--`;
      }
    }
  });
}

// Render Rule-Based Prescription & Products
function renderPrescription(data) {
  const headlineEl = document.getElementById('disp-headline');
  if (headlineEl) {
    headlineEl.textContent = `"${data.headline || 'Dermatological Skincare Wellness Guide'}"`;
  }

  const sourceBadge = document.getElementById('engine-status-badge');
  if (sourceBadge) {
    sourceBadge.textContent = '● RULE-BASED INGREDIENT ENGINE';
    sourceBadge.className = 'status-pill';
  }

  const causesUl = document.getElementById('list-causes');
  causesUl.innerHTML = '';
  const causesList = Array.isArray(data.root_causes) ? data.root_causes : [data.root_causes].filter(Boolean);
  causesList.forEach(c => {
    const li = document.createElement('li');
    li.textContent = String(c);
    causesUl.appendChild(li);
  });

  const morningEl = document.getElementById('disp-routine-morning');
  const eveningEl = document.getElementById('disp-routine-evening');
  const lifestyleEl = document.getElementById('disp-routine-lifestyle');
  if (morningEl) morningEl.textContent = data.routine?.morning || 'Gentle cleansing and barrier hydration';
  if (eveningEl) eveningEl.textContent = data.routine?.evening || 'Restorative recovery and skin calming';
  if (lifestyleEl) lifestyleEl.textContent = data.routine?.lifestyle || 'Hydration and adequate sleep recovery';

  // Safe eCommerce Cards or Explicit Healthy Banner based on assessment_status
  const pContainer = document.getElementById('products-container');
  pContainer.innerHTML = '';

  if (data.assessment_status === 'optimal_balance') {
    const emptyBanner = document.createElement('div');
    emptyBanner.style.cssText = 'grid-column: 1 / -1; text-align: center; color: #64ffda; padding: 24px; font-size: 0.95rem; border: 1px dashed rgba(100, 255, 218, 0.3); border-radius: 8px; background: rgba(100, 255, 218, 0.05);';
    emptyBanner.innerHTML = '<i class="fa-solid fa-circle-check" style="margin-right: 8px; font-size: 1.1rem;"></i> <strong>Available scores meet the prototype\'s rule thresholds.</strong> No targeted product suggestions for the evaluated categories.';
    pContainer.appendChild(emptyBanner);
    return;
  }

  const recs = Array.isArray(data.recommendations) ? data.recommendations : [];
  if (recs.length === 0) {
    const emptyBanner = document.createElement('div');
    emptyBanner.style.cssText = 'grid-column: 1 / -1; text-align: center; color: #8892b0; padding: 24px; font-size: 0.95rem; border: 1px dashed rgba(255, 255, 255, 0.15); border-radius: 8px;';
    emptyBanner.innerHTML = '<i class="fa-solid fa-circle-info" style="margin-right: 8px;"></i> No targeted product suggestions for the available skin scores.';
    pContainer.appendChild(emptyBanner);
    return;
  }

  recs.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'product-card';

    const infoDiv = document.createElement('div');

    const badgeRow = document.createElement('div');
    badgeRow.className = 'prod-badge-row';

    const tagPill = document.createElement('span');
    tagPill.className = 'tag-pill';
    tagPill.textContent = String(prod.tag || 'Active Ingredient');

    badgeRow.appendChild(tagPill);

    const nameDiv = document.createElement('div');
    nameDiv.className = 'prod-name';
    nameDiv.textContent = String(prod.product_name || '');

    const brandDiv = document.createElement('brand');
    brandDiv.className = 'prod-brand';
    brandDiv.textContent = String(prod.brand || '');

    const ingDiv = document.createElement('div');
    ingDiv.className = 'prod-ingredients';
    const strongEl = document.createElement('strong');
    strongEl.textContent = 'Active Ingredients: ';
    ingDiv.appendChild(strongEl);
    ingDiv.appendChild(document.createTextNode(String(prod.active_ingredients || '')));

    const purposeDiv = document.createElement('div');
    purposeDiv.className = 'prod-purpose';
    purposeDiv.textContent = String(prod.purpose || '');

    infoDiv.appendChild(badgeRow);
    infoDiv.appendChild(nameDiv);
    infoDiv.appendChild(brandDiv);
    infoDiv.appendChild(ingDiv);
    infoDiv.appendChild(purposeDiv);

    // Global Search Link (Google Search)
    const buyLink = document.createElement('a');
    buyLink.className = 'buy-btn';
    buyLink.target = '_blank';
    buyLink.rel = 'noopener noreferrer';
    const rawUrl = String(prod.buy_url || '');
    if (rawUrl.startsWith('https://')) {
      buyLink.href = rawUrl;
    } else {
      buyLink.href = `https://www.google.com/search?q=${encodeURIComponent(prod.product_name || 'skincare')}`;
    }
    buyLink.textContent = 'Search Product on Google (Global Retailers)';

    card.appendChild(infoDiv);
    card.appendChild(buyLink);
    pContainer.appendChild(card);
  });
}

// Mask Overlay Drawing
function toggleMask(type) {
  document.querySelectorAll('.mask-btn').forEach(b => b.classList.remove('active'));

  if (activeMask === type) {
    clearMasks();
    return;
  }
  activeMask = type;
  if (typeof event !== 'undefined' && event && event.target) {
    event.target.closest('.mask-btn')?.classList.add('active');
  }

  const maskFileMap = {
    oiliness: { file: 'oiliness_output.png', color: 'rgba(255, 204, 0, 0.55)' },
    dark_circle: { file: 'dark_circle_v2_output.png', color: 'rgba(59, 130, 246, 0.55)' },
    pore: { file: 'pore_output.png', color: 'rgba(239, 68, 68, 0.65)' },
    redness: { file: 'redness_output.png', color: 'rgba(16, 185, 129, 0.55)' }
  };

  const conf = maskFileMap[type];
  if (!conf) return;

  let src = currentMasks[conf.file];
  if (!src) {
    console.warn(`[Mask] ${type} mask data was not included in this analysis.`);
    clearMasks();
    return;
  }
  drawMaskOnCanvas(src, conf.color);
}

function clearMasks() {
  activeMask = null;
  currentRenderToken++;
  document.querySelectorAll('.mask-btn').forEach(b => b.classList.remove('active'));
  const ctx = maskCanvas.getContext('2d');
  ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
}

function drawMaskOnCanvas(imgSrc, tintColor) {
  const token = ++currentRenderToken;
  const img = new Image();
  img.onload = () => {
    if (token !== currentRenderToken || !activeMask) return;
    maskCanvas.width = video.clientWidth || 480;
    maskCanvas.height = video.clientHeight || 480;
    const ctx = maskCanvas.getContext('2d');
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    const off = document.createElement('canvas');
    off.width = img.width;
    off.height = img.height;
    const octx = off.getContext('2d');

    octx.drawImage(img, 0, 0);
    octx.globalCompositeOperation = 'source-in';
    octx.fillStyle = tintColor;
    octx.fillRect(0, 0, off.width, off.height);

    ctx.drawImage(off, 0, 0, maskCanvas.width, maskCanvas.height);
  };
  img.src = imgSrc;
}

// Start on load
window.addEventListener('load', () => {
  startWebcam();
  updateWearable();
});
