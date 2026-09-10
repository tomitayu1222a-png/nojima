export type Genre = {
  id: string;
  name: string;
  icon: string;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  genreId: string;
  keywords: string[];
  janCode?: string;
  modelNumber?: string;
  janSuffix?: string;
};

export const DEFAULT_GENRES: Genre[] = [
  { id: 'pc', name: 'パソコン', icon: 'laptop' },
  { id: 'fridge', name: '冷蔵庫', icon: 'refrigerator' },
  { id: 'washer', name: '洗濯機', icon: 'washing-machine' },
  { id: 'ac', name: 'エアコン', icon: 'wind' },
  { id: 'av', name: 'AV(オーディオ機器)', icon: 'headphones' },
  { id: 'microwave', name: '電子レンジ', icon: 'microwave' },
];

export const DEFAULT_KEYWORDS: Record<string, string[]> = {
  pc: ['ノートPC', 'デスクトップ', 'ゲーミング', '轻薄', '高性能', '長時間バッテリー', '2in1', 'タッチパネル', 'Core i7', 'Core i5', 'Ryzen', '16GBメモリ', 'SSD', '4K対応', 'ビジネス', '学生向け', 'クリエイター', 'テレワーク'],
  fridge: ['省エネ', '大容量', 'ノンフロン', '静音', '自動製氷', '野菜室', '冷凍室', 'スマート家電', '2ドア', '3ドア', 'フレンチドア', '省スペース'],
  washer: ['ドラム式', '縦型', '省エネ', '大容量', '静音', '乾燥機付き', '温水洗浄', '槽洗浄', '節水', 'AI搭載', '泡洗浄'],
  ac: ['省エネ', '冷暖房', 'エネファーム', '静音', '除湿', '空気清浄', 'フィルター自動洗浄', '6畳用', '10畳用', '14畳用', 'センサー搭載', 'Wi-Fi対応'],
  av: ['ノイズキャンセリング', 'ワイヤレス', 'ハイレゾ', 'Bluetooth', '防水', '軽量', '長時間再生', 'コンパクト', '重低音', 'マルチポイント', 'ホームシアター', 'サウンドバー'],
  microwave: ['スチーム', 'オーブン', 'トースト', '省エネ', '自動メニュー', 'センサー加熱', 'フラット型', 'ターンテーブル', 'コンパクト', '解凍', 'ワンルーム向け'],
};

