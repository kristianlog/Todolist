// ===== GREENKEEPER - Map & Infrastructure =====

window.map = null;
window.droneImageUrl = null;
let droneOverlayLayer = null;
let droneOverlayVisible = true;
let satelliteLayer = null;
let satelliteVisible = false;
let streetLayer = null;
let locationMarker = null;
let infraMarkers = [];
let infraData = [];
let currentFilter = 'all';
let currentViewInfraId = null;

// Pin mode state
let pinModeActive = false;
let pinSelectedType = 'drain';

// --- Initialize Leaflet Map ---
function initMap() {
  window.map = L.map('map', {
    zoomControl: false,
    attributionControl: false
  }).setView([59.9, 10.7], 15); // Default: Norway area

  // Street tile layer (default)
  streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 22,
    maxNativeZoom: 19
  }).addTo(window.map);

  // Satellite tile layer (Esri)
  satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 22,
    maxNativeZoom: 19,
    attribution: '© Esri'
  });

  // Attribution in corner
  L.control.attribution({ position: 'bottomleft', prefix: false })
    .addAttribution('© OpenStreetMap / Esri')
    .addTo(window.map);

  // Zoom control on right
  L.control.zoom({ position: 'topright' }).addTo(window.map);

  // Load drone overlay if available
  if (localStorage.getItem('gk_drone_image')) {
    loadDroneFromIDB().then(function(dataUrl) {
      if (dataUrl) {
        window.droneImageUrl = dataUrl;
        updateDroneOverlay();
      }
    });
  }

  // Load infrastructure markers
  loadInfrastructure();

  // Try to center on user location
  locateMe(true);
}

