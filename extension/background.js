/**
 * ConsentLens Background Service Worker
 * Manages consent event storage, demo data seeding, and message handling.
 */

const DEMO_EVENTS = [
  {
    id: "evt-001",
    website: "google.com",
    consentType: "oauth",
    capability: { type: "oauth", provider: "google", scope: ["email", "profile", "calendar.read", "drive.readonly"] },
    grantStatus: "granted",
    timestamp: "2026-10-03T09:15:00Z",
    riskLevel: "medium",
    dataCollected: "Email, name, profile photo, calendar events, Google Drive files (read-only)",
    purpose: { stated: "Sign in and sync your calendar", inferred: "Data aggregation and ad targeting", confidence: 0.72 }
  },
  {
    id: "evt-002",
    website: "facebook.com",
    consentType: "cookie",
    capability: { type: "cookie", category: "advertising", name: "_fbp", domain: ".facebook.com" },
    grantStatus: "granted",
    timestamp: "2026-10-03T08:30:00Z",
    riskLevel: "high",
    dataCollected: "Browsing behavior, ad interactions, cross-site tracking",
    purpose: { stated: "Personalize your ad experience", inferred: "Cross-site behavioral tracking for ad network", confidence: 0.91 }
  },
  {
    id: "evt-003",
    website: "zoom.in",
    consentType: "browser-permission",
    capability: { type: "browser-permission", permission: "camera" },
    grantStatus: "granted",
    timestamp: "2026-10-03T10:00:00Z",
    riskLevel: "medium",
    dataCollected: "Camera video feed",
    purpose: { stated: "Enable video calls", inferred: "Video conferencing", confidence: 0.95 }
  },
  {
    id: "evt-004",
    website: "zoom.in",
    consentType: "browser-permission",
    capability: { type: "browser-permission", permission: "microphone" },
    grantStatus: "granted",
    timestamp: "2026-10-03T10:00:05Z",
    riskLevel: "medium",
    dataCollected: "Microphone audio feed",
    purpose: { stated: "Enable audio in calls", inferred: "Audio conferencing", confidence: 0.95 }
  },
  {
    id: "evt-005",
    website: "amazon.com",
    consentType: "cookie",
    capability: { type: "cookie", category: "analytics", name: "_amz_sess" },
    grantStatus: "granted",
    timestamp: "2026-10-03T07:45:00Z",
    riskLevel: "low",
    dataCollected: "Shopping behavior, product views, search queries",
    purpose: { stated: "Improve shopping experience", inferred: "Purchase behavior analytics", confidence: 0.85 }
  },
  {
    id: "evt-006",
    website: "linkedin.com",
    consentType: "oauth",
    capability: { type: "oauth", provider: "linkedin", scope: ["r_liteprofile", "r_emailaddress", "w_member_social"] },
    grantStatus: "granted",
    timestamp: "2026-10-02T14:20:00Z",
    riskLevel: "high",
    dataCollected: "Profile data, email, ability to post on your behalf",
    purpose: { stated: "Connect your professional profile", inferred: "Social graph mining and recruitment data", confidence: 0.68 }
  },
  {
    id: "evt-007",
    website: "openai.com",
    consentType: "policy",
    capability: { type: "policy", practice: "ai-training-data-use" },
    grantStatus: "granted",
    timestamp: "2026-10-01T11:00:00Z",
    riskLevel: "high",
    dataCollected: "Conversations, prompts, uploaded files",
    aiTrainingUse: true,
    purpose: { stated: "Improve our AI models", inferred: "Training data for commercial AI products", confidence: 0.88 }
  },
  {
    id: "evt-008",
    website: "spotify.com",
    consentType: "cookie",
    capability: { type: "cookie", category: "functional", name: "sp_t" },
    grantStatus: "granted",
    timestamp: "2026-10-03T06:15:00Z",
    riskLevel: "low",
    dataCollected: "Listening history, preferences",
    purpose: { stated: "Remember your preferences", inferred: "Music recommendation engine", confidence: 0.90 }
  },
  {
    id: "evt-010",
    website: "github.com",
    consentType: "oauth",
    capability: { type: "oauth", provider: "github", scope: ["repo", "user", "read:org"] },
    grantStatus: "granted",
    timestamp: "2026-10-02T16:45:00Z",
    riskLevel: "high",
    dataCollected: "Repository access, user profile, organization membership",
    purpose: { stated: "Access your repositories", inferred: "Full code repository access including private repos", confidence: 0.75 }
  },
  {
    id: "evt-011",
    website: "maps.google.com",
    consentType: "browser-permission",
    capability: { type: "browser-permission", permission: "geolocation" },
    grantStatus: "granted",
    timestamp: "2026-10-03T11:20:00Z",
    riskLevel: "high",
    dataCollected: "Precise GPS location, movement patterns",
    purpose: { stated: "Show your location on the map", inferred: "Location tracking and movement analytics", confidence: 0.70 }
  },
  {
    id: "evt-012",
    website: "notion.so",
    consentType: "terms",
    capability: { type: "terms", clause: "data-portability-limitation" },
    grantStatus: "granted",
    timestamp: "2026-09-28T09:00:00Z",
    riskLevel: "medium",
    dataCollected: "All workspace content, collaboration data",
    purpose: { stated: "Provide workspace services", inferred: "Vendor lock-in through limited export", confidence: 0.65 }
  },
  {
    id: "evt-013",
    website: "instagram.com",
    consentType: "policy",
    capability: { type: "policy", practice: "facial-recognition" },
    grantStatus: "granted",
    timestamp: "2026-10-01T13:30:00Z",
    riskLevel: "high",
    dataCollected: "Facial features, photo metadata, social connections",
    purpose: { stated: "Tag suggestions for your photos", inferred: "Biometric data collection for identity graphing", confidence: 0.78 }
  },
  {
    id: "evt-014",
    website: "chatgpt.com",
    consentType: "browser-permission",
    capability: { type: "browser-permission", permission: "clipboard-read" },
    grantStatus: "granted",
    timestamp: "2026-10-03T14:00:00Z",
    riskLevel: "medium",
    dataCollected: "Clipboard contents",
    purpose: { stated: "Paste content into chat", inferred: "Clipboard content access", confidence: 0.80 }
  }
];

