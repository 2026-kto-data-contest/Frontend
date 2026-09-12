export type AwardTier = "대상" | "최우수상" | "우수상" | "수상" | "표창";

export type VisitAvailability = "가능" | "불가" | "정보없음";

export interface DrinkProduct {
  id: string;
  name: string;
  type: (typeof ALL_TYPE_FILTERS)[number];
  abv: string;
  volume: string;
  isRepresentative?: boolean;
  description?: string;
  tags?: string[];
  /** 정렬/판별용 등급. 등급을 특정할 수 없는 모호한 수상 이력이면 awardLabel 없이 이 값만 채웁니다. */
  awardTier?: AwardTier;
  /** 화면에 노출할 실제 수상 문구. 없으면 awardTier 기반으로 '수상' 고정 라벨만 노출합니다. */
  awardLabel?: string;
}

export interface ExperienceProgram {
  id: string;
  name: string;
  description: string;
  durationMinutes?: number;
  /** 없으면 '문의 필요'로 표기합니다. */
  price?: number;
}

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
  strength: (typeof ALL_STRENGTH_FILTERS)[number];
  visitCondition: (typeof ALL_VISIT_CONDITION_FILTERS)[number];
  /** API로 받아온 실제 사진 URL 목록. 비어있으면 상세/목록 모두 기본 이미지(NoneImage)로 대체합니다. */
  photoUrls?: string[];
  phone?: string;
  homepageUrl?: string;
  address?: string;
  lat?: number;
  lng?: number;
  establishedYear?: number;
  generationCount?: number;
  /** 방문방식 매트릭스용 상세 상태. 없으면 legacy visitCondition에서 유추합니다. */
  reservationStatus?: VisitAvailability;
  walkinStatus?: VisitAvailability;
  /** 양조장 소개 본문. 없으면 description으로 대체합니다. */
  intro?: string;
  drinks?: DrinkProduct[];
  experiences?: ExperienceProgram[];
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
export const ALL_STRENGTH_FILTERS = ["7도 미만", "7도 ~ 20도", "20도 이상"] as const;
export const ALL_VISIT_CONDITION_FILTERS = ["상시 방문", "예약 방문"] as const;
export const ALL_HISTORY_FILTERS = [
  "수상이력",
  "식품명인",
  "무형문화재",
  "대통령상",
  "유기농",
] as const;

