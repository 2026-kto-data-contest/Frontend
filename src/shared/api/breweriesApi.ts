// 실제 배포 백엔드의 양조장 목록/상세/제품 조회 API 클라이언트입니다.
// 모두 로그인 없이 조회 가능한 공개 API라 credentials를 보내지 않습니다
// (쿠키를 실어 보내면 백엔드가 와일드카드 CORS를 쓸 경우 브라우저가 응답 자체를 막아버릴 수 있어요).
import { API_BASE_URL, ApiError } from "./api";

export type VisitState = "Y" | "N" | "UNKNOWN";

export interface MainImage {
  url: string;
  copyright: string | null;
  modifiable: boolean;
}

export interface BreweryListItem {
  breweryId: string;
  businessName: string;
  sido: string | null;
  region: string | null;
  reservationVisitState: VisitState;
  alwaysVisitState: VisitState;
  featureTags: string[];
  alcoholMin: number | null;
  alcoholMax: number | null;
  liquorTypes: string[];
  mainImage: MainImage | null;
  sigungu: string | null;
  flavorTags: string[];
  introduction: string | null;
}

export interface ExperienceItem {
  programName: string;
  content: string | null;
  place: string | null;
  /** "H:MM" 형태의 원문. 분 단위 변환은 화면에서 처리합니다. */
  duration: string | null;
  /** 0 = 무료, null = 정보 없음 */
  cost: number | null;
}

export interface BreweryDetail {
  breweryId: string;
  businessName: string;
  sido: string | null;
  region: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  homepageUrl: string | null;
  reservationVisitState: VisitState;
  alwaysVisitState: VisitState;
  featureTags: string[];
  alcoholMin: number | null;
  alcoholMax: number | null;
  liquorTypes: string[];
  mainImage: MainImage | null;
  overview: string | null;
  phone: string | null;
  phoneSource: "TOUR" | "KAKAO" | null;
  operatingHours: string | null;
  restDate: string | null;
  parkingInfo: string | null;
  accomCount: string | null;
  foundedYear: number | null;
  representativeName: string | null;
  designatedYear: number | null;
  designationNote: string | null;
  experiences: ExperienceItem[];
  kakaoPlaceUrl: string | null;
}

