import * as puppeteer from 'puppeteer';
import * as devices from 'puppeteer/DeviceDescriptors';
import { ReplaySubject } from 'rxjs';
import { debounceTime, first, timeout } from 'rxjs/operators';
import { orderBy } from 'lodash';
import { Result, CrawlerOptions } from './types';
import { logger } from './helpers';

const deviceModel = {
  iPhone: devices['iPhone 6'],
  nexsus: devices['Nexus 5']
};

export class NetworkCrawler {
  private readonly o: CrawlerOptions;
  private requestCount = 0;
  private networkLogs: Result[] = [];
  private finalResponseTime = 0;
  private performanceTiming = {
    navigationStart: 0,
    domContentLoadedEventStart: 0,
    loadEventStart: 0
  };

  constructor(options: Partial<CrawlerOptions> = {}) {
    logger('Debug mode is true.');
    const defaultOptions: CrawlerOptions = {
      headless: false,
      useCache: false,
      device: 'pc',
      url: 'http://example.com/',
      network: {
        downloadUpTo: 100,
        uploadUpTo: 100,
        latency: 0
      },
      additianlScripts: [''],
      preventAutoClose: false,
      metricsUrlFilter: [''],
      metricsUrlExcludes: [''],
      timeoutSec: 30,
      useRealUserAgent: false
    };
    this.o = {
      ...defaultOptions,
      ...options
    };
  }

  async getBrowser(): Promise<puppeteer.Browser> {
    const headless = this.o.headless;
    const appMode = !this.o.headless;
    const devtools = !this.o.headless;
    const browser = await puppeteer.launch({
      headless,
      appMode,
      devtools
    });
    return browser;
  }

  async setPageEnvironment(page: puppeteer.Page): Promise<void> {
    const device = this.o.device;
    const useRealUserAgent = this.o.useRealUserAgent;
    if (device.toUpperCase() === 'ANDROID') {
      await page.emulate(deviceModel.nexsus);
    } else if (device.toUpperCase() === 'IOS') {
      await page.emulate(deviceModel.iPhone);
    }
    if (!useRealUserAgent) {
      await page.setUserAgent('bot');
    }
  }

  async openPageOnceIfNeeded(browser: puppeteer.Browser): Promise<void> {
    const useCache = this.o.useCache;
    if (useCache) {
      const url = this.o.url;
      const page = await browser.newPage();
      await this.setPageEnvironment(page);
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.close();
      await new Promise(resolve => setTimeout(resolve, 1000 * 1));
    }
  }

