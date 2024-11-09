(function () {
  ("use strict");

  var location = window.location;
  var document = window.document;
  var scriptElement = document.currentScript;
  var dataDomain = scriptElement.getAttribute("data-domain");
  var endpoint = "http://localhost:3000/api/track";
  var initialPathname = window.location.pathname;

  var EVENTS = {
    "page-view": "page-view",
    "session-start": "session-start",
    "session-end": "session-end",
  };

  function generateSessionId() {
    return `session-${Math.random().toString(36).substring(2, 9)}`;
  }

  function isSessionExpired(expirationTime) {
    return Date.now() >= expirationTime;
  }

  function initializeSession() {
    var sessionId = localStorage.getItem("session_id");
    var expirationTime = localStorage.getItem("session_expiration");

    if (!sessionId || !expirationTime) {
      // new visit
      sessionId = generateSessionId();
      expirationTime = Date.now() + 10 * 60 * 1000; // 10 minutes
      localStorage.setItem("session_id", sessionId);
      localStorage.setItem("session_expiration", expirationTime);
      trackSessionStart();
    } else if (isSessionExpired(expirationTime)) {
      localStorage.removeItem("session_id");
      localStorage.removeItem("session_expiration");
      trackSessionEnd();
    }
    return {
      sessionId,
      expirationTime: parseInt(expirationTime),
    };
  }

  function trigger(eventName, options) {
    var payload = {
      event: eventName,
      url: location.href,
      domain: dataDomain,
    };
    sendRequest(payload, options);
  }

  function sendRequest(payload, options) {
    var request = new XMLHttpRequest();
    request.open("POST", endpoint, true);
    request.setRequestHeader("Content-Type", "application/json");
    request.onreadystatechange = function () {
      if (request.readyState === 4 && options && options.callback) {
        options.callback();
      }
    };
    request.send(JSON.stringify(payload));
  }

  // Queue of events
  var queue = (window.your_tracking && window.your_tracking.q) || [];
  window.your_tracking = trigger;
  for (var i = 0; i < queue.length; i++) {
    trigger.apply(this, queue[i]);
  }

  // track page views
  function trackPageView() {
    trigger(EVENTS["page-view"]);
  }

  function trackSessionStart() {
    trigger(EVENTS["session-start"]);
  }

  function trackSessionEnd() {
    trigger(EVENTS["session-end"]);
  }
  trackPageView();

  // TODO: to run first
  initializeSession();

  trackPageView();

  window.addEventListener("popstate", trackPageView);
  window.addEventListener("hashchange", trackPageView);
  document.addEventListener("click", function () {
    setTimeout(() => {
      if (window.location.pathname !== initialPathname) {
        trackPageView();
        initialPathname = window.location.pathname;
      }
    }, 3000);
  });
})();
