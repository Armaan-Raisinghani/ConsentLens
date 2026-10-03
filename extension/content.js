// Content script for ConsentLens
// Scans for privacy consent prompts and notifies the extension

function scanForPrivacyPrompts() {
  const detections = [];
  
  // 1. Scan for cookie banners
  const cookieKeywords = ['cookie', 'consent', 'gdpr', 'ccpa'];
  const potentialCookieElements = document.querySelectorAll(
    '[class*="cookie" i], [class*="consent" i], [id*="cookie" i], [id*="consent" i]'
  );
  
  if (potentialCookieElements.length > 0) {
    // Basic heuristic: check if any of these elements have buttons
    let hasButtons = false;
    potentialCookieElements.forEach(el => {
      if (el.querySelector('button') || el.tagName.toLowerCase() === 'button') {
        hasButtons = true;
      }
    });
    
    if (hasButtons) {
      detections.push({ type: 'cookie-banner', url: window.location.hostname });
    }
  }
  
  // 2. Scan for OAuth / Social Logins
  const oauthKeywords = ['sign in with', 'continue with', 'log in with'];
  const buttons = document.querySelectorAll('button, a, [role="button"]');
  
  buttons.forEach(btn => {
    const text = (btn.textContent || '').toLowerCase();
    for (const kw of oauthKeywords) {
      if (text.includes(kw)) {
        detections.push({ type: 'oauth-button', provider: text.replace(kw, '').trim() || 'unknown', url: window.location.hostname });
        break;
      }
    }
  });
  
  return detections;
}

function injectBadge(count) {
  if (document.getElementById('consentlens-badge') || count === 0) return;
  
  const badge = document.createElement('div');
  badge.id = 'consentlens-badge';
  badge.innerHTML = `🛡️ ${count}`;
  
  // Styling for a subtle floating badge
  Object.assign(badge.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor: '#3b82f6', // blue-500
    color: 'white',
    padding: '6px 12px',
    borderRadius: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '12px',
    fontWeight: 'bold',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    zIndex: '2147483647', // Max z-index
    cursor: 'help',
    transition: 'opacity 0.3s ease',
    opacity: '0.8',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  });
  
  badge.title = `ConsentLens detected ${count} privacy prompt(s) on this page`;
  
  badge.onmouseenter = () => badge.style.opacity = '1';
  badge.onmouseleave = () => badge.style.opacity = '0.8';
  
  document.body.appendChild(badge);
}

// Run scanner after a brief delay to let dynamic content load
setTimeout(() => {
  const detections = scanForPrivacyPrompts();
  
  if (detections.length > 0) {
    // Send to background script
    chrome.runtime.sendMessage({ 
      action: 'logDetection', 
      data: detections 
    });
    
    // Show UI badge
    injectBadge(detections.length);
  }
}, 2000);
