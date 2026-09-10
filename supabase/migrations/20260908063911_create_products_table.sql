/*
# 家電量販店 商品案内ツール - データベーススキーマ

## 概要
家電量販店の従業員が商品情報を検索・参照・比較するためのテーブルを作成します。
認証なしのシングルテナントアプリとして設計（従業員共有ツール）。

## 新規テーブル
- `products` - 商品マスタ
  - `id` (uuid, PK) - 商品ID
  - `name` (text) - 商品名
  - `category` (text) - カテゴリ
  - `brand` (text) - メーカー名
  - `model_number` (text) - 型番
  - `price` (integer) - 価格（税抜）
  - `description` (text) - 商品説明
  - `features` (text[]) - 特徴・売りポイント
  - `specs` (jsonb) - 詳細スペック
  - `stock_status` (text) - 在庫ステータス
  - `image_url` (text) - 商品画像URL
  - `warranty` (text) - 保証内容
  - `energy_rating` (text) - 省エネ評価
  - `created_at` (timestamptz) - 作成日時

## セキュリティ
- RLSを有効化
- 認証なしアプリのため `TO anon, authenticated` で全CRUDを許可
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  brand text NOT NULL,
  model_number text NOT NULL,
  price integer NOT NULL,
  description text NOT NULL DEFAULT '',
  features text[] DEFAULT '{}',
  specs jsonb DEFAULT '{}'::jsonb,
  stock_status text NOT NULL DEFAULT '在庫あり',
  image_url text DEFAULT '',
  warranty text DEFAULT '',
  energy_rating text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO products (name, category, brand, model_number, price, description, features, specs, stock_status, warranty, energy_rating) VALUES
('ブレビオ 4K有機ELテレビ 55V型', 'テレビ', 'ソニー', 'K-55XR55', 198000, '有機ELパネルで深い黒と鮮やかな色再現。4K解像度で映画もスポーツも臨場感たっぷり。', ARRAY['有機ELパネル搭載', '4K HDR対応', 'Google TV内蔵', '音声リモコン付属'], '{"画面サイズ": "55V型", "解像度": "4K (3840x2160)", "パネル": "有機EL", "HDMI端子": "4系統", "消費電力": "145W", "重量": "18.5kg"}'::jsonb, '在庫あり', 'メーカー保証2年', '省エネ達成'),
('プレミアム液晶テレビ 43V型', 'テレビ', 'パナソニック', 'P-43LX800', 89800, '高画質液晶パネルとクリアな音声で、コストパフォーマンスに優れた一台。', ARRAY['4K液晶パネル', 'HDR10対応', 'Android TV', '壁掛け対応'], '{"画面サイズ": "43V型", "解像度": "4K (3840x2160)", "パネル": "液晶", "HDMI端子": "3系統", "消費電力": "95W", "重量": "11.2kg"}'::jsonb, '在庫少', 'メーカー保証1年', '省エネ達成'),
('ノーストフロスト冷蔵庫 455L', '冷蔵庫', '日立', 'H-R45K', 156000, '野菜室が大きく、冷凍室も充実。ノンフロン設計で環境にも配慮した大容量冷蔵庫。', ARRAY['ノンフロン冷媒', '野菜室大容量', '自動製氷機能', '節電モード搭載'], '{"総容量": "455L", "冷蔵室": "252L", "冷凍室": "116L", "野菜室": "87L", "消費電力": "年間290kWh", "幅": "685mm"}'::jsonb, '在庫あり', 'メーカー保証3年', '省エネ達成'),
('コンパクト冷蔵庫 230L', '冷蔵庫', 'シャープ', 'S-J23S', 59800, '一人暮らしや小家族に最適なコンパクトサイズ。省スペース設計で設置場所を選ばない。', ARRAY['コンパクト設計', '静音設計', 'ドアポケット充実', 'クリーンフィルター'], '{"総容量": "230L", "冷蔵室": "150L", "冷凍室": "45L", "野菜室": "35L", "消費電力": "年間180kWh", "幅": "560mm"}'::jsonb, '在庫あり', 'メーカー保証1年', '省エネ達成'),
('ドラム式洗濯乾燥機 10kg', '洗濯機', 'LG', 'L-V10W', 248000, '洗濯から乾燥まで全自動。大容量10kgで家族の洗濯物も一度に処理できる。', ARRAY['10kg大容量', 'ヒートポンプ乾燥', 'スマート診断', '温水洗浄対応'], '{"洗濯容量": "10kg", "乾燥容量": "7kg", "消費電力": "年間120kWh", "騒音": "洗濯42dB 乾燥45dB", "幅": "680mm"}'::jsonb, '在庫少', 'メーカー保証2年', '省エネ達成'),
('縦型洗濯機 7kg', '洗濯機', '東芝', 'T-S7W', 78000, 'コンパクトながらパワフルな縦型洗濯機。低騒音設計で夜間使用も安心。', ARRAY['7kg容量', '低騒音設計', 'ソフト洗浄コース', '時短モード'], '{"洗濯容量": "7kg", "消費電力": "年間95kWh", "騒音": "38dB", "幅": "580mm"}'::jsonb, '在庫あり', 'メーカー保証1年', '省エネ達成'),
('ルームエアコン 6畳用', 'エアコン', 'ダイキン', 'D-R226', 98000, '6畳向けのコンパクトエアコン。省エネ設計で電気代を抑えつつ快適な温度管理。', ARRAY['6畳対応', '省エネ設計', '空気清浄機能', '静音運転'], '{"適用畳数": "6畳", "冷房能力": "2.2kW", "暖房能力": "2.5kW", "消費電力": "冷房510W 暖房580W", "騒音": "冷房28dB"}'::jsonb, '在庫あり', 'メーカー保証3年', '省エネ達成'),
('ロボット掃除機 AI搭載', '掃除機', 'アイロボット', 'I-R9', 89000, 'AIが部屋の構造を認識し、効率的な掃除ルートを自動生成。スマホ操作対応。', ARRAY['AIマッピング機能', '自動充電復帰', 'スマホ操作対応', '強力吸引'], '{"吸引力": "4000Pa", "連続稼働": "120分", "充電時間": "3時間", "騒音": "65dB", "重量": "3.2kg"}'::jsonb, '在庫あり', 'メーカー保証1年', '該当なし'),
('スチーム電子レンジ 30L', '電子レンジ', 'パナソニック', 'P-NE30S', 45000, 'スチーム機能付きで本格調理も可能。30Lの大容量で家族の食事も手軽に温められる。', ARRAY['スチーム機能', '30L大容量', '自動メニュー50種', '省エネモード'], '{"容量": "30L", "出力": "1000W", "消費電力": "1200W", "幅": "510mm", "重量": "14kg"}'::jsonb, '在庫あり', 'メーカー保証1年', '省エネ達成'),
('フラッグシップスマホ 256GB', 'スマホ', 'サムスン', 'G-S25U', 159800, '大画面・高性能カメラ・長持ちバッテリーを兼ね備えたフラッグシップモデル。', ARRAY['6.8インチ大画面', '200MPカメラ', '5G対応', 'IP68防水'], '{"画面": "6.8インチ", "ストレージ": "256GB", "RAM": "12GB", "バッテリー": "5000mAh", "重量": "232g"}'::jsonb, '在庫少', 'メーカー保証2年', '該当なし'),
('ミドルレンジスマホ 128GB', 'スマホ', 'Google', 'G-P8a', 69800, 'コストパフォーマンスに優れたミドルレンジモデル。日常使いに十分な性能を備える。', ARRAY['6.1インチ画面', '64MPカメラ', '5G対応', '長期間アップデート'], '{"画面": "6.1インチ", "ストレージ": "128GB", "RAM": "8GB", "バッテリー": "4492mAh", "重量": "188g"}'::jsonb, '在庫あり', 'メーカー保証2年', '該当なし'),
('ノートPC 15.6インチ', 'PC', 'レノボ', 'L-I15I', 128000, '薄型軽量ボディに高性能CPUを搭載。ビジネスからエンタメまで幅広く対応。', ARRAY['Core i7搭載', '15.6インチFHD', '16GBメモリ', 'SSD512GB'], '{"CPU": "Core i7-1360P", "メモリ": "16GB", "ストレージ": "SSD 512GB", "画面": "15.6インチ FHD", "重量": "1.6kg"}'::jsonb, '在庫あり', 'メーカー保証1年', '省エネ達成'),
('ゲーミングPC 16インチ', 'PC', 'ASUS', 'A-G16R', 198000, '最新GPU搭載で重いゲームも高画質で快適動作。120Hzリフレッシュレート対応。', ARRAY['RTX 4060搭載', '16インチWQXGA', '32GBメモリ', '120Hz対応'], '{"CPU": "Ryzen 7 7840HS", "GPU": "RTX 4060", "メモリ": "32GB", "ストレージ": "SSD 1TB", "画面": "16インチ WQXGA 120Hz"}'::jsonb, '入荷待ち', 'メーカー保証2年', '該当なし'),
('ワイヤレスイヤホン ノイズキャンセリング', 'オーディオ', 'ソニー', 'S-WF5', 39800, '業界最高クラスのノイズキャンセリング。長時間装着でも快適な軽量設計。', ARRAY['ノイズキャンセリング', '最大30時間再生', 'IPX4防水', 'マルチポイント接続'], '{"ドライバー": "8mm", "再生時間": "最大30時間", "防水": "IPX4", "重量": "片耳5.3g", "通信": "Bluetooth 5.3"}'::jsonb, '在庫あり', 'メーカー保証1年', '該当なし'),
('ミラーレス一眼カメラ キット', 'カメラ', 'キヤノン', 'C-R50K', 98000, '初心者向けミラーレス一眼。レンズキットで撮影開始に必要なものがすべて揃う。', ARRAY['2420万画素センサー', '4K動画撮影', '初心者向けガイド', 'レンズキット付属'], '{"センサー": "APS-C 2420万画素", "動画": "4K 30p", "ISO感度": "100-32000", "重量": "375g（本体）", "連続撮影": "約12枚/秒"}'::jsonb, '在庫あり', 'メーカー保証2年', '該当なし')
ON CONFLICT DO NOTHING;