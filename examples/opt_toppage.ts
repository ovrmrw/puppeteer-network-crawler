import * as fs from 'fs';
import { NetworkCrawler } from '../src';

process.env.NODE_ENV = 'debug';

async function main() {
  const crawler = new NetworkCrawler({
    url: 'http://www.opt.ne.jp/',
    metricsUrlFilter: ['gtm.js?id=GTM-MJSJPP', '.adplan7.com/'],
    metricsUrlExcludes: ['.adplan7.com/cs/'],
    network: {
      latency: 20,
      downloadUpTo: 4,
      uploadUpTo: 2
    },
    useCache: false
  });
  const result = await crawler.run();
  fs.writeFileSync('./result.json', JSON.stringify(result, null, 2));
}

main().catch(console.error);
