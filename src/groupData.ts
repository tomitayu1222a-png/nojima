export type MemberRank = '開発者' | '店長' | 'リーダー' | 'パートナー';

export type Member = {
  id: string;
  name: string;
  rank: MemberRank;
  joinedAt: string;
};

export type Group = {
  id: string;
  name: string;
  inviteToken: string;
  createdAt: string;
};

export const CURRENT_USER: Member = {
  id: 'user-yu',
  name: '悠',
  rank: '開発者',
  joinedAt: '2026-09-01',
};

export const INITIAL_GROUP: Group = {
  id: 'nojima-a',
  name: 'ノジマA店',
  inviteToken: 'NOJIMA-A-2026',
  createdAt: '2026-09-01',
};

export const INITIAL_MEMBERS: Member[] = [
  CURRENT_USER,
  { id: 'user-sato', name: '佐藤', rank: '店長', joinedAt: '2026-09-01' },
  { id: 'user-tanaka', name: '田中', rank: 'リーダー', joinedAt: '2026-09-02' },
  { id: 'user-suzuki', name: '鈴木', rank: 'パートナー', joinedAt: '2026-09-03' },
  { id: 'user-yamada', name: '山田', rank: 'パートナー', joinedAt: '2026-09-04' },
];

export const PRIVILEGED_RANKS: MemberRank[] = ['開発者', '店長', 'リーダー'];
export const GENRE_MANAGE_RANKS: MemberRank[] = ['開発者', '店長'];

export function canManage(rank: MemberRank): boolean {
  return PRIVILEGED_RANKS.includes(rank);
}

export function canManageGenres(rank: MemberRank): boolean {
  return GENRE_MANAGE_RANKS.includes(rank);
}

export function rankColor(rank: MemberRank): string | null {
  if (rank === '開発者' || rank === '店長') return 'text-red-500';
  if (rank === 'リーダー') return 'text-orange-500';
  return null;
}
