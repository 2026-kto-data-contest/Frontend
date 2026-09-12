// 실제 백엔드 양조장 상세/제품 응답을 상세 화면이 이미 알고 있는 Winery 모양으로 변환합니다.
// 상세 화면의 렌더링·요약문 생성 로직을 그대로 재사용하기 위한 어댑터입니다.
import { ALL_TYPE_FILTERS, ALL_REGION_FILTERS, ALL_STRENGTH_FILTERS } from "../lib/mockWineries";
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
  if (value == null) return "7도 ~ 20도";
  if (value < 7) return "7도 미만";
  if (value < 20) return "7도 ~ 20도";
  return "20도 이상";
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

  return {
    id: detail.breweryId,
    type: asType(detail.liquorTypes[0]),
    region: asRegion(detail.region),
    detailRegion: detail.sido ?? detail.region ?? "",
    name: detail.businessName,
    productName: products[0]?.productName ?? "",
    description: intro ?? "",
    tags: [],
    badges: detail.featureTags,
    strength: bucketizeStrength(detail.alcoholMin, detail.alcoholMax),
    visitCondition: detail.reservationVisitState === "Y" ? "예약 방문" : "상시 방문",
    photoUrls: detail.mainImage ? [detail.mainImage.url] : undefined,
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
  };
}
