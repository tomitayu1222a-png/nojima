import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Product = {
  id: string;
  name: string;
  category: string;
  brand: string;
  model_number: string;
  price: number;
  description: string;
  features: string[];
  specs: Record<string, string>;
  stock_status: string;
  image_url: string;
  warranty: string;
  energy_rating: string;
  created_at: string;
};

export const CATEGORIES = [
  'テレビ',
  '冷蔵庫',
  '洗濯機',
  'エアコン',
  '掃除機',
  '電子レンジ',
  'スマホ',
  'PC',
  'オーディオ',
  'カメラ',
] as const;

export const STOCK_STATUSES = ['在庫あり', '在庫少', '入荷待ち', '取扱終了'] as const;
