export interface CrawlerOptions {
  /** ヘッドレスモードを有効にするかどうか (default: false) */
  headless: boolean;
  /** ページキャッシュがある状態で計測するかどうか (default: false) */
  useCache: boolean;
  /** デバイスエミュレーションをするかどうか (default: 'pc') */
  device: 'pc' | 'android' | 'ios';
  /** 計測するURL (default: 'http://example.com/') */
  url: string;
  /** 通信速度を制限する場合に指定する */
  network: NetworkCondition;
  /** ページ表示後に実行させたいJavaScript (default: []) */
  additianlScripts: string[];
  /** ページを自動的に閉じたくない場合にtrueにする (default: false) */
  preventAutoClose: boolean;
  /** 取得したい通信のURLの一部を指定する (default: []) */
  metricsUrlFilter: string[];
  /** 取得対象外にしたい通信のURLの一部を指定する (default: []) */
  metricsUrlExcludes: string[];
  /** タイムアウト時間(秒) (default: 30) */
  timeoutSec: number;
  /** 本物のユーザーエージェントを使うかどうか (default: false) */
  useRealUserAgent: boolean;
}

export interface NetworkCondition {
  /** 単位はMbps (default: 100) */
  downloadUpTo: number;
  /** 単位はMbps (default: 100) */
  uploadUpTo: number;
  /** 単位はms (default: 0)*/
  latency: number;
}

export interface NetworkLog {
  ts: number; // timpstamp
  network: string; // 'request' or 'response' or 'performance.timing'
  type: string; // 'document' or 'script' or event names
  url?: string; // url of the resource
  diffFromStart?: number; // time diff from navigationStart
  diffFromRequest?: number; // time diff from the associated request
}

export interface Result {
  pageUrl: string; // url of the page
  metricsUrlFilter: string[]; // picks up network logs with this filter
  metricsUrlExcludes: string[]; // excludes piking up with this filter
  networkCondition: NetworkCondition; // condition of the network throughput
  requestCount: number; // total request count in the page
  domContentLoadedEvent: number; // timestamp when DOMContentLoaded event occured
  loadEvent: number; // timestamp when Load event occured
  finalResponse: number; // timestamp of the final response of the page
  networkLogs: NetworkLog[]; // array of network logs
}
