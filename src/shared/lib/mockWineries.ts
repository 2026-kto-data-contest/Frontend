import { matchesQuery, findMatchRange } from "./hangul";

export interface Winery {
  id: string;
  type: (typeof ALL_TYPE_FILTERS)[number];
  region: (typeof ALL_REGION_FILTERS)[number];
  detailRegion: string;
  name: string;
  productName: string;
  description: string;
  tags: string[];
  badges?: string[];
}

export const ALL_TYPE_FILTERS = ["탁주", "약주", "청주", "증류주", "과실주", "기타"] as const;
export const ALL_REGION_FILTERS = [
  "수도권",
  "강원",
  "충청",
  "전라",
  "경상",
  "부산",
  "울산",
  "제주",
] as const;

export const WINERIES: Winery[] = [
  {
    id: "gounddal",
    type: "증류주",
    region: "경상",
    detailRegion: "경북 문경",
    name: "고운달 양조장",
    productName: "예담",
    description: "국내산 명품 오미자를 와인 옹기에 숙성하여 고귀하게 빚어낸 전통 프리미엄 증류주",
    tags: ["상큼함", "달콤함", "드라이", "산미"],
  },
  {
    id: "baramkkot",
    type: "증류주",
    region: "전라",
    detailRegion: "전북 익산",
    name: "바람꽃 양조장",
    productName: "해풍",
    description: "국내산 명품 오미자를 와인 옹기에 숙성하여 고귀하게 빚어낸 전통 프리미엄 증류주",
    tags: ["상큼함", "달콤함", "묵직함"],
  },
  {
    id: "cheongjeong",
    type: "청주",
    region: "제주",
    detailRegion: "제주 서귀포",
    name: "청정 바다 양조장",
    productName: "청명주",
    description: "국내산 명품 오미자를 와인 옹기에 숙성하여 고귀하게 빚어낸 전통 프리미엄 증류주",
    tags: ["상큼함", "달콤함", "깔끔함", "향긋함"],
  },
  {
    id: "pocheon-1",
    type: "탁주",
    region: "수도권",
    detailRegion: "경기 포천",
    name: "포천 이동식 저장 양조장",
    productName: "포천막걸리",
    description: "이동식 저장고에서 저온 숙성한 생막걸리를 현대적으로 재해석한 양조장",
    tags: ["부드러움", "묵직함"],
  },
  {
    id: "pocheon-2",
    type: "탁주",
    region: "수도권",
    detailRegion: "경기 포천",
    name: "포천 이동식 저장 양조장",
    productName: "포천막걸리 스파클링",
    description: "이동식 저장고에서 저온 숙성한 생막걸리를 현대적으로 재해석한 양조장",
    tags: ["상큼함", "드라이"],
  },
  {
    id: "pocheon-3",
    type: "약주",
    region: "수도권",
    detailRegion: "경기 포천",
    name: "포천 이동식 저장 양조장",
    productName: "포천약주",
    description: "이동식 저장고에서 저온 숙성한 약주를 현대적으로 재해석한 양조장",
    tags: ["깔끔함", "향긋함"],
  },
  {
    id: "mungyeong-1",
    type: "증류주",
    region: "경상",
    detailRegion: "경북 문경시",
    name: "문경 고운달 양조장",
    productName: "고운달",
    description: "국내산 명품 오미자를 와인 옹기에 숙성하여 고귀하게 빚어낸 전통 증류주",
    tags: ["상큼함", "산미"],
  },
  {
    id: "mungyeong-2",
    type: "과실주",
    region: "경상",
    detailRegion: "경북 문경시",
    name: "문경 오미자 양조장",
    productName: "오미로",
    description: "국내산 명품 오미자를 와인 옹기에 숙성하여 고귀하게 빚어낸 전통 과실주",
    tags: ["달콤함", "부드러움"],
  },
  {
    id: "boksundoga",
    type: "탁주",
    region: "수도권",
    detailRegion: "경기 포천",
    name: "복순도가",
    productName: "손막걸리",
    description: "전통 방식의 생막걸리를 현대적으로 계승하여 재해석한 양조장",
    tags: ["부드러움", "묵직함"],
    badges: ["예약필요"],
  },
  {
    id: "sancheong-1",
    type: "기타",
    region: "경상",
    detailRegion: "경남 산청",
    name: "산청 약초 양조장",
    productName: "산청약주 리큐르",
    description: "지리산 약초를 더해 전통주에 새로운 개성을 담은 리큐르",
    tags: ["향긋함", "묵직함"],
  },
  {
    id: "pyeongchang-1",
    type: "약주",
    region: "강원",
    detailRegion: "강원 평창",
    name: "평창 메밀 양조장",
    productName: "메밀약주",
    description: "고랭지 메밀로 빚어 은은한 향과 깔끔한 끝맛을 살린 약주",
    tags: ["깔끔함", "향긋함"],
  },
  {
    id: "cheongju-1",
    type: "청주",
    region: "충청",
    detailRegion: "충북 청주",
    name: "청주 대추 양조장",
    productName: "대추청주",
    description: "충청도산 대추를 더해 은은한 단맛을 살린 프리미엄 청주",
    tags: ["달콤함", "부드러움"],
  },
  {
    id: "busan-1",
    type: "과실주",
    region: "부산",
    detailRegion: "부산 기장",
    name: "기장 미역 양조장",
    productName: "해풍 과실주",
    description: "바닷바람을 맞고 자란 과일로 빚어 상큼한 산미가 도는 과실주",
    tags: ["상큼함", "산미"],
  },
  {
    id: "ulsan-1",
    type: "탁주",
    region: "울산",
    detailRegion: "울산 울주",
    name: "울주 대숲 양조장",
    productName: "대숲막걸리",
    description: "대나무 숲 인근 지하수로 빚어 목넘김이 부드러운 생막걸리",
    tags: ["부드러움", "깔끔함"],
  },
];

