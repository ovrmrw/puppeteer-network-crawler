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
  network: {
    /** 単位はMbps (default: 100) */
    downloadUpTo: number;
    /** 単位はMbps (default: 100) */
    uploadUpTo: number;
    /** 単位はms (default: 0)*/
    latency: number;
  };
  /** ページ表示後に実行させたいJavaScript (default: []) */
  additianlScripts: string[];
  /** ページを自動的に閉じたくない場合にtrueにする (default: false) */
  preventAutoClose: boolean;
  /** 取得したい通信のURLの一部を指定する (default: []) */
  metricsUrlFilter: string[];
  /** 取得対象外にしたい通信のURLの一部を指定する (default: []) */
  metricsUrlExcludes: string[];
  /** タイムアウト時間 (default: 30) */
  timeoutSec: number;
  /** 本物のユーザーエージェントを使うかどうか (default: false) */
  useRealUserAgent: boolean;
}

export interface NetworkLog {
  ts: number;
  network: string;
  type: string;
  url?: string;
  diffFromStart?: number;
  diffFromRequest?: number;
}
