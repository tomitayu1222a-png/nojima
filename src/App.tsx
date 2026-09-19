import { useState, useMemo, useRef } from 'react';
import {
  Search, Plus, X, Pencil, Check, Laptop, Shirt, Refrigerator,
  Headphones, Camera, Smartphone, Package, Tag, TrendingUp,
  AlertCircle, RotateCcw, Users, QrCode, ScanLine, Trash2,
  ArrowLeft, Zap, Barcode, ChevronRight, WashingMachine, Wind, Microwave,
  GitCompare, Camera as CameraIcon, Cpu, HardDrive, MemoryStick, Award, FileText,
  Copy, LogOut, Store, UserPlus, Eye, EyeOff, ArrowRight,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Modal } from './components/Modal';
import {
  type Product, type Genre, DEFAULT_GENRES, DEFAULT_KEYWORDS, DUMMY_PRODUCTS,
  autoParseSpecs,
} from './data';
import {
  type Group, type Member, type MemberRank, CURRENT_USER, INITIAL_GROUP,
  INITIAL_MEMBERS, canManage, canManageGenres, rankColor,
} from './groupData';

const GENRE_ICONS: Record<string, typeof Laptop> = {
  laptop: Laptop,
  shirt: Shirt,
  refrigerator: Refrigerator,
  headphones: Headphones,
  camera: Camera,
  smartphone: Smartphone,
  'washing-machine': WashingMachine,
  wind: Wind,
  microwave: Microwave,
};

function getGenreIcon(iconName: string) {
  return GENRE_ICONS[iconName] ?? Package;
}

function formatPrice(price: number): string {
  return '¥' + price.toLocaleString();
}

// ===== Copy-to-clipboard button with icon-change feedback =====
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={handleCopy} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title={`コピー: ${text}`}>
      {copied ? (
        <><Check className="w-3 h-3 text-emerald-500" /><span className="text-xs text-emerald-500">コピーしました</span></>
      ) : (
        <><Copy className="w-3 h-3" />{label && <span className="text-xs">{label}</span>}</>
      )}
    </button>
  );
}

type SearchResult = Product & { matchCount: number; matchedKeywords: string[] };