export const WINERIES: Winery[] = [
  {
    id: "baehyejeong",
    type: "탁주",
    region: "수도권",
    detailRegion: "경기 화성",
    name: "배혜정도가",
    productName: "우곡생주",
    description: "1933년 설립, 3대째 전통을 이어온 고운 양조장입니다.",
    tags: ["부드러움", "묵직함"],
    badges: ["수상이력", "식품명인", "무형문화재", "대통령상", "유기농"],
    strength: "7도 ~ 20도",
    visitCondition: "예약 방문",
    phone: "031-227-1234",
    homepageUrl: "https://baehyejeongdoga.example.com",
    address: "경기도 화성시 정남면 서봉로 835",
    lat: 37.1502,
    lng: 126.8601,
    establishedYear: 1933,
    generationCount: 3,
    reservationStatus: "가능",
    walkinStatus: "불가",
    intro:
      "문경의 명물 오미자를 사용해 3대째 전통을 이어온 고운달 양조장입니다. 옹기 숙성 방식으로 깊은 맛과 향을 자랑하며, 지역 특산물의 가치를 지키고 있습니다. 대표 배혜정 대표는 선대의 양조 이념을 그대로 계승하면서도 현대적인 감각을 더해 다양한 세대가 즐길 수 있는 술을 빚고 있습니다.",
    drinks: [
      {
        id: "ugok-saengju",
        name: "우곡생주",
        type: "탁주",
        abv: "10도",
        volume: "750ml",
        isRepresentative: true,
        description:
          "우곡생주는 일생을 전통주를 위해 헌신한 고 배산면 회장의 마지막 역작을 바탕으로, 딸인 배혜정 대표가 아버지의 이념을 계승해 만든 제품입니다. 옹기에서 저온 숙성해 깊고 진한 맛을 살렸습니다.",
        tags: ["달콤함"],
        awardTier: "대상",
        awardLabel: "2019 대한민국주류대상",
      },
      {
        id: "darangi-yuja",
        name: "다랭이팜 유자 막걸리",
        type: "탁주",
        abv: "10도",
        volume: "750ml",
        description:
          "한계령의 맑은 물과 설악산의 정기를 받은 청정한 양질의 쌀로 세 번 빚어 만들었습니다. 삼양주법으로 빚어 맛이 깊고 진하며, 일체의 첨가제 없이 누룩으로만 제작했습니다.",
      },
      {
        id: "darangi-yuja-sparkling",
        name: "다랭이팜 유자 막걸리 스파클링",
        type: "탁주",
        abv: "8도",
        volume: "500ml",
        description:
          "다랭이팜 유자 막걸리에 탄산을 더해 산뜻하게 즐길 수 있도록 만든 스파클링 버전입니다.",
      },
      {
        id: "ugok-jeungryu",
        name: "우곡 증류주",
        type: "증류주",
        abv: "35도",
        volume: "375ml",
        description: "우곡생주를 그대로 증류해 깊고 묵직한 향을 살린 프리미엄 증류주입니다.",
      },
    ],
    experiences: [
      {
        id: "gyeonhak",
        name: "견학",
        description: "일반인 대상 탁주 제조 및 증류주 제조 공장 동시 견학 프로그램",
        durationMinutes: 60,
        price: 20000,
      },
      {
        id: "cheheom",
        name: "체험",
        description: "일반인 대상 탁주 제조 및 증류주 제조 공장 동시 견학 프로그램",
      },
      {
        id: "naman-sul",
        name: "나만의 술 체험",
        description: "마이보틀 증류주 및 견학 프로그램",
        durationMinutes: 90,
        price: 20000,
      },
      {
        id: "siheumhoe",
        name: "시음회",
        description: "인당 다양한 전통주를 시음해볼 수 있는 프로그램",
        durationMinutes: 40,
        price: 15000,
      },
    ],
  },
  {
    id: "gounddal",
    type: "증류주",
    region: "경상",
    detailRegion: "경북 문경",
    name: "고운달 양조장",
    productName: "예담",
    description: "국내산 명품 오미자를 와인 옹기에 숙성하여 고귀하게 빚어낸 전통 프리미엄 증류주",
    tags: ["상큼함", "달콤함", "드라이", "산미"],
    strength: "20도 이상",
    visitCondition: "예약 방문",
    badges: ["수상이력"],
    lat: 36.5866,
    lng: 128.1867,
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
    strength: "20도 이상",
    visitCondition: "상시 방문",
    lat: 35.9483,
    lng: 126.9576,
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
    strength: "7도 ~ 20도",
    visitCondition: "상시 방문",
    badges: ["식품명인"],
    lat: 33.2541,
    lng: 126.5601,
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
    strength: "7도 미만",
    visitCondition: "상시 방문",
    lat: 37.8949,
    lng: 127.2003,
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
    strength: "7도 미만",
    visitCondition: "상시 방문",
    lat: 37.897,
    lng: 127.2035,
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
    strength: "7도 ~ 20도",
    visitCondition: "상시 방문",
    lat: 37.892,
    lng: 127.197,
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
    strength: "20도 이상",
    visitCondition: "예약 방문",
    badges: ["무형문화재"],
    lat: 36.5952,
    lng: 128.2015,
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
    strength: "7도 ~ 20도",
    visitCondition: "상시 방문",
    lat: 36.578,
    lng: 128.175,
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
    strength: "7도 미만",
    visitCondition: "예약 방문",
    badges: ["예약필요"],
    lat: 37.885,
    lng: 127.195,
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
    strength: "20도 이상",
    visitCondition: "예약 방문",
    lat: 35.4161,
    lng: 127.8736,
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
    strength: "7도 ~ 20도",
    visitCondition: "상시 방문",
    lat: 37.3706,
    lng: 128.3903,
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
    strength: "7도 ~ 20도",
    visitCondition: "상시 방문",
    lat: 36.6424,
    lng: 127.489,
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
    strength: "7도 미만",
    visitCondition: "상시 방문",
    badges: ["대통령상"],
    lat: 35.2444,
    lng: 129.2131,
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
    strength: "7도 미만",
    visitCondition: "상시 방문",
    badges: ["당일방문가능"],
    lat: 35.5624,
    lng: 129.2431,
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

const BADGE_SUMMARY_TEMPLATES: Record<string, string> = {
  수상이력: "다양한 수상 이력이 있는 양조장이에요",
  식품명인: "식품명인이 빚는 양조장이에요",
  무형문화재: "무형문화재로 지정된 전통 방식을 이어가고 있어요",
  대통령상: "대통령상을 수상한 양조장이에요",
  유기농: "유기농 재료로 술을 빚고 있어요",
};

// 방문방식 매트릭스: 예약 가능여부 x 상시 방문 가능여부 조합에 따라 라벨을 결정합니다.
// 둘 다 확정된 정보가 없거나 방문이 불가능하면 셀 자체를 노출하지 않습니다(null).
function resolveVisitLabel(
  reservation: VisitAvailability,
  walkin: VisitAvailability
): string | null {
  const canReserve = reservation === "가능";
  const canWalkin = walkin === "가능";
  if (canWalkin && canReserve) return "상시 방문 · 예약 가능";
  if (canWalkin) return "상시 방문";
  if (canReserve && walkin === "불가") return "예약 필수";
  if (canReserve) return "예약 가능";
  return null;
}

function deriveVisitStatuses(winery: Winery): {
  reservation: VisitAvailability;
  walkin: VisitAvailability;
} {
  if (winery.reservationStatus || winery.walkinStatus) {
    return {
      reservation: winery.reservationStatus ?? "정보없음",
      walkin: winery.walkinStatus ?? "정보없음",
    };
  }
  // 상세 상태가 없으면 목록/필터용 legacy 필드에서 유추합니다.
  if (winery.visitCondition === "예약 방문") return { reservation: "가능", walkin: "불가" };
  return { reservation: "정보없음", walkin: "가능" };
}

export function getWineryVisitLabel(winery: Winery): string | null {
  const { reservation, walkin } = deriveVisitStatuses(winery);
  return resolveVisitLabel(reservation, walkin);
}

// 대표주종 노출 로직: 2종 이하는 모두 노출, 3종 이상이면 취급 개수가 많은 상위 2개 + '외 N종'.
export function getRepresentativeTypeLabel(winery: Winery, preferredType?: string): string {
  const drinks =
    winery.drinks && winery.drinks.length > 0 ? winery.drinks : [{ type: winery.type }];
  const counts = new Map<string, number>();
  for (const drink of drinks) counts.set(drink.type, (counts.get(drink.type) ?? 0) + 1);
  const types = Array.from(counts.keys());

  if (types.length <= 2) return types.join("·");

  const sorted = [...types].sort((a, b) => {
    const diff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
    if (diff !== 0) return diff;
    if (a === preferredType) return -1;
    if (b === preferredType) return 1;
    return (
      ALL_TYPE_FILTERS.indexOf(a as (typeof ALL_TYPE_FILTERS)[number]) -
      ALL_TYPE_FILTERS.indexOf(b as (typeof ALL_TYPE_FILTERS)[number])
    );
  });

  const top2 = sorted.slice(0, 2);
  const restCount = sorted.length - 2;
  return `${top2.join("·")} 외 ${restCount}종`;
}

// '이 양조장의 한 줄 요약' 3줄을 자동 생성합니다. 확정된 정보가 없는 항목은 건너뜁니다.
export function buildSummaryBullets(winery: Winery): string[] {
  const bullets: string[] = [];

  if (winery.establishedYear && winery.generationCount) {
    bullets.push(
      `${winery.establishedYear}년 설립, ${winery.generationCount}대째 전통을 이어오고 있어요`
    );
  } else if (winery.establishedYear) {
    bullets.push(`${winery.establishedYear}년 설립했어요`);
  } else if (winery.generationCount) {
    bullets.push(`${winery.generationCount}대째 전통을 이어오고 있어요`);
  }

  const bestBadge = ALL_HISTORY_FILTERS.find((badge) => winery.badges?.includes(badge));
  if (bestBadge && BADGE_SUMMARY_TEMPLATES[bestBadge]) {
    bullets.push(BADGE_SUMMARY_TEMPLATES[bestBadge]);
  }

  if (winery.experiences && winery.experiences.length > 0) {
    const types = Array.from(new Set((winery.drinks ?? []).map((drink) => drink.type))).slice(0, 2);
    const typeLabel = types.length > 0 ? types.join("·") : winery.type;
    bullets.push(`${typeLabel} 체험 프로그램을 운영하고 있어요`);
  }

  return bullets.slice(0, 3);
}
