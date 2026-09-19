/*
# JANコード商品情報キャッシュテーブル作成

## 概要
JANコードから外部API（Yahoo!ショッピングAPI等）で取得した商品情報をキャッシュし、
次回以降はネット通信なしで即座に結果を返せるようにするためのテーブル。

## 新規テーブル
- `jan_product_cache`
  - `id` (uuid, PK) - 内部ID
  - `jan_code` (text, UNIQUE) - JANコード（13桁）
  - `product_info` (jsonb) - 取得した商品情報（商品名、型番、メーカー、スペック等）
  - `found` (boolean) - APIで商品が見つかったかどうか
  - `created_at` (timestamptz) - 作成日時
  - `updated_at` (timestamptz) - 更新日時

## セキュリティ
- RLSを有効化
- 認証なしアプリのため `TO anon, authenticated` で全CRUDを許可（従業員共有ツール）
*/

CREATE TABLE IF NOT EXISTS jan_product_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jan_code text UNIQUE NOT NULL,
  product_info jsonb,
  found boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jan_product_cache_jan_code ON jan_product_cache(jan_code);

ALTER TABLE jan_product_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_jan_cache" ON jan_product_cache;
CREATE POLICY "anon_select_jan_cache" ON jan_product_cache FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_jan_cache" ON jan_product_cache;
CREATE POLICY "anon_insert_jan_cache" ON jan_product_cache FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_jan_cache" ON jan_product_cache;
CREATE POLICY "anon_update_jan_cache" ON jan_product_cache FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_jan_cache" ON jan_product_cache;
CREATE POLICY "anon_delete_jan_cache" ON jan_product_cache FOR DELETE
  TO anon, authenticated USING (true);