// --- GPS Location ---
function locateMe(silent) {
  if (!navigator.geolocation) {
    if (!silent) showToast(t('gpsError'));
    return;
  }

  navigator.geolocation.getCurrentPosition(function(pos) {
    var lat = pos.coords.latitude;
    var lng = pos.coords.longitude;

    window.map.setView([lat, lng], 17);

    // Update or create location marker
    if (locationMarker) {
      locationMarker.setLatLng([lat, lng]);
    } else {
      var pulseIcon = L.divIcon({
        className: '',
        html: '<div class="location-pulse"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      locationMarker = L.marker([lat, lng], { icon: pulseIcon, zIndexOffset: 1000 })
        .addTo(window.map);
    }
  }, function() {
    if (!silent) showToast(t('gpsError'));
  }, { enableHighAccuracy: true, timeout: 10000 });
}

// --- Satellite Layer Toggle ---
function toggleSatelliteLayer() {
  var btn = document.getElementById('satelliteToggleBtn');
  if (satelliteVisible) {
    window.map.removeLayer(satelliteLayer);
    btn.classList.remove('active-layer');
    satelliteVisible = false;
  } else {
    window.map.addLayer(satelliteLayer);
    streetLayer.bringToBack();
    btn.classList.add('active-layer');
    satelliteVisible = true;
  }
}

// --- Drone Overlay ---
function updateDroneOverlay() {
  if (droneOverlayLayer) {
    window.map.removeLayer(droneOverlayLayer);
    droneOverlayLayer = null;
  }

  var bounds = JSON.parse(localStorage.getItem('gk_drone_bounds') || 'null');
  if (!bounds || !window.droneImageUrl) return;

  var imageBounds = [
    [bounds.swLat, bounds.swLng],
    [bounds.neLat, bounds.neLng]
  ];

  droneOverlayLayer = L.imageOverlay(window.droneImageUrl, imageBounds, {
    opacity: 0.85,
    interactive: false
  });

  if (droneOverlayVisible) {
    droneOverlayLayer.addTo(window.map);
  }
}

function toggleDroneOverlay() {
  if (!droneOverlayLayer && !window.droneImageUrl) {
    showToast(t('uploadDrone'));
    return;
  }

  droneOverlayVisible = !droneOverlayVisible;
  var btn = document.getElementById('droneToggleBtn');

  if (droneOverlayVisible && droneOverlayLayer) {
    droneOverlayLayer.addTo(window.map);
    btn.classList.add('active-layer');
  } else if (droneOverlayLayer) {
    window.map.removeLayer(droneOverlayLayer);
    btn.classList.remove('active-layer');
  }
}

// --- Infrastructure Markers ---
function createInfraIcon(type) {
  var info = INFRA_TYPES[type] || INFRA_TYPES.drain;
  return L.divIcon({
    className: '',
    html: '<div class="infra-marker" style="background:' + info.color + '">' + info.emoji + '</div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
}

async function loadInfrastructure() {
  try {
    infraData = await localDB.getAll('infrastructure');
  } catch (e) {
    console.warn('Failed to load infrastructure:', e);
    infraData = [];
  }
  renderInfraMarkers();
}

function renderInfraMarkers() {
  // Clear existing markers
  infraMarkers.forEach(function(m) { window.map.removeLayer(m); });
  infraMarkers = [];

  infraData.forEach(function(item) {
    if (currentFilter !== 'all' && item.type !== currentFilter) return;

    var marker = L.marker([item.lat, item.lng], {
      icon: createInfraIcon(item.type)
    }).addTo(window.map);

    marker.on('click', function() {
      openViewInfraModal(item);
    });

    infraMarkers.push(marker);
  });
}

function filterInfra(type) {
  currentFilter = type;

  // Update active chip
  document.querySelectorAll('.filter-chip').forEach(function(chip) {
    chip.classList.toggle('active', chip.getAttribute('data-filter') === type);
  });

  renderInfraMarkers();
}

// --- Pin Mode ---
function togglePinMode() {
  pinModeActive = !pinModeActive;
  var btn = document.getElementById('pinModeBtn');
  var crosshair = document.getElementById('pinCrosshair');
  var typeBar = document.getElementById('pinTypeBar');

  if (pinModeActive) {
    btn.classList.add('active');
    crosshair.classList.add('visible');
    typeBar.classList.add('visible');
    showToast(t('pinModeOn'));
  } else {
    btn.classList.remove('active');
    crosshair.classList.remove('visible');
    typeBar.classList.remove('visible');
  }
}

function selectPinType(type) {
  pinSelectedType = type;
  document.querySelectorAll('.pin-type-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-pin-type') === type);
  });
}

// Drop a pin at current GPS location
function dropPinAtCurrentLocation() {
  if (!navigator.geolocation) {
    showToast(t('gpsError'));
    return;
  }

  navigator.geolocation.getCurrentPosition(async function(pos) {
    var lat = pos.coords.latitude;
    var lng = pos.coords.longitude;

    var item = {
      type: pinSelectedType,
      lat: lat,
      lng: lng,
      note: '',
      photoUrl: '',
      createdAt: Date.now()
    };

    try {
      var saved = await localDB.add('infrastructure', item);
      infraData.unshift(saved);
      renderInfraMarkers();

      // Center map on the new pin
      window.map.setView([lat, lng], window.map.getZoom());

      var typeInfo = INFRA_TYPES[pinSelectedType] || INFRA_TYPES.drain;
      showToast(typeInfo.emoji + ' ' + t(pinSelectedType) + ' ' + t('saved'));
    } catch (e) {
      console.error('Pin save failed:', e);
      showToast('Error saving pin');
    }
  }, function() {
    showToast(t('gpsError'));
  }, { enableHighAccuracy: true, timeout: 15000 });
}

// Handle map click in pin mode - drop pin at tapped location
function handleMapClickForPin(e) {
  if (!pinModeActive) return;

  var lat = e.latlng.lat;
  var lng = e.latlng.lng;

  var item = {
    type: pinSelectedType,
    lat: lat,
    lng: lng,
    note: '',
    photoUrl: '',
    createdAt: Date.now()
  };

  localDB.add('infrastructure', item).then(function(saved) {
    infraData.unshift(saved);
    renderInfraMarkers();
    var typeInfo = INFRA_TYPES[pinSelectedType] || INFRA_TYPES.drain;
    showToast(typeInfo.emoji + ' ' + t(pinSelectedType) + ' ' + t('saved'));
  }).catch(function(e) {
    console.error('Pin save failed:', e);
  });
}

// --- Add Infrastructure Modal ---
function openAddInfraModal() {
  document.getElementById('addInfraModal').style.display = 'flex';
  document.getElementById('infraType').value = '';
  document.getElementById('infraNote').value = '';
  document.getElementById('infraPhoto').value = '';
  document.getElementById('infraPhotoPreview').innerHTML = '';
  document.getElementById('infraLat').value = '';
  document.getElementById('infraLng').value = '';

  var gpsEl = document.getElementById('gpsStatus');
  gpsEl.textContent = t('gpsWaiting');
  gpsEl.className = 'gps-status';

  // Get GPS
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(pos) {
      document.getElementById('infraLat').value = pos.coords.latitude;
      document.getElementById('infraLng').value = pos.coords.longitude;
      gpsEl.textContent = '📍 ' + pos.coords.latitude.toFixed(6) + ', ' + pos.coords.longitude.toFixed(6);
      gpsEl.className = 'gps-status success';
    }, function() {
      gpsEl.textContent = t('gpsError');
      gpsEl.className = 'gps-status error';
    }, { enableHighAccuracy: true, timeout: 15000 });
  } else {
    gpsEl.textContent = t('gpsError');
    gpsEl.className = 'gps-status error';
  }

  // Photo preview
  document.getElementById('infraPhoto').onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function() {
      document.getElementById('infraPhotoPreview').innerHTML =
        '<img src="' + reader.result + '" alt="preview">';
    };
    reader.readAsDataURL(file);
  };
}

