// 실제 백엔드 양조장 상세/제품 응답을 상세 화면이 이미 알고 있는 Winery 모양으로 변환합니다.
// 상세 화면의 렌더링·요약문 생성 로직을 그대로 재사용하기 위한 어댑터입니다.
import { ALL_TYPE_FILTERS, ALL_REGION_FILTERS, ALL_STRENGTH_FILTERS } from "../lib/mockWineries";
import { resolveImageUrl } from "./api";
import type {
  Winery,
  DrinkProduct,
  ExperienceProgram,
  VisitAvailability,
} from "../lib/mockWineries";
import type { BreweryDetail, ProductCard, VisitState } from "./breweriesApi";

function asType(type: string | undefined): (typeof ALL_TYPE_FILTERS)[number] {
  return (ALL_TYPE_FILTERS as readonly string[]).includes(type ?? "")
    ? (type as (typeof ALL_TYPE_FILTERS)[number])
    : "기타";
}

function asRegion(region: string | null): (typeof ALL_REGION_FILTERS)[number] {
  return (ALL_REGION_FILTERS as readonly string[]).includes(region ?? "")
    ? (region as (typeof ALL_REGION_FILTERS)[number])
    : "수도권";
}

// BreweryDetail에는 시/군/구 필드가 따로 없어서, 전체 주소의 두 번째 토큰(예: "경상북도
// 문경시 ..." → "문경시", "경북 영천시 ..." → "영천시")에서 시/군/구 접미사를 뗀 값을 씁니다.
export function sigunguFromAddress(address: string): string | null {
  const token = address.split(" ")[1];
  if (!token) return null;
  const trimmed = token.replace(/(시|군|구)$/, "");
  return trimmed || null;
}

// 시/도 정식 명칭 → 두 글자 축약형입니다. 시/군/구와 달리 접미사만 떼서는 안 되는(예:
// "충청북도"→"충북", "전북특별자치도"→"전북") 불규칙한 축약이라 표로 관리합니다.
const SIDO_ABBREVIATIONS: Record<string, string> = {
  서울특별시: "서울",
  부산광역시: "부산",
  대구광역시: "대구",
  인천광역시: "인천",
  광주광역시: "광주",
  대전광역시: "대전",
  울산광역시: "울산",
  세종특별자치시: "세종",
  경기도: "경기",
  강원도: "강원",
  강원특별자치도: "강원",
  충청북도: "충북",
  충청남도: "충남",
  전라북도: "전북",
  전북특별자치도: "전북",
  전라남도: "전남",
  경상북도: "경북",
  경상남도: "경남",
  제주특별자치도: "제주",
};

// 도로명주소 전체 문자열(예: "경기도 포천시 가산면 포천로898번길 156")을 지도 리스트처럼
// 공간이 좁은 곳에 쓸 짧은 지역명("경기 포천")으로 줄입니다.
export function shortRegionFromAddress(address: string): string | null {
  const [sidoToken, sigunguToken] = address.trim().split(/\s+/);
  if (!sidoToken) return null;
  const sido = SIDO_ABBREVIATIONS[sidoToken] ?? sidoToken;
  if (!sigunguToken) return sido;
  const sigungu = sigunguToken.replace(/(시|군|구)$/, "");
  return sigungu ? `${sido} ${sigungu}` : sido;
}

function asVisitAvailability(state: VisitState): VisitAvailability {
  if (state === "Y") return "가능";
  if (state === "N") return "불가";
  return "정보없음";
}

function bucketizeStrength(
  min: number | null,
  max: number | null
): (typeof ALL_STRENGTH_FILTERS)[number] {
  const value = max ?? min;
  if (value == null) return "15도 ~ 29도";
  if (value <= 14) return "14도 이하";
  if (value <= 29) return "15도 ~ 29도";
  return "30도 이상";
}

function formatAbv(min: number | null, max: number | null): string {
  if (min == null && max == null) return "도수 정보 없음";
  if (min == null || max == null || min === max) return `${min ?? max}도`;
  return `${min}~${max}도`;
}

// "H:MM" 원문을 분 단위로 변환합니다. 형식이 다르면 undefined(문의 필요로 표기됨).
function parseDurationMinutes(duration: string | null): number | undefined {
  if (!duration) return undefined;
  const match = duration.match(/^(\d+):(\d{2})$/);
  if (!match) return undefined;
  return Number(match[1]) * 60 + Number(match[2]);
}

function adaptProduct(product: ProductCard): DrinkProduct {
  return {
    id: String(product.productId),
    name: product.productName,
    type: asType(product.liquorTypes[0]),
    abv: formatAbv(product.alcoholMin, product.alcoholMax),
    volume: product.volume ?? "용량 정보 없음",
    description: product.description ?? undefined,
    awardTier: product.awardBadge ? "수상" : undefined,
    awardLabel: product.awardBadge ?? undefined,
  };
}

function adaptExperience(
  experience: BreweryDetail["experiences"][number],
  index: number
): ExperienceProgram {
  return {
    id: `exp-${index}`,
    name: experience.programName,
    description: experience.content ?? "",
    durationMinutes: parseDurationMinutes(experience.duration),
    price: experience.cost ?? undefined,
  };
}

export function adaptBreweryToWinery(detail: BreweryDetail, products: ProductCard[]): Winery {
  const intro = detail.overview ?? detail.designationNote ?? undefined;
  const sigungu = sigunguFromAddress(detail.address);
  const sido = detail.sido ?? detail.region ?? "";

  return {
    id: detail.breweryId,
    type: asType(detail.liquorTypes[0]),
    region: asRegion(detail.region),
    detailRegion: sigungu ? `${sido} ${sigungu}`.trim() : sido,
    name: detail.businessName,
    productName: products[0]?.productName ?? "",
    description: intro ?? "",
    tags: [],
    badges: detail.featureTags,
    strength: bucketizeStrength(detail.alcoholMin, detail.alcoholMax),
    visitCondition: detail.reservationVisitState === "Y" ? "예약 방문" : "상시 방문",
    photoUrls: detail.mainImage ? [resolveImageUrl(detail.mainImage.url)!] : undefined,
    phone: detail.phone ?? undefined,
    homepageUrl: detail.homepageUrl ?? undefined,
    address: detail.address,
    lat: detail.latitude ?? undefined,
    lng: detail.longitude ?? undefined,
    establishedYear: detail.foundedYear ?? undefined,
    reservationStatus: asVisitAvailability(detail.reservationVisitState),
    walkinStatus: asVisitAvailability(detail.alwaysVisitState),
    intro,
    drinks: products.map(adaptProduct),
    experiences: detail.experiences.map(adaptExperience),
    summaryLines: detail.summaryLines,
  };
}
