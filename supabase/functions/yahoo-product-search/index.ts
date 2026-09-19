import { createClient } from "npm:@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface YahooHit {
  name?: string;
  url?: string;
  review?: { rate?: number; count?: number };
  image?: { small?: string; medium?: string; large?: string };
  price?: number;
  description?: string;
  janCode?: string;
  brand?: { type?: string; name?: string };
  code?: string;
  condition?: string;
  point?: { amount?: number; times?: number };
  shipping?: { code?: string; name?: string };
  delivery?: { code?: string; name?: string; date?: string };
  releaseDate?: string;
  seller?: { sellerId?: string; name?: string; url?: string; review?: { rate?: number; count?: number } };
  affiliate?: { rate?: number };
  specifications?: string[];
}

interface YahooSearchResponse {
  hits?: YahooHit[];
  total?: number;
  // V3 may return different structure; handle both
  SearchResult?: { Hits?: { Hit?: YahooHit[] } };
}

interface ProductInfo {
  janCode: string;
  name: string;
  modelNumber: string;
  maker: string;
  description: string;
  price: number | null;
  imageUrl: string;
  specs: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const janCode = url.searchParams.get("jan") ?? "";

    if (!janCode || !/^\d{13}$/.test(janCode)) {
      return new Response(
        JSON.stringify({ found: false, error: "JANコードは13桁の数字で指定してください" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check cache in Supabase first
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const { data: cached } = await supabase
        .from("jan_product_cache")
        .select("product_info")
        .eq("jan_code", janCode)
        .maybeSingle();

      if (cached?.product_info) {
        return new Response(
          JSON.stringify({ found: true, source: "cache", ...cached.product_info as ProductInfo }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Fetch from Yahoo Shopping API
    const yahooAppId = Deno.env.get("YAHOO_APP_ID") ?? "";

    if (!yahooAppId) {
      // No API key configured — return not-found so frontend shows fallback form
      return new Response(
        JSON.stringify({ found: false, reason: "API_KEY_NOT_CONFIGURED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiUrl = `https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch?appid=${encodeURIComponent(yahooAppId)}&jan=${encodeURIComponent(janCode)}&results=10`;

    const yahooRes = await fetch(apiUrl, {
      headers: { "Content-Type": "application/json" },
    });

    if (!yahooRes.ok) {
      return new Response(
        JSON.stringify({ found: false, reason: "API_ERROR", status: yahooRes.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data: YahooSearchResponse = await yahooRes.json();

    // Handle both V3 flat structure and older nested structure
    const hits: YahooHit[] = data.hits ?? data.SearchResult?.Hits?.Hit ?? [];

    if (!hits || hits.length === 0) {
      // Cache the not-found result to avoid repeated API calls
      if (supabaseUrl && serviceRoleKey) {
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        await supabase.from("jan_product_cache").upsert({
          jan_code: janCode,
          product_info: null,
          found: false,
        });
      }
      return new Response(
        JSON.stringify({ found: false, reason: "NO_RESULTS" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Find the best match — prefer exact JAN match, then highest review count
    let bestHit: YahooHit | null = null;
    for (const hit of hits) {
      if (hit.janCode === janCode) {
        bestHit = hit;
        break;
      }
    }
    if (!bestHit) {
      bestHit = hits.reduce((best, hit) =>
        (hit.review?.count ?? 0) > (best.review?.count ?? 0) ? hit : best
      );
    }

    const hit = bestHit!;

    // Extract model number from product name or code
    const modelNumber = extractModelNumber(hit.name ?? "", hit.code ?? "");

    // Extract maker/brand
    const maker = hit.brand?.name ?? extractMaker(hit.name ?? "");

    // Extract specs from description and specifications
    const specs = extractSpecs(hit.description ?? "", hit.specifications ?? []);

    const productInfo: ProductInfo = {
      janCode: hit.janCode ?? janCode,
      name: hit.name ?? "",
      modelNumber,
      maker,
      description: hit.description ?? "",
      price: hit.price ?? null,
      imageUrl: hit.image?.medium ?? hit.image?.large ?? hit.image?.small ?? "",
      specs,
    };

    // Cache the result in Supabase
    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      await supabase.from("jan_product_cache").upsert({
        jan_code: janCode,
        product_info: productInfo,
        found: true,
      });
    }

    return new Response(
      JSON.stringify({ found: true, source: "yahoo_api", ...productInfo }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ found: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// 商品名から型番を抽出（例: "Lenovo ThinkPad X1 Carbon Gen11" → "X1 Carbon Gen11"）
function extractModelNumber(name: string, code: string): string {
  // Yahoo code field often contains the model/SKU
  if (code && code.trim()) return code.trim();

  // Try to extract model-like patterns from the name
  // Common patterns: alphanumeric model codes like "BN-Pro15", "GF-RTX4070", "K-55XR55"
  const modelMatch = name.match(/[A-Z]{1,3}[-]?[A-Z0-9]{2,}/);
  if (modelMatch) return modelMatch[0];

  return "";
}

// 商品名からメーカー名を抽出
function extractMaker(name: string): string {
  const makers = [
    "Lenovo", "ASUS", "Dell", "HP", "Apple", "Acer", "MSI", "Panasonic",
    "SHARP", "Sharp", "HITACHI", "Hitachi", "TOSHIBA", "Toshiba", "NEC",
    "Sony", "SONY", "Samsung", "LG", "Canon", "Canon", "Nikon", "FUJITSU",
    "Fujitsu", "YAMAHA", "Midea", "dyson", "Dyson",
  "パナソニック", "シャープ", "日立", "東芝", "富士通",
  "ソニー", "サムスン", "キヤノン", "ニコン",
  "レノボ", "エイスース",
  "dynabook", "VAIO", "Let's", "レッツ",
  "iRobot", "アイロボット",
  "Google",
  "Razer", "Logitech",
    "Anker",
    "Buffalo", "バッファロー",
    "I-O DATA", "IODATA",
    "Elecom", "エレコム",
    "Yamazen", "山善",
    "Iris Ohyama", "アイリスオーヤマ",
    "Tiger", "タイガー",
    "Zojirushi", "象印",
    "Panasonic", "National",
    "Mitsubishi", "三菱",
    "Pioneer", "パイオニア",
    "Onkyo", "オンキヨー",
    "Denon", "デノン",
    "Marantz",
    "Yamaha", "ヤマハ",
    "Roland",
    "Korg",
    "Casio", "カシオ",
    "Seiko", "セイコー",
    "Citizen", "シチズン",
    "Olympus", "オリンパス",
    "Pentax", "Ricoh", "リコー",
    "Leica",
    "DJI",
    "GoPro",
    "Bose",
    "JBL",
    "Harman",
    "Bowers & Wilkins",
    "Bang & Olufsen",
    "Marshall",
    "Audio-Technica", "オーディオテクニカ",
    "Shure",
    "Sennheiser",
    "Beyerdynamic",
    "AKG",
  ];

  for (const maker of makers) {
    if (name.toLowerCase().includes(maker.toLowerCase())) {
      return maker;
    }
  }
  return "";
}

// 商品説明と仕様テキストからスペック情報を抽出
function extractSpecs(description: string, specifications: string[]): Record<string, string> {
  const specs: Record<string, string> = {};

  const allText = description + " " + specifications.join(" ");

  // CPU
  const cpuMatch = allText.match(/(Core\s*i[3579][^,\s]*)|(Ryzen\s*[3579][^,\s]*)|(Celeron[^,\s]*)|(Pentium[^,\s]*)|(Snapdragon[^,\s]*)|(Apple\s*M[123][^,\s]*)/i);
  if (cpuMatch) specs["CPU"] = cpuMatch[0].trim();

  // メモリ
  const memMatch = allText.match(/(\d+)\s*GB\s*(?:メモリ|RAM|DDR)/i);
  if (memMatch) specs["メモリ"] = `${memMatch[1]}GB`;

  // SSD / ストレージ
  const ssdMatch = allText.match(/(\d+)\s*(TB|GB)\s*(?:SSD|ストレージ|NVMe)/i);
  if (ssdMatch) specs["SSD"] = `${ssdMatch[1]}${ssdMatch[2]}`;

  // 画面サイズ
  const screenMatch = allText.match(/(\d+\.?\d*)\s*インチ/i);
  if (screenMatch) specs["画面サイズ"] = `${screenMatch[1]}インチ`;

  // 重さ
  const weightMatch = allText.match(/(\d+\.?\d*)\s*kg/i);
  if (weightMatch) specs["重量"] = `${weightMatch[1]}kg`;

  // 容量 (L) — for refrigerators etc.
  const capacityMatch = allText.match(/(\d+)\s*L\b/i);
  if (capacityMatch) specs["容量"] = `${capacityMatch[1]}L`;

  // Add raw specifications if provided
  for (const spec of specifications) {
    // spec format: "key:value" or just text
    const parts = spec.split(/[:：]/);
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join(":").trim();
      if (key && value) specs[key] = value;
    }
  }

  return specs;
}