const DEFAULT_PREFERENCES = {
  privacyLevel: "balanced",
  autoBlock: { advertising: true, analytics: false, functional: false },
  notifications: true,
  riskThreshold: "medium"
};

// Seed demo data on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({
      consentEvents: DEMO_EVENTS,
      userPreferences: DEFAULT_PREFERENCES
    });
    console.log('[ConsentLens] Demo data seeded successfully');
  }
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // keep channel open for async response
});

async function handleMessage(message) {
  const { action, ...data } = message;

  switch (action) {
    case 'getEvents': {
      const result = await chrome.storage.local.get('consentEvents');
      return { events: result.consentEvents || [] };
    }

    case 'getEventsByType': {
      const result = await chrome.storage.local.get('consentEvents');
      const events = (result.consentEvents || []).filter(e => e.consentType === data.consentType);
      return { events };
    }

    case 'getEventsBySite': {
      const result = await chrome.storage.local.get('consentEvents');
      const events = (result.consentEvents || []).filter(e => e.website === data.website);
      return { events };
    }

    case 'revokeConsent': {
      const result = await chrome.storage.local.get('consentEvents');
      const events = result.consentEvents || [];
      const idx = events.findIndex(e => e.id === data.eventId);
      if (idx !== -1) {
        events[idx].grantStatus = 'revoked';
        events[idx].revokedAt = new Date().toISOString();
        await chrome.storage.local.set({ consentEvents: events });
        return { success: true, event: events[idx] };
      }
      return { success: false, error: 'Event not found' };
    }

    case 'getStats': {
      const result = await chrome.storage.local.get('consentEvents');
      const events = result.consentEvents || [];
      const stats = {
        total: events.length,
        granted: events.filter(e => e.grantStatus === 'granted').length,
        denied: events.filter(e => e.grantStatus === 'denied').length,
        revoked: events.filter(e => e.grantStatus === 'revoked').length,
        highRisk: events.filter(e => e.riskLevel === 'high' && e.grantStatus === 'granted').length,
        sites: [...new Set(events.map(e => e.website))].length,
        byType: {
          oauth: events.filter(e => e.consentType === 'oauth').length,
          cookie: events.filter(e => e.consentType === 'cookie').length,
          'browser-permission': events.filter(e => e.consentType === 'browser-permission').length,
          policy: events.filter(e => e.consentType === 'policy').length,
          terms: events.filter(e => e.consentType === 'terms').length,
        },
        byRisk: {
          low: events.filter(e => e.riskLevel === 'low').length,
          medium: events.filter(e => e.riskLevel === 'medium').length,
          high: events.filter(e => e.riskLevel === 'high').length,
        }
      };
      return { stats };
    }

    case 'getPreferences': {
      const result = await chrome.storage.local.get('userPreferences');
      return { preferences: result.userPreferences || DEFAULT_PREFERENCES };
    }

    case 'updatePreferences': {
      await chrome.storage.local.set({ userPreferences: data.preferences });
      return { success: true };
    }

    case 'addEvent': {
      const result = await chrome.storage.local.get('consentEvents');
      const events = result.consentEvents || [];
      const newEvent = {
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        grantStatus: 'pending',
        ...data.event
      };
      events.unshift(newEvent);
      await chrome.storage.local.set({ consentEvents: events });
      return { success: true, event: newEvent };
    }

    case 'clearAllData': {
      await chrome.storage.local.set({
        consentEvents: [],
        userPreferences: DEFAULT_PREFERENCES
      });
      return { success: true };
    }

    case 'resetDemo': {
      await chrome.storage.local.set({
        consentEvents: DEMO_EVENTS,
        userPreferences: DEFAULT_PREFERENCES
      });
      return { success: true };
    }

    case 'exportData': {
      const result = await chrome.storage.local.get(['consentEvents', 'userPreferences']);
      return {
        data: {
          exportDate: new Date().toISOString(),
          version: '1.0.0',
          events: result.consentEvents || [],
          preferences: result.userPreferences || DEFAULT_PREFERENCES
        }
      };
    }

    default:
      return { error: `Unknown action: ${action}` };
  }
}