  async setCDPSession(page: puppeteer.Page): Promise<void> {
    const downloadUpTo = this.o.network.downloadUpTo;
    const uploadUpTo = this.o.network.uploadUpTo;
    const latency = this.o.network.latency;
    const client = await page.target().createCDPSession();
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: latency, // ms
      downloadThroughput: downloadUpTo * 1024 * 1024 / 8,
      uploadThroughput: uploadUpTo * 1024 * 1024 / 8
    });
  }

  async wait(timeout: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeout)).then(() => void 0);
  }

  async runAdditionalScripts(page: puppeteer.Page): Promise<void> {
    const scripts = this.o.additianlScripts instanceof Array ? this.o.additianlScripts : [this.o.additianlScripts];
    const promises = scripts.filter(script => !!script).map(script => page.addScriptTag({ content: script }));
    return Promise.all(promises).then(() => void 0);
  }

  setNetworkLogListeners(page: puppeteer.Page, awaiter$: ReplaySubject<null>): void {
    const metricsUrlFilter = this.o.metricsUrlFilter;
    const metricsUrlExcludes = this.o.metricsUrlExcludes;
    page.on('request', request => {
      const url = request.url();
      if (
        (metricsUrlFilter.some(filterUrl => url.includes(filterUrl)) &&
          metricsUrlExcludes.every(exclude => !url.includes(exclude))) ||
        url === this.o.url
      ) {
        logger('request:', request.resourceType(), url);
        this.networkLogs.push({
          ts: Date.now(),
          network: 'request',
          type: request.resourceType(),
          url
        });
      }
      awaiter$.next(null);
      this.requestCount++;
    });
    page.on('response', response => {
      const url = response.url();
      const now = Date.now();
      if (
        (metricsUrlFilter.some(filterUrl => url.includes(filterUrl)) &&
          metricsUrlExcludes.every(exclude => !url.includes(exclude))) ||
        url === this.o.url
      ) {
        logger('response:', url);
        this.networkLogs.push({
          ts: now,
          network: 'response',
          type: '',
          url: response.url()
        });
      }
      awaiter$.next(null);
      this.finalResponseTime = now;
    });
    page.on('requestfailed', response => {
      const url = response.url();
      if (
        (metricsUrlFilter.some(filterUrl => url.includes(filterUrl)) &&
          metricsUrlExcludes.every(exclude => !url.includes(exclude))) ||
        url === this.o.url
      ) {
        logger('request_failed:', url);
        this.networkLogs.push({
          ts: Date.now(),
          network: 'request_failed',
          type: '',
          url: response.url()
        });
      }
      awaiter$.next(null);
    });
  }

  async setPerformanceLog(page: puppeteer.Page): Promise<void> {
    const performanceTiming = JSON.parse(await page.evaluate(() => JSON.stringify(window.performance.timing)));
    logger('performanceTiming:', performanceTiming);
    this.performanceTiming = performanceTiming;
    this.networkLogs.push({
      ts: this.performanceTiming.navigationStart,
      network: 'performance.timing',
      type: 'navigationStart'
    });
    this.networkLogs.push({
      ts: this.performanceTiming.domContentLoadedEventStart,
      network: 'performance.timing',
      type: 'domContentLoadedEventStart'
    });
    this.networkLogs.push({
      ts: this.performanceTiming.loadEventStart,
      network: 'performance.timing',
      type: 'loadEventStart'
    });
  }

  getCompleteNetworkLogs(): Result[] {
    const orderdLogs = orderBy(this.networkLogs, 'ts').map((log, i) => {
      log.diffFromStart = log.ts - this.performanceTiming.navigationStart;
      if (/^(response|request_(finished|failed))$/.test(log.network) && i > 0) {
        for (let j = i - 1; j >= 0; j--) {
          if (log.url === this.networkLogs[j].url && this.networkLogs[j].network === 'request') {
            log.diffFromRequest = log.ts - this.networkLogs[j].ts;
            log.type = this.networkLogs[j].type;
          }
        }
      }
      return log;
    });
    return orderdLogs;
  }

  async run() {
    try {
      const browser = await this.getBrowser();

      await this.openPageOnceIfNeeded(browser);

      const page = await browser.newPage();
      await this.setCDPSession(page);
      await this.setPageEnvironment(page);

      const awaiter$ = new ReplaySubject<null>(1);
      this.setNetworkLogListeners(page, awaiter$);
      await this.wait(1000 * 2);
      await page.goto(this.o.url);
      await this.runAdditionalScripts(page);

      if (this.o.preventAutoClose) {
        await this.wait(1000 * 60);
      }

      // ネットワーク通信が2秒途切れたら次に進ませる。
      await awaiter$
        .pipe(debounceTime(1000 * 2), first(), timeout(1000 * this.o.timeoutSec))
        .toPromise()
        .catch(console.error);

      await this.setPerformanceLog(page);

      await page.close();
      await browser.close();

      const networkLogs = this.getCompleteNetworkLogs();
      const result = {
        requestCount: this.requestCount,
        domContentLoadedEvent:
          this.performanceTiming.domContentLoadedEventStart - this.performanceTiming.navigationStart,
        loadEvent: this.performanceTiming.loadEventStart - this.performanceTiming.navigationStart,
        finalResponse: this.finalResponseTime - this.performanceTiming.navigationStart,
        networkLogs: networkLogs
      };
      console.log(result);
      return result;
    } catch (err) {
      throw err;
    }
  }
}
