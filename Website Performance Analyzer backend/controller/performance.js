import axios from "axios";
import puppeteer from "puppeteer";

export const getAllData = async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).send("URL is required");
  }

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    // Get performance metrics
    const performance = await page.evaluate(() => {
      const resources = performance.getEntriesByType("resource");
      return {
        pageLoadTime:
          performance.timing.loadEventEnd - performance.timing.navigationStart,
        totalRequestSize: resources.reduce(
          (total, entry) => total + (entry.transferSize || 0),
          0
        ),
        numberOfRequests: resources.length,
      };
    });

    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Function to measure metrics
        const measurePerformance = async () => {
          const [fcp, lcp, tbt, cls, ttfb, mpFid] = await Promise.all([
            new Promise((resolve) => {
              new PerformanceObserver((list) => {
                const entries = list.getEntriesByName("first-contentful-paint");
                resolve(
                  entries.length > 0 ? entries[0].startTime : "Not available"
                );
              }).observe({ type: "paint", buffered: true });
            }),
            new Promise((resolve) => {
              new PerformanceObserver((list) => {
                const entries = list.getEntriesByType(
                  "largest-contentful-paint"
                );
                resolve(
                  entries.length > 0 ? entries[entries.length-1].startTime : "Not available"
                );
              }).observe({ type: "largest-contentful-paint", buffered: true });
            }),
            new Promise((resolve) => {
              new PerformanceObserver((list) => {
                const entries = list.getEntriesByType("longtask");
                const totalBlockingTime = entries.reduce((total, entry) => {
                  return total + Math.max(entry.duration - 50, 0);
                }, 0);
                resolve(totalBlockingTime);
              }).observe({ type: "longtask", buffered: true });
            }),
            new Promise((resolve) => {
              new PerformanceObserver((list) => {
                const entries = list.getEntriesByType("layout-shift");
                const cls = entries.reduce(
                  (total, entry) => total + entry.value,
                  0
                );
                resolve(cls);
              }).observe({ type: "layout-shift", buffered: true });
            }),
            new Promise((resolve) => {
              const [navigationEntry] =
                performance.getEntriesByType("navigation");
              resolve(
                navigationEntry
                  ? navigationEntry.responseStart - navigationEntry.requestStart
                  : "Not available"
              );
            }),
            new Promise((resolve) => {
              new PerformanceObserver((list) => {
                const entries = list.getEntriesByType("longtask");
                const maxDuration = entries.reduce(
                  (max, entry) => Math.max(max, entry.duration),
                  0
                );
                resolve(maxDuration);
              }).observe({ type: "longtask", buffered: true });
            }),
          ]);

          resolve({
            FCP: {
              title: "First Contentful Paint",
              numericValue: fcp,
            },
            TBT: {
              title: "Total Blocking Time",
              numericValue: tbt,
            },
            CLS: {
              title: "Cumulative Layout Shift",
              numericValue: cls,
            },
            TTFB: {
              title: "Time to First Byte",
              numericValue: ttfb,
            },
            LCP: {
                title: "Largest Contentful Paint",
                numericValue: lcp,
              },
            MPFID: {
              title: "Maximum Potential First Input Delay",
              numericValue: mpFid,
            },
          });
        };

        measurePerformance();
      });
    });

    await browser.close();

    res.json({
      performance: {
        pageLoadTime: performance.pageLoadTime,
        totalRequestSize: (performance.totalRequestSize / 1024).toFixed(2),
        numberOfRequests: performance.numberOfRequests,
      },
      metrics: metrics,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching performance data");
  }
};
