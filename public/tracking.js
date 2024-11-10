(function () {
  "use strict";
  const CONFIG = {
    ENDPOINT: "http://localhost:3000/api/track",
    SESSION_DURATION: 10 * 60 * 1000,
    STORAGE_KEYS: {
      SESSION_ID: "au_si",
      EXPIRATION: "au_se",
      CLIENT_ID: "au_ci",
    },
    EVENTS: {
      PAGE_VIEW: "page-view",
      SESSION_START: "session-start",
      SESSION_END: "session-end",
      ERROR: "error",
      PERFORMANCE: "performance",
      CORE_VITAL: "vital",
      WEB_VITALS: "web-vitals",
    },
    RETRY: {
      MAX_ATTEMPTS: 0,
      BACKOFF_FACTOR: 1000,
    },
    PERFORMANCE: {
      MAX_LCP_TIME: 5000, // Maximum time to wait for LCP
      METRIC_TYPES: {
        NAVIGATION: "navigation",
        PAINT: "paint",
        LARGEST_CONTENTFUL_PAINT: "largest-contentful-paint",
        LAYOUT_SHIFT: "layout-shift",
        FIRST_INPUT: "first-input",
        RESOURCE: "resource",
        LONG_TASK: "longtask",
      },
    },
  };

  class BrowserDetector {
    detect(userAgent) {
      const browser = this.detectBrowser(userAgent);
      const os = this.detectOS(userAgent);

      return {
        ...browser,
        os,
      };
    }

    detectBrowser(userAgent) {
      const browserPatterns = [
        {
          pattern: /Edg\/([0-9.]+)/i,
          name: "Edge",
        },
        {
          pattern: /OPR\/([0-9.]+)/i,
          name: "Opera",
        },
        {
          pattern: /Chrome\/([0-9.]+)/i,
          name: "Chrome",
        },
        {
          pattern: /Firefox\/([0-9.]+)/i,
          name: "Firefox",
        },
        {
          pattern: /Safari\/([0-9.]+)/i,
          name: "Safari",
        },
      ];

      for (const browser of browserPatterns) {
        const match = userAgent.match(browser.pattern);

        if (match) {
          return browser.name;
        }
      }

      return null;
    }

    detectOS(userAgent) {
      const osPatterns = {
        windows: {
          pattern: /Windows NT ([0-9.]+)/i,
          versions: {
            "10.0": "10",
            6.3: "8.1",
            6.2: "8",
            6.1: "7",
            "6.0": "Vista",
            5.2: "XP 64-bit",
            5.1: "XP",
          },
        },
        mac: {
          pattern: /Mac OS X ([0-9._]+)/i,
          clean: (version) => version.replace(/_/g, "."),
        },
        ios: {
          pattern: /OS ([0-9._]+) like Mac OS X/i,
          clean: (version) => version.replace(/_/g, "."),
        },
        android: {
          pattern: /Android ([0-9.]+)/i,
        },
        linux: {
          pattern: /Linux/i,
        },
      };

      for (const [osName, data] of Object.entries(osPatterns)) {
        const match = userAgent.match(data.pattern);
        if (match) {
          // Uncomment versioning if needed
          // let version = match[1] || "";

          // // Handle Windows version mapping
          // if (osName === "windows" && data.versions[version]) {
          //   version = data.versions[version];
          // }

          // // Clean version if needed
          // if (data.clean) {
          //   version = data.clean(version);
          // }

          return osName.charAt(0).toUpperCase() + osName.slice(1);
        }
      }

      return null;
    }
  }

  class PerformanceTracker {
    constructor(analyticsTracker) {
      this.analyticsTracker = analyticsTracker;
      this.observers = new Map();
      this.metrics = {
        dcl: 0,
        load: 0,
        fcp: 0,
        lcp: 0,
        cls: 0,
        fid: 0,
        tbt: 0,
        tti: 0,
        ttfb: 0,
        resources: [],
      };

      // Track if final metrics were sent to avoid duplicates
      this.finalMetricsSent = false;

      // Initialize tracking if the Performance API is available
      if (this.isPerformanceSupported()) {
        this.initializeTracking();
      }
    }
    isPerformanceSupported() {
      return (
        typeof window !== "undefined" &&
        window.performance &&
        window.PerformanceObserver
      );
    }
    initializeTracking() {
      try {
        this.setupPerformanceObservers();
        this.setupNavigationTracking();
        this.setupResourceTracking();
        this.setupVisibilityTracking();
      } catch (error) {
        console.error("Failed to initialize performance tracking:", error);
      }
    }
    setupPerformanceObservers() {
      // Store cleanup functions for each observer
      this.createObserver("paint", this.observePaint.bind(this));
      this.createObserver("lcp", this.observeLCP.bind(this));
      this.createObserver("cls", this.observeCLS.bind(this));
      this.createObserver("fid", this.observeFID.bind(this));
      this.createObserver("longtasks", this.observeLongTasks.bind(this));
    }
    createObserver(name, observerFn) {
      try {
        const observer = observerFn();
        if (observer) {
          this.observers.set(name, observer);
        }
      } catch (error) {
        console.error(`Failed to create ${name} observer:`, error);
      }
    }
    observePaint() {
      return new PerformanceObserver((entryList) => {
        try {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            if (entry.name === "first-contentful-paint") {
              this.metrics.fcp = entry.startTime;
              this.sendPartialMetrics("FCP", entry.startTime);
            }
          });
        } catch (error) {
          console.error("Error processing paint entries:", error);
        }
      }).observe({
        type: CONFIG.PERFORMANCE.METRIC_TYPES.PAINT,
        buffered: true,
      });
    }
    observeLCP() {
      let finalLCP = false;
      const observer = new PerformanceObserver((entryList) => {
        try {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            if (entry.startTime > this.metrics.lcp) {
              this.metrics.lcp = entry.startTime;
              if (!finalLCP) {
                this.sendPartialMetrics("LCP", entry.startTime);
              }
            }
          });
        } catch (error) {
          console.error("Error processing LCP entries:", error);
        }
      });
      observer.observe({
        type: CONFIG.PERFORMANCE.METRIC_TYPES.LARGEST_CONTENTFUL_PAINT,
        buffered: true,
      });

      // Store timeout ID for cleanup
      this.lcpTimeout = setTimeout(() => {
        finalLCP = true;
        this.sendPartialMetrics("Final LCP", this.metrics.lcp);
      }, CONFIG.PERFORMANCE.MAX_LCP_TIME);

      return observer;
    }
    observeCLS() {
      let sessionEntries = [];
      return new PerformanceObserver((entryList) => {
        try {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              sessionEntries.push(entry);
              this.calculateCLS(sessionEntries);
            }
          });
        } catch (error) {
          console.error("Error processing CLS entries:", error);
        }
      }).observe({
        type: CONFIG.PERFORMANCE.METRIC_TYPES.LAYOUT_SHIFT,
        buffered: true,
      });
    }
    calculateCLS(sessionEntries) {
      let windowCLS = 0;
      let window = [];
      let windowStart = 0;

      sessionEntries.forEach((entry) => {
        if (window.length === 0 || entry.startTime - windowStart < 1000) {
          window.push(entry);
        } else {
          windowCLS = Math.max(windowCLS, this.calculateWindowCLS(window));
          window = [entry];
          windowStart = entry.startTime;
        }
      });

      this.metrics.cls = windowCLS;
      this.sendPartialMetrics("CLS", windowCLS);
    }
    calculateWindowCLS(entries) {
      return entries.reduce((sum, entry) => sum + entry.value, 0);
    }
    observeFID() {
      return new PerformanceObserver((entryList) => {
        try {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            this.metrics.fid = entry.processingStart - entry.startTime;
            this.sendPartialMetrics("FID", this.metrics.fid);
          });
        } catch (error) {
          console.error("Error processing FID entries:", error);
        }
      }).observe({
        type: CONFIG.PERFORMANCE.METRIC_TYPES.FIRST_INPUT,
        buffered: true,
      });
    }
    observeLongTasks() {
      let totalBlockingTime = 0;
      return new PerformanceObserver((entryList) => {
        try {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            const blockingTime = entry.duration - 50;
            if (blockingTime > 0) {
              totalBlockingTime += blockingTime;
              this.metrics.tbt = totalBlockingTime;
              this.sendPartialMetrics("TBT", totalBlockingTime);
            }
          });
        } catch (error) {
          console.error("Error processing long task entries:", error);
        }
      }).observe({
        type: CONFIG.PERFORMANCE.METRIC_TYPES.LONG_TASK,
        buffered: true,
      });
    }
    setupNavigationTracking() {
      const onDocumentReady = (callback) => {
        if (document.readyState === "complete") {
          callback();
        } else {
          const handler = () => {
            if (document.readyState === "complete") {
              document.removeEventListener("readystatechange", handler);
              callback();
            }
          };
          document.addEventListener("readystatechange", handler);
        }
      };
      onDocumentReady(() => {
        this.navigationTimeout = setTimeout(() => {
          try {
            const navEntry = performance.getEntriesByType("navigation")[0];
            if (navEntry) {
              this.processNavigationTiming(navEntry);
            }
          } catch (error) {
            console.error("Error processing navigation timing:", error);
          }
        }, 0);
      });
    }
    processNavigationTiming(navEntry) {
      this.metrics.dcl = navEntry.domContentLoadedEventStart;
      this.metrics.load = navEntry.loadEventStart;
      this.metrics.ttfb = navEntry.responseStart;
      this.metrics.tti = navEntry.domInteractive;

      this.sendPartialMetrics("Navigation", {
        dcl: this.metrics.dcl,
        load: this.metrics.load,
        ttfb: this.metrics.ttfb,
        tti: this.metrics.tti,
      });
    }

    isImportantResource(entry) {
      return entry.transferSize > 0 && entry.duration > 100;
    }

    setupResourceTracking() {
      this.resourceObserver = new PerformanceObserver((entryList) => {
        try {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            if (this.isImportantResource(entry)) {
              this.metrics.resources.push({
                name: entry.name,
                type: entry.initiatorType,
                duration: entry.duration,
                transferSize: entry.transferSize,
                startTime: entry.startTime,
              });
            }
          });
        } catch (error) {
          console.error("Error processing resource entries:", error);
        }
      });
      this.resourceObserver.observe({
        type: CONFIG.PERFORMANCE.METRIC_TYPES.RESOURCE,
        buffered: true,
      });
    }
    setupVisibilityTracking() {
      this.unloadHandler = () => {
        this.sendFinalMetrics();
      };

      window.addEventListener("beforeunload", this.unloadHandler);
    }
    sendPartialMetrics(metricName, value) {
      if (!this.finalMetricsSent) {
        this.analyticsTracker.trackEvent(CONFIG.EVENTS.CORE_VITAL, {
          metricName,
          value,
          partial: true,
        });
      }
    }
    sendFinalMetrics() {
      if (!this.finalMetricsSent) {
        this.finalMetricsSent = true;
        this.analyticsTracker.trackEvent(
          CONFIG.EVENTS.WEB_VITALS,
          {
            ...this.metrics,
            partial: false,
            timestamp: performance.now(),
          },
          { keepalive: true }
        );
      }
    }
    destroy() {
      // Clear all observers
      this.observers.forEach((observer) => {
        try {
          observer.disconnect();
        } catch (error) {
          console.error("Error disconnecting observer:", error);
        }
      });
      this.observers.clear();

      // Clear resource observer
      if (this.resourceObserver) {
        this.resourceObserver.disconnect();
      }
      // Remove event listeners
      window.removeEventListener("beforeunload", this.unloadHandler);
      // Clear timeouts
      if (this.lcpTimeout) {
        clearTimeout(this.lcpTimeout);
      }
      if (this.navigationTimeout) {
        clearTimeout(this.navigationTimeout);
      }
      // Send final metrics if not already sent
      this.sendFinalMetrics();
    }
  }

  class AnalyticsTracker {
    constructor() {
      this.scriptElement = document.currentScript;
      this.dataDomain = this.scriptElement?.getAttribute("data-domain");
      this.clientId = this.getOrCreateClientId();
      this.queue = [];
      this.initialPathname = window.location.pathname;
      this.session = null;
      this.mutationObserver = null;
      this.isDestroyed = false;

      // Initialize in correct order
      this.initializeSession();
      this.setupErrorTracking();
      this.performanceTracker = new PerformanceTracker(this);
      this.setupEventListeners();
      this.processQueue();
    }
    getOrCreateClientId() {
      try {
        let clientId = localStorage.getItem(CONFIG.STORAGE_KEYS.CLIENT_ID);
        if (!clientId) {
          clientId = `${crypto.randomUUID()}`;
          localStorage.setItem(CONFIG.STORAGE_KEYS.CLIENT_ID, clientId);
        }
        return clientId;
      } catch (error) {
        console.error("Failed to manage client ID:", error);
        return `${Math.random().toString(36).substring(2, 9)}`;
      }
    }

    generateSessionId() {
      try {
        return `${crypto.randomUUID()}`;
      } catch {
        return `${Math.random().toString(36).substring(2, 9)}`;
      }
    }

    isSessionExpired(expirationTime) {
      return Date.now() >= parseInt(expirationTime);
    }

    initializeSession() {
      try {
        const sessionId = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION_ID);
        const expirationTime = localStorage.getItem(
          CONFIG.STORAGE_KEYS.EXPIRATION
        );

        if (
          !sessionId ||
          !expirationTime ||
          this.isSessionExpired(expirationTime)
        ) {
          const newSessionId = this.generateSessionId();
          const newExpirationTime = Date.now() + CONFIG.SESSION_DURATION;

          localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_ID, newSessionId);
          localStorage.setItem(
            CONFIG.STORAGE_KEYS.EXPIRATION,
            newExpirationTime
          );

          this.session = {
            sessionId: newSessionId,
            expirationTime: newExpirationTime,
            startTime: Date.now(),
          };
          this.trackEvent(CONFIG.EVENTS.SESSION_START);
        } else {
          this.session = {
            sessionId,
            expirationTime: parseInt(expirationTime),
            startTime: Date.now(),
          };
        }

        // Set up session refresh interval
        this.sessionInterval = setInterval(
          () => this.refreshSession(),
          CONFIG.SESSION_DURATION / 2
        );
      } catch {
        // console.error("Failed to initialize session:", error);
      }
    }

    refreshSession() {
      if (document.visibilityState === "visible" && !this.isDestroyed) {
        const newExpirationTime = Date.now() + CONFIG.SESSION_DURATION;
        try {
          localStorage.setItem(
            CONFIG.STORAGE_KEYS.EXPIRATION,
            newExpirationTime
          );
          this.session.expirationTime = newExpirationTime;
        } catch {
          // console.error("Failed to refresh session:", error);
        }
      }
    }

    async trackEvent(eventName, eventData = {}, options = {}) {
      if (this.isDestroyed) return;

      // Safety check for session
      if (!this.session?.sessionId) {
        // console.warn("Tracking attempted before session initialization");
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (!this.session?.sessionId) return;
      }

      // device information from user agent client-side
      const detector = new BrowserDetector();
      const userAgentData = {
        browser: detector.detectBrowser(navigator.userAgent),
        os: detector.detectOS(navigator.userAgent),
      };

      const payload = {
        event: eventName,
        timestamp: Date.now(),
        url: window.location.href,
        pathname: window.location.pathname,
        referrer: document.referrer || null,
        // TODO: Temp - delete after testing
        dataDomain: this.dataDomain || "clair.byharsh.com",
        clientId: this.clientId,
        sessionId: this.session.sessionId,
        pageLoadId: this.pageLoadId,
        userAgentData,
        eventData,
      };

      return this.sendRequestWithRetry(payload, options);
    }

    async sendRequestWithRetry(payload, options = {}, attempt = 1) {
      try {
        const response = await fetch(CONFIG.ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          keepalive: true,
          ...options,
        });

        if (!response.ok) {
          // throw new Error(`HTTP error! status: ${response.status}`);
          return;
        }

        return await response.json();
      } catch {
        if (attempt < CONFIG.RETRY.MAX_ATTEMPTS && !this.isDestroyed) {
          const backoffTime =
            Math.pow(2, attempt - 1) * CONFIG.RETRY.BACKOFF_FACTOR;
          await new Promise((resolve) => setTimeout(resolve, backoffTime));
          return this.sendRequestWithRetry(payload, options, attempt + 1);
        }
        // console.error("Failed to send analytics event:", error);
        // throw error;
      }
    }

    setupErrorTracking() {
      this.errorHandler = (event) => {
        this.trackEvent(CONFIG.EVENTS.ERROR, {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack,
          type: "error",
        });
      };

      this.rejectionHandler = (event) => {
        this.trackEvent(CONFIG.EVENTS.ERROR, {
          type: "unhandledrejection",
          message: event.reason?.message,
          stack: event.reason?.stack,
        });
      };

      window.addEventListener("error", this.errorHandler);
      window.addEventListener("unhandledrejection", this.rejectionHandler);
    }

    setupEventListeners() {
      // Generate unique ID for this page load
      this.pageLoadId = crypto.randomUUID();

      // Track page views
      this.trackPageView = () => {
        if (this.isDestroyed) return;
        this.trackEvent(CONFIG.EVENTS.PAGE_VIEW);
        this.initialPathname = window.location.pathname;
      };

      // Initial page view
      this.trackPageView();

      // Handle navigation events
      window.addEventListener("hashchange", this.trackPageView);

      // Handle client-side navigation
      this.mutationObserver = new MutationObserver(() => {
        if (
          !this.isDestroyed &&
          window.location.pathname !== this.initialPathname
        ) {
          this.trackPageView();
        }
      });

      this.mutationObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });

      // page close handler
      window.addEventListener("beforeunload", () => {
        this.trackEvent(
          CONFIG.EVENTS.SESSION_END,
          {
            sessionDuration: Date.now() - this.session.startTime,
            currentUrl: window.location.href,
          },
          { keepalive: true }
        );
      });
    }

    processQueue() {
      const queue = window.your_tracking?.q || [];
      queue.forEach((args) => {
        try {
          if (Array.isArray(args)) {
            this.trackEvent(...args);
          } else {
            // console.warn("Invalid queue item:", args);
          }
        } catch {
          // console.error("Failed to process queue item:", error);
        }
      });
    }

    destroy() {
      this.isDestroyed = true;

      // Clear intervals
      if (this.sessionInterval) {
        clearInterval(this.sessionInterval);
      }

      // Remove event listeners
      window.removeEventListener("error", this.errorHandler);
      window.removeEventListener("unhandledrejection", this.rejectionHandler);
      window.removeEventListener("hashchange", this.trackPageView);

      // Disconnect observers
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
      }

      // Clean up performance tracker if it has a destroy method
      if (this.performanceTracker?.destroy) {
        this.performanceTracker.destroy();
      }
    }
  }

  // Initialize the tracker
  const tracker = new AnalyticsTracker();

  // Expose tracking function globally
  window.your_tracking = (...args) => tracker.trackEvent(...args);
})();