function closeAddInfraModal() {
  document.getElementById('addInfraModal').style.display = 'none';
}

async function saveInfrastructure() {
  var type = document.getElementById('infraType').value;
  var note = document.getElementById('infraNote').value.trim();
  var lat = parseFloat(document.getElementById('infraLat').value);
  var lng = parseFloat(document.getElementById('infraLng').value);
  var photoFile = document.getElementById('infraPhoto').files[0];

  if (!type) {
    showToast(t('selectType'));
    return;
  }
  if (isNaN(lat) || isNaN(lng)) {
    showToast(t('gpsError'));
    return;
  }

  var photoUrl = '';
  if (photoFile) {
    try {
      photoUrl = await localDB.uploadImage(photoFile);
    } catch (e) {
      console.warn('Photo upload failed:', e);
    }
  }

  var item = {
    type: type,
    lat: lat,
    lng: lng,
    note: note,
    photoUrl: photoUrl,
    createdAt: Date.now()
  };

  try {
    var saved = await localDB.add('infrastructure', item);
    infraData.unshift(saved);
    renderInfraMarkers();
    closeAddInfraModal();
    showToast(t('saved'));
  } catch (e) {
    console.error('Save failed:', e);
    showToast('Error saving');
  }
}

// --- View Infrastructure Modal ---
function openViewInfraModal(item) {
  currentViewInfraId = item.id;

  var typeInfo = INFRA_TYPES[item.type] || INFRA_TYPES.drain;
  document.getElementById('viewInfraTitle').textContent = t(item.type);

  var badge = document.getElementById('viewInfraType');
  badge.textContent = typeInfo.emoji + ' ' + t(item.type);
  badge.style.background = typeInfo.color;

  document.getElementById('viewInfraCoords').textContent =
    t('coordinates') + ': ' + item.lat.toFixed(6) + ', ' + item.lng.toFixed(6);

  document.getElementById('viewInfraDate').textContent =
    t('addedOn') + ': ' + new Date(item.createdAt).toLocaleDateString();

  document.getElementById('viewInfraNote').textContent = item.note || '';

  var photoEl = document.getElementById('viewInfraPhoto');
  if (item.photoUrl) {
    photoEl.innerHTML = '<img src="' + item.photoUrl + '" alt="photo" onclick="openImageModal(this.src)">';
  } else {
    photoEl.innerHTML = '<p style="color:#94a3b8">' + t('noPhoto') + '</p>';
  }

  document.getElementById('viewInfraModal').style.display = 'flex';
}

function closeViewInfraModal() {
  document.getElementById('viewInfraModal').style.display = 'none';
  currentViewInfraId = null;
}

async function deleteCurrentInfra() {
  if (!currentViewInfraId) return;
  if (!confirm(t('deleteConfirm'))) return;

  try {
    await localDB.remove('infrastructure', currentViewInfraId);
    infraData = infraData.filter(function(i) { return i.id !== currentViewInfraId; });
    renderInfraMarkers();
    closeViewInfraModal();
    showToast(t('delete') + ' ✓');
  } catch (e) {
    console.error('Delete failed:', e);
  }
}

// --- Setup map click listener after map init ---
var _origInitMap = initMap;
initMap = function() {
  _origInitMap();
  // Listen for map clicks for pin mode
  window.map.on('click', handleMapClickForPin);
};