export const SUGGESTED_KEYWORDS = [
  "상큼함",
  "복분자주",
  "달콤함",
  "전통주",
  "막주",
  "아주",
  "막걸리와자반",
  "청주",
  "과일주",
];

export function getAvailableTypeFilters(): string[] {
  return ALL_TYPE_FILTERS.filter((type) => WINERIES.some((winery) => winery.type === type));
}

export function getAvailableRegionFilters(): string[] {
  return ALL_REGION_FILTERS.filter((region) => WINERIES.some((winery) => winery.region === region));
}

// 완전한 단어가 아니라 자음(초성)만 입력해도(예: "ㅂㅅㄷㄱ" -> "복순도가") 매칭됩니다.
export function searchWineries(query: string): Winery[] {
  if (!query.trim()) return [];

  return WINERIES.filter(
    (winery) => matchesQuery(winery.name, query) || matchesQuery(winery.productName, query)
  ).sort((a, b) => {
    const score = (winery: Winery) => {
      const match = findMatchRange(winery.name, query);
      if (!match) return 2;
      return match.index === 0 ? 0 : 1;
    };
    return score(a) - score(b);
  });
}

export function getAutocompleteSuggestions(query: string): Winery[] {
  if (!query.trim()) return [];

  return WINERIES.filter(
    (winery) => matchesQuery(winery.name, query) || matchesQuery(winery.productName, query)
  ).slice(0, 10);
}

// 온보딩 취향(지역 > 주종 > 태그 순 가중치)과 얼마나 맞는지 점수화합니다.
export function getPreferenceScore(
  winery: Winery,
  preferredRegion: string,
  preferredType: string,
  preferredTag: string
): number {
  let score = 0;
  if (winery.region === preferredRegion) score += 3;
  if (winery.type === preferredType) score += 2;
  if (winery.tags.includes(preferredTag)) score += 1;
  return score;
}

export function sortByPreference<T extends Winery>(
  list: T[],
  preferredRegion: string,
  preferredType: string,
  preferredTag: string
): T[] {
  return [...list].sort(
    (a, b) =>
      getPreferenceScore(b, preferredRegion, preferredType, preferredTag) -
      getPreferenceScore(a, preferredRegion, preferredType, preferredTag)
  );
}

// 온보딩 전에는 고정 목록, 온보딩 후에는 취향 매칭 정렬 결과를 반환합니다 (매칭 부족분은 고정 목록으로 자동 보충됨).
export function getRecommendedWineries(
  hasOnboarded: boolean,
  preferredRegion: string,
  preferredType: string,
  preferredTag: string,
  count = 2
): Winery[] {
  if (!hasOnboarded) return WINERIES.slice(0, count);
  return sortByPreference(WINERIES, preferredRegion, preferredType, preferredTag).slice(0, count);
}