export default function App() {
  const [products, setProducts] = useLocalStorage<Product[]>('nojima_products_v3', DUMMY_PRODUCTS);
  const [keywords, setKeywords] = useLocalStorage<Record<string, string[]>>('nojima_keywords_v3', DEFAULT_KEYWORDS);
  const [genres, setGenres] = useLocalStorage<Genre[]>('nojima_genres_v3', DEFAULT_GENRES);
  const [specCache, setSpecCache] = useLocalStorage<Record<string, { modelNumber: string; maker: string; cpu: string; ssd: string; memory: string }>>('nojima_spec_cache_v1', {});
  const [group, setGroup] = useLocalStorage<Group>('nojima_group_v3', INITIAL_GROUP);
  const [members, setMembers] = useLocalStorage<Member[]>('nojima_members_v3', INITIAL_MEMBERS);
  const [currentUser, setCurrentUser] = useState<Member>(CURRENT_USER);
  const [joined, setJoined] = useLocalStorage<boolean>('nojima_joined_v3', false);

  const [selectedGenre, setSelectedGenre] = useState('pc');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [keywordModalOpen, setKeywordModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignKw, setBulkAssignKw] = useState<string>('');
  const [genreModalOpen, setGenreModalOpen] = useState(false);
  const [deleteGenreId, setDeleteGenreId] = useState<string | null>(null);
  const [janSearchOpen, setJanSearchOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareResult, setCompareResult] = useState<Product[] | null>(null);

  const isManager = canManage(currentUser.rank);
  const canEditGenres = canManageGenres(currentUser.rank);
  const [editMode, setEditMode] = useState(false);
  const canEdit = isManager && editMode;
  const canEditGenre = canEditGenres && editMode;
  const genreKeywords = keywords[selectedGenre] ?? [];

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]
    );
  };

  const handleGenreChange = (genreId: string) => {
    setSelectedGenre(genreId);
    setSelectedKeywords([]);
    setSearchText('');
  };

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed || genreKeywords.includes(trimmed) || !canEdit) return;
    setKeywords((prev) => ({
      ...prev,
      [selectedGenre]: [...(prev[selectedGenre] ?? []), trimmed],
    }));
    setNewKeyword('');
    setKeywordModalOpen(false);
  };

  const handleDeleteKeyword = (keyword: string) => {
    if (!canEdit) return;
    setKeywords((prev) => ({
      ...prev,
      [selectedGenre]: (prev[selectedGenre] ?? []).filter((item) => item !== keyword),
    }));
    setSelectedKeywords((prev) => prev.filter((item) => item !== keyword));
  };

  const [joinName, setJoinName] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState('');
  const [showJoinPassword, setShowJoinPassword] = useState(false);
  const [joinStep, setJoinStep] = useState<'scan' | 'name'>('scan');
  const [scannedGroup, setScannedGroup] = useState<Group | null>(null);

  const handleScan = (results: { rawValue: string }[]) => {
    const value = results[0]?.rawValue;
    if (!value) return;
    let parsed: Group;
    try {
      parsed = JSON.parse(value);
    } catch {
      setScanMessage('無効なQRコードです。グループの招待コードをスキャンしてください。');
      return;
    }
    if (!parsed.id || !parsed.name || !parsed.inviteToken) {
      setScanMessage('無効なQRコードです。グループの招待コードをスキャンしてください。');
      return;
    }
    setScannedGroup(parsed);
    setJoinStep('name');
  };

  const handleJoin = () => {
    const trimmed = joinName.trim();
    if (!trimmed || !scannedGroup) return;
    if (joinPassword !== scannedGroup.password) {
      setJoinError('パスワードが正しくありません。もう一度入力してください。');
      return;
    }
    const newId = 'user-' + Date.now();
    const newMember: Member = { id: newId, name: trimmed, rank: 'パートナー', joinedAt: new Date().toISOString().slice(0, 10) };
    setGroup(scannedGroup);
    setMembers([newMember]);
    setProducts([]);
    setCurrentUser(newMember);
    setJoinName('');
    setJoinPassword('');
    setJoinError('');
    setJoinStep('scan');
    setScannedGroup(null);
    setScannerOpen(false);
    setJoined(true);
  };

  const handleCreateGroup = (groupName: string, userName: string, password: string) => {
    const groupId = 'group-' + Date.now();
    const inviteToken = 'INV-' + Math.random().toString(36).slice(2, 10).toUpperCase();
    const newGroup: Group = { id: groupId, name: groupName, inviteToken, password, createdAt: new Date().toISOString().slice(0, 10) };
    const creator: Member = { id: 'user-' + Date.now(), name: userName, rank: '開発者', joinedAt: new Date().toISOString().slice(0, 10) };
    setGroup(newGroup);
    setMembers([creator]);
    setProducts([]);
    setCurrentUser(creator);
    setJoined(true);
  };

  const handleLeaveGroup = () => {
    setJoined(false);
    setEditMode(false);
    setScannerOpen(false);
    setJoinStep('scan');
    setJoinName('');
    setJoinPassword('');
    setJoinError('');
    setScannedGroup(null);
    setScanMessage('');
    setCurrentUser(CURRENT_USER);
  };

  const handleSaveProduct = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (updated.janCode) {
      setSpecCache((prev) => ({
        ...prev,
        [updated.janCode]: {
          modelNumber: updated.modelNumber ?? '',
          maker: updated.maker ?? '',
          cpu: updated.cpu ?? '',
          ssd: updated.ssd ?? '',
          memory: updated.memory ?? '',
        },
      }));
    }
    setEditProduct(null);
    setDetailProduct(null);
  };

  const handleJanSearch = (janCode: string) => {
    const found = products.find((p) => p.janCode === janCode);
    if (found) {
      setJanSearchOpen(false);
      setDetailProduct(found);
    } else {
      alert('該当する商品が見つかりませんでした。JANコード: ' + janCode);
    }
  };

  const handleAddProduct = (product: Product) => {
    setProducts((prev) => [...prev, product]);
    if (product.janCode) {
      setSpecCache((prev) => ({
        ...prev,
        [product.janCode]: {
          modelNumber: product.modelNumber ?? '',
          maker: product.maker ?? '',
          cpu: product.cpu ?? '',
          ssd: product.ssd ?? '',
          memory: product.memory ?? '',
        },
      }));
    }
    setAddProductOpen(false);
  };

  const handleBulkAssign = (keyword: string, productIds: string[]) => {
    setProducts((prev) => prev.map((p) => {
      if (!productIds.includes(p.id)) return p;
      if (p.keywords.includes(keyword)) return p;
      return { ...p, keywords: [...p.keywords, keyword] };
    }));
    setBulkAssignOpen(false);
    setBulkAssignKw('');
  };

  const handleReset = () => {
    setProducts([]);
    setKeywords(DEFAULT_KEYWORDS);
    setGenres(DEFAULT_GENRES);
    setSelectedKeywords([]);
    setSearchText('');
  };

  const handleAddGenre = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = 'genre-' + Date.now();
    setGenres((prev) => [...prev, { id, name: trimmed, icon: 'package' }]);
  };

  const handleDeleteGenre = (genreId: string) => {
    setGenres((prev) => prev.filter((g) => g.id !== genreId));
    setProducts((prev) => prev.filter((p) => p.genreId !== genreId));
    setKeywords((prev) => {
      const next = { ...prev };
      delete next[genreId];
      return next;
    });
    if (selectedGenre === genreId) {
      const remaining = genres.filter((g) => g.id !== genreId);
      setSelectedGenre(remaining[0]?.id ?? '');
    }
    setDeleteGenreId(null);
  };

  const searchResults = useMemo<SearchResult[]>(() => {
    const genreProducts = products.filter((p) => p.genreId === selectedGenre);
    const text = searchText.trim().toLowerCase();

    const results = genreProducts.map((p) => {
      const matchedKeywords = selectedKeywords.filter((kw) => p.keywords.includes(kw));
      let textMatch = false;
      if (text) {
        textMatch =
          p.name.toLowerCase().includes(text) ||
          p.description.toLowerCase().includes(text) ||
          p.keywords.some((kw) => kw.toLowerCase().includes(text));
      }
      return { ...p, matchCount: matchedKeywords.length, matchedKeywords, textMatch };
    });

    let filtered = results;
    if (selectedKeywords.length > 0) filtered = filtered.filter((r) => r.matchCount > 0);
    if (text) filtered = filtered.filter((r) => r.textMatch);

    filtered.sort((a, b) => {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      return a.price - b.price;
    });

    return filtered;
  }, [products, selectedGenre, selectedKeywords, searchText]);

  const totalKeywords = selectedKeywords.length;
  const hasFilters = totalKeywords > 0 || searchText.trim().length > 0;

  if (!joined) {
    return (
      <>
        <WelcomeScreen
          onCreate={handleCreateGroup}
          onJoinClick={() => { setScanMessage(''); setJoinStep('scan'); setScannedGroup(null); setScannerOpen(true); }}
        />
        <ScanQrModal
          open={scannerOpen}
          message={scanMessage}
          joinStep={joinStep}
          scannedGroup={scannedGroup}
          joinName={joinName}
          setJoinName={setJoinName}
          joinPassword={joinPassword}
          setJoinPassword={setJoinPassword}
          showPassword={showJoinPassword}
          setShowPassword={setShowJoinPassword}
          joinError={joinError}
          onScan={handleScan}
          onJoin={handleJoin}
          onClose={() => { setScannerOpen(false); setJoinStep('scan'); setJoinName(''); setJoinPassword(''); setJoinError(''); setScannedGroup(null); }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-800 leading-tight">nojimaコンサルツール</h1>
                  <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">{group.name}</span>
                </div>
                <p className="text-xs text-slate-500 leading-tight">商品検索・管理ツール</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button onClick={() => setGroupModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="メンバー一覧">
                <Users className="w-4 h-4" /><span className="hidden sm:inline">メンバー</span>
              </button>
              {isManager && (
                <button onClick={() => setQrModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="招待QRコード">
                  <QrCode className="w-4 h-4" /><span className="hidden sm:inline">QR表示</span>
                </button>
              )}
              <button onClick={() => { setScannerOpen(true); setScanMessage(''); }} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="QRコードをスキャン">
                <ScanLine className="w-4 h-4" /><span className="hidden sm:inline">QRスキャン</span>
              </button>
              <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="初期状態に戻す">
                <RotateCcw className="w-4 h-4" /><span className="hidden lg:inline">リセット</span>
              </button>
              {isManager && (
                <button onClick={() => setEditMode((p) => !p)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${editMode ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} title="編集モードの切り替え">
                  <Pencil className="w-4 h-4" /><span className="hidden sm:inline">{editMode ? '編集中' : '編集'}</span>
                </button>
              )}
              <button onClick={handleLeaveGroup} className="flex items-center gap-1.5 px-3 py-2 text-sm text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors" title="グループを離脱">
                <LogOut className="w-4 h-4" /><span className="hidden sm:inline">離脱</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Genre tabs */}
        <div className="mb-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {genres.map((genre) => {
              const Icon = getGenreIcon(genre.icon);
              const isActive = selectedGenre === genre.id;
              return (
                <div key={genre.id} className="relative group flex-shrink-0">
                  <button onClick={() => handleGenreChange(genre.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${isActive ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                    <Icon className="w-4 h-4" />
                    {genre.name}
                  </button>
                  {canEditGenre && genres.length > 1 && (
                    <button onClick={() => setDeleteGenreId(genre.id)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      title="部門を削除">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
            {canEditGenre && (
              <button onClick={() => setGenreModalOpen(true)}
                className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-sm font-medium text-blue-600 border border-dashed border-blue-300 hover:bg-blue-50 transition-all whitespace-nowrap flex-shrink-0">
                <Plus className="w-4 h-4" />
                部門を追加
              </button>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)}
            placeholder="商品名やキーワードで検索..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm" />
          {searchText && (
            <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Keywords section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-500" />
              キーワード
              {totalKeywords > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">{totalKeywords}個選択中</span>
              )}
            </h2>
            {canEdit && (
              <div className="flex items-center gap-2">
                <button onClick={() => setBulkAssignOpen(true)} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors">
                  <Zap className="w-4 h-4" />
                  反映
                </button>
                <button onClick={() => setKeywordModalOpen(true)} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />
                  キーワード追加
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {genreKeywords.map((kw) => {
              const isSelected = selectedKeywords.includes(kw);
              return (
                <div key={kw} className={`flex items-center gap-1 rounded-lg text-sm font-medium transition-all ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
                  <button onClick={() => toggleKeyword(kw)} className="flex items-center gap-1.5 pl-3 py-1.5 hover:opacity-80">
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {kw}
                  </button>
                  {canEdit && (
                    <button onClick={() => handleDeleteKeyword(kw)} className="pr-2 text-current opacity-60 hover:opacity-100" title="キーワード削除">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
            {genreKeywords.length === 0 && (
              <p className="text-sm text-slate-400 py-2">キーワードがありません。「キーワード追加」から登録してください。</p>
            )}
          </div>

          {totalKeywords > 0 && (
            <button onClick={() => setSelectedKeywords([])} className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
              <X className="w-3 h-3" />選択を全て解除
            </button>
          )}
        </div>

        {/* Results header + action buttons */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-slate-600">
              {hasFilters ? (
                <><span className="font-semibold text-slate-800">{searchResults.length}件</span>の商品が見つかりました</>
              ) : (
                <><span className="font-semibold text-slate-800">{searchResults.length}件</span>の商品</>
              )}
            </p>
            {canEdit && (
              <button onClick={() => setAddProductOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                商品追加
              </button>
            )}
            <button onClick={() => setJanSearchOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors shadow-sm">
              <Search className="w-4 h-4" />
              検索
            </button>
            <button onClick={() => setCompareOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
              <GitCompare className="w-4 h-4" />
              同時比較
            </button>
          </div>
          {hasFilters && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              一致度順で表示中
            </div>
          )}
        </div>

        {/* Results */}
        {searchResults.length === 0 ? (
          <div className="text-center py-20">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{hasFilters ? '条件に一致する商品が見つかりませんでした' : '商品がありません。商品を追加してください'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((product) => (
              <ProductCard key={product.id} product={product} canEdit={canEdit} onEdit={() => setEditProduct(product)} onDetail={() => setDetailProduct(product)} />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <Modal open={keywordModalOpen} onClose={() => { setKeywordModalOpen(false); setNewKeyword(''); }} title="キーワード追加">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">ジャンル</label>
            <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600">{genres.find((g) => g.id === selectedGenre)?.name}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">新しいキーワード</label>
            <input type="text" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddKeyword(); }}
              placeholder="例: 軽量、防水、長持ち..." autoFocus
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {newKeyword.trim() && genreKeywords.includes(newKeyword.trim()) && (
            <p className="text-xs text-amber-600">このキーワードは既に存在しています。</p>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setKeywordModalOpen(false); setNewKeyword(''); }} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">キャンセル</button>
            <button onClick={handleAddKeyword} disabled={!newKeyword.trim() || genreKeywords.includes(newKeyword.trim())} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors">追加する</button>
          </div>
        </div>
      </Modal>

      {editProduct && <EditProductModal product={editProduct} allKeywords={genreKeywords} onSave={handleSaveProduct} onClose={() => setEditProduct(null)} />}
      {detailProduct && <ProductDetailModal product={detailProduct} allKeywords={genreKeywords} isManager={canEdit} onSaveProduct={handleSaveProduct} onAddKeyword={(kw) => { handleSaveProduct({ ...detailProduct, keywords: detailProduct.keywords.includes(kw) ? detailProduct.keywords : [...detailProduct.keywords, kw] }); setDetailProduct({ ...detailProduct, keywords: [...detailProduct.keywords, kw] }); }} onClose={() => setDetailProduct(null)} />}
      <InviteQrModal open={qrModalOpen} group={group} onClose={() => setQrModalOpen(false)} />
      <ScanQrModal
        open={scannerOpen}
        message={scanMessage}
        joinStep={joinStep}
        scannedGroup={scannedGroup}
        joinName={joinName}
        setJoinName={setJoinName}
        joinPassword={joinPassword}
        setJoinPassword={setJoinPassword}
        showPassword={showJoinPassword}
        setShowPassword={setShowJoinPassword}
        joinError={joinError}
        onScan={handleScan}
        onJoin={handleJoin}
        onClose={() => { setScannerOpen(false); setJoinStep('scan'); setJoinName(''); setJoinPassword(''); setJoinError(''); setScannedGroup(null); }}
      />
      <GroupMembersModal open={groupModalOpen} group={group} members={members} currentUser={currentUser}
        onUpdateRank={(id, rank) => setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, rank } : m)))}
        onDelete={(id) => setMembers((prev) => prev.filter((m) => m.id !== id))}
        onClose={() => setGroupModalOpen(false)} />
      {addProductOpen && <AddProductModal genreId={selectedGenre} existingProducts={products} specCache={specCache} onSave={handleAddProduct} onClose={() => setAddProductOpen(false)} />}
      {bulkAssignOpen && <BulkAssignModal keywords={genreKeywords} genreId={selectedGenre} products={products} selectedKw={bulkAssignKw} setSelectedKw={setBulkAssignKw} onApply={handleBulkAssign} onClose={() => { setBulkAssignOpen(false); setBulkAssignKw(''); }} />}
      <AddGenreModal open={genreModalOpen} onAdd={handleAddGenre} onClose={() => setGenreModalOpen(false)} />
      {deleteGenreId && <DeleteGenreConfirmModal genreName={genres.find((g) => g.id === deleteGenreId)?.name ?? ''} onConfirm={() => handleDeleteGenre(deleteGenreId)} onCancel={() => setDeleteGenreId(null)} />}
      {janSearchOpen && <JanSearchModal products={products} onFound={handleJanSearch} onClose={() => setJanSearchOpen(false)} />}
      {compareOpen && <CompareSetupModal products={products} onCompare={(items) => { setCompareResult(items); setCompareOpen(false); }} onClose={() => setCompareOpen(false)} />}
      {compareResult && compareResult.length > 0 && <CompareViewModal products={compareResult} onClose={() => setCompareResult(null)} />}
    </div>
  );
}

// ===== Welcome Screen (initial create / join) =====
function WelcomeScreen({ onCreate, onJoinClick }: {
  onCreate: (groupName: string, userName: string, password: string) => void;
  onJoinClick: () => void;
}) {
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [groupName, setGroupName] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const canCreate = groupName.trim() && userName.trim() && password.trim();

  const handleCreate = () => {
    if (!canCreate) return;
    onCreate(groupName.trim(), userName.trim(), password.trim());
  };

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 items-center justify-center shadow-lg mb-3">
              <Store className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 mb-1">新しいグループを作成</h1>
            <p className="text-sm text-slate-500">グループ名・ユーザー名・パスワードを入力してください</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">グループ名</label>
              <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)}
                placeholder="例: ノジマA店" autoFocus
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ユーザー名</label>
              <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)}
                placeholder="例: 山田太郎"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">参加用パスワード</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="グループ参加時に必要なパスワード"
                  className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">このパスワードは他のメンバーがグループに参加する際に必要です。</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setMode('select')} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">戻る</button>
              <button onClick={handleCreate} disabled={!canCreate} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm">作成する</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 items-center justify-center shadow-lg mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">nojimaコンサルツール</h1>
          <p className="text-sm text-slate-500">商品検索・管理ツール</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <p className="text-center text-sm text-slate-600">開始するにはグループを作成するか、既存グループに参加してください</p>
          <button onClick={() => setMode('create')} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
            <Store className="w-5 h-5" />
            新規作成
          </button>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">または</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <button onClick={onJoinClick} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors">
            <UserPlus className="w-5 h-5" />
            グループに参加
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Invite QR Modal =====
function InviteQrModal({ open, group, onClose }: { open: boolean; group: Group; onClose: () => void }) {
  const qrValue = JSON.stringify({ id: group.id, name: group.name, inviteToken: group.inviteToken, password: group.password });
  return (
    <Modal open={open} onClose={onClose} title="グループ招待QRコード">
      <div className="text-center space-y-4">
        <div className="inline-flex p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <QRCodeSVG value={qrValue} size={220} level="M" includeMargin />
        </div>
        <div>
          <p className="font-semibold text-slate-800">{group.name}</p>
          <p className="text-xs text-slate-500 mt-1">このQRコードをスキャンするとグループに参加できます。</p>
          <p className="text-xs text-slate-400 mt-1">参加者はグループパスワードの入力が必要です。</p>
        </div>
      </div>
    </Modal>
  );
}

// ===== Scan QR Modal (with password) =====
function ScanQrModal({ open, message, joinStep, scannedGroup, joinName, setJoinName, joinPassword, setJoinPassword, showPassword, setShowPassword, joinError, onScan, onJoin, onClose }: {
  open: boolean; message: string; joinStep: 'scan' | 'name'; scannedGroup: Group | null;
  joinName: string; setJoinName: (v: string) => void;
  joinPassword: string; setJoinPassword: (v: string) => void;
  showPassword: boolean; setShowPassword: (v: boolean) => void;
  joinError: string;
  onScan: (results: { rawValue: string }[]) => void; onJoin: () => void; onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={joinStep === 'name' ? 'グループに参加' : 'QRコードをスキャン'}>
      {joinStep === 'scan' ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl bg-slate-900 aspect-square">
            {open && <Scanner onScan={onScan} styles={{ container: { width: '100%', height: '100%' } }} />}
          </div>
          <p className="text-center text-xs text-slate-500">招待用QRコードをカメラの枠内に合わせてください。</p>
          {message && <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm text-blue-700">{message}</div>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center py-3">
            <p className="text-xs text-slate-400 mb-1">グループに参加</p>
            <p className="text-2xl font-bold text-slate-800">{scannedGroup?.name ?? '---'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">ユーザー名</label>
            <input type="text" value={joinName} onChange={(e) => setJoinName(e.target.value)}
              placeholder="例: 山田太郎" autoFocus
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">グループパスワード</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)}
                placeholder="グループのパスワードを入力"
                className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {joinError && <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">{joinError}</div>}
          <p className="text-xs text-slate-400">参加時のランクは「パートナー」となります。</p>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">キャンセル</button>
            <button onClick={onJoin} disabled={!joinName.trim() || !joinPassword} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors">参加する</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ===== Group Members Modal =====
function GroupMembersModal({ open, group, members, currentUser, onUpdateRank, onDelete, onClose }: {
  open: boolean; group: Group; members: Member[]; currentUser: Member;
  onUpdateRank: (id: string, rank: MemberRank) => void; onDelete: (id: string) => void; onClose: () => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const isManager = canManage(currentUser.rank);
  const selectedMember = members.find((m) => m.id === selectedId) ?? null;

  const close = () => { setEditMode(false); setSelectedId(null); setDeleteTarget(null); onClose(); };

  return (
    <Modal open={open} onClose={close} title={`メンバー一覧（${group.name}）`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{members.length}名が参加中</p>
          {isManager && (
            <button onClick={() => setEditMode((p) => !p)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${editMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <Pencil className="inline w-3.5 h-3.5 mr-1" />変更
            </button>
          )}
        </div>
        {editMode && <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">メンバーを選択するとランクを変更できます。</p>}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {members.map((member) => {
            const color = rankColor(member.rank);
            return (
              <div key={member.id} onClick={() => editMode && member.id !== currentUser.id && setSelectedId(member.id)}
                className={`flex items-center justify-between px-4 py-3 bg-white ${editMode && member.id !== currentUser.id ? 'cursor-pointer hover:bg-slate-50' : ''}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-lg leading-none ${color ?? 'invisible'}`}>●</span>
                  <span className="font-medium text-slate-800">{member.name}</span>
                  {member.id === currentUser.id && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">自分</span>}
                </div>
                <span className="text-xs text-slate-500">{member.rank}</span>
              </div>
            );
          })}
        </div>
        {editMode && selectedMember && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">{selectedMember.name}さんのランクを変更</p>
            <select value={selectedMember.rank} onChange={(e) => { onUpdateRank(selectedMember.id, e.target.value as MemberRank); setSelectedId(null); }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
              <option value="店長">店長</option>
              <option value="リーダー">リーダー</option>
              <option value="パートナー">パートナー</option>
            </select>
          </div>
        )}
        {isManager && (
          <div className="flex justify-end">
            <button onClick={() => { const t = members.find((m) => m.id === selectedId); if (t) setDeleteTarget(t); }}
              disabled={!selectedId || selectedId === currentUser.id}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:text-slate-300 disabled:hover:bg-transparent rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />メンバー削除
            </button>
          </div>
        )}
        {deleteTarget && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
            <p className="text-sm text-rose-800">本当に{deleteTarget.name}さんを削除しますか？</p>
            <p className="text-xs text-rose-600">削除後も招待QRコードを読み取れば再参加できます。</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-3 py-1.5 text-sm text-slate-600 bg-white rounded-lg">キャンセル</button>
              <button onClick={() => { onDelete(deleteTarget.id); setDeleteTarget(null); setSelectedId(null); }} className="px-3 py-1.5 text-sm text-white bg-rose-600 rounded-lg">削除する</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ===== Product Card =====
function ProductCard({ product, canEdit, onEdit, onDetail }: { product: SearchResult; canEdit: boolean; onEdit: () => void; onDetail: () => void }) {
  const unmatchedKws = product.keywords.filter((kw) => !product.matchedKeywords.includes(kw));
  return (
    <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all overflow-hidden">
      {product.matchCount > 0 && (
        <div className="px-5 pt-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-100">
            <TrendingUp className="w-3.5 h-3.5" />一致したキーワード数: {product.matchCount}件
          </div>
        </div>
      )}
      <div className="p-5">
        <h3 className="font-semibold text-slate-800 text-base leading-snug mb-1 cursor-pointer hover:text-blue-600 transition-colors" onClick={onDetail}>{product.name}</h3>
        <p className="text-xs text-slate-500 mb-3 flex items-center gap-1 flex-wrap">
          {product.id.toUpperCase()}
          {product.janCode && <>&nbsp;/ JAN: {product.janCode}<CopyButton text={product.janCode} /></>}
          {product.modelNumber && <>&nbsp;/ 型番: {product.modelNumber}<CopyButton text={product.modelNumber} /></>}
        </p>
        <p className="text-sm text-slate-600 leading-relaxed mb-3 line-clamp-2">{product.description}</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {product.matchedKeywords.map((kw) => (
            <span key={kw} className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{kw}</span>
          ))}
          {unmatchedKws.slice(0, 4).map((kw) => (
            <span key={kw} className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">{kw}</span>
          ))}
          {unmatchedKws.length > 4 && <span className="inline-flex items-center px-2 py-0.5 text-slate-400 text-xs">+{unmatchedKws.length - 4}</span>}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xl font-bold text-slate-900">{formatPrice(product.price)}</p>
          <div className="flex items-center gap-2">
            <button onClick={onDetail} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
              詳細 <ChevronRight className="w-3 h-3" />
            </button>
            {canEdit && (
              <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors">
                <Pencil className="w-3.5 h-3.5" />編集
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Product Detail Modal (with spec fields + 設定を反映) =====
function ProductDetailModal({ product, allKeywords, isManager, onSaveProduct, onAddKeyword, onClose }: {
  product: Product; allKeywords: string[]; isManager: boolean;
  onSaveProduct: (p: Product) => void; onAddKeyword: (kw: string) => void; onClose: () => void;
}) {
  const [showKwInput, setShowKwInput] = useState(false);
  const [customKw, setCustomKw] = useState('');
  const [editing, setEditing] = useState(false);
  const [maker, setMaker] = useState(product.maker ?? '');
  const [cpu, setCpu] = useState(product.cpu ?? '');
  const [ssd, setSsd] = useState(product.ssd ?? '');
  const [memory, setMemory] = useState(product.memory ?? '');
  const [strengths, setStrengths] = useState(product.strengths ?? '');
  const [description, setDescription] = useState(product.description);
  const availableKws = allKeywords.filter((kw) => !product.keywords.includes(kw));

  const handleAdd = (kw: string) => {
    if (!kw.trim()) return;
    onAddKeyword(kw.trim());
    setCustomKw('');
    setShowKwInput(false);
  };

  const handleApplySpecs = () => {
    onSaveProduct({
      ...product,
      maker: maker.trim() || undefined,
      cpu: cpu.trim() || undefined,
      ssd: ssd.trim() || undefined,
      memory: memory.trim() || undefined,
      strengths: strengths.trim() || undefined,
      description: description.trim(),
    });
    setEditing(false);
  };

  const specRows: { label: string; icon: typeof Cpu; value: string; setter: (v: string) => void; placeholder: string }[] = [
    { label: 'メーカー', icon: Package, value: maker, setter: setMaker, placeholder: '例: Lenovo, Panasonic...' },
    { label: 'CPU', icon: Cpu, value: cpu, setter: setCpu, placeholder: '例: Core i7, Ryzen 5...' },
    { label: 'SSD', icon: HardDrive, value: ssd, setter: setSsd, placeholder: '例: 512GB, 1TB...' },
    { label: 'メモリ', icon: MemoryStick, value: memory, setter: setMemory, placeholder: '例: 16GB, 8GB...' },
  ];

  return (
    <Modal open={true} onClose={onClose} title="商品詳細">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-1">{product.name}</h3>
          <p className="text-xs text-slate-500 flex items-center gap-1 flex-wrap">
            ID: {product.id.toUpperCase()}
            {product.modelNumber && <> / 型番: {product.modelNumber}<CopyButton text={product.modelNumber} /></>}
          </p>
          {product.janCode && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-slate-600">JAN: {product.janCode}<CopyButton text={product.janCode} /></span>
              <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-600">末尾3桁: {product.janSuffix}</span>
            </div>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{formatPrice(product.price)}</p>
        </div>

        {/* 基本スペック */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">基本スペック</label>
            {isManager && (
              <button onClick={() => setEditing((p) => !p)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${editing ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <Pencil className="inline w-3 h-3 mr-1" />{editing ? '編集中' : '編集'}
              </button>
            )}
          </div>
          {specRows.map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                <row.icon className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-500">{row.label}</span>
              </div>
              {editing ? (
                <input type="text" value={row.value} onChange={(e) => row.setter(e.target.value)} placeholder={row.placeholder}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              ) : (
                <span className="text-sm font-medium text-slate-800">{row.value || 'スペック情報未取得（手動入力してください）'}</span>
              )}
            </div>
          ))}
        </div>

        {/* 商品の強み */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            <label className="text-sm font-semibold text-slate-700">この商品の強み</label>
          </div>
          {editing ? (
            <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={2}
              placeholder="この商品の強み・セールスポイントを入力..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
          ) : (
            <p className="text-sm text-slate-700 leading-relaxed">{strengths || '—'}</p>
          )}
        </div>

        {/* 商品詳細 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-400" />
            <label className="text-sm font-semibold text-slate-700">商品詳細</label>
          </div>
          {editing ? (
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          ) : (
            <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
          )}
        </div>

        {/* 編集中の設定反映ボタン */}
        {editing && (
          <div className="flex gap-3">
            <button onClick={() => {
              setMaker(product.maker ?? ''); setCpu(product.cpu ?? ''); setSsd(product.ssd ?? '');
              setMemory(product.memory ?? ''); setStrengths(product.strengths ?? ''); setDescription(product.description);
              setEditing(false);
            }} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">キャンセル</button>
            <button onClick={handleApplySpecs} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">設定を反映</button>
          </div>
        )}

        {/* キーワード */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">キーワード</label>
            {isManager && !showKwInput && (
              <button onClick={() => setShowKwInput(true)} className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                <Plus className="w-4 h-4" />キーワード追加
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {product.keywords.map((kw) => (
              <span key={kw} className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100">{kw}</span>
            ))}
            {product.keywords.length === 0 && <p className="text-sm text-slate-400">キーワードが設定されていません</p>}
          </div>
          {showKwInput && (
            <div className="mt-3 space-y-3">
              {availableKws.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">既存キーワードから追加:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableKws.map((kw) => (
                      <button key={kw} onClick={() => handleAdd(kw)} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors">
                        <Plus className="inline w-3 h-3 mr-0.5" />{kw}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <input type="text" value={customKw} onChange={(e) => setCustomKw(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(customKw); } }}
                  placeholder="新しいキーワードを入力..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={() => handleAdd(customKw)} disabled={!customKw.trim()} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  追加
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">閉じる</button>
        </div>
      </div>
    </Modal>
  );
}

// ===== Edit Product Modal =====
function EditProductModal({ product, allKeywords, onSave, onClose }: {
  product: Product; allKeywords: string[]; onSave: (p: Product) => void; onClose: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [description, setDescription] = useState(product.description);
  const [selectedKws, setSelectedKws] = useState<string[]>(product.keywords);
  const [customKw, setCustomKw] = useState('');

  const toggleKw = (kw: string) => {
    setSelectedKws((prev) => prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]);
  };

  const addCustomKw = () => {
    const trimmed = customKw.trim();
    if (!trimmed || selectedKws.includes(trimmed)) return;
    setSelectedKws((prev) => [...prev, trimmed]);
    setCustomKw('');
  };

  const handleSave = () => {
    const priceNum = parseInt(price, 10);
    if (isNaN(priceNum) || priceNum < 0) return;
    onSave({ ...product, name: name.trim() || product.name, price: priceNum, description: description.trim(), keywords: selectedKws });
  };

  return (
    <Modal open={true} onClose={onClose} title="商品編集">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">商品名</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">価格（税抜）</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min={0} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">商品説明</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">キーワード<span className="ml-1 text-xs font-normal text-slate-400">（タップで切替）</span></label>
          <div className="flex flex-wrap gap-2 mb-2">
            {allKeywords.map((kw) => {
              const isSelected = selectedKws.includes(kw);
              return (
                <button key={kw} onClick={() => toggleKw(kw)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {isSelected && <Check className="w-3 h-3" />}{kw}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input type="text" value={customKw} onChange={(e) => setCustomKw(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomKw(); } }}
              placeholder="新しいキーワードを追加..." className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={addCustomKw} disabled={!customKw.trim()} className="flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {selectedKws.length > 0 && <p className="mt-2 text-xs text-slate-400">{selectedKws.length}個のキーワードが設定されています</p>}
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">キャンセル</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">保存する</button>
        </div>
      </div>
    </Modal>
  );
}

// ===== Add Product Modal (JAN scan + auto-parse specs + manual edit) =====
function AddProductModal({ genreId, existingProducts, specCache, onSave, onClose }: { genreId: string; existingProducts: Product[]; specCache: Record<string, { modelNumber: string; maker: string; cpu: string; ssd: string; memory: string }>; onSave: (p: Product) => void; onClose: () => void }) {
  const [dupError, setDupError] = useState('');
  const [step, setStep] = useState<'scan' | 'input' | 'confirm'>('scan');
  const [janCode, setJanCode] = useState('');
  const [scanError, setScanError] = useState('');
  const [name, setName] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [maker, setMaker] = useState('');
  const [cpu, setCpu] = useState('');
  const [ssd, setSsd] = useState('');
  const [memory, setMemory] = useState('');
  const [strengths, setStrengths] = useState('');
  const [cacheLoaded, setCacheLoaded] = useState(false);

  const checkDuplicate = (code: string): Product | undefined => {
    return existingProducts.find((p) => p.janCode === code);
  };

  const applyCache = (code: string) => {
    const cached = specCache[code];
    if (cached) {
      setModelNumber(cached.modelNumber || '');
      setMaker(cached.maker || '');
      setCpu(cached.cpu || '');
      setSsd(cached.ssd || '');
      setMemory(cached.memory || '');
      setCacheLoaded(true);
    } else {
      setCacheLoaded(false);
    }
  };

  const handleScan = (results: { rawValue: string }[]) => {
    const value = results[0]?.rawValue;
    if (!value) return;
    if (value.length < 13) {
      setScanError('JANコードは13桁である必要があります。');
      return;
    }
    const dup = checkDuplicate(value);
    if (dup) {
      setScanError('');
      setDupError(`この商品は既に追加済みです（型番: ${dup.modelNumber ?? dup.name}）`);
      return;
    }
    setDupError('');
    setJanCode(value);
    applyCache(value);
    setStep('confirm');
  };

  const handleManualInput = () => {
    if (janCode.length < 13) {
      setScanError('JANコードは13桁で入力してください。');
      return;
    }
    const dup = checkDuplicate(janCode);
    if (dup) {
      setScanError('');
      setDupError(`この商品は既に追加済みです（型番: ${dup.modelNumber ?? dup.name}）`);
      return;
    }
    setScanError('');
    setDupError('');
    applyCache(janCode);
    setStep('confirm');
  };

  // confirm画面に入った時にスペックを推定（キャッシュがない場合のみ）
  const autoFillSpecs = () => {
    if (cacheLoaded) return;
    const specs = autoParseSpecs(name, description, janCode);
    setMaker(specs.maker);
    setCpu(specs.cpu);
    setSsd(specs.ssd);
    setMemory(specs.memory);
  };

  const handleSave = () => {
    const priceNum = parseInt(price, 10);
    if (!name.trim() || isNaN(priceNum) || priceNum < 0) return;
    const suffix = janCode.slice(-3);
    onSave({
      id: 'p' + Date.now(),
      name: name.trim(),
      price: priceNum,
      description: description.trim() || '商品説明なし',
      genreId,
      keywords: [],
      janCode,
      modelNumber: modelNumber.trim() || undefined,
      janSuffix: suffix,
      maker: maker.trim() || undefined,
      cpu: cpu.trim() || undefined,
      ssd: ssd.trim() || undefined,
      memory: memory.trim() || undefined,
      strengths: strengths.trim() || undefined,
    });
  };

  const specFields: { label: string; icon: typeof Cpu; value: string; setter: (v: string) => void; placeholder: string }[] = [
    { label: 'メーカー', icon: Package, value: maker, setter: setMaker, placeholder: '例: Lenovo, Panasonic...' },
    { label: 'CPU', icon: Cpu, value: cpu, setter: setCpu, placeholder: '例: Core i7, Ryzen 5...' },
    { label: 'SSD', icon: HardDrive, value: ssd, setter: setSsd, placeholder: '例: 512GB, 1TB...' },
    { label: 'メモリ', icon: MemoryStick, value: memory, setter: setMemory, placeholder: '例: 16GB, 8GB...' },
  ];

  return (
    <Modal open={true} onClose={onClose} title="商品追加（JANコード読み込み）">
      {step === 'scan' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl bg-slate-900 aspect-square">
            <Scanner onScan={handleScan} styles={{ container: { width: '100%', height: '100%' } }} />
          </div>
          <p className="text-center text-xs text-slate-500">商品のバーコード（JANコード）をカメラに合わせてください。</p>
          {scanError && <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-sm text-rose-700">{scanError}</div>}
          {dupError && <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">{dupError}</div>}
          <div className="text-center">
            <button onClick={() => setStep('input')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">手動でJANコードを入力する</button>
          </div>
        </div>
      )}
      {step === 'input' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">JANコード（13桁）</label>
            <input type="text" value={janCode} onChange={(e) => setJanCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 13))}
              placeholder="4905550123451" autoFocus
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="mt-1 text-xs text-slate-400">{janCode.length}桁入力済み</p>
          </div>
          {scanError && <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-sm text-rose-700">{scanError}</div>}
          {dupError && <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">{dupError}</div>}
          <div className="flex gap-3">
            <button onClick={() => setStep('scan')} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">スキャンに戻る</button>
            <button onClick={handleManualInput} disabled={janCode.length < 13} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors">次へ</button>
          </div>
        </div>
      )}
      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-blue-600 font-medium">JAN:</span>
              <span className="text-sm font-mono font-semibold text-slate-800">{janCode}</span>
              <CopyButton text={janCode} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-blue-600 font-medium">型番:</span>
              {modelNumber ? (
                <>
                  <span className="text-sm font-semibold text-slate-800">{modelNumber}</span>
                  <CopyButton text={modelNumber} />
                </>
              ) : (
                <span className="text-sm text-slate-400">未入力（下記フォームに入力してください）</span>
              )}
            </div>
            <p className="text-xs text-slate-500">末尾3桁: <span className="font-semibold">{janCode.slice(-3)}</span></p>
          </div>
          {cacheLoaded && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
              このJANコードは過去に登録済みです。スペック情報をキャッシュから読み込みました。
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">商品名</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={autoFillSpecs}
              placeholder="商品名を入力..." autoFocus
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">型番</label>
            <input type="text" value={modelNumber} onChange={(e) => setModelNumber(e.target.value)}
              placeholder="例: BN-Pro15, GF-RTX4070..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">価格（税抜）</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min={0} placeholder="98000"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* 自動解析スペック（手動修正可能） */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">基本スペック（手動入力可）</label>
              {!cacheLoaded && (
                <button onClick={() => { const specs = autoParseSpecs(name, description, janCode); setMaker(specs.maker); setCpu(specs.cpu); setSsd(specs.ssd); setMemory(specs.memory); }} className="text-xs text-blue-600 hover:text-blue-700 font-medium">商品名から推定</button>
              )}
            </div>
            {specFields.map((f) => (
              <div key={f.label} className="flex items-center gap-2">
                <div className="flex items-center gap-1 w-20 flex-shrink-0">
                  <f.icon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500">{f.label}</span>
                </div>
                <input type="text" value={f.value} onChange={(e) => f.setter(e.target.value)} placeholder={f.placeholder}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            {!cacheLoaded && !maker && !cpu && !ssd && !memory && (
              <p className="text-xs text-amber-600 pl-1">スペック情報未取得（手動入力してください）</p>
            )}
          </div>

          {/* 強み */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <label className="text-sm font-semibold text-slate-700">この商品の強み</label>
            </div>
            <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={2}
              placeholder="この商品の強み・セールスポイントを入力..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">商品詳細（任意）</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setStep('scan'); setJanCode(''); setModelNumber(''); setMaker(''); setCpu(''); setSsd(''); setMemory(''); setCacheLoaded(false); }} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">読み直す</button>
            <button onClick={handleSave} disabled={!name.trim() || !price} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors">登録する</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ===== Bulk Assign Modal =====
function BulkAssignModal({ keywords, genreId, products, selectedKw, setSelectedKw, onApply, onClose }: {
  keywords: string[]; genreId: string; products: Product[]; selectedKw: string; setSelectedKw: (v: string) => void;
  onApply: (keyword: string, productIds: string[]) => void; onClose: () => void;
}) {
  const [step, setStep] = useState<'select' | 'products'>('select');
  const [customKw, setCustomKw] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const genreProducts = products.filter((p) => p.genreId === genreId);
  const effectiveKw = selectedKw || customKw.trim();

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleApply = () => {
    if (!effectiveKw || selectedProductIds.length === 0) return;
    onApply(effectiveKw, selectedProductIds);
  };

  return (
    <Modal open={true} onClose={onClose} title="キーワードの一括割り当て">
      {step === 'select' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">キーワードを選択</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {keywords.map((kw) => (
                <button key={kw} onClick={() => { setSelectedKw(kw); setCustomKw(''); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedKw === kw ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {kw}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">または新規キーワードを入力</label>
            <input type="text" value={customKw} onChange={(e) => { setCustomKw(e.target.value); setSelectedKw(''); }} placeholder="新しいキーワード..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">キャンセル</button>
            <button onClick={() => setStep('products')} disabled={!effectiveKw} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors">
              商品を選択する
            </button>
          </div>
        </div>
      )}
      {step === 'products' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
            <p className="text-xs text-blue-600">割り当てるキーワード</p>
            <p className="text-sm font-semibold text-slate-800">{effectiveKw}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">商品を複数選択（{selectedProductIds.length}件選択中）</p>
            <div className="max-h-64 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2">
              {genreProducts.map((p) => {
                const checked = selectedProductIds.includes(p.id);
                const hasKw = p.keywords.includes(effectiveKw);
                return (
                  <button key={p.id} onClick={() => toggleProduct(p.id)} disabled={hasKw}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${checked ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'} ${hasKw ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${checked ? 'bg-blue-600' : 'border-2 border-slate-300'}`}>
                      {checked && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">{formatPrice(p.price)}{hasKw && '（既に設定済み）'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep('select')} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">戻る</button>
            <button onClick={handleApply} disabled={selectedProductIds.length === 0} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors">
              <Zap className="inline w-4 h-4 mr-1" />反映（{selectedProductIds.length}件）
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ===== Add Genre Modal =====
function AddGenreModal({ open, onAdd, onClose }: { open: boolean; onAdd: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name);
    setName('');
    onClose();
  };
  return (
    <Modal open={open} onClose={() => { setName(''); onClose(); }} title="部門を追加">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">部門名</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="例: 掃除機、炊飯器..." autoFocus
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => { setName(''); onClose(); }} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">キャンセル</button>
          <button onClick={handleAdd} disabled={!name.trim()} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors">追加する</button>
        </div>
      </div>
    </Modal>
  );
}

// ===== Delete Genre Confirm Modal =====
function DeleteGenreConfirmModal({ genreName, onConfirm, onCancel }: { genreName: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal open={true} onClose={onCancel} title="部門を削除">
      <div className="space-y-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-2">
          <p className="text-sm text-rose-800">本当に「{genreName}」部門を削除しますか？</p>
          <p className="text-xs text-rose-600">この部門に属するすべての商品とキーワードも削除されます。この操作は取り消せません。</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">キャンセル</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors">削除する</button>
        </div>
      </div>
    </Modal>
  );
}

// ===== JAN Search Modal (scan JAN → direct to product detail) =====
function JanSearchModal({ products, onFound, onClose }: { products: Product[]; onFound: (janCode: string) => void; onClose: () => void }) {
  const [step, setStep] = useState<'scan' | 'input'>('scan');
  const [janCode, setJanCode] = useState('');
  const [error, setError] = useState('');

  const handleScan = (results: { rawValue: string }[]) => {
    const value = results[0]?.rawValue;
    if (!value) return;
    if (value.length < 13) {
      setError('JANコードは13桁である必要があります。');
      return;
    }
    onFound(value);
  };

  const handleManualSearch = () => {
    if (janCode.length < 13) {
      setError('JANコードは13桁で入力してください。');
      return;
    }
    setError('');
    onFound(janCode);
  };

  return (
    <Modal open={true} onClose={onClose} title="JANコード検索">
      {step === 'scan' ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl bg-slate-900 aspect-square">
            <Scanner onScan={handleScan} styles={{ container: { width: '100%', height: '100%' } }} />
          </div>
          <p className="text-center text-xs text-slate-500">商品のバーコード（JANコード）をカメラに合わせてください。該当商品の詳細が一発で表示されます。</p>
          {error && <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <div className="text-center">
            <button onClick={() => setStep('input')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">手動でJANコードを入力する</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">JANコード（13桁）</label>
            <input type="text" value={janCode} onChange={(e) => setJanCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 13))}
              placeholder="4905550123451" autoFocus
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="mt-1 text-xs text-slate-400">{janCode.length}桁入力済み</p>
          </div>
          {error && <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <div className="flex gap-3">
            <button onClick={() => setStep('scan')} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">スキャンに戻る</button>
            <button onClick={handleManualSearch} disabled={janCode.length < 13} className="flex-1 px-4 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 transition-colors">検索する</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ===== Compare Setup Modal (max 5 slots, scan JAN per slot) =====
type CompareSlot = { index: number; janCode: string; product: Product | null };

function CompareSetupModal({ products, onCompare, onClose }: { products: Product[]; onCompare: (items: Product[]) => void; onClose: () => void }) {
  const [slots, setSlots] = useState<CompareSlot[]>([
    { index: 0, janCode: '', product: null },
    { index: 1, janCode: '', product: null },
  ]);
  const [scanningSlot, setScanningSlot] = useState<number | null>(null);

  const addSlot = () => {
    if (slots.length >= 5) return;
    setSlots((prev) => [...prev, { index: prev.length, janCode: '', product: null }]);
  };

  const removeSlot = (idx: number) => {
    if (slots.length <= 2) return;
    setSlots((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, index: i })));
  };

  const handleScanResult = (results: { rawValue: string }[]) => {
    const value = results[0]?.rawValue;
    if (!value || scanningSlot === null) return;
    const found = products.find((p) => p.janCode === value);
    setSlots((prev) => prev.map((s, i) =>
      i === scanningSlot ? { ...s, janCode: value, product: found ?? null } : s
    ));
    setScanningSlot(null);
  };

  const handleManualJan = (idx: number, code: string) => {
    const found = products.find((p) => p.janCode === code);
    setSlots((prev) => prev.map((s, i) =>
      i === idx ? { ...s, janCode: code, product: found ?? null } : s
    ));
  };

  const validSlots = slots.filter((s) => s.product !== null);
  const canCompare = validSlots.length >= 2;

  return (
    <Modal open={true} onClose={onClose} title="同時比較設定（最大5台）">
      <div className="space-y-3">
        {slots.map((slot, idx) => (
          <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-3">
            <div className="flex-shrink-0 w-16 text-center">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 text-white text-sm font-bold">{idx + 1}台目</span>
            </div>
            <div className="flex-1 min-w-0">
              {slot.product ? (
                <div>
                  <p className="text-sm font-medium text-slate-800 truncate">{slot.product.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{slot.janCode}</p>
                </div>
              ) : (
                <div>
                  <input type="text" value={slot.janCode}
                    onChange={(e) => handleManualJan(idx, e.target.value.replace(/[^0-9]/g, '').slice(0, 13))}
                    placeholder="JANコード（手動入力可）"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {!slot.product && slot.janCode.length >= 13 && (
                    <p className="text-xs text-rose-500 mt-1">該当商品なし</p>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => setScanningSlot(idx)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-900 transition-colors">
              <CameraIcon className="w-4 h-4" />カメラ
            </button>
            {slots.length > 2 && (
              <button onClick={() => removeSlot(idx)} className="flex-shrink-0 p-1.5 text-slate-300 hover:text-rose-500">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {slots.length < 5 && (
          <button onClick={addSlot} className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm font-medium text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
            <Plus className="w-4 h-4" />スロットを追加（最大5台）
          </button>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">キャンセル</button>
          <button onClick={() => onCompare(validSlots.map((s) => s.product!))}
            disabled={!canCompare}
            className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors">
            <GitCompare className="inline w-4 h-4 mr-1" />比較する（{validSlots.length}台）
          </button>
        </div>
      </div>

      {/* カメラスキャン用オーバーレイ */}
      {scanningSlot !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setScanningSlot(null)}>
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-800">{scanningSlot + 1}台目のJANコードをスキャン</p>
              <button onClick={() => setScanningSlot(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-hidden rounded-xl bg-slate-900 aspect-square">
              <Scanner onScan={handleScanResult} styles={{ container: { width: '100%', height: '100%' } }} />
            </div>
            <p className="text-center text-xs text-slate-500 mt-2">商品のバーコードをカメラに合わせてください。</p>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ===== Compare View Modal (linked scroll, side-by-side comparison) =====
function CompareViewModal({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const rows: { label: string; icon: typeof Cpu; key: keyof Product }[] = [
    { label: 'メーカー', icon: Package, key: 'maker' },
    { label: 'CPU', icon: Cpu, key: 'cpu' },
    { label: 'SSD', icon: HardDrive, key: 'ssd' },
    { label: 'メモリ', icon: MemoryStick, key: 'memory' },
  ];

  return (
    <Modal open={true} onClose={onClose} title={`同時比較（${products.length}台）`}>
      <div className="space-y-4">
        {/* 横並び比較テーブル（連動スクロール） */}
        <div ref={scrollRef} className="overflow-x-auto overflow-y-auto max-h-[60vh] rounded-xl border border-slate-200">
          <div className="inline-block min-w-full">
            {/* ヘッダー: 商品名 */}
            <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
              <div className="w-28 flex-shrink-0 p-3 text-xs font-semibold text-slate-500 border-r border-slate-200">商品名</div>
              {products.map((p) => (
                <div key={p.id} className="w-48 flex-shrink-0 p-3 border-r border-slate-200 last:border-r-0">
                  <p className="text-sm font-bold text-slate-800 leading-snug">{p.name}</p>
                  <p className="text-xs text-blue-600 font-semibold mt-0.5">{formatPrice(p.price)}</p>
                  {p.janCode && <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">{p.janCode}<CopyButton text={p.janCode} /></p>}
                </div>
              ))}
            </div>

            {/* メーカー（公式ロゴ欄） */}
            <div className="flex border-b border-slate-100">
              <div className="w-28 flex-shrink-0 p-3 text-xs font-medium text-slate-500 border-r border-slate-200 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-400" />メーカー
              </div>
              {products.map((p) => (
                <div key={p.id} className="w-48 flex-shrink-0 p-3 border-r border-slate-200 last:border-r-0">
                  <div className="inline-flex items-center px-2.5 py-1 bg-slate-100 rounded-lg text-sm font-bold text-slate-700">
                    {p.maker || '—'}
                  </div>
                </div>
              ))}
            </div>

            {/* CPU */}
            <div className="flex border-b border-slate-100">
              <div className="w-28 flex-shrink-0 p-3 text-xs font-medium text-slate-500 border-r border-slate-200 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-slate-400" />CPU
              </div>
              {products.map((p) => (
                <div key={p.id} className="w-48 flex-shrink-0 p-3 border-r border-slate-200 last:border-r-0">
                  <span className="text-sm text-slate-700">{p.cpu || '—'}</span>
                </div>
              ))}
            </div>

            {/* SSD */}
            <div className="flex border-b border-slate-100">
              <div className="w-28 flex-shrink-0 p-3 text-xs font-medium text-slate-500 border-r border-slate-200 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />SSD
              </div>
              {products.map((p) => (
                <div key={p.id} className="w-48 flex-shrink-0 p-3 border-r border-slate-200 last:border-r-0">
                  <span className="text-sm text-slate-700">{p.ssd || '—'}</span>
                </div>
              ))}
            </div>

            {/* メモリ */}
            <div className="flex border-b border-slate-100">
              <div className="w-28 flex-shrink-0 p-3 text-xs font-medium text-slate-500 border-r border-slate-200 flex items-center gap-1.5">
                <MemoryStick className="w-3.5 h-3.5 text-slate-400" />メモリ
              </div>
              {products.map((p) => (
                <div key={p.id} className="w-48 flex-shrink-0 p-3 border-r border-slate-200 last:border-r-0">
                  <span className="text-sm text-slate-700">{p.memory || '—'}</span>
                </div>
              ))}
            </div>

            {/* 強み */}
            <div className="flex border-b border-slate-100">
              <div className="w-28 flex-shrink-0 p-3 text-xs font-medium text-slate-500 border-r border-slate-200 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />強み
              </div>
              {products.map((p) => (
                <div key={p.id} className="w-48 flex-shrink-0 p-3 border-r border-slate-200 last:border-r-0 bg-amber-50/50">
                  <span className="text-sm text-slate-700 leading-relaxed">{p.strengths || '—'}</span>
                </div>
              ))}
            </div>

            {/* 商品詳細 */}
            <div className="flex">
              <div className="w-28 flex-shrink-0 p-3 text-xs font-medium text-slate-500 border-r border-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />詳細
              </div>
              {products.map((p) => (
                <div key={p.id} className="w-48 flex-shrink-0 p-3 border-r border-slate-200 last:border-r-0">
                  <span className="text-sm text-slate-600 leading-relaxed">{p.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center">スクロールで全項目・全商品を確認できます。各項目は同じ高さに揃えて表示されます。</p>

        <div className="flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">閉じる</button>
        </div>
      </div>
    </Modal>
  );
}