export interface ProductCard {
  productId: number;
  productName: string;
  alcoholMin: number | null;
  alcoholMax: number | null;
  volume: string | null;
  liquorTypes: string[];
  description: string | null;
  awardBadge: string | null;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface BreweryListParams {
  region?: string[];
  reservationVisit?: VisitState;
  alwaysVisit?: VisitState;
  keyword?: string;
  /** 백엔드가 이 파라미터로는 허용하지 않는 값(예: "기타")은 호출 전에 걸러내야 합니다. */
  liquorType?: string[];
  minAbv?: number;
  maxAbv?: number;
  page?: number;
  size?: number;
}

async function getJson<T>(
  path: string,
  params?: URLSearchParams,
  signal?: AbortSignal
): Promise<T> {
  const query = params?.toString();
  const response = await fetch(`${API_BASE_URL}${path}${query ? `?${query}` : ""}`, {
    credentials: "omit",
    signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body?.message || `요청이 실패했습니다. (${response.status})`
    );
  }
  return response.json();
}

export function fetchBreweries(
  params: BreweryListParams,
  signal?: AbortSignal
): Promise<PageResponse<BreweryListItem>> {
  const qs = new URLSearchParams();
  params.region?.forEach((value) => qs.append("region", value));
  params.liquorType?.forEach((value) => qs.append("liquorType", value));
  if (params.reservationVisit) qs.set("reservationVisit", params.reservationVisit);
  if (params.alwaysVisit) qs.set("alwaysVisit", params.alwaysVisit);
  if (params.keyword) qs.set("keyword", params.keyword);
  if (params.minAbv != null) qs.set("minAbv", String(params.minAbv));
  if (params.maxAbv != null) qs.set("maxAbv", String(params.maxAbv));
  qs.set("page", String(params.page ?? 0));
  qs.set("size", String(params.size ?? 20));
  return getJson<PageResponse<BreweryListItem>>("/api/v1/breweries", qs, signal);
}

export function fetchBreweryDetail(
  breweryId: string,
  signal?: AbortSignal
): Promise<BreweryDetail> {
  return getJson<BreweryDetail>(
    `/api/v1/breweries/${encodeURIComponent(breweryId)}`,
    undefined,
    signal
  );
}

export function fetchBreweryProducts(
  breweryId: string,
  page = 0,
  size = 20,
  signal?: AbortSignal
): Promise<PageResponse<ProductCard>> {
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  return getJson<PageResponse<ProductCard>>(
    `/api/v1/breweries/${encodeURIComponent(breweryId)}/products`,
    qs,
    signal
  );
}

export interface HomeViewer {
  authenticated: boolean;
  onboardingCompleted: boolean;
}

export interface HomeBanner {
  type: "LOGIN" | "ONBOARDING" | "DEFAULT" | "PERSONALIZED";
  message: string;
  actionPath: string | null;
}

export interface RecommendedCourseCard {
  courseId: string;
  imageUrl: string | null;
  regionLabel: string | null;
  title: string;
}

export interface HomeBrewerySection {
  selectedValue: string;
  breweries: BreweryListItem[];
}

export interface HomeResponse {
  viewer: HomeViewer;
  header: { message: string };
  banner: HomeBanner;
  recommendedCourses: RecommendedCourseCard[];
  liquorTypeBreweries: HomeBrewerySection;
  regionBreweries: HomeBrewerySection;
  recommendedBreweries: BreweryListItem[];
}

export function fetchHome(
  region?: string,
  liquorType?: string,
  signal?: AbortSignal
): Promise<HomeResponse> {
  const qs = new URLSearchParams();
  if (region) qs.set("region", region);
  if (liquorType) qs.set("liquorType", liquorType);
  return getJson<HomeResponse>("/api/v1/home", qs, signal);
}

export function fetchRecommendedBreweries(
  page = 0,
  size = 6,
  signal?: AbortSignal
): Promise<PageResponse<BreweryListItem>> {
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  return getJson<PageResponse<BreweryListItem>>("/api/v1/recommendations/breweries", qs, signal);
}

// 지도 마커/장소 검색용 카테고리. 전통시장·문화시설은 백엔드에서 TOURIST_ATTRACTION으로 합쳐집니다.
export type MapPlaceCategory =
  "BREWERY" | "RESTAURANT" | "TOURIST_ATTRACTION" | "CAFE" | "ACCOMMODATION";

export interface MapPlace {
  placeId: string;
  placeName: string;
  category: MapPlaceCategory;
  categoryName: string;
  /** 사용자 좌표를 함께 보냈을 때만 값이 있는 직선거리(km) */
  distance: number | null;
  roadAddressName: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
}

export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export function fetchMapPlaces(
  bounds: MapBounds,
  category: MapPlaceCategory,
  userPosition?: { lat: number; lng: number },
  page = 0,
  size = 100,
  signal?: AbortSignal
): Promise<PageResponse<MapPlace>> {
  const qs = new URLSearchParams({
    south: String(bounds.south),
    west: String(bounds.west),
    north: String(bounds.north),
    east: String(bounds.east),
    category,
    page: String(page),
    size: String(size),
  });
  if (userPosition) {
    qs.set("userLatitude", String(userPosition.lat));
    qs.set("userLongitude", String(userPosition.lng));
  }
  return getJson<PageResponse<MapPlace>>("/api/v1/map/places", qs, signal);
}

export type CourseStopType =
  | "BREWERY"
  | "RESTAURANT"
  | "TOURIST_ATTRACTION"
  | "CULTURAL_FACILITY"
  | "MARKET"
  | "CAFE"
  | "ACCOMMODATION"
  | "ETC";

export interface RecommendedCourseStop {
  order: number;
  type: CourseStopType;
  contentId: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  distanceMeters: number | null;
  imageUrl: string | null;
  recommendationReason: string | null;
  categoryName: string | null;
  subcategoryName: string | null;
  placeUrl: string | null;
  pairingComment: string | null;
  featureTags: string[];
  liquorTypes: string[];
}

export interface RecommendedCourseDetail {
  courseId: string;
  title: string;
  regionLabel: string | null;
  centerBreweryId: string;
  stops: RecommendedCourseStop[];
}

// 선택한 양조장을 첫 장소로 고정한 실제 추천 코스입니다. 코스 ID는 breweryId와 동일합니다.
export function fetchRecommendedCourse(
  breweryId: string,
  signal?: AbortSignal
): Promise<RecommendedCourseDetail> {
  return getJson<RecommendedCourseDetail>(
    `/api/v1/breweries/${encodeURIComponent(breweryId)}/recommended-course`,
    undefined,
    signal
  );
}

// 양조장 목록 카드(WineryCard)가 그대로 그릴 수 있는 최소 형태로 변환합니다.
// 목록 페이지·홈 화면 등 BreweryListItem을 카드로 보여주는 모든 곳에서 재사용합니다.
export function breweryToCardData(item: BreweryListItem): {
  name: string;
  detailRegion: string;
  description?: string;
  tags?: string[];
  badges?: string[];
  photoUrls?: string[];
} {
  const region = item.sigungu
    ? `${item.sido ?? ""} ${item.sigungu}`.trim()
    : (item.sido ?? item.region ?? "");
  return {
    name: item.businessName,
    detailRegion: region,
    description: item.introduction ?? undefined,
    tags: item.flavorTags,
    badges: item.featureTags,
    photoUrls: item.mainImage ? [item.mainImage.url] : undefined,
  };
}
