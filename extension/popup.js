    // Mock data for initial rendering in case background is not available (dev mode)
    let mockEvents = [
      { id: '1', site: 'example.com', type: 'oauth', risk: 'high', status: 'granted', timestamp: Date.now() - 3600000, capability: 'Read Email', dataCollected: 'Email address, Profile', statedPurpose: 'Login', inferredPurpose: 'Marketing targeting', confidence: 0.6, aiTrainingUse: true },
      { id: '2', site: 'shop.net', type: 'cookie', risk: 'medium', status: 'granted', timestamp: Date.now() - 86400000, capability: 'Cross-site tracking', dataCollected: 'Browsing history', statedPurpose: 'Analytics', inferredPurpose: 'Analytics', confidence: 0.9, aiTrainingUse: false },
      { id: '3', site: 'news.org', type: 'browser', risk: 'low', status: 'denied', timestamp: Date.now() - 172800000, capability: 'Notifications', dataCollected: 'None', statedPurpose: 'Alerts', inferredPurpose: 'Alerts', confidence: 0.95, aiTrainingUse: false },
      { id: '4', site: 'social.com', type: 'policy', risk: 'high', status: 'granted', timestamp: Date.now() - 500000, capability: 'Data sharing', dataCollected: 'All activity', statedPurpose: 'Improve service', inferredPurpose: 'AI Model Training', confidence: 0.85, aiTrainingUse: true },
      { id: '5', site: 'app.io', type: 'terms', risk: 'low', status: 'granted', timestamp: Date.now() - 10000, capability: 'Account creation', dataCollected: 'Basic profile', statedPurpose: 'Service delivery', inferredPurpose: 'Service delivery', confidence: 0.9, aiTrainingUse: false }
    ];
    let mockPrefs = {
      privacyLevel: 'balanced',
      blockAds: true,
      blockAnalytics: false,
      showIndicator: true,
      notifications: true,
      threshold: 'medium'
    };

    // State
    let events = [];
    let preferences = {};
    let currentFilter = 'all';

    // Normalize events from background format to popup format
    function normalizeEvent(e) {
      // If already normalized (mock data), return as-is
      if (e.site) return e;
      
      // Map capability object to readable string
      let capStr = '';
      const cap = e.capability || {};
      if (cap.type === 'oauth') capStr = (cap.scope || []).join(', ');
      else if (cap.type === 'browser-permission') capStr = cap.permission || '';
      else if (cap.type === 'cookie') capStr = `${cap.category || ''} cookie${cap.name ? ` (${cap.name})` : ''}`;
      else if (cap.type === 'policy') capStr = cap.practice || '';
      else if (cap.type === 'terms') capStr = cap.clause || '';

      // Map consentType to short type used by popup badges
      let typeStr = e.consentType || cap.type || 'unknown';
      if (typeStr === 'browser-permission') typeStr = 'browser';

      const purpose = e.purpose || {};

      return {
        id: e.id,
        site: e.website || '',
        type: typeStr,
        risk: e.riskLevel || 'low',
        status: e.grantStatus || 'unknown',
        timestamp: new Date(e.timestamp).getTime(),
        capability: capStr,
        dataCollected: e.dataCollected || '',
        statedPurpose: purpose.stated || '',
        inferredPurpose: purpose.inferred || '',
        confidence: purpose.confidence || 1,
        aiTrainingUse: !!e.aiTrainingUse,
      };
    }

    // Utility: Send message to background
    function sendMessage(action, data = {}) {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action, ...data }, resolve);
        } else {
          // Fallback for local testing outside extension
          console.log(`[Mock] Action: ${action}`, data);
          if (action === 'getEvents') resolve({ events: mockEvents });
          else if (action === 'getPreferences') resolve({ preferences: mockPrefs });
          else if (action === 'revokeConsent') {
            const ev = mockEvents.find(e => e.id === data.eventId);
            if (ev) ev.status = 'revoked';
            resolve({ success: true });
          }
          else if (action === 'clearData') {
            mockEvents = [];
            resolve({ success: true });
          }
          else if (action === 'resetDemo') resolve({ success: true });
          else resolve({ success: true });
        }
      });
    }

    // Initialization
    async function init() {
      // Show loader
      document.getElementById('loading').style.display = 'flex';
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));

      // Fetch data
      const evRes = await sendMessage('getEvents');
      if (evRes && evRes.events) {
        events = evRes.events.map(normalizeEvent).sort((a,b) => b.timestamp - a.timestamp);
      }
      
      const prefRes = await sendMessage('getPreferences');
      if (prefRes && prefRes.preferences) {
        // Normalize preference keys
        const p = prefRes.preferences;
        preferences = {
          privacyLevel: p.privacyLevel || 'balanced',
          blockAds: p.blockAds ?? p.autoBlock?.advertising ?? true,
          blockAnalytics: p.blockAnalytics ?? p.autoBlock?.analytics ?? false,
          showIndicator: p.showIndicator ?? true,
          notifications: p.notifications ?? true,
          threshold: p.threshold ?? p.riskThreshold ?? 'medium',
        };
      }

      // Hide loader and show default tab
      document.getElementById('loading').style.display = 'none';
      switchTab('dashboard');

      renderAll();
      setupEventListeners();
    }

    // Render functions
    function renderAll() {
      calculateAndRenderScore();
      renderDashboard();
      renderPermissions();
      renderSites();
      renderSettings();
    }

    function calculateAndRenderScore() {
      if (!events.length) {
        setScoreUI(100);
        return;
      }
      
      let score = 100;
      let totalRiskWeight = 0;
      
      events.forEach(e => {
        if (e.status === 'granted') {
          if (e.risk === 'high') totalRiskWeight += 15;
          else if (e.risk === 'medium') totalRiskWeight += 5;
          else if (e.risk === 'low') totalRiskWeight += 1;
        }
      });

      // Normalize score
      score = Math.max(0, Math.min(100, 100 - totalRiskWeight));
      setScoreUI(Math.round(score));
    }

    function setScoreUI(score) {
      const circle = document.getElementById('privacy-score-circle');
      const val = document.getElementById('privacy-score-val');
      
      let color = 'var(--success)';
      if (score < 50) color = 'var(--danger)';
      else if (score < 80) color = 'var(--warning)';

      // Animate score counting
      let current = 0;
      const interval = setInterval(() => {
        current += 2;
        if (current >= score) {
          current = score;
          clearInterval(interval);
        }
        val.innerText = current;
        
        const deg = (current / 100) * 360;
        circle.style.background = `conic-gradient(${color} 0%, ${color} ${deg}deg, var(--border) ${deg}deg)`;
        val.style.color = color;
      }, 20);
    }

    function renderDashboard() {
      const total = events.length;
      const highRisk = events.filter(e => e.risk === 'high' && e.status === 'granted').length;
      const denied = events.filter(e => e.status === 'denied').length;
      const sites = new Set(events.map(e => e.site)).size;

      document.getElementById('stat-total').innerText = total;
      document.getElementById('stat-risk').innerText = highRisk;
      document.getElementById('stat-denied').innerText = denied;
      document.getElementById('stat-sites').innerText = sites;

      // Risk Bar
      const granted = events.filter(e => e.status === 'granted');
      const gTotal = granted.length || 1; // avoid div by 0
      const lowP = (granted.filter(e => e.risk === 'low').length / gTotal) * 100;
      const medP = (granted.filter(e => e.risk === 'medium').length / gTotal) * 100;
      const highP = (granted.filter(e => e.risk === 'high').length / gTotal) * 100;

      setTimeout(() => {
        document.getElementById('bar-low').style.width = `${lowP}%`;
        document.getElementById('bar-medium').style.width = `${medP}%`;
        document.getElementById('bar-high').style.width = `${highP}%`;
      }, 100);

      document.getElementById('leg-low').innerText = `Low (${Math.round(lowP)}%)`;
      document.getElementById('leg-med').innerText = `Med (${Math.round(medP)}%)`;
      document.getElementById('leg-high').innerText = `High (${Math.round(highP)}%)`;

      // Recent Activity
      const list = document.getElementById('recent-activity-list');
      list.innerHTML = '';
      if (events.length === 0) {
        list.innerHTML = '<div class="empty-state">No activity yet</div>';
        return;
      }
      events.slice(0, 5).forEach(e => {
        list.appendChild(createEventCard(e));
      });
    }

    function renderPermissions() {
      const list = document.getElementById('permissions-list');
      list.innerHTML = '';
      
      const filtered = currentFilter === 'all' 
        ? events 
        : events.filter(e => e.type === currentFilter);

      if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state">No permissions found matching this filter</div>';
        return;
      }

      filtered.forEach(e => {
        list.appendChild(createEventCard(e, true));
      });
    }

    function renderSites() {
      const list = document.getElementById('sites-list');
      list.innerHTML = '';

      const siteMap = {};
      events.forEach(e => {
        if (!siteMap[e.site]) siteMap[e.site] = [];
        siteMap[e.site].push(e);
      });

      const sites = Object.keys(siteMap).sort();
      if (sites.length === 0) {
        list.innerHTML = '<div class="empty-state">No sites tracked yet</div>';
        return;
      }

      sites.forEach(site => {
        const siteEvents = siteMap[site];
        const highRisk = siteEvents.filter(e => e.risk === 'high' && e.status === 'granted').length;
        
        const el = document.createElement('div');
        el.className = `event-card ${highRisk > 0 ? 'risk-high' : 'risk-low'}`;
        el.innerHTML = `
          <div class="event-header" style="cursor: pointer;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'block' ? 'none' : 'block'">
            <img class="favicon" src="https://www.google.com/s2/favicons?domain=${site}&sz=32" alt="">
            <div class="event-title">${site}</div>
            <div class="time-ago">${siteEvents.length} items</div>
          </div>
          <div class="expandable-content" style="display: none;">
            ${siteEvents.map(e => `
              <div style="font-size: 12px; margin-bottom: 4px; display: flex; justify-content: space-between;">
                <span>• ${e.type} - ${e.capability}</span>
                <span class="badge badge-${e.status === 'granted' ? 'granted' : e.status === 'denied' ? 'denied' : 'terms'}">${e.status}</span>
              </div>
            `).join('')}
          </div>
        `;
        list.appendChild(el);
      });
    }

    function renderSettings() {
      // Sync UI with preferences object
      document.querySelectorAll('input[name="privacyLevel"]').forEach(el => {
        if (el.value === preferences.privacyLevel) el.checked = true;
      });
      document.getElementById('pref-block-ads').checked = preferences.blockAds;
      document.getElementById('pref-block-analytics').checked = preferences.blockAnalytics;
      document.getElementById('pref-show-indicator').checked = preferences.showIndicator;
      document.getElementById('pref-notifications').checked = preferences.notifications;
      document.getElementById('pref-threshold').value = preferences.threshold || 'medium';
    }

    // Helper: Create DOM for an event card
    function createEventCard(e, detailed = false) {
      const card = document.createElement('div');
      card.className = `event-card risk-${e.risk} ${e.status === 'revoked' ? 'revoked' : ''}`;
      
      const timeStr = getTimeAgo(e.timestamp);
      const isGranted = e.status === 'granted';

      // Purpose mismatch warning
      let purposeWarnHTML = '';
      if (e.confidence && e.confidence < 0.8 && e.inferredPurpose) {
        purposeWarnHTML = `<div class="purpose-warning">⚠️ Stated: ${e.statedPurpose} vs Inferred: ${e.inferredPurpose}</div>`;
      }

      // AI warning
      let aiWarnHTML = '';
      if (e.aiTrainingUse) {
        aiWarnHTML = `<div class="ai-warning">🤖 Data may be used for AI training</div>`;
      }

      card.innerHTML = `
        <div class="event-header">
          <img class="favicon" src="https://www.google.com/s2/favicons?domain=${e.site}&sz=32" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'">
          <div class="event-title">${e.site}</div>
          <span class="badge badge-${e.type}">${e.type}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div style="font-size: 13px;">${e.capability || e.statedPurpose}</div>
          <div class="time-ago">${timeStr}</div>
        </div>
        <div style="display: flex; gap: 4px;">
          <span class="badge badge-${isGranted ? 'granted' : e.status === 'denied' ? 'denied' : 'terms'}">${e.status}</span>
          ${detailed ? `<button class="expand-btn" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'block' ? 'none' : 'block'">Details ▼</button>
          <div class="expandable-content">
            <div class="event-details">
              <div><strong>Data:</strong> ${e.dataCollected || 'Unknown'}</div>
              <div><strong>Risk:</strong> <span style="text-transform: capitalize">${e.risk}</span></div>
            </div>
            ${purposeWarnHTML}
            ${aiWarnHTML}
          </div>` : ''}
        </div>
        ${isGranted ? `<button class="revoke-btn" data-id="${e.id}">Revoke</button>` : ''}
      `;

      // Attach revoke handler
      const revokeBtn = card.querySelector('.revoke-btn');
      if (revokeBtn) {
        revokeBtn.addEventListener('click', async (evt) => {
          evt.stopPropagation();
          revokeBtn.innerText = 'Revoking...';
          await sendMessage('revokeConsent', { eventId: e.id });
          e.status = 'revoked';
          renderAll(); // Re-render to show updated status
        });
      }

      return card;
    }

    // Tab Switching
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
      });
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`tab-${tabId}`).classList.add('active');
    }

    // Setup Event Listeners
    function setupEventListeners() {
      // Tabs
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
      });

      // Filters
      document.querySelectorAll('.filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentFilter = btn.dataset.filter;
          renderPermissions();
        });
      });

      // Settings Changes
      const updateSettings = () => {
        preferences = {
          privacyLevel: document.querySelector('input[name="privacyLevel"]:checked').value,
          blockAds: document.getElementById('pref-block-ads').checked,
          blockAnalytics: document.getElementById('pref-block-analytics').checked,
          showIndicator: document.getElementById('pref-show-indicator').checked,
          notifications: document.getElementById('pref-notifications').checked,
          threshold: document.getElementById('pref-threshold').value
        };
        sendMessage('updatePreferences', { preferences });
      };

      document.querySelectorAll('input[name="privacyLevel"]').forEach(el => el.addEventListener('change', updateSettings));
      ['pref-block-ads', 'pref-block-analytics', 'pref-show-indicator', 'pref-notifications'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateSettings);
      });
      document.getElementById('pref-threshold').addEventListener('change', updateSettings);

      // Export
      document.getElementById('btn-export').addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "privacy_report.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      });

      // Clear Data
      document.getElementById('btn-clear').addEventListener('click', async () => {
        if (confirm("Are you sure you want to clear all consent data?")) {
          await sendMessage('clearAllData');
          events = [];
          renderAll();
        }
      });
    }

    // Utility
    function getTimeAgo(ts) {
      const diff = Date.now() - ts;
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    }

    // Start
    document.addEventListener('DOMContentLoaded', init);