export const DUMMY_PRODUCTS: Product[] = [
  // パソコン (4件)
  { id: 'p1', name: 'ビジネスノート Pro 15', price: 128000, description: 'Core i7搭載の薄型ビジネスノートPC。長時間バッテリーで外出先でも安心。', genreId: 'pc', keywords: ['ノートPC', '轻薄', '高性能', '長時間バッテリー', 'Core i7', '16GBメモリ', 'SSD', 'ビジネス', 'テレワーク'], janCode: '4905550123451', modelNumber: 'BN-Pro15', janSuffix: '451' },
  { id: 'p2', name: 'ゲーミングデスクトップ G-Force', price: 248000, description: 'RTX 4070搭載のハイエンドゲーミングPC。4K対応で重いゲームも快適動作。', genreId: 'pc', keywords: ['デスクトップ', 'ゲーミング', '高性能', '4K対応', 'Core i7', '16GBメモリ', 'SSD', 'クリエイター'], janCode: '4905550234562', modelNumber: 'GF-RTX4070', janSuffix: '562' },
  { id: 'p3', name: '轻薄ノート Air 13', price: 98000, description: '1.2kgの超轻薄ボディ。学生向けで持ち運びに最適な2in1タッチパネル搭載。', genreId: 'pc', keywords: ['ノートPC', '轻薄', '2in1', 'タッチパネル', 'Core i5', '長時間バッテリー', '学生向け', 'テレワーク'], janCode: '4905550345673', modelNumber: 'Air-13', janSuffix: '673' },
  { id: 'p4', name: 'クリエイター向け WS 16', price: 198000, description: '色精度の高い16インチディスプレイ。クリエイター向け高性能ノートPC。', genreId: 'pc', keywords: ['ノートPC', '高性能', '4K対応', 'Core i7', '16GBメモリ', 'SSD', 'クリエイター'], janCode: '4905550456784', modelNumber: 'WS-16', janSuffix: '784' },

  // 冷蔵庫 (3件)
  { id: 'p5', name: 'ノンフロン冷蔵庫 455L', price: 156000, description: '大容量で省エネ。ノンフロン設計の環境にやさしい冷蔵庫。', genreId: 'fridge', keywords: ['省エネ', '大容量', 'ノンフロン', 'スマート家電', '静音'], janCode: '4905550567895', modelNumber: 'REF-455', janSuffix: '895' },
  { id: 'p6', name: '3ドア冷蔵庫 350L', price: 98000, description: '3ドアタイプで使いやすい。野菜室が広く、家族に最適な冷蔵庫。', genreId: 'fridge', keywords: ['3ドア', '大容量', '野菜室', '省エネ', '静音'], janCode: '4905550678906', modelNumber: 'REF-350', janSuffix: '906' },
  { id: 'p7', name: 'フレンチドア冷蔵庫 500L', price: 218000, description: 'フレンチドアでスタイリッシュ。自動製氷機能付きの高機能冷蔵庫。', genreId: 'fridge', keywords: ['フレンチドア', '大容量', '自動製氷', 'スマート家電', '省エネ'], janCode: '4905550789017', modelNumber: 'REF-500F', janSuffix: '017' },

  // 洗濯機 (3件)
  { id: 'p8', name: 'ドラム式洗濯乾燥機 10kg', price: 178000, description: 'ドラム式で乾燥まで一本化。温水洗浄と槽洗浄機能付き。', genreId: 'washer', keywords: ['ドラム式', '大容量', '乾燥機付き', '温水洗浄', '槽洗浄', '静音'], janCode: '4905550890128', modelNumber: 'DRM-10', janSuffix: '128' },
  { id: 'p9', name: '縦型洗濯機 7kg', price: 68000, description: '縦型でコンパクト。泡洗浄で汚れをしっかり落とす省エネ洗濯機。', genreId: 'washer', keywords: ['縦型', '省エネ', '泡洗浄', '節水', '静音'], janCode: '4905550901239', modelNumber: 'VRT-7', janSuffix: '239' },
  { id: 'p10', name: 'AI搭載ドラム式 11kg', price: 258000, description: 'AIが汚れを検知して最適洗浄。大容量で家族向けの高性能洗濯乾燥機。', genreId: 'washer', keywords: ['ドラム式', '大容量', '乾燥機付き', 'AI搭載', '温水洗浄', '槽洗浄'], janCode: '4905551012340', modelNumber: 'AI-DRM-11', janSuffix: '340' },

  // エアコン (3件)
  { id: 'p11', name: 'エアコン 6畳用 省エネモデル', price: 78000, description: '6畳用の省エネエアコン。冷暖房・除湿機能付きでコンパクト設計。', genreId: 'ac', keywords: ['省エネ', '冷暖房', '除湿', '6畳用', '静音'], janCode: '4905551123451', modelNumber: 'AC-6', janSuffix: '451' },
  { id: 'p12', name: 'エアコン 10畳用 フィルター自動洗浄', price: 138000, description: 'フィルター自動洗浄付きで手入れラク。センサー搭載の10畳用エアコン。', genreId: 'ac', keywords: ['省エネ', '冷暖房', 'フィルター自動洗浄', '10畳用', 'センサー搭載', '静音'], janCode: '4905551234562', modelNumber: 'AC-10A', janSuffix: '562' },
  { id: 'p13', name: 'エアコン 14畳用 Wi-Fi対応', price: 188000, description: 'Wi-Fi対応でスマホ操作可能。空気清浄機能付きの14畳用ハイエンドモデル。', genreId: 'ac', keywords: ['省エネ', '冷暖房', '空気清浄', '14畳用', 'Wi-Fi対応', 'センサー搭載'], janCode: '4905551345673', modelNumber: 'AC-14W', janSuffix: '673' },

  // AV(オーディオ機器) (3件)
  { id: 'p14', name: 'ノイズキャンセリングイヤホン', price: 39800, description: 'ノイズキャンセリング搭載のワイヤレスイヤホン。長時間再生可能。', genreId: 'av', keywords: ['ノイズキャンセリング', 'ワイヤレス', 'Bluetooth', '長時間再生', '軽量', 'マルチポイント'], janCode: '4905551456784', modelNumber: 'NC-Ear', janSuffix: '784' },
  { id: 'p15', name: 'ハイレゾヘッドホン', price: 52000, description: 'ハイレゾ対応の重低音ヘッドホン。Bluetooth接続でコンパクト設計。', genreId: 'av', keywords: ['ハイレゾ', 'ワイヤレス', 'Bluetooth', '重低音', 'コンパクト'], janCode: '4905551567895', modelNumber: 'HR-Head', janSuffix: '895' },
  { id: 'p16', name: 'サウンドバー 2.1ch', price: 89000, description: 'ホームシアターに最適なサウンドバー。重低音で映画体験を向上。', genreId: 'av', keywords: ['ホームシアター', 'サウンドバー', '重低音', 'ワイヤレス', 'Bluetooth'], janCode: '4905551678906', modelNumber: 'SB-21', janSuffix: '906' },

  // 電子レンジ (3件)
  { id: 'p17', name: 'スチームオーブンレンジ 30L', price: 58000, description: 'スチーム機能付きオーブンレンジ。自動メニュー豊富で毎日の調理に便利。', genreId: 'microwave', keywords: ['スチーム', 'オーブン', '自動メニュー', 'センサー加熱', 'トースト'], janCode: '4905551789017', modelNumber: 'STM-30', janSuffix: '017' },
  { id: 'p18', name: 'フラット型電子レンジ 23L', price: 28000, description: 'フラット型でお手入れラク。コンパクトでワンルーム向けの電子レンジ。', genreId: 'microwave', keywords: ['フラット型', 'コンパクト', 'ワンルーム向け', '省エネ', '解凍'], janCode: '4905551890128', modelNumber: 'FLT-23', janSuffix: '128' },
  { id: 'p19', name: 'スチームレンジ センサー搭載 25L', price: 45000, description: 'センサー加熱でムラなく温まるスチームレンジ。トースト機能付き。', genreId: 'microwave', keywords: ['スチーム', 'センサー加熱', 'トースト', '自動メニュー', '省エネ'], janCode: '4905551901239', modelNumber: 'STM-25S', janSuffix: '239' },
];
