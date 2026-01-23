/**
 * Browser Capabilities Detection
 * やねうら王WASMエンジンの動作に必要な機能の検出
 */

export class BrowserCapabilities {
  constructor() {
    this._cache = null;
  }

  /**
   * ブラウザ機能をチェックして結果を返す
   * @returns {Object} 機能チェック結果
   */
  check() {
    if (this._cache) {
      return this._cache;
    }

    const capabilities = {
      // SharedArrayBuffer対応（COOP/COEPヘッダーが必要）
      sharedArrayBuffer: this._checkSharedArrayBuffer(),

      // Web Worker対応
      webWorker: this._checkWebWorker(),

      // WebAssembly対応
      webAssembly: this._checkWebAssembly(),

      // SIMD対応（やねうら王WASMに必要）
      simd: this._checkSIMD(),

      // Atomics対応
      atomics: this._checkAtomics(),

      // Cross-Origin Isolation状態
      crossOriginIsolated: this._checkCrossOriginIsolated(),

      // ブラウザ情報
      browser: this._detectBrowser(),

      // 総合判定
      canUseYaneuraOu: false,
      canUseStockfish: false,
      fallbackReason: null
    };

    // やねうら王WASMの動作可否判定
    if (!capabilities.webWorker) {
      capabilities.fallbackReason = 'Web Workerに対応していません';
    } else if (!capabilities.webAssembly) {
      capabilities.fallbackReason = 'WebAssemblyに対応していません';
    } else if (!capabilities.sharedArrayBuffer) {
      capabilities.fallbackReason = 'SharedArrayBufferが利用できません（COOP/COEPヘッダーが必要）';
    } else if (!capabilities.atomics) {
      capabilities.fallbackReason = 'Atomicsが利用できません';
    } else if (!capabilities.simd) {
      capabilities.fallbackReason = 'WASM SIMDに対応していません';
    } else {
      capabilities.canUseYaneuraOu = true;
    }

    // Stockfishは少し要件が緩い（SIMDはオプショナル）
    if (capabilities.webWorker && capabilities.webAssembly &&
        capabilities.sharedArrayBuffer && capabilities.atomics) {
      capabilities.canUseStockfish = true;
    }

    this._cache = capabilities;
    return capabilities;
  }

  /**
   * やねうら王が使用可能かどうか
   * @returns {boolean}
   */
  canUseYaneuraOu() {
    return this.check().canUseYaneuraOu;
  }

  /**
   * 何らかの外部エンジンが使用可能かどうか
   * @returns {boolean}
   */
  canUseExternalEngine() {
    const caps = this.check();
    return caps.canUseYaneuraOu || caps.canUseStockfish;
  }

  /**
   * フォールバックが必要な理由を取得
   * @returns {string|null}
   */
  getFallbackReason() {
    return this.check().fallbackReason;
  }

  /**
   * SharedArrayBuffer対応チェック
   * @private
   */
  _checkSharedArrayBuffer() {
    try {
      // SharedArrayBufferの存在確認
      if (typeof SharedArrayBuffer === 'undefined') {
        return false;
      }
      // 実際に作成できるか確認
      new SharedArrayBuffer(1);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Web Worker対応チェック
   * @private
   */
  _checkWebWorker() {
    return typeof Worker !== 'undefined';
  }

  /**
   * WebAssembly対応チェック
   * @private
   */
  _checkWebAssembly() {
    try {
      if (typeof WebAssembly === 'undefined') {
        return false;
      }
      // 基本的なWASM機能の確認
      const module = new WebAssembly.Module(
        new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
      );
      return module instanceof WebAssembly.Module;
    } catch (e) {
      return false;
    }
  }

  /**
   * WASM SIMD対応チェック
   * @private
   */
  _checkSIMD() {
    try {
      // SIMD命令を含む最小限のWASMモジュールをコンパイル
      // v128.const命令（SIMD）をテスト
      const simdTest = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, // magic
        0x01, 0x00, 0x00, 0x00, // version
        0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b, // type section: () -> v128
        0x03, 0x02, 0x01, 0x00, // function section
        0x0a, 0x16, 0x01, 0x14, 0x00, // code section
        0xfd, 0x0c, // v128.const
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x0b // end
      ]);

      return WebAssembly.validate(simdTest);
    } catch (e) {
      return false;
    }
  }

  /**
   * Atomics対応チェック
   * @private
   */
  _checkAtomics() {
    try {
      return typeof Atomics !== 'undefined' && typeof Atomics.wait === 'function';
    } catch (e) {
      return false;
    }
  }

  /**
   * Cross-Origin Isolation状態チェック
   * @private
   */
  _checkCrossOriginIsolated() {
    // crossOriginIsolated プロパティが存在し、trueであるか確認
    if (typeof crossOriginIsolated !== 'undefined') {
      return crossOriginIsolated;
    }

    // 古いブラウザ向けフォールバック
    // SharedArrayBufferが使えるなら分離されている可能性が高い
    return this._checkSharedArrayBuffer();
  }

  /**
   * ブラウザ情報の検出
   * @private
   */
  _detectBrowser() {
    const ua = navigator.userAgent;

    let name = 'Unknown';
    let version = '';
    let mobile = /Mobile|Android|iPhone|iPad/.test(ua);

    if (ua.includes('Firefox/')) {
      name = 'Firefox';
      const match = ua.match(/Firefox\/(\d+)/);
      version = match ? match[1] : '';
    } else if (ua.includes('Edg/')) {
      name = 'Edge';
      const match = ua.match(/Edg\/(\d+)/);
      version = match ? match[1] : '';
    } else if (ua.includes('Chrome/')) {
      name = 'Chrome';
      const match = ua.match(/Chrome\/(\d+)/);
      version = match ? match[1] : '';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      name = 'Safari';
      const match = ua.match(/Version\/(\d+)/);
      version = match ? match[1] : '';
    }

    return { name, version, mobile };
  }

  /**
   * 推奨ブラウザの情報を返す
   * @returns {string}
   */
  getRecommendation() {
    const caps = this.check();

    if (caps.canUseYaneuraOu) {
      return null;
    }

    if (caps.browser.mobile) {
      return 'モバイルブラウザではやねうら王AIは使用できません。内蔵AIをご利用ください。';
    }

    if (!caps.crossOriginIsolated) {
      return 'やねうら王AIを使用するには、Cross-Origin Isolationが必要です。サーバー設定を確認してください。';
    }

    if (!caps.simd) {
      return 'やねうら王AIを使用するには、Chrome 91以上またはFirefoxの最新版が必要です。';
    }

    return `お使いのブラウザ（${caps.browser.name}）ではやねうら王AIは使用できません。Chrome 91以上をお試しください。`;
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this._cache = null;
  }
}

// シングルトンインスタンス
export const browserCapabilities = new BrowserCapabilities();
