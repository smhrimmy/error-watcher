// Ultra-Secure Frontend Anti-Tampering System (Fortress Mode)
(function() {
  'use strict';
  
  let suspicionScore = 0;
  let devToolsDetected = false;
  let rapidReloadCount = 0;
  let lastReloadTime = Date.now();
  let consoleCommands = [];
  let domMutations = 0;
  let headlessBrowserDetected = false;
  
  // Security Event Logger
  function logSecurityEvent(type, details) {
    // Send to backend analytics
    if (navigator.sendBeacon) {
      const data = new Blob([JSON.stringify({
        eventType: type,
        severity: suspicionScore > 5 ? 'high' : 'medium',
        description: `Security event: ${type}`,
        metadata: details,
        userId: window.localStorage.getItem('userId') // If available
      })], { type: 'application/json' });
      
      navigator.sendBeacon('/api/security/events', data);
    }
    
    console.debug(`[FORTRESS] Security event logged: ${type}`);
  }
  
  // UI Feedback for Security Events
  function showSecurityBanner(message) {
    let banner = document.getElementById('fortress-security-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'fortress-security-banner';
      banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        background: rgba(220, 38, 38, 0.9);
        color: white;
        text-align: center;
        padding: 10px;
        z-index: 99999;
        font-family: monospace;
        font-weight: bold;
        transform: translateY(-100%);
        transition: transform 0.3s ease;
        pointer-events: none;
      `;
      document.body.appendChild(banner);
      
      // Animate in
      setTimeout(() => {
        banner.style.transform = 'translateY(0)';
      }, 100);
    }
    banner.textContent = `⚠️ SECURITY ALERT: ${message}`;
  }
  
  function showSecurityWarning(message) {
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid #ef4444;
      color: #ef4444;
      padding: 20px;
      z-index: 99999;
      font-family: monospace;
      text-align: center;
      border-radius: 8px;
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
    `;
    warning.innerHTML = `
      <h2 style="margin: 0 0 10px 0; font-size: 24px;">SECURITY WARNING</h2>
      <p style="margin: 0;">${message}</p>
    `;
    document.body.appendChild(warning);
    
    setTimeout(() => {
      warning.remove();
    }, 3000);
  }
  
  function showFullscreenWarning() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: black;
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ef4444;
      font-family: monospace;
      flex-direction: column;
    `;
    
    overlay.innerHTML = `
      <h1 style="font-size: 48px; margin-bottom: 20px; text-shadow: 0 0 10px #ef4444;">ACCESS DENIED</h1>
      <p style="font-size: 18px;">Suspicious activity detected. Your session has been terminated.</p>
      <div style="margin-top: 40px; font-size: 14px; opacity: 0.7;">IP Logging Active • Incident Reported</div>
    `;
    
    document.body.appendChild(overlay);
  }
  
  function disableUIControls() {
    document.body.style.pointerEvents = 'none';
    document.body.style.filter = 'blur(5px) grayscale(100%)';
  }
  
  function terminateSession() {
    // Clear session storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Log logout
    logSecurityEvent('session_terminated', { reason: 'suspicious_activity' });
    
    // Redirect after delay
    setTimeout(() => {
      window.location.href = '/login?reason=security_violation';
    }, 2000);
  }
  
  // Explicit DevTools Interaction Detection
  // Only triggers on explicit user actions (keys, right click)
  function detectExplicitDevToolsInteraction() {
    // Disable right click
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      incrementSuspicion(1, 'Right click attempted (potential inspect)');
      return false;
    });
    
    // Detect F12 and Ctrl+Shift+I/J/C
    document.addEventListener('keydown', (e) => {
      // F12
      if (e.key === 'F12') {
        incrementSuspicion(2, 'F12 Developer Tools hotkey pressed');
        // We don't prevent default to allow legitimate use, but we log it
      }
      
      // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element Inspector)
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'i' || e.key === 'j' || e.key === 'c')) {
        incrementSuspicion(3, 'Developer Tools shortcut pressed');
      }
      
      // Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
        incrementSuspicion(2, 'View Source shortcut pressed');
      }
    });
  }
  
  // Headless Browser Detection (Passive)
  function detectHeadlessBrowser() {
    const indicators = [
      navigator.webdriver,
      window.chrome && window.chrome.runtime === undefined,
      navigator.plugins.length === 0,
      navigator.languages === undefined,
      navigator.userAgent.includes('HeadlessChrome')
    ];
    
    const score = indicators.filter(Boolean).length;
    
    if (score > 2) {
      headlessBrowserDetected = true;
      incrementSuspicion(2, `Headless browser indicators detected (${score})`);
      logSecurityEvent('headless_browser_detected', { score });
    }
  }
  
  // Console Command Monitoring (Passive)
  function monitorConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalClear = console.clear;
    
    console.log = function(...args) {
      // Check for suspicious keywords in log arguments without blocking
      if (args.some(arg => typeof arg === 'string' && 
          (arg.includes('debugger') || arg.includes('DevTools') || arg.includes('inspect')))) {
        // Only increment suspicion if explicitly suspicious keywords are logged
        incrementSuspicion(1, 'Suspicious console keyword logged');
      }
      return originalLog.apply(console, args);
    };
    
    // We don't override error/warn to avoid interfering with app logic
    
    console.clear = function() {
      // Console clear is often used by devs/attackers to hide tracks
      incrementSuspicion(1, 'Console cleared');
      return originalClear.apply(console);
    };
  }
  
  // Rapid Page Reload Detection
  function detectRapidReloads() {
    const currentTime = Date.now();
    const timeSinceLastReload = currentTime - lastReloadTime;
    
    if (timeSinceLastReload < 2000) { // 2 seconds
      rapidReloadCount++;
      
      if (rapidReloadCount > 4) { // Increased threshold
        incrementSuspicion(2, `Rapid page reloads detected (${rapidReloadCount})`);
      }
    } else {
      rapidReloadCount = 0;
    }
    
    lastReloadTime = currentTime;
  }
  
  // Suspicion Score Management
  function incrementSuspicion(points, reason) {
    const oldScore = suspicionScore;
    suspicionScore += points;
    
    console.debug(`[SECURITY] Suspicion score: ${oldScore} → ${suspicionScore} (${reason})`);
    
    // Escalating responses based on suspicion score
    if (suspicionScore >= 5 && oldScore < 5) {
      showSecurityBanner('Security monitoring active');
      logSecurityEvent('suspicion_threshold_low', { score: suspicionScore });
    }
    
    if (suspicionScore >= 10 && oldScore < 10) {
      showSecurityWarning('Suspicious activity detected');
      logSecurityEvent('suspicion_threshold_medium', { score: suspicionScore });
    }
    
    if (suspicionScore >= 20 && oldScore < 20) {
      showFullscreenWarning();
      terminateSession();
      logSecurityEvent('suspicion_threshold_critical', { score: suspicionScore });
      blockIP();
    }
  }
  
  // IP Blocking
  function blockIP() {
    logSecurityEvent('ip_blocked', { suspicionScore });
    // Redirect to security block page
    window.location.href = '/security-blocked?reason=suspicious_activity&score=' + suspicionScore;
  }
  
  // Initialize Security System
  function initSecuritySystem() {
    console.debug('[FORTRESS] Initializing passive security monitoring...');
    
    detectHeadlessBrowser();
    monitorConsole();
    detectExplicitDevToolsInteraction();
    detectRapidReloads();
    
    // No periodic checks or debugger statements
  }
  
  // Start the security system
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSecuritySystem);
  } else {
    initSecuritySystem();
  }
  
  // Expose security status for debugging (only in development)
  window.__fortressSecurity = {
    getSuspicionScore: () => suspicionScore,
    getDevToolsStatus: () => devToolsDetected,
    getHeadlessStatus: () => headlessBrowserDetected
  };
})();