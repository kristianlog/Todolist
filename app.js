// ===== GREENKEEPER - Core App Logic =====

let currentLang = localStorage.getItem('gk_lang') || 'en';
let mapInitialized = false;

// --- Initialize app ---
window.addEventListener('load', function() {
  applyLanguage(currentLang);
  loadTasks();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function(err) {
      console.log('SW registration failed:', err);
    });
  }

  // Load saved drone bounds
  loadDroneBounds();
});

// --- View Navigation ---
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });

  document.getElementById(viewId).classList.add('active');
  document.querySelector('[data-view="' + viewId + '"]').classList.add('active');

  // Initialize map on first visit
  if (viewId === 'mapView' && !mapInitialized) {
    initMap();
    mapInitialized = true;
  }
  // Refresh map size when switching to it
  if (viewId === 'mapView' && window.map) {
    setTimeout(function() { window.map.invalidateSize(); }, 100);
  }
}

// --- Language System ---
function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'no' : 'en';
  applyLanguage(currentLang);
}

function setLanguage(lang) {
  currentLang = lang;
  applyLanguage(lang);
}

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('gk_lang', lang);

  // Update toggle button
  document.getElementById('langToggle').textContent = lang === 'en' ? 'NO' : 'EN';

  // Update language buttons in settings
  document.getElementById('langEN').classList.toggle('active', lang === 'en');
  document.getElementById('langNO').classList.toggle('active', lang === 'no');

  // Update all data-lang elements
  document.querySelectorAll('[data-lang]').forEach(function(el) {
    var key = el.getAttribute('data-lang');
    if (LANG[lang][key]) {
      el.textContent = LANG[lang][key];
    }
  });

  // Update all data-lang-placeholder elements
  document.querySelectorAll('[data-lang-placeholder]').forEach(function(el) {
    var key = el.getAttribute('data-lang-placeholder');
    if (LANG[lang][key]) {
      el.placeholder = LANG[lang][key];
    }
  });
}

function t(key) {
  return LANG[currentLang][key] || LANG['en'][key] || key;
}

// --- Toast Notifications ---
function showToast(message) {
  var existing = document.querySelector('.toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 2600);
}

// --- Image Lightbox ---
function openImageModal(src) {
  document.getElementById('lightboxImage').src = src;
  document.getElementById('imageModal').style.display = 'flex';
}

function closeImageModal() {
  document.getElementById('imageModal').style.display = 'none';
  document.getElementById('lightboxImage').src = '';
}

// --- Drone Bounds (Settings) ---
function loadDroneBounds() {
  var bounds = JSON.parse(localStorage.getItem('gk_drone_bounds') || 'null');
  if (bounds) {
    document.getElementById('swLat').value = bounds.swLat || '';
    document.getElementById('swLng').value = bounds.swLng || '';
    document.getElementById('neLat').value = bounds.neLat || '';
    document.getElementById('neLng').value = bounds.neLng || '';
  }
}

function setBoundsFromGPS(corner) {
  if (!navigator.geolocation) {
    showToast(t('gpsError'));
    return;
  }
  navigator.geolocation.getCurrentPosition(function(pos) {
    if (corner === 'sw') {
      document.getElementById('swLat').value = pos.coords.latitude.toFixed(6);
      document.getElementById('swLng').value = pos.coords.longitude.toFixed(6);
    } else {
      document.getElementById('neLat').value = pos.coords.latitude.toFixed(6);
      document.getElementById('neLng').value = pos.coords.longitude.toFixed(6);
    }
    showToast(corner.toUpperCase() + ' set from GPS');
  }, function() {
    showToast(t('gpsError'));
  }, { enableHighAccuracy: true });
}

function applyDroneBounds() {
  var bounds = {
    swLat: parseFloat(document.getElementById('swLat').value),
    swLng: parseFloat(document.getElementById('swLng').value),
    neLat: parseFloat(document.getElementById('neLat').value),
    neLng: parseFloat(document.getElementById('neLng').value)
  };

  if (isNaN(bounds.swLat) || isNaN(bounds.swLng) || isNaN(bounds.neLat) || isNaN(bounds.neLng)) {
    showToast('Please fill in all coordinates');
    return;
  }

  localStorage.setItem('gk_drone_bounds', JSON.stringify(bounds));

  // Update drone overlay on map if it exists
  if (window.map && window.droneImageUrl) {
    updateDroneOverlay();
  }

  showToast(t('saved'));
}

function handleDroneUpload(event) {
  var file = event.target.files[0];
  if (!file) return;

  var statusEl = document.getElementById('droneStatus');
  statusEl.textContent = 'Processing...';

  // Store as data URL for local use (or upload to Firebase)
  var reader = new FileReader();
  reader.onload = function() {
    window.droneImageUrl = reader.result;
    localStorage.setItem('gk_drone_image', 'uploaded');
    // For large files, we store in IndexedDB
    saveDroneToIDB(reader.result).then(function() {
      statusEl.textContent = '✅ Drone image loaded (' + (file.size / 1024 / 1024).toFixed(1) + ' MB)';
      if (window.map) updateDroneOverlay();
    });
  };
  reader.readAsDataURL(file);
}

// IndexedDB for large drone image
function saveDroneToIDB(dataUrl) {
  return new Promise(function(resolve) {
    var req = indexedDB.open('greenkeeper', 1);
    req.onupgradeneeded = function(e) {
      e.target.result.createObjectStore('files');
    };
    req.onsuccess = function(e) {
      var tx = e.target.result.transaction('files', 'readwrite');
      tx.objectStore('files').put(dataUrl, 'droneImage');
      tx.oncomplete = resolve;
    };
    req.onerror = function() { resolve(); };
  });
}

function loadDroneFromIDB() {
  return new Promise(function(resolve) {
    var req = indexedDB.open('greenkeeper', 1);
    req.onupgradeneeded = function(e) {
      e.target.result.createObjectStore('files');
    };
    req.onsuccess = function(e) {
      var tx = e.target.result.transaction('files', 'readonly');
      var getReq = tx.objectStore('files').get('droneImage');
      getReq.onsuccess = function() { resolve(getReq.result || null); };
      getReq.onerror = function() { resolve(null); };
    };
    req.onerror = function() { resolve(null); };
  });
}

// --- Clear All Data ---
function clearAllData() {
  if (!confirm(t('clearConfirm'))) return;
  localStorage.removeItem('gk_tasks');
  localStorage.removeItem('gk_infrastructure');
  localStorage.removeItem('gk_drone_bounds');
  localStorage.removeItem('gk_drone_image');
  // Clear IDB
  indexedDB.deleteDatabase('greenkeeper');
  showToast('Data cleared');
  location.reload();
}
