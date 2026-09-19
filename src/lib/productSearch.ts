// JANコードから商品情報を取得するクライアント
// Supabase Edge Function経由でYahoo!ショッピングAPIを呼び出し、
// 結果をローカルキャッシュ（LocalStorage）に保存する

export type ProductSearchResult = {
  found: boolean;
  source?: 'cache' | 'yahoo_api';
  janCode: string;
  name: string;
  modelNumber: string;
  maker: string;
  description: string;
  price: number | null;
  imageUrl: string;
  specs: Record<string, string>;
  reason?: string;
  error?: string;
};

const LOCAL_CACHE_KEY = 'nojima_jan_search_cache_v1';

type LocalCacheEntry = {
  product_info: ProductSearchResult | null;
  found: boolean;
  timestamp: number;
};

function getLocalCache(): Record<string, LocalCacheEntry> {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalCacheEntry(janCode: string, entry: LocalCacheEntry) {
  try {
    const cache = getLocalCache();
    cache[janCode] = entry;
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
}

export function getCachedProduct(janCode: string): ProductSearchResult | null {
  const cache = getLocalCache();
  const entry = cache[janCode];
  if (entry && entry.found && entry.product_info) {
    return { ...entry.product_info, source: 'cache' };
  }
  return null;
}

export function isCachedNotFound(janCode: string): boolean {
  const cache = getLocalCache();
  const entry = cache[janCode];
  return !!entry && !entry.found;
}

export function clearJanCache(janCode: string) {
  try {
    const cache = getLocalCache();
    delete cache[janCode];
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export async function searchByJanCode(janCode: string): Promise<ProductSearchResult> {
  // まずローカルキャッシュを確認
  const cached = getCachedProduct(janCode);
  if (cached) return cached;

  // Edge Functionを呼び出し
  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yahoo-product-search?jan=${encodeURIComponent(janCode)}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (anonKey) {
    headers['Authorization'] = `Bearer ${anonKey}`;
    headers['apikey'] = anonKey;
  }

  const response = await fetch(functionUrl, { headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return {
      found: false,
      janCode,
      name: '',
      modelNumber: '',
      maker: '',
      description: '',
      price: null,
      imageUrl: '',
      specs: {},
      reason: body.reason ?? 'API_ERROR',
      error: body.error ?? `HTTP ${response.status}`,
    };
  }

  const data = await response.json();

  if (data.found) {
    const result: ProductSearchResult = {
      found: true,
      source: data.source ?? 'yahoo_api',
      janCode: data.janCode ?? janCode,
      name: data.name ?? '',
      modelNumber: data.modelNumber ?? '',
      maker: data.maker ?? '',
      description: data.description ?? '',
      price: data.price ?? null,
      imageUrl: data.imageUrl ?? '',
      specs: data.specs ?? {},
    };
    setLocalCacheEntry(janCode, { product_info: result, found: true, timestamp: Date.now() });
    return result;
  }

  // 見つからなかった場合もキャッシュに記録（APIキー未設定・NO_RESULTS両方）
  const result: ProductSearchResult = {
    found: false,
    janCode,
    name: '',
    modelNumber: '',
    maker: '',
    description: '',
    price: null,
    imageUrl: '',
    specs: {},
    reason: data.reason ?? 'NO_RESULTS',
  };
  setLocalCacheEntry(janCode, { product_info: null, found: false, timestamp: Date.now() });
  return result;
}
