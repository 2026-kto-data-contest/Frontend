import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styled from "styled-components";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { colors } from "../../shared/styles/colors";
import { AppBar } from "../../shared/components/AppBar";
import { Snackbar } from "../../shared/components/Snackbar";
import { DotsLoader } from "../../shared/components/DotsLoader";
import { Skeleton } from "../../shared/components/Skeleton";
import { Badge } from "../../shared/components/Badge";
import { PhotoCard } from "../../shared/components/PhotoCard";
import {
  WINERIES,
  getRepresentativeTypeLabel,
  getWineryVisitLabel,
} from "../../shared/lib/mockWineries";
import type { Winery } from "../../shared/lib/mockWineries";
import {
  fetchMapPlaces,
  fetchRecommendedCourse,
  fetchMapRecommendedBreweries,
  fetchMapAwardedLiquors,
  fetchMapMenus,
  fetchMapMenuPlaces,
  fetchBreweryDetail,
  fetchBreweryProducts,
} from "../../shared/api/breweriesApi";
import type {
  MapPlace,
  MapPlaceCategory,
  RecommendedCourseStop,
  MapRecommendedBrewery,
  MapAwardedLiquor,
  MapMenu,
} from "../../shared/api/breweriesApi";
import { adaptBreweryToWinery } from "../../shared/api/adaptBrewery";
import { resolveImageUrl, fetchTerms } from "../../shared/api/api";
import { useHideNavbar } from "../../shared/lib/navbarVisibility";
import { usePageMemory } from "../../shared/lib/pageState";
import { resolveHiddenPinLabels, resolveOverlapOffsets } from "../../shared/lib/mapPinOverlap";
import { loadKakaoMaps } from "../../shared/api/kakaoMaps";
import type {
  KakaoMapsNamespace,
  KakaoMapInstance,
  KakaoCustomOverlayInstance,
} from "../../shared/api/kakaoMaps";
import callIcon from "../../assets/icon/MapArticle.svg";
import outwardIcon from "../../assets/icon/MapArrowOutward.svg";
import shareIcon from "../../assets/icon/Upload.svg";
import webIcon from "../../assets/icon/Web.svg";
import topRightIcon from "../../assets/icon/TopRight.svg";
import liquorIcon from "../../assets/icon/MapCategoryBrewery.svg";
import bedIcon from "../../assets/icon/Bed.svg";
import cafeIcon from "../../assets/icon/Cafe.svg";
import flagIcon from "../../assets/icon/Flag.svg";
import restaurantIcon from "../../assets/icon/MapCategoryRestaurant.svg";
import awardIcon from "../../assets/icon/Award.svg";
import searchIcon from "../../assets/icon/MapSearch.svg";
import targetIcon from "../../assets/icon/MapTarget.svg";
import mapViewIcon from "../../assets/icon/MapViewIcon.svg";
import placeCardFallbackBrewery from "../../assets/icon/MapPlaceCardFallback.svg";
import placeCardFallbackRestaurant from "../../assets/icon/CourseFallbackRestaurant.svg";
import placeCardFallbackAttraction from "../../assets/icon/CourseFallbackAttraction.svg";
import placeCardFallbackCafe from "../../assets/icon/CourseFallbackCafe.svg";
import placeCardFallbackLodging from "../../assets/icon/CourseFallbackLodging.svg";
import closeIcon from "../../assets/icon/CloseX.svg";
import noneImage from "../../assets/img/NoneImage.png";

type CategoryKey = "brewery" | "restaurants" | "attractions" | "cafes" | "lodging";
type LoadState = "loading" | "ready" | "error";
type SheetMode = "list" | "detail";
type DetailKind = "winery" | "place" | "stop";
type PlacesLoadState = "idle" | "loading" | "ready" | "error";

const CATEGORY_ORDER: CategoryKey[] = ["brewery", "restaurants", "attractions", "cafes", "lodging"];

const CATEGORY_META: Record<CategoryKey, { label: string; icon: string; color: string }> = {
  brewery: { label: "양조장", icon: "🍶", color: colors.category.brewery },
  restaurants: { label: "식당", icon: "🍴", color: colors.category.restaurant },
  attractions: { label: "관광지", icon: "🚩", color: colors.category.attraction },
  cafes: { label: "카페", icon: "☕", color: colors.category.cafe },
  lodging: { label: "숙소", icon: "🛏", color: colors.category.lodging },
};

// 지도 위 핀 마커 전용 아이콘입니다. 여기 없는 카테고리(식당)는 기존 이모지 핀을 그대로 씁니다.
const CATEGORY_PIN_ICON: Partial<Record<CategoryKey, string>> = {
  brewery: liquorIcon,
  restaurants: restaurantIcon,
  attractions: flagIcon,
  cafes: cafeIcon,
  lodging: bedIcon,
};

// 장소 목록 카드에 사진이 없을 때 보여줄 카테고리별 일러스트 썸네일입니다.
const CATEGORY_PLACE_FALLBACK: Record<CategoryKey, string> = {
  brewery: placeCardFallbackBrewery,
  restaurants: placeCardFallbackRestaurant,
  attractions: placeCardFallbackAttraction,
  cafes: placeCardFallbackCafe,
  lodging: placeCardFallbackLodging,
};

const MAP_PLACE_CATEGORY: Record<CategoryKey, MapPlaceCategory> = {
  brewery: "BREWERY",
  restaurants: "RESTAURANT",
  attractions: "TOURIST_ATTRACTION",
  cafes: "CAFE",
  lodging: "ACCOMMODATION",
};

// 실제 코스 stop 분류를 지도 카테고리로 정규화합니다(문화시설·전통시장·기타는 관광지로 묶습니다).
const STOP_TYPE_TO_CATEGORY: Record<string, CategoryKey> = {
  RESTAURANT: "restaurants",
  TOURIST_ATTRACTION: "attractions",
  CULTURAL_FACILITY: "attractions",
  MARKET: "attractions",
  CAFE: "cafes",
  ACCOMMODATION: "lodging",
  ETC: "attractions",
};

// 수도권 중 목데이터상 양조장이 가장 많이 모인 지점(경기 포천 일대)을 위치 미동의 시 기본 뷰로 사용합니다.
const DEFAULT_CLUSTER_CENTER = { lat: 37.892, lng: 127.199 };
const DEFAULT_LEVEL = 7;
const FOCUS_LEVEL = 5;
const USER_LOCATION_LEVEL = 6;
const TOAST_DURATION_MS = 3000;
// 양조장을 선택했을 때 바텀시트의 기본 높이입니다. 사용자가 핸들로 직접 늘리거나 줄일 수 있습니다.
const DETAIL_SHEET_HEIGHT = 320;
// 카테고리 Chip 선택 시 리스트 아이템이 이만큼 모일 때까지 지도 탐색 반경을 넓혀갑니다.
const MIN_PLACE_RESULTS = 3;
const SEARCH_RADII_KM = [3, 5, 7, 10, 15, 20, 30];

interface SimplePlaceInfo {
  name: string;
  categoryLabel?: string;
  distanceLabel?: string;
  address?: string;
  phone?: string;
  mapUrl?: string;
  note?: string;
}

// 예: ["증류주","탁주","약주"] → "증류주/탁주 외 1"
function formatLiquorTypes(types: string[]): string {
  const shown = types.slice(0, 2).join("/");
  const rest = types.length - 2;
  return rest > 0 ? `${shown} 외 ${rest}` : shown;
}

// 반경 안에 실제 조회된 양조장이 없어 목록이 "전통주로 추천 양조장"으로 대체될 때도,
// 그 추천 양조장들의 핀은 지도에 떠 있어야 합니다. MapPlace 모양으로 맞춰 재사용합니다.
function recommendedBreweryToPlace(item: MapRecommendedBrewery): MapPlace {
  return {
    placeId: item.breweryId,
    placeName: item.businessName,
    category: "BREWERY",
    categoryName: formatLiquorTypes(item.liquorTypes.length > 0 ? item.liquorTypes : ["양조장"]),
    distance: null,
    roadAddressName: item.address,
    phone: null,
    latitude: item.latitude,
    longitude: item.longitude,
    imageUrl: resolveImageUrl(item.mainImage?.url) ?? null,
  };
}

function placeToInfo(place: MapPlace): SimplePlaceInfo {
  return {
    name: place.placeName,
    categoryLabel: place.categoryName,
    distanceLabel:
      place.distance != null ? `현재 위치에서 ${place.distance.toFixed(1)}km` : undefined,
    address: place.roadAddressName ?? undefined,
    phone: place.phone ?? undefined,
    mapUrl: `https://map.kakao.com/link/map/${encodeURIComponent(place.placeName)},${place.latitude},${place.longitude}`,
  };
}

function stopToInfo(stop: RecommendedCourseStop): SimplePlaceInfo {
  const distanceKm = stop.distanceMeters != null ? (stop.distanceMeters / 1000).toFixed(1) : null;
  return {
    name: stop.name,
    categoryLabel: stop.subcategoryName || stop.categoryName || undefined,
    distanceLabel: distanceKm ? `양조장에서 ${distanceKm}km` : undefined,
    address: stop.address ?? undefined,
    mapUrl:
      stop.placeUrl ||
      `https://map.kakao.com/link/map/${encodeURIComponent(stop.name)},${stop.latitude},${stop.longitude}`,
    // 지도에서 핀 눌러 뜨는 간단 카드에는 페어링 코멘트·추천 이유("함께 둘러보기 좋은 추천
    // 명소" 등)를 보여주지 않습니다. 코스 상세 페이지(CourseDetailPage)에서만 보여줍니다.
  };
}

// 바텀시트 높이는 리스트/상세 모드가 공유하는 mid(320px)·full(검색바까지 가리는 최대 높이)와,
// 모드별로 다른 collapsed 높이를 가집니다: 리스트는 핸들+카테고리 칩 줄까지만(96px),
// 상세는 이름+액션 버튼 줄까지 보이도록 더 큽니다(Figma "Map - Card Sheet" 기준 130px).
function getSnapPoints(areaHeight: number) {
  const safeHeight = areaHeight || 600;
  const full = Math.max(260, safeHeight - 52);
  return {
    collapsed: Math.min(96, full),
    detailCollapsed: Math.min(130, full),
    mid: Math.min(DETAIL_SHEET_HEIGHT, full),
    full,
  };
}

function createPinElement(options: {
  emoji: string;
  iconSrc?: string;
  color: string;
  label: string;
  selected: boolean;
  dimmed: boolean;
  /** 핀이 겹쳐 있을 때, 겹친 묶음 안에서 맨 위가 아닌 핀은 이름표를 숨깁니다. 기본은 표시합니다. */
  showLabel?: boolean;
}): HTMLDivElement {
  const { emoji, iconSrc, color, label, selected, dimmed, showLabel = true } = options;
  const wrap = document.createElement("div");
  wrap.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;opacity:${
    dimmed ? 0.45 : 1
  };`;

  const circleSize = selected ? 32 : 22;
  const circle = document.createElement("div");
  circle.style.cssText = `
    width:${circleSize}px;height:${circleSize}px;border-radius:50%;
    background:${color};display:flex;align-items:center;justify-content:center;
    box-sizing:border-box;
    border:${selected ? "2.5px" : "1.5px"} solid #ffffff;
    ${selected ? `box-shadow:0 0 8px ${color};` : ""}
  `;
  if (iconSrc) {
    const iconSize = selected ? 18 : 12;
    const icon = document.createElement("span");
    icon.style.cssText = `
      display:block;width:${iconSize}px;height:${iconSize}px;
      background-color:#ffffff;
      -webkit-mask-image:url("${iconSrc}");mask-image:url("${iconSrc}");
      -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;
      -webkit-mask-position:center;mask-position:center;
      -webkit-mask-size:60% 60%;mask-size:60% 60%;
    `;
    circle.appendChild(icon);
  } else {
    circle.style.fontSize = selected ? "16px" : "11px";
    circle.textContent = emoji;
  }

  wrap.appendChild(circle);

  if (showLabel) {
    const text = document.createElement("span");
    text.textContent = label;
    text.style.cssText = `
      font-size:${selected ? 12 : 11}px;font-weight:${selected ? "700" : "400"};color:#171716;
      white-space:nowrap;
      -webkit-text-stroke:3px #ffffff;
      paint-order:stroke fill;
    `;
    wrap.appendChild(text);
  }

  return wrap;
}

function createUserDotElement(): HTMLDivElement {
  const dot = document.createElement("div");
  dot.style.cssText = `
    width:16px;height:16px;border-radius:50%;background:#3b82f6;
    border:3px solid #ffffff;box-shadow:0 0 0 4px rgba(59,130,246,0.25);
  `;
  return dot;
}

export default function Map() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const isCourseMode = Boolean(focusId);
  // 모의 데이터에 없는 id(실제 백엔드 양조장)면 아래 효과에서 상세를 조회해 채웁니다.
  const mockFocusWinery = focusId ? WINERIES.find((winery) => winery.id === focusId) : undefined;
  // 이전 화면(양조장 상세·코스 상세)에서 이미 조회해둔 데이터를 넘겨받으면 재조회를 건너뜁니다.
  const navState = location.state as {
    winery?: Winery;
    courseStops?: RecommendedCourseStop[];
    searchBreweryIds?: string[];
  } | null;
  const navStateWinery =
    navState?.winery && navState.winery.id === focusId ? navState.winery : undefined;
  const searchBreweryIds = navState?.searchBreweryIds;
  // 양조장 상세를 보다가(코스 모드 아님) 다른 화면(양조장 상세 페이지 등)으로 넘어갔다 뒤로
  // 왔을 때, 새로고침한 것처럼 처음부터 다시 보이지 않도록 지도 중심·시트 상태를 기억해뒀다가
  // 복원합니다. 코스 모드는 매번 focusId 기준으로 새로 시작해야 하므로 이 복원 대상에서 뺍니다.
  const { get: getMemory, set: setMemory } = usePageMemory();

  const areaRef = useRef<HTMLDivElement>(null);
  const mapElRef = useRef<HTMLDivElement>(null);
  const kakaoRef = useRef<KakaoMapsNamespace | null>(null);
  const mapInstanceRef = useRef<KakaoMapInstance | null>(null);
  const pinOverlaysRef = useRef<KakaoCustomOverlayInstance[]>([]);
  const placeOverlaysRef = useRef<KakaoCustomOverlayInstance[]>([]);
  const stopOverlaysRef = useRef<KakaoCustomOverlayInstance[]>([]);
  const userDotOverlayRef = useRef<KakaoCustomOverlayInstance | null>(null);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheetInitialized = useRef(false);
  const restoredFocusRef = useRef(false);
  const activeCategoryRef = useRef<CategoryKey>("brewery");
  const userPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const refetchPlacesRef = useRef<(category: CategoryKey) => void>(() => {});
  const placesAbortRef = useRef<AbortController | null>(null);
  const isSearchResultModeRef = useRef(Boolean(searchBreweryIds?.length));
  // 목록에서 핀/카드를 눌러 양조장 상세로 들어가기 직전의 시트 높이를 기억해뒀다가,
  // 상세를 닫으면(X) 접힌 상태로 되돌리지 않고 원래 보던 목록 높이로 복원합니다.
  const previousSheetHeightRef = useRef<number | null>(null);

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [areaHeight, setAreaHeight] = useState(0);

  const [activeCategory, setActiveCategory] = useState<CategoryKey>(() =>
    isCourseMode ? "brewery" : (getMemory<CategoryKey>("map:activeCategory") ?? "brewery")
  );
  const [sheetMode, setSheetMode] = useState<SheetMode>(() =>
    isCourseMode ? "detail" : (getMemory<SheetMode>("map:sheetMode") ?? "list")
  );
  const [detailKind, setDetailKind] = useState<DetailKind>(() =>
    isCourseMode ? "winery" : (getMemory<DetailKind>("map:detailKind") ?? "winery")
  );
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    isCourseMode ? focusId : (getMemory<string | null>("map:selectedId") ?? null)
  );
  const [focusWinery, setFocusWinery] = useState<Winery | undefined>(
    mockFocusWinery ?? navStateWinery
  );
  const [focusWineryLoading, setFocusWineryLoading] = useState(
    isCourseMode && !mockFocusWinery && !navStateWinery
  );
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [selectedStop, setSelectedStop] = useState<RecommendedCourseStop | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const [locationState, setLocationState] = useState<"unknown" | "granted" | "denied">("unknown");
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [showLocationConsent, setShowLocationConsent] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [placesLoadState, setPlacesLoadState] = useState<PlacesLoadState>("idle");
  // 검색 결과에서 "지도에서 보기"로 넘어온 경우, 지도가 뜨자마자 뷰포트 기준 조회가
  // 그 결과를 덮어쓰지 않도록 이 플래그가 true인 동안만 자동 조회를 막습니다.
  const [isSearchResultMode, setIsSearchResultMode] = useState(Boolean(searchBreweryIds?.length));
  const [courseStops, setCourseStops] = useState<RecommendedCourseStop[]>([]);
  const [recommendedBreweries, setRecommendedBreweries] = useState<MapRecommendedBrewery[]>([]);
  const [awardedLiquors, setAwardedLiquors] = useState<MapAwardedLiquor[]>([]);
  const [mapMenus, setMapMenus] = useState<MapMenu[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  // 칩을 하나라도 눌러야 그 카테고리의 실제 목록으로 바뀝니다. 누르기 전(진입 초기 포함)에는
  // 백그라운드에서 이미 양조장 결과가 도착했더라도 Figma의 "Default BottomSheet"(추천 콘텐츠)를
  // 계속 보여줍니다.
  const [categorySelected, setCategorySelected] = useState(() =>
    isCourseMode ? false : (getMemory<boolean>("map:categorySelected") ?? false)
  );

  const [toast, setToast] = useState<string | null>(null);

  const [fetchedWineries, setFetchedWineries] = useState<Record<string, Winery>>({});
  const [wineryDetailLoading, setWineryDetailLoading] = useState(false);
  const wineryFetchInFlightRef = useRef<Set<string>>(new Set());

  // 양조장 리스트 행에 보여줄 이력 뱃지(수상이력 등)만 가볍게 따로 캐시합니다.
  // (products까지 조회하는 ensureWineryLoaded는 핀을 눌러 상세를 열 때만 씁니다.)
  const [breweryBadges, setBreweryBadges] = useState<Record<string, string[]>>({});
  const badgeFetchInFlightRef = useRef<Set<string>>(new Set());

  function ensureBreweryBadgesLoaded(id: string) {
    if (breweryBadges[id] !== undefined) return;
    if (badgeFetchInFlightRef.current.has(id)) return;
    badgeFetchInFlightRef.current.add(id);
    fetchBreweryDetail(id)
      .then((detail) => {
        setBreweryBadges((prev) => ({ ...prev, [id]: detail.featureTags ?? [] }));
      })
      .catch(() => {
        setBreweryBadges((prev) => ({ ...prev, [id]: [] }));
      })
      .finally(() => {
        badgeFetchInFlightRef.current.delete(id);
      });
  }

  // 목데이터에 없는 실제 양조장(코스 모드의 focusWinery, 지도에서 선택한 실제 양조장 핀)도 함께 찾습니다.
  function findWineryById(id: string): Winery | undefined {
    return (
      WINERIES.find((winery) => winery.id === id) ??
      (focusWinery?.id === id ? focusWinery : undefined) ??
      fetchedWineries[id]
    );
  }

  // 지도에서 선택한 양조장 핀이 목데이터에 없으면 실제 상세를 조회해 캐시에 채워둡니다.
  function ensureWineryLoaded(id: string) {
    if (findWineryById(id)) return;
    if (wineryFetchInFlightRef.current.has(id)) return;
    wineryFetchInFlightRef.current.add(id);
    setWineryDetailLoading(true);
    Promise.all([fetchBreweryDetail(id), fetchBreweryProducts(id, 0, 50)])
      .then(([detail, productsPage]) => {
        setFetchedWineries((prev) => ({
          ...prev,
          [id]: adaptBreweryToWinery(detail, productsPage.content),
        }));
      })
      .catch((error) => {
        console.error("양조장 정보 조회 실패", error);
      })
      .finally(() => {
        wineryFetchInFlightRef.current.delete(id);
        setWineryDetailLoading(false);
      });
  }

  const selectedWinery = selectedId ? findWineryById(selectedId) : undefined;

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    userPositionRef.current = userPosition;
  }, [userPosition]);

  useEffect(() => {
    isSearchResultModeRef.current = isSearchResultMode;
  }, [isSearchResultMode]);

  // 지도에 양조장이 하나도 안 보일 때(혹은 아직 조회 전인 진입 초기) 목록 대신 보여줄 기본
  // 콘텐츠입니다. Figma의 "Default BottomSheet"처럼 추천 양조장 그리드 3묶음(12개) 사이사이에
  // 수상 전통주·추천 메뉴 섹션을 끼워 넣으므로 12개를 한 번에 받아둡니다.
  useEffect(() => {
    const controller = new AbortController();
    fetchMapRecommendedBreweries(0, 12, controller.signal)
      .then((page) => setRecommendedBreweries(page.content))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRecommendedBreweries([]);
      });
    fetchMapAwardedLiquors(0, 4, controller.signal)
      .then((page) => setAwardedLiquors(page.content))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAwardedLiquors([]);
      });
    fetchMapMenus(controller.signal)
      .then(setMapMenus)
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMapMenus([]);
      });
    return () => controller.abort();
  }, []);

  // 추천 메뉴 칩을 고르면 그 메뉴를 파는 장소로 목록·핀을 바꿔 보여줍니다(양조장 카테고리 목록과 동일한 자리를 씁니다).
  function handleSelectMenu(menu: string) {
    if (selectedMenu === menu) {
      setSelectedMenu(null);
      refetchPlacesByRadius(activeCategory);
      return;
    }
    setSelectedMenu(menu);
    placesAbortRef.current?.abort();
    const controller = new AbortController();
    placesAbortRef.current = controller;
    setPlacesLoadState("loading");
    fetchMapMenuPlaces(menu, userPositionRef.current ?? undefined, 0, 20, controller.signal)
      .then((page) => {
        setPlaces(page.content);
        setPlacesLoadState("ready");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("메뉴별 장소 조회 실패", error);
        setPlacesLoadState("error");
      });
  }

  // 양조장 리스트가 보이는 동안, 각 행에 표시할 이력 뱃지를 백그라운드로 채워둡니다.
  useEffect(() => {
    if (activeCategory !== "brewery" || placesLoadState !== "ready") return;
    places.forEach((place) => ensureBreweryBadgesLoaded(place.placeId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, activeCategory, placesLoadState]);

  // 카테고리 Chip을 선택하면, 리스트 아이템이 최소 3개 모일 때까지 지도 중심 기준
  // 탐색 반경을 3km → 5km → 7km → 10km → 15km → 20km → 30km 순으로 넓혀가며 조회합니다.
  function refetchPlacesByRadius(category: CategoryKey) {
    const mapCategory = MAP_PLACE_CATEGORY[category];
    const kakao = kakaoRef.current;
    const map = mapInstanceRef.current;
    if (!mapCategory || !kakao || !map) return;

    placesAbortRef.current?.abort();
    const controller = new AbortController();
    placesAbortRef.current = controller;

    const center = map.getCenter();
    const centerLat = center.getLat();
    const centerLng = center.getLng();
    const position = userPositionRef.current;

    setPlacesLoadState("loading");

    async function run() {
      for (let i = 0; i < SEARCH_RADII_KM.length; i++) {
        const radiusKm = SEARCH_RADII_KM[i];
        const isLastRadius = i === SEARCH_RADII_KM.length - 1;
        const latDelta = radiusKm / 111;
        const lngDelta = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180));
        try {
          const page = await fetchMapPlaces(
            {
              south: centerLat - latDelta,
              north: centerLat + latDelta,
              west: centerLng - lngDelta,
              east: centerLng + lngDelta,
            },
            mapCategory,
            position ?? undefined,
            0,
            100,
            controller.signal
          );
          if (controller.signal.aborted) return;
          if (page.content.length >= MIN_PLACE_RESULTS || isLastRadius) {
            setPlaces(page.content);
            setPlacesLoadState("ready");
            return;
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          console.error("장소 조회 실패", error);
          setPlacesLoadState("error");
          return;
        }
      }
    }

    run();
  }

  // 지도를 움직여 'idle'이 발생했을 때도 같은 반경 확장 조회를 써서, 사용자가 어디로 이동하든
  // (내 위치 포함) 식당·숙소처럼 드문 카테고리가 "결과 없음"으로 비어 보이지 않게 합니다.
  refetchPlacesRef.current = refetchPlacesByRadius;

  // 지도 인스턴스는 최초 1회만 생성합니다.
  useEffect(() => {
    let cancelled = false;
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !mapElRef.current) return;
        kakaoRef.current = kakao;
        const initialFocusWinery = mockFocusWinery ?? navStateWinery;
        // 양조장 상세를 보다가(코스 모드 아님) 다른 화면으로 넘어갔다 뒤로 왔으면, 떠나기 직전
        // 지도 중심·줌으로 그대로 복원합니다(처음 보는 진입이면 저장된 값이 없습니다).
        const savedCenter = !isCourseMode
          ? getMemory<{ lat: number; lng: number }>("map:center")
          : undefined;
        const savedLevel = !isCourseMode ? getMemory<number>("map:level") : undefined;
        // 위치 권한이 이미 허용돼 있으면, 카카오맵 SDK 로딩(비동기)이 끝나기 전에
        // 위치 동의 확인 효과가 먼저 끝나 userPositionRef가 채워져 있을 수 있습니다.
        // 이 경우 기본 클러스터 중심 대신 바로 현재 위치를 초기 중심으로 씁니다.
        const initialCenter =
          isCourseMode && initialFocusWinery?.lat && initialFocusWinery?.lng
            ? { lat: initialFocusWinery.lat, lng: initialFocusWinery.lng }
            : (savedCenter ?? userPositionRef.current ?? DEFAULT_CLUSTER_CENTER);
        const map = new kakao.Map(mapElRef.current, {
          center: new kakao.LatLng(initialCenter.lat, initialCenter.lng),
          level: isCourseMode
            ? FOCUS_LEVEL
            : (savedLevel ?? (userPositionRef.current ? USER_LOCATION_LEVEL : DEFAULT_LEVEL)),
        });
        mapInstanceRef.current = map;
        // 코스 모드는 양조장 상세 시트(mid, DETAIL_SHEET_HEIGHT)가 처음부터 하단을 덮으므로,
        // focusMapOn과 동일하게 양조장 핀이 "시트를 제외한 지도 영역"의 가운데 오도록 지도
        // 중심을 살짝 아래로 옮깁니다. 그렇지 않으면 핀이 화면 위쪽으로 치우쳐 보입니다.
        if (isCourseMode && initialFocusWinery?.lat && initialFocusWinery?.lng) {
          const projection = map.getProjection();
          const pinPoint = projection.pointFromCoords(
            new kakao.LatLng(initialFocusWinery.lat, initialFocusWinery.lng)
          );
          const shiftedPoint = new kakao.Point(pinPoint.x, pinPoint.y + DETAIL_SHEET_HEIGHT / 3);
          map.setCenter(projection.coordsFromPoint(shiftedPoint));
        }
        kakao.event.addListener(map, "idle", () => {
          if (!isCourseMode && !isSearchResultModeRef.current) {
            refetchPlacesRef.current(activeCategoryRef.current);
          }
          if (!isCourseMode) {
            const center = map.getCenter();
            setMemory("map:center", { lat: center.getLat(), lng: center.getLng() });
            setMemory("map:level", map.getLevel());
          }
        });
        setLoadState("ready");
        requestAnimationFrame(() => map.relayout());
      })
      .catch((error: Error) => {
        if (cancelled) return;
        console.error("카카오맵 로드 실패", error);
        setErrorMessage(error.message);
        setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 코스 모드일 때 실제 추천 코스(정거장 좌표 포함)를 조회합니다.
  // 코스 상세 화면에서 이미 조회한 stops를 전달받았다면 재조회 없이 그대로 씁니다.
  useEffect(() => {
    if (!isCourseMode || !focusId) return;
    if (navState?.courseStops) {
      setCourseStops(navState.courseStops);
      return;
    }
    const controller = new AbortController();
    fetchRecommendedCourse(focusId, controller.signal)
      .then((data) => {
        setCourseStops(data.stops);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("추천 코스 조회 실패", error);
        setCourseStops([]);
      });
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCourseMode, focusId, navState?.courseStops]);

  // 코스 모드에서 모의 데이터에 없는 실제 양조장이면 상세를 조회해 채웁니다.
  useEffect(() => {
    if (!isCourseMode || !focusId || mockFocusWinery || navStateWinery) return;
    const controller = new AbortController();
    setFocusWineryLoading(true);
    Promise.all([
      fetchBreweryDetail(focusId, controller.signal),
      fetchBreweryProducts(focusId, 0, 50, controller.signal),
    ])
      .then(([detail, productsPage]) => {
        setFocusWinery(adaptBreweryToWinery(detail, productsPage.content));
        setFocusWineryLoading(false);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("양조장 정보 조회 실패", error);
        setFocusWinery(undefined);
        setFocusWineryLoading(false);
      });
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCourseMode, focusId]);

  // 양조장 정보가 (비동기로) 준비되면 그 위치로 지도를 맞춥니다. 정거장이 여러 곳이어도
  // 전체를 화면에 맞추려고 bounds로 fit하지 않고, 항상 양조장 핀이 가운데 오도록 고정합니다.
  useEffect(() => {
    if (!isCourseMode || loadState !== "ready" || !focusWinery?.lat || !focusWinery?.lng) return;
    const kakao = kakaoRef.current;
    const map = mapInstanceRef.current;
    if (!kakao || !map) return;

    const wineryLatLng = new kakao.LatLng(focusWinery.lat, focusWinery.lng);
    map.setCenter(wineryLatLng);
    map.setLevel(FOCUS_LEVEL);
    // 시트(mid, DETAIL_SHEET_HEIGHT)가 덮는 만큼 양조장 핀이 화면 가운데(시트 제외 영역
    // 기준)에 오도록 중심을 살짝 아래로 옮깁니다.
    const projection = map.getProjection();
    const pinPoint = projection.pointFromCoords(wineryLatLng);
    const shiftedPoint = new kakao.Point(pinPoint.x, pinPoint.y + DETAIL_SHEET_HEIGHT / 3);
    map.setCenter(projection.coordsFromPoint(shiftedPoint));
  }, [isCourseMode, loadState, focusWinery]);

  // 바텀시트 높이 계산의 기준이 되는 지도 영역 실측 높이를 추적합니다.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const update = () => setAreaHeight(el.clientHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (sheetInitialized.current || areaHeight === 0) return;
    sheetInitialized.current = true;
    const points = getSnapPoints(areaHeight);
    if (isCourseMode) {
      setSheetHeight(points.mid);
      return;
    }
    // 상세(양조장) 화면은 끝까지 올리면 곧장 양조장 상세 페이지로 이동해버려서, 복원된
    // sheetMode가 "detail"이면 저장된 높이가 사실상 항상 그 이동 직전(full 근처) 값입니다.
    // 그대로 복원하면 매번 풀시트로 보이므로, 상세 복원은 하프시트(mid) 고정으로 시작합니다.
    if (sheetMode === "detail") {
      setSheetHeight(points.mid);
      return;
    }
    const savedHeight = getMemory<number>("map:sheetHeight");
    setSheetHeight(savedHeight != null ? Math.min(savedHeight, points.full) : points.collapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaHeight]);

  // 지금 보고 있는 목록/상세 상태를 계속 기억해둡니다(코스 모드는 제외) — 다른 화면에 갔다
  // 돌아와도 이 상태로 복원됩니다.
  useEffect(() => {
    if (isCourseMode) return;
    setMemory("map:sheetMode", sheetMode);
    setMemory("map:selectedId", selectedId);
    setMemory("map:detailKind", detailKind);
    setMemory("map:activeCategory", activeCategory);
    setMemory("map:categorySelected", categorySelected);
    if (sheetHeight > 0) setMemory("map:sheetHeight", sheetHeight);
  }, [
    isCourseMode,
    sheetMode,
    selectedId,
    detailKind,
    activeCategory,
    categorySelected,
    sheetHeight,
    setMemory,
  ]);

  // 양조장 상세가 복원됐는데(다른 화면에서 뒤로 옴) 실제 데이터가 아직 없으면 다시 불러옵니다.
  useEffect(() => {
    if (isCourseMode || sheetMode !== "detail" || detailKind !== "winery" || !selectedId) return;
    if (findWineryById(selectedId)) return;
    ensureWineryLoaded(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCourseMode, sheetMode, detailKind, selectedId]);

  // 하프시트로 복원한 양조장이, 지도에서도 그 핀 위치로 다시 포커스되게 합니다(하프시트만
  // 복원되고 지도는 떠나기 직전 위치 그대로면 핀이 화면 밖일 수 있습니다). 한 번만 실행합니다.
  useEffect(() => {
    if (isCourseMode || restoredFocusRef.current) return;
    if (loadState !== "ready" || sheetMode !== "detail" || detailKind !== "winery") return;
    if (!selectedWinery?.lat || !selectedWinery?.lng) return;
    restoredFocusRef.current = true;
    focusMapOn(selectedWinery.lat, selectedWinery.lng, DETAIL_SHEET_HEIGHT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCourseMode, loadState, sheetMode, detailKind, selectedWinery]);

  // 위치 동의 상태를 최초 진입 시 한 번 확인합니다(코스 모드에서는 생략).
  useEffect(() => {
    if (isCourseMode) return;
    let cancelled = false;

    const checkBrowserPermission = () => {
      const nav = navigator as Navigator & {
        permissions?: { query: (opts: { name: string }) => Promise<{ state: string }> };
      };
      if (nav.permissions?.query) {
        nav.permissions
          .query({ name: "geolocation" })
          .then((status) => {
            if (cancelled) return;
            if (status.state === "granted") {
              acquireLocation();
            } else {
              setShowLocationConsent(true);
            }
          })
          .catch(() => {
            if (!cancelled) setShowLocationConsent(true);
          });
      } else {
        setShowLocationConsent(true);
      }
    };

    // 마이페이지(약관 동의)에서 위치 기반 서비스 이용약관에 이미 동의한 회원이면, 여기서
    // 다시 앱 자체 안내 시트를 띄우지 않고 바로 위치를 가져옵니다(브라우저 자체 권한 팝업은
    // 아직 허용 전이면 별도로 뜰 수 있고, 이건 앱이 막을 수 있는 대상이 아닙니다).
    fetchTerms()
      .then((items) => {
        if (cancelled) return;
        const locationAgreed = items.find((item) => item.code === "LOCATION")?.agreed;
        if (locationAgreed) {
          acquireLocation();
        } else {
          checkBrowserPermission();
        }
      })
      .catch(() => {
        if (!cancelled) checkBrowserPermission();
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 카테고리를 바꾸면 그 카테고리의 실제 장소를(양조장 포함) 반경을 넓혀가며 새로 조회합니다.
  useEffect(() => {
    if (loadState !== "ready" || isCourseMode || isSearchResultMode) return;
    refetchPlacesByRadius(activeCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, loadState, isCourseMode, isSearchResultMode]);

  // 검색 결과에서 "지도에서 보기"로 넘어온 경우, 뷰포트 조회 대신 그 검색 결과
  // 양조장들만 조회해 핀으로 띄우고 지도 범위를 그 핀들에 맞춥니다.
  useEffect(() => {
    if (!isSearchResultMode || loadState !== "ready" || !searchBreweryIds?.length) return;
    const kakao = kakaoRef.current;
    const map = mapInstanceRef.current;
    if (!kakao || !map) return;

    let cancelled = false;
    setPlacesLoadState("loading");
    Promise.all(searchBreweryIds.map((id) => fetchBreweryDetail(id).catch(() => null)))
      .then((details) => {
        if (cancelled) return;
        const validPlaces: MapPlace[] = details
          .filter((detail): detail is NonNullable<typeof detail> => detail != null)
          .filter((detail) => detail.latitude != null && detail.longitude != null)
          .map((detail) => ({
            placeId: detail.breweryId,
            placeName: detail.businessName,
            category: "BREWERY",
            categoryName: "양조장",
            distance: null,
            roadAddressName: detail.address ?? null,
            phone: detail.phone,
            latitude: detail.latitude as number,
            longitude: detail.longitude as number,
            imageUrl: resolveImageUrl(detail.mainImage?.url) ?? null,
          }));
        setPlaces(validPlaces);
        setPlacesLoadState("ready");

        if (validPlaces.length > 0) {
          const bounds = new kakao.LatLngBounds();
          validPlaces.forEach((place) =>
            bounds.extend(new kakao.LatLng(place.latitude, place.longitude))
          );
          if (validPlaces.length === 1) {
            map.setCenter(new kakao.LatLng(validPlaces[0].latitude, validPlaces[0].longitude));
            map.setLevel(FOCUS_LEVEL);
          } else {
            map.setBounds(bounds, 80, 40, 40, 40);
          }
        }
        setIsSearchResultMode(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("검색 결과 양조장 조회 실패", error);
        setPlacesLoadState("error");
        setIsSearchResultMode(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearchResultMode, loadState]);

  // 코스 모드에서 중심 양조장 마커만 그립니다(일반 모드의 양조장 핀은 아래 장소 마커 효과가 담당합니다).
  useEffect(() => {
    const kakao = kakaoRef.current;
    const map = mapInstanceRef.current;
    if (!kakao || !map || loadState !== "ready" || !isCourseMode) return;

    pinOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    pinOverlaysRef.current = [];

    if (!focusWinery?.lat || !focusWinery?.lng) return;
    const position = new kakao.LatLng(focusWinery.lat, focusWinery.lng);
    const isSelected = detailKind === "winery";
    const el = createPinElement({
      emoji: CATEGORY_META.brewery.icon,
      iconSrc: CATEGORY_PIN_ICON.brewery,
      color: CATEGORY_META.brewery.color,
      label: focusWinery.name,
      selected: isSelected,
      dimmed: false,
    });
    el.addEventListener("click", () => handleSelectWinery(focusWinery.id));
    const overlay = new kakao.CustomOverlay({
      map,
      position,
      content: el,
      yAnchor: 1,
      clickable: true,
    });
    pinOverlaysRef.current.push(overlay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadState, detailKind, isCourseMode, focusWinery]);

  // 카테고리 탭(양조장/식당/관광지/카페/숙소)에서 조회한 실제 장소 마커를 그립니다.
  useEffect(() => {
    const kakao = kakaoRef.current;
    const map = mapInstanceRef.current;
    if (!kakao || !map || loadState !== "ready") return;

    placeOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    placeOverlaysRef.current = [];

    if (isCourseMode) return;

    // 반경 안에 실제 양조장이 하나도 없어 목록이 "전통주로 추천 양조장"으로 대체된 상태라면,
    // 핀도 그 추천 양조장 기준으로 그립니다(그렇지 않으면 지도에 핀이 하나도 안 보이게 됩니다).
    const pinSource =
      activeCategory === "brewery" && places.length === 0 && recommendedBreweries.length > 0
        ? recommendedBreweries.map(recommendedBreweryToPlace)
        : places;

    // 핀이 화면상 겹쳐 있으면, 유저 현재 위치(없으면 지도 중심)와 가장 가까운 핀만 이름표를
    // 보여주고 나머지는 숨깁니다. 이름표가 남는 핀이 겹친 핀들 위로 그려지도록 뒤에 그립니다.
    const projection = map.getProjection();
    const reference = userPosition ?? {
      lat: map.getCenter().getLat(),
      lng: map.getCenter().getLng(),
    };
    const hiddenLabels = resolveHiddenPinLabels(
      pinSource.map((place) => ({ key: place.placeId, lat: place.latitude, lng: place.longitude })),
      kakao,
      projection,
      reference
    );
    const orderedPlaces = [...pinSource].sort(
      (a, b) => Number(hiddenLabels.has(b.placeId)) - Number(hiddenLabels.has(a.placeId))
    );

    orderedPlaces.forEach((place) => {
      const isSelected =
        place.category === "BREWERY"
          ? detailKind === "winery" && selectedId === place.placeId
          : detailKind === "place" && selectedPlace?.placeId === place.placeId;
      const el = createPinElement({
        emoji: CATEGORY_META[activeCategory].icon,
        iconSrc: CATEGORY_PIN_ICON[activeCategory],
        color: CATEGORY_META[activeCategory].color,
        label: place.placeName,
        selected: isSelected,
        dimmed: false,
        showLabel: isSelected || !hiddenLabels.has(place.placeId),
      });
      el.addEventListener("click", () => handleSelectPlace(place));
      const overlay = new kakao.CustomOverlay({
        map,
        position: new kakao.LatLng(place.latitude, place.longitude),
        content: el,
        yAnchor: 1,
        clickable: true,
      });
      placeOverlaysRef.current.push(overlay);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loadState,
    places,
    activeCategory,
    isCourseMode,
    detailKind,
    selectedPlace,
    selectedId,
    userPosition,
    recommendedBreweries,
  ]);

  // 코스 모드에서 실제 추천 코스 정거장(식당·관광지·카페·숙소) 마커를 그립니다.
  useEffect(() => {
    const kakao = kakaoRef.current;
    const map = mapInstanceRef.current;
    if (!kakao || !map || loadState !== "ready" || !isCourseMode) return;

    stopOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    stopOverlaysRef.current = [];

    const validStops = courseStops.filter((stop) => STOP_TYPE_TO_CATEGORY[stop.type]);
    // 핀이 겹쳐 있으면 유저 현재 위치(없으면 양조장)와 가장 가까운 핀만 이름표를 보여줍니다.
    const projection = map.getProjection();
    const reference =
      userPosition ??
      (focusWinery?.lat && focusWinery?.lng
        ? { lat: focusWinery.lat, lng: focusWinery.lng }
        : null);
    const stopPins = validStops.map((stop) => ({
      key: stop.contentId,
      lat: stop.latitude,
      lng: stop.longitude,
    }));
    const hiddenLabels = resolveHiddenPinLabels(stopPins, kakao, projection, reference);
    // 아이콘 자체가 서로 겹쳐 가려지지 않도록, 겹친 핀들은 원래 위치 주위로 살짝 흩어 그립니다.
    const overlapOffsets = resolveOverlapOffsets(stopPins, kakao, projection);
    const orderedStops = [...validStops].sort(
      (a, b) => Number(hiddenLabels.has(b.contentId)) - Number(hiddenLabels.has(a.contentId))
    );

    orderedStops.forEach((stop) => {
      const category = STOP_TYPE_TO_CATEGORY[stop.type];
      const isSelected = detailKind === "stop" && selectedStop?.contentId === stop.contentId;
      const position = overlapOffsets[stop.contentId] ?? {
        lat: stop.latitude,
        lng: stop.longitude,
      };
      const el = createPinElement({
        emoji: CATEGORY_META[category].icon,
        iconSrc: CATEGORY_PIN_ICON[category],
        color: CATEGORY_META[category].color,
        label: stop.name,
        selected: isSelected,
        dimmed: false,
        showLabel: isSelected || !hiddenLabels.has(stop.contentId),
      });
      el.addEventListener("click", () => handleSelectStop(stop));
      const overlay = new kakao.CustomOverlay({
        map,
        position: new kakao.LatLng(position.lat, position.lng),
        content: el,
        yAnchor: 1,
        clickable: true,
      });
      stopOverlaysRef.current.push(overlay);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadState, isCourseMode, courseStops, detailKind, selectedStop, userPosition, focusWinery]);

  // 내 위치 표시(파란 점)를 그립니다.
  useEffect(() => {
    const kakao = kakaoRef.current;
    const map = mapInstanceRef.current;
    if (!kakao || !map || loadState !== "ready") return;

    userDotOverlayRef.current?.setMap(null);
    userDotOverlayRef.current = null;
    if (!userPosition) return;

    const overlay = new kakao.CustomOverlay({
      map,
      position: new kakao.LatLng(userPosition.lat, userPosition.lng),
      content: createUserDotElement(),
      clickable: false,
    });
    userDotOverlayRef.current = overlay;
  }, [loadState, userPosition]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  };

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch {
      showToast("복사에 실패했어요. 다시 시도해주세요.");
    }
  };

  function acquireLocation() {
    if (!navigator.geolocation) {
      setLocationError("이 브라우저에서는 위치 정보를 지원하지 않아요.");
      return;
    }
    setLocationBusy(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserPosition(coords);
        setLocationState("granted");
        setShowLocationConsent(false);
        setLocationBusy(false);
        const kakao = kakaoRef.current;
        const map = mapInstanceRef.current;
        if (kakao && map) {
          map.setCenter(new kakao.LatLng(coords.lat, coords.lng));
          map.setLevel(USER_LOCATION_LEVEL);
        }
      },
      () => {
        setLocationState("denied");
        setLocationBusy(false);
        setLocationError("위치 정보를 가져오지 못했어요. 브라우저 설정을 확인해주세요.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }

  const handleLocationButtonClick = () => {
    if (isCourseMode) {
      if (focusWinery?.lat && focusWinery?.lng) {
        focusMapOn(focusWinery.lat, focusWinery.lng, DETAIL_SHEET_HEIGHT);
      }
      return;
    }
    if (locationState === "granted") {
      acquireLocation();
    } else {
      setShowLocationConsent(true);
    }
  };

  const handleZoomIn = () => {
    const map = mapInstanceRef.current;
    if (map) map.setLevel(map.getLevel() - 1);
  };

  const handleZoomOut = () => {
    const map = mapInstanceRef.current;
    if (map) map.setLevel(map.getLevel() + 1);
  };

  // 바텀시트가 지도 아래쪽을 덮는 만큼, 핀이 "시트를 제외한 나머지 지도 영역"에서 살짝 위쪽에
  // 오도록 지도 중심을 핀보다 아래인 지점으로 옮깁니다(그래야 상대적으로 핀이 화면상 위로 올라와
  // 보입니다). panBy는 드래그와 동일하게 동작해 줌 레벨 전환 애니메이션 중에는 픽셀↔좌표 환산이
  // 어긋날 수 있어서, 대신 프로젝션으로 정확한 목표 좌표를 계산합니다.
  function focusMapOn(lat: number, lng: number, coveredBottom = 0) {
    const kakao = kakaoRef.current;
    const map = mapInstanceRef.current;
    if (!kakao || !map) return;
    const pinLatLng = new kakao.LatLng(lat, lng);
    map.setCenter(pinLatLng);
    map.setLevel(FOCUS_LEVEL);
    if (coveredBottom > 0) {
      const projection = map.getProjection();
      const pinPoint = projection.pointFromCoords(pinLatLng);
      const shiftedPoint = new kakao.Point(pinPoint.x, pinPoint.y + coveredBottom / 3);
      map.setCenter(projection.coordsFromPoint(shiftedPoint));
    }
  }

  function handleSelectWinery(id: string) {
    if (sheetMode === "list") previousSheetHeightRef.current = sheetHeight;
    setSelectedId(id);
    setDetailKind("winery");
    setSheetMode("detail");
    setSheetHeight(getSnapPoints(areaHeight).mid);
    const winery = WINERIES.find((item) => item.id === id);
    if (winery?.lat && winery?.lng) focusMapOn(winery.lat, winery.lng, DETAIL_SHEET_HEIGHT);
  }

  // 목록·핀에서 장소를 선택하면 카테고리 상관없이 해당 핀으로 지도를 이동시키고(반경 3km 수준)
  // 그 장소의 바텀시트(양조장이면 상세 시트, 그 외는 FloatingCard)를 엽니다.
  function handleSelectPlace(place: MapPlace) {
    if (place.category === "BREWERY") {
      if (sheetMode === "list") previousSheetHeightRef.current = sheetHeight;
      setSelectedId(place.placeId);
      setDetailKind("winery");
      ensureWineryLoaded(place.placeId);
      setSheetMode("detail");
      setSheetHeight(getSnapPoints(areaHeight).mid);
      focusMapOn(place.latitude, place.longitude, DETAIL_SHEET_HEIGHT);
      return;
    }
    setSelectedPlace(place);
    setDetailKind("place");
    focusMapOn(place.latitude, place.longitude, DETAIL_SHEET_HEIGHT);
  }

  function handleSelectStop(stop: RecommendedCourseStop) {
    setSelectedStop(stop);
    setDetailKind("stop");
  }

  const handleCloseDetail = () => {
    setSelectedId(null);
    setDetailKind("winery");
    setSheetMode("list");
    setSheetHeight(previousSheetHeightRef.current ?? getSnapPoints(areaHeight).collapsed);
    previousSheetHeightRef.current = null;
  };

  // 장소(식당·카페 등)·코스 정거장 카드를 닫습니다. 바텀시트 자체는 건드리지 않습니다.
  const handleCloseFloating = () => {
    setSelectedPlace(null);
    setSelectedStop(null);
    setDetailKind("winery");
  };

  const handleDragStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startHeight: sheetHeight };
    setIsDragging(true);
  };

  const handleDragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const points = getSnapPoints(areaHeight);
    const minHeight = sheetMode === "detail" ? points.detailCollapsed : points.collapsed;
    const delta = dragRef.current.startY - e.clientY;
    const next = Math.min(
      points.full,
      Math.max(minHeight - 40, dragRef.current.startHeight + delta)
    );
    setSheetHeight(next);
  };

  const handleDragEnd = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsDragging(false);
    const points = getSnapPoints(areaHeight);
    const minHeight = sheetMode === "detail" ? points.detailCollapsed : points.collapsed;
    const candidates = [minHeight, points.mid, points.full];
    const snapped = candidates.reduce((a, b) =>
      Math.abs(b - sheetHeight) < Math.abs(a - sheetHeight) ? b : a
    );
    // 양조장 상세를 맨 위까지 끌어올리면, Figma의 "Brewery Card Expanded" 미니 상세 페이지 대신
    // 이미 동일한 내용(대표주종·방문방식·한 줄 요약 등)을 갖춘 양조장 상세 페이지로 이동합니다.
    if (
      snapped >= points.full &&
      sheetMode === "detail" &&
      detailKind === "winery" &&
      selectedWinery
    ) {
      navigate(`/winery/${selectedWinery.id}`);
      return;
    }
    setSheetHeight(snapped);
  };

  const handleShareWinery = async (winery: Winery) => {
    const shareUrl = `${window.location.origin}/winery/${winery.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: winery.name, url: shareUrl });
      } catch {
        // 사용자가 공유를 취소한 경우는 조용히 무시합니다.
      }
      return;
    }
    await copyToClipboard(shareUrl, "링크를 복사했어요!");
  };

  const handleDirections = (winery: Winery) => {
    const url =
      winery.lat && winery.lng
        ? `https://map.kakao.com/link/to/${encodeURIComponent(winery.name)},${winery.lat},${winery.lng}`
        : `https://map.kakao.com/link/search/${encodeURIComponent(winery.address ?? winery.detailRegion)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const consentActive = !isCourseMode && showLocationConsent;
  // 칩도 메뉴 칩도 아직 안 눌렀고, 검색 결과에서 넘어온 것도 아닐 때만 Figma의
  // "Default BottomSheet"(추천 콘텐츠)를 보여줍니다.
  const showRecommendedDefault = !categorySelected && !selectedMenu && !isSearchResultMode;
  const floatingInfo =
    detailKind === "place" && selectedPlace
      ? placeToInfo(selectedPlace)
      : detailKind === "stop" && selectedStop
        ? stopToInfo(selectedStop)
        : null;
  // 위치 동의 시트·양조장 상세 시트·장소 상세 카드가 화면을 덮는 동안은 하단 네비게이션 바를 숨깁니다.
  useHideNavbar(consentActive || sheetMode === "detail" || Boolean(floatingInfo));

  // 양조장 정보를 아직 못 찾은 게 "로딩 중"이 아니라 "완전히 실패"했을 때만 지도를 아예 안 그립니다.
  // 로딩 중에는 아래 메인 렌더가 그대로 진행되어야 <MapEl>이 마운트되고 카카오맵이 초기화됩니다
  // (여기서 일찍 return하면 <MapEl>이 없는 채로 지도 초기화 효과가 한 번만 실행되고 끝나버려,
  // 나중에 양조장 정보가 도착해도 지도가 영영 뜨지 않습니다).
  if (isCourseMode && !focusWinery && !focusWineryLoading) {
    return (
      <PageContainer>
        <AppBar onBack={() => navigate(-1)} title="코스" />
        <NotFoundArea>
          <NotFoundText>코스 정보를 찾을 수 없어요</NotFoundText>
        </NotFoundArea>
      </PageContainer>
    );
  }

  // 장소 카드(FloatingCard)가 떠 있을 때는 바텀시트 자체가 사라지므로 피해야 할 높이가 없습니다.
  const activeSheetHeight = consentActive ? 190 : floatingInfo ? 0 : sheetHeight;
  const isSheetFullyExpanded =
    !consentActive && !floatingInfo && sheetHeight >= getSnapPoints(areaHeight).full - 2;
  // 바텀시트를 접힌 스냅 지점까지 끌어내리면, Figma의 "Brewery Card Collapsed" 상태처럼
  // 이름·버튼만 남기고 종류/주소/사진 등 부가 정보는 숨깁니다.
  const isDetailCollapsed = sheetHeight <= getSnapPoints(areaHeight).detailCollapsed + 20;

  return (
    <PageContainer>
      {isCourseMode ? (
        <AppBar
          onBack={() => navigate(-1)}
          title={focusWinery ? `${focusWinery.name} 코스` : "코스"}
          align="left"
          trailing={
            focusWinery && (
              <ShareButton
                type="button"
                aria-label="공유하기"
                onClick={() => handleShareWinery(focusWinery)}
              >
                <img src={shareIcon} alt="" width={24} height={24} />
              </ShareButton>
            )
          }
        />
      ) : null}

      <MapArea ref={areaRef}>
        <MapEl ref={mapElRef} />

        {!isCourseMode && !isSheetFullyExpanded && (
          <SearchBarButton type="button" onClick={() => navigate("/search")}>
            <img src={searchIcon} alt="" width={24} height={24} />
            <SearchPlaceholder>양조장·전통주 검색</SearchPlaceholder>
          </SearchBarButton>
        )}

        {(loadState === "loading" || (loadState === "ready" && isSearchResultMode)) && (
          <StatusOverlay style={{ bottom: activeSheetHeight }}>
            <DotsLoader />
          </StatusOverlay>
        )}
        {loadState === "error" && (
          <StatusOverlay style={{ bottom: activeSheetHeight }}>
            <StatusText>지도를 불러오지 못했어요.</StatusText>
            {errorMessage && <StatusSubtext>{errorMessage}</StatusSubtext>}
          </StatusOverlay>
        )}

        {loadState === "ready" && !consentActive && !isSheetFullyExpanded && (
          <MapControls style={{ bottom: activeSheetHeight + 12 }}>
            <ZoomControl>
              <ZoomButton type="button" aria-label="확대" onClick={handleZoomIn}>
                +
              </ZoomButton>
              <ZoomDivider />
              <ZoomButton type="button" aria-label="축소" onClick={handleZoomOut}>
                −
              </ZoomButton>
            </ZoomControl>
            <LocationButton
              type="button"
              aria-label="현재 위치로 이동"
              $active={locationState === "granted"}
              onClick={handleLocationButtonClick}
            >
              <LocationGlyph $src={targetIcon} aria-hidden />
            </LocationButton>
          </MapControls>
        )}

        {consentActive && (
          <ConsentSheet>
            <SheetHandle />
            <ConsentTitle>
              내 주변 양조장을 보려면
              <br />
              위치 동의가 필요해요
            </ConsentTitle>
            <ConsentDesc>위치 기반 서비스 약관 동의 후 위치 권한을 허용해주세요.</ConsentDesc>
            {locationError && <ConsentError>{locationError}</ConsentError>}
            <ConsentAgreeButton
              type="button"
              disabled={locationBusy}
              onClick={() => acquireLocation()}
            >
              {locationBusy ? "확인 중..." : "동의하고 계속하기"}
            </ConsentAgreeButton>
            <ConsentSkipButton type="button" onClick={() => setShowLocationConsent(false)}>
              다음에 할게요
            </ConsentSkipButton>
          </ConsentSheet>
        )}

        {!consentActive && !floatingInfo && (
          <Sheet
            style={{ height: sheetHeight, transition: isDragging ? "none" : "height 0.25s ease" }}
          >
            <SheetHandleArea
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
            >
              <SheetHandle />
            </SheetHandleArea>

            <SheetScroll>
              {sheetMode === "list" && (
                <>
                  <ChipRow>
                    {CATEGORY_ORDER.map((key) => {
                      const pinIcon = CATEGORY_PIN_ICON[key];
                      const active = categorySelected && activeCategory === key;
                      return (
                        <CategoryChip
                          key={key}
                          type="button"
                          $active={active}
                          onClick={() => {
                            const wasMenuMode = selectedMenu != null;
                            setSelectedMenu(null);
                            setActiveCategory(key);
                            setCategorySelected(true);
                            if (wasMenuMode) refetchPlacesByRadius(key);
                          }}
                        >
                          {pinIcon ? (
                            <ChipIcon
                              aria-hidden
                              $src={pinIcon}
                              $color={active ? "#ffffff" : CATEGORY_META[key].color}
                            />
                          ) : (
                            <span aria-hidden>{CATEGORY_META[key].icon}</span>
                          )}
                          {CATEGORY_META[key].label}
                        </CategoryChip>
                      );
                    })}
                  </ChipRow>

                  {showRecommendedDefault ? (
                    recommendedBreweries.length === 0 ? (
                      // 추천 콘텐츠가 아직 도착하기 전에는 점 3개 로더 대신, 아래에 채워질
                      // 카드들과 같은 모양의 스켈레톤을 보여줍니다.
                      <DefaultBottomSheetSkeleton />
                    ) : (
                      // Figma의 "Default BottomSheet"처럼, 칩을 하나도 안 눌렀을 때는 추천 양조장
                      // 그리드 사이사이에 수상 전통주·추천 메뉴 섹션을 끼워 보여줍니다. 백그라운드에서
                      // 이미 실제 양조장 결과(places)가 도착했어도, 칩을 누르기 전까지는 이 추천
                      // 콘텐츠를 계속 보여줍니다.
                      <>
                        <RecommendedSection>
                          <RecommendedTitle>전통주로에서 추천하는 양조장</RecommendedTitle>
                          <RecommendedGrid>
                            {recommendedBreweries.slice(0, 4).map((item) => (
                              <RecommendedBreweryCard
                                key={item.breweryId}
                                item={item}
                                onNavigate={navigate}
                              />
                            ))}
                          </RecommendedGrid>
                        </RecommendedSection>

                        {awardedLiquors.length > 0 && (
                          <AwardSection>
                            <RecommendedTitle>수상받은 전통주</RecommendedTitle>
                            <AwardRow>
                              {awardedLiquors.map((item) => (
                                <AwardCard
                                  key={item.productId}
                                  type="button"
                                  onClick={() => navigate(`/winery/${item.breweryId}`)}
                                >
                                  <AwardThumb
                                    src={resolveImageUrl(item.image?.url) ?? noneImage}
                                    alt=""
                                  />
                                  <AwardBadgeLine>
                                    <img src={awardIcon} alt="" width={14} height={14} />
                                    {item.awardBadge}
                                  </AwardBadgeLine>
                                  <AwardName>{item.productName}</AwardName>
                                  <AwardMetaPrimary>
                                    {item.breweryName}
                                    {item.address
                                      ? ` · ${item.address.split(" ").slice(0, 2).join(" ")}`
                                      : ""}
                                  </AwardMetaPrimary>
                                  <AwardMetaSecondary>
                                    {[
                                      item.alcoholMin != null ? `${item.alcoholMin}도` : null,
                                      item.volume,
                                      item.liquorTypes[0],
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </AwardMetaSecondary>
                                </AwardCard>
                              ))}
                            </AwardRow>
                          </AwardSection>
                        )}

                        {recommendedBreweries.slice(4, 8).length > 0 && (
                          <RecommendedSection>
                            <RecommendedGrid>
                              {recommendedBreweries.slice(4, 8).map((item) => (
                                <RecommendedBreweryCard
                                  key={item.breweryId}
                                  item={item}
                                  onNavigate={navigate}
                                />
                              ))}
                            </RecommendedGrid>
                          </RecommendedSection>
                        )}

                        {mapMenus.length > 0 && (
                          <RecommendedSection>
                            <RecommendedTitle>지금 찾아보면 좋은 메뉴</RecommendedTitle>
                            <MenuChipRow>
                              {mapMenus.map((item) => (
                                <MenuChip
                                  key={item.menu}
                                  type="button"
                                  $active={selectedMenu === item.menu}
                                  onClick={() => handleSelectMenu(item.menu)}
                                >
                                  {item.displayName}
                                </MenuChip>
                              ))}
                            </MenuChipRow>
                          </RecommendedSection>
                        )}

                        {recommendedBreweries.slice(8, 12).length > 0 && (
                          <RecommendedSection>
                            <RecommendedGrid>
                              {recommendedBreweries.slice(8, 12).map((item) => (
                                <RecommendedBreweryCard
                                  key={item.breweryId}
                                  item={item}
                                  onNavigate={navigate}
                                />
                              ))}
                            </RecommendedGrid>
                          </RecommendedSection>
                        )}
                      </>
                    )
                  ) : (
                    <>
                      {placesLoadState === "loading" && (
                        <LoaderCenter $height={Math.max(160, sheetHeight - 90)}>
                          <DotsLoader />
                        </LoaderCenter>
                      )}
                      {placesLoadState === "error" && (
                        <EmptyCategoryNotice>
                          목록을 불러오지 못했어요. 지도를 조금 움직여보세요.
                        </EmptyCategoryNotice>
                      )}
                      {placesLoadState === "ready" &&
                        places.length === 0 &&
                        (activeCategory === "brewery" ? (
                          // 양조장은 "정보가 없어요" 문구 대신, 추천 콘텐츠가 도착할 때까지 로딩 표시로 대신합니다.
                          <LoaderCenter $height={Math.max(160, sheetHeight - 90)}>
                            <DotsLoader />
                          </LoaderCenter>
                        ) : (
                          <EmptyCategoryNotice>
                            이 지역에는 {CATEGORY_META[activeCategory].label} 정보가 없어요.
                          </EmptyCategoryNotice>
                        ))}
                    </>
                  )}
                  {!showRecommendedDefault && placesLoadState === "ready" && places.length > 0 && (
                    <PlaceList>
                      {places.map((place) => {
                        const isBrewery = place.category === "BREWERY";
                        const distanceOrAddress =
                          place.distance != null
                            ? `${place.distance.toFixed(1)}km`
                            : place.roadAddressName || undefined;
                        const subtitleParts = (
                          isBrewery
                            ? [place.categoryName || undefined, distanceOrAddress]
                            : [distanceOrAddress, place.categoryName || undefined]
                        ).filter((part): part is string => Boolean(part));
                        const thumbSrc = resolveImageUrl(place.imageUrl);
                        const badges = isBrewery ? breweryBadges[place.placeId] : undefined;
                        return (
                          <PlaceRow
                            key={place.placeId}
                            type="button"
                            onClick={() => handleSelectPlace(place)}
                          >
                            <PlaceThumb
                              src={thumbSrc ?? CATEGORY_PLACE_FALLBACK[activeCategory]}
                              alt=""
                            />
                            <PlaceBody>
                              <PlaceName>{place.placeName}</PlaceName>
                              <PlaceMeta>
                                {subtitleParts.map((part, index) => (
                                  <PlaceMetaPart
                                    key={part}
                                    $tone={
                                      isBrewery ? undefined : index === 0 ? "primary" : "secondary"
                                    }
                                  >
                                    {index > 0 && <PlaceMetaDot aria-hidden />}
                                    {part}
                                  </PlaceMetaPart>
                                ))}
                              </PlaceMeta>
                              {badges && badges.length > 0 && (
                                <PlaceBadgeRow>
                                  {badges.map((badge) => (
                                    <Badge
                                      key={badge}
                                      label={badge}
                                      tone={badge === "예약필요" ? "neutral" : "gray"}
                                      shape="flat"
                                    />
                                  ))}
                                </PlaceBadgeRow>
                              )}
                            </PlaceBody>
                          </PlaceRow>
                        );
                      })}
                    </PlaceList>
                  )}
                </>
              )}

              {sheetMode === "detail" &&
                detailKind === "winery" &&
                (selectedWinery ? (
                  <DetailContent
                    winery={selectedWinery}
                    showClose={!isCourseMode}
                    compact={isDetailCollapsed}
                    onClose={handleCloseDetail}
                    onShare={handleShareWinery}
                    onDirections={handleDirections}
                    onCopyPhone={(phone) => copyToClipboard(phone, "전화번호를 복사했어요!")}
                    onNavigateCourse={(courseId) => navigate(`/course/${courseId}`)}
                  />
                ) : wineryDetailLoading || (isCourseMode && focusWineryLoading) ? (
                  // 코스 모드에서는 focusWinery를 별도 effect로 불러오는 중이라 wineryDetailLoading이
                  // 아니라 focusWineryLoading이 참일 때도 "정보 없음"이 아니라 로딩으로 처리해야 합니다.
                  <LoaderCenter $height={Math.max(160, sheetHeight - 40)}>
                    <DotsLoader />
                  </LoaderCenter>
                ) : (
                  <DetailNotFound>양조장 정보를 찾을 수 없어요.</DetailNotFound>
                ))}
            </SheetScroll>
          </Sheet>
        )}

        {!consentActive && floatingInfo && (
          <FloatingCard>
            <SimplePlaceDetail
              info={floatingInfo}
              showClose
              onClose={handleCloseFloating}
              onCopy={copyToClipboard}
            />
          </FloatingCard>
        )}

        {/* 시트를 끝까지 올리면 지도가 안 보이므로, Figma의 "Map - Basic Sheet Expanded"처럼
            시트를 다시 접는 지름길 버튼을 띄웁니다. */}
        {isSheetFullyExpanded && (
          <MapViewButton
            type="button"
            onClick={() => setSheetHeight(getSnapPoints(areaHeight).collapsed)}
          >
            <img src={mapViewIcon} alt="" width={16} height={16} />
            지도보기
          </MapViewButton>
        )}
      </MapArea>

      <Snackbar message={toast} />
    </PageContainer>
  );
}

function RecommendedBreweryCard({
  item,
  onNavigate,
}: {
  item: MapRecommendedBrewery;
  onNavigate: (path: string) => void;
}) {
  const region = item.address.split(" ").slice(0, 2).join(" ");
  return (
    <PhotoCard
      fluid
      name={item.businessName}
      region={
        item.liquorTypes.length > 0 ? `${formatLiquorTypes(item.liquorTypes)} · ${region}` : region
      }
      photoUrl={resolveImageUrl(item.mainImage?.url)}
      onClick={() => onNavigate(`/winery/${item.breweryId}`)}
    />
  );
}

// 추천 콘텐츠(추천 양조장·수상 전통주·추천 메뉴)가 아직 도착하기 전, 그 콘텐츠가 채워질
// 자리에 똑같은 모양의 스켈레톤을 보여줍니다. 실제 콘텐츠가 도착하면 레이아웃이 튀지 않도록
// 각 카드 크기를 PhotoCard(fluid)·AwardCard·MenuChip과 맞췄습니다.
function DefaultBottomSheetSkeleton() {
  return (
    <>
      <RecommendedSection>
        <SkeletonTitle $width="180px" $height="20px" />
        <RecommendedGrid>
          {Array.from({ length: 4 }, (_, i) => (
            <BrewerySkeletonCard key={i} />
          ))}
        </RecommendedGrid>
      </RecommendedSection>

      <AwardSection>
        <SkeletonTitle $width="140px" $height="20px" />
        <AwardRow>
          {Array.from({ length: 3 }, (_, i) => (
            <LiquorSkeletonCard key={i} />
          ))}
        </AwardRow>
      </AwardSection>

      <RecommendedSection>
        <RecommendedGrid>
          {Array.from({ length: 2 }, (_, i) => (
            <BrewerySkeletonCard key={i} />
          ))}
        </RecommendedGrid>
      </RecommendedSection>

      <RecommendedSection>
        <SkeletonTitle $width="160px" $height="20px" />
        <MenuChipRow>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} $width="64px" $height="37px" $radius="9999px" />
          ))}
        </MenuChipRow>
      </RecommendedSection>
    </>
  );
}

function BrewerySkeletonCard() {
  return (
    <SkeletonCard>
      <Skeleton $height="120px" $radius="8px" />
      <SkeletonCardBody>
        <Skeleton $width="70%" $height="16px" />
        <Skeleton $width="50%" $height="12px" />
      </SkeletonCardBody>
    </SkeletonCard>
  );
}

function LiquorSkeletonCard() {
  return (
    <SkeletonAwardCard>
      <Skeleton $width="150px" $height="200px" $radius="8px" />
      <Skeleton $width="120px" $height="16px" />
      <Skeleton $width="90px" $height="13px" />
    </SkeletonAwardCard>
  );
}

function DetailContent({
  winery,
  showClose,
  compact,
  onClose,
  onShare,
  onDirections,
  onCopyPhone,
  onNavigateCourse,
}: {
  winery: Winery;
  showClose: boolean;
  compact: boolean;
  onClose: () => void;
  onShare: (winery: Winery) => void;
  onDirections: (winery: Winery) => void;
  onCopyPhone: (phone: string) => void;
  onNavigateCourse: (courseId: string) => void;
}) {
  const representativeType = getRepresentativeTypeLabel(winery);
  const visitLabel = getWineryVisitLabel(winery);
  const experienceCount = winery.experiences?.length ?? 0;
  const photoUrls = winery.photoUrls && winery.photoUrls.length > 0 ? winery.photoUrls : [];

  return (
    <DetailWrap>
      <DetailHeaderRow>
        <DetailName>{winery.name}</DetailName>
        {showClose && (
          <DetailCloseButton type="button" aria-label="닫기" onClick={onClose}>
            <img src={closeIcon} alt="" width={24} height={24} />
          </DetailCloseButton>
        )}
      </DetailHeaderRow>

      {!compact && (
        <>
          <DetailMetaLine>
            {representativeType}
            {experienceCount > 0 ? ` · 체험 프로그램 ${experienceCount}개` : ""}
          </DetailMetaLine>
          {visitLabel && <DetailVisitLine>{visitLabel}</DetailVisitLine>}
          <DetailAddressText>{winery.address ?? winery.detailRegion}</DetailAddressText>
        </>
      )}

      <DetailActionRow>
        <DetailActionPrimary type="button" onClick={() => onNavigateCourse(winery.id)}>
          <MaskIcon $src={topRightIcon} /> 추천코스
        </DetailActionPrimary>
        <DetailAction type="button" onClick={() => onShare(winery)}>
          <MaskIcon $src={shareIcon} /> 공유
        </DetailAction>
        {winery.phone && (
          <DetailAction type="button" onClick={() => onCopyPhone(winery.phone!)}>
            <MaskIcon $src={callIcon} /> 연락처
          </DetailAction>
        )}
        <DetailAction type="button" onClick={() => onDirections(winery)}>
          <MaskIcon $src={outwardIcon} /> 길찾기
        </DetailAction>
        {winery.homepageUrl && (
          <DetailAction
            type="button"
            onClick={() => window.open(winery.homepageUrl, "_blank", "noopener,noreferrer")}
          >
            <MaskIcon $src={webIcon} /> 홈페이지
          </DetailAction>
        )}
      </DetailActionRow>

      {!compact && photoUrls.length > 0 && (
        <DetailPhotoRow>
          {photoUrls.map((url, index) => (
            <DetailPhoto
              key={`${url}-${index}`}
              src={url}
              alt=""
              $single={photoUrls.length === 1}
            />
          ))}
        </DetailPhotoRow>
      )}
    </DetailWrap>
  );
}

// 지도 장소·코스 정거장처럼 데이터가 가벼운 항목의 상세 카드를 공통으로 그립니다.
function SimplePlaceDetail({
  info,
  showClose,
  onClose,
  onCopy,
}: {
  info: SimplePlaceInfo;
  showClose: boolean;
  onClose: () => void;
  onCopy: (text: string, message: string) => void;
}) {
  return (
    <DetailWrap>
      <DetailHeaderRow>
        <DetailName>{info.name}</DetailName>
        {showClose && (
          <DetailCloseButton type="button" aria-label="닫기" onClick={onClose}>
            <img src={closeIcon} alt="" width={24} height={24} />
          </DetailCloseButton>
        )}
      </DetailHeaderRow>

      {info.note && <PlaceNote>{info.note}</PlaceNote>}

      {(info.distanceLabel || info.categoryLabel) && (
        <DetailMetaRow>
          {info.distanceLabel && <DetailMetaPrimary>{info.distanceLabel}</DetailMetaPrimary>}
          {info.distanceLabel && info.categoryLabel && <DetailMetaDot aria-hidden />}
          {info.categoryLabel && <DetailMetaSecondary>{info.categoryLabel}</DetailMetaSecondary>}
        </DetailMetaRow>
      )}

      {info.address && (
        <InlineCopyRow>
          <DetailAddressText>{info.address}</DetailAddressText>
          <InlineCopyButton
            type="button"
            onClick={() => onCopy(info.address!, "주소를 복사했어요!")}
          >
            복사
          </InlineCopyButton>
        </InlineCopyRow>
      )}
      {info.phone && (
        <InlineCopyRow>
          <DetailAddressText>{info.phone}</DetailAddressText>
          <InlineCopyButton
            type="button"
            onClick={() => onCopy(info.phone!, "전화번호를 복사했어요!")}
          >
            복사
          </InlineCopyButton>
        </InlineCopyRow>
      )}

      {info.mapUrl && (
        <DetailActionRow>
          <DetailActionFull
            type="button"
            onClick={() => window.open(info.mapUrl, "_blank", "noopener,noreferrer")}
          >
            카카오맵에서 보기
          </DetailActionFull>
        </DetailActionRow>
      )}
    </DetailWrap>
  );
}

const PageContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: #ffffff;
`;

const ShareButton = styled.button`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: ${colors.gray[900]};
  cursor: pointer;
`;

const MapArea = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  background-color: ${colors.gray[50]};
  overflow: hidden;
`;

const MapEl = styled.div`
  width: 100%;
  height: 100%;
`;

const SearchBarButton = styled.button`
  position: absolute;
  top: 40px;
  left: 16px;
  right: 16px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 9999px;
  background: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  text-align: left;
`;

const MapViewButton = styled.button`
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  z-index: 8;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: none;
  border-radius: 9999px;
  background-color: #2a2a28;
  color: #ffffff;
  font-size: 0.8125rem;
  white-space: nowrap;
  cursor: pointer;
`;

const SearchPlaceholder = styled.span`
  font-size: 0.875rem;
  font-weight: 300;
  letter-spacing: -0.28px;
  color: ${colors.gray[400]};
`;

const StatusOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px;
  background-color: ${colors.gray[50]};
  text-align: center;
  transition: bottom 0.25s ease;
`;

const StatusText = styled.p`
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${colors.gray[600]};
`;

const StatusSubtext = styled.p`
  margin: 0;
  font-size: 0.75rem;
  color: ${colors.gray[400]};
`;

const MapControls = styled.div`
  position: absolute;
  right: 16px;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: bottom 0.25s ease;
`;

const ZoomControl = styled.div`
  display: flex;
  flex-direction: column;
  width: 36px;
  border-radius: 999px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
`;

const ZoomButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: #ffffff;
  font-size: 1.125rem;
  font-weight: 700;
  color: ${colors.gray[900]};
  cursor: pointer;
`;

const ZoomDivider = styled.div`
  height: 1px;
  margin: 0 10px;
  background: ${colors.gray[100]};
`;

const ControlButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  font-size: 1rem;
  font-weight: 700;
  color: ${colors.gray[900]};
  cursor: pointer;
`;

const LocationButton = styled(ControlButton)<{ $active: boolean }>`
  color: ${(props) => (props.$active ? "#3b82f6" : colors.gray[900])};
`;

const LocationGlyph = styled.span<{ $src: string }>`
  display: inline-block;
  width: 20px;
  height: 20px;
  background-color: currentColor;
  -webkit-mask-image: url("${(props) => props.$src}");
  mask-image: url("${(props) => props.$src}");
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
`;

const ConsentSheet = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 8;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 8px 16px 18px;
  border-radius: 16px 16px 0 0;
  background: #ffffff;
  box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
`;

const SheetHandle = styled.span`
  display: block;
  align-self: center;
  width: 36px;
  height: 4px;
  margin: 6px 0 14px;
  border-radius: 9999px;
  background-color: ${colors.gray[200]};
`;

const ConsentTitle = styled.p`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: -0.36px;
  text-align: left;
  color: ${colors.gray[900]};
`;

const ConsentDesc = styled.p`
  margin: 12px 0 0;
  font-size: 0.8125rem;
  color: ${colors.gray[400]};
  text-align: left;
`;

const ConsentError = styled.p`
  margin: 8px 0 0;
  font-size: 0.75rem;
  color: ${colors.danger};
  text-align: left;
`;

const ConsentAgreeButton = styled.button`
  width: 100%;
  height: 48px;
  margin-top: 32px;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  background-color: ${colors.primary[500]};
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.32px;
  cursor: pointer;

  &:disabled {
    background-color: ${colors.gray[200]};
    cursor: not-allowed;
  }
`;

const ConsentSkipButton = styled.button`
  align-self: center;
  width: 100%;
  border: none;
  background: transparent;
  padding: 14px;
  font-size: 0.875rem;
  font-weight: 300;
  letter-spacing: -0.28px;
  color: ${colors.gray[500]};
  cursor: pointer;
`;

const Sheet = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 7;
  display: flex;
  flex-direction: column;
  border-radius: 16px 16px 0 0;
  background: #ffffff;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

// 양조장 이외의 장소·코스 정거장은 드래그 가능한 바텀시트 대신, 내용 크기에 맞는
// 이 카드로 지도 위에 떠서 보여줍니다(뒤의 목록/시트는 그대로 유지됩니다).
const FloatingCard = styled.div`
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 32px;
  z-index: 9;
  max-height: 60%;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
`;

const SheetHandleArea = styled.div`
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding: 8px 0 6px;
  touch-action: none;
  cursor: grab;
`;

const SheetScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 16px 20px;
  box-sizing: border-box;
`;

const ChipRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 4px 0 14px;
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const CategoryChip = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 9999px;
  border: 1px solid ${(props) => (props.$active ? colors.primary[500] : colors.gray[200])};
  background: ${(props) => (props.$active ? colors.primary[500] : "#ffffff")};
  color: ${(props) => (props.$active ? "#ffffff" : colors.gray[500])};
  font-size: 0.8125rem;
  font-weight: ${(props) => (props.$active ? 700 : 400)};
  white-space: nowrap;
  cursor: pointer;
`;

const ChipIcon = styled.span<{ $src: string; $color: string }>`
  display: inline-block;
  width: 16px;
  height: 16px;
  background-color: ${(props) => props.$color};
  -webkit-mask-image: url("${(props) => props.$src}");
  mask-image: url("${(props) => props.$src}");
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
`;

const EmptyCategoryNotice = styled.p`
  margin: 32px 0;
  text-align: center;
  font-size: 0.875rem;
  color: ${colors.gray[400]};
`;

const LoaderCenter = styled.div<{ $height: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: ${(props) => props.$height}px;
`;

const RecommendedSection = styled.div`
  padding: 15px 0 45px;
`;

const RecommendedTitle = styled.h2`
  margin: 0 0 20px;
  font-size: 1.125rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const SkeletonTitle = styled(Skeleton)`
  margin: 0 0 12px;
`;

const SkeletonCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SkeletonCardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SkeletonAwardCard = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const RecommendedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30px 16px;

  img {
    height: 200px;
  }
`;

const AwardSection = styled(RecommendedSection)`
  background-color: ${colors.info.bg};
  margin: 0 -16px;
  padding: 20px 16px;
`;

const AwardRow = styled.div`
  display: flex;
  gap: 12px;
  overflow-x: auto;
  margin: 0 -16px;
  padding: 0 16px 4px;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const AwardCard = styled.button`
  flex-shrink: 0;
  width: 150px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  text-align: left;
`;

const AwardThumb = styled.img`
  width: 150px;
  height: 200px;
  border-radius: 8px;
  object-fit: cover;
  background-color: ${colors.gray[100]};
  margin-bottom: 8px;
`;

const AwardBadgeLine = styled.p`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${colors.primary[700]};
`;

const AwardName = styled.p`
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const AwardMetaPrimary = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  color: ${colors.gray[500]};
`;

const AwardMetaSecondary = styled.p`
  margin: 0;
  font-size: 0.75rem;
  color: ${colors.info.text};
`;

const MenuChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const MenuChip = styled.button<{ $active: boolean }>`
  border: none;
  border-radius: 9999px;
  padding: 8px 12px;
  background-color: ${(props) => (props.$active ? colors.primary[500] : "#fff5e6")};
  color: ${(props) => (props.$active ? "#ffffff" : colors.primary[500])};
  font-size: 0.8125rem;
  font-weight: 400;
  cursor: pointer;
`;

const PlaceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const PlaceRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  border: none;
  border-top: 1px solid ${colors.gray[100]};
  background: transparent;
  cursor: pointer;
  text-align: left;

  &:first-child {
    border-top: none;
  }
`;

const PlaceThumb = styled.img`
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
  background-color: ${colors.gray[50]};
`;

const PlaceBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const PlaceName = styled.p`
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${colors.gray[900]};
`;

const PlaceMeta = styled.p`
  display: flex;
  align-items: center;
  margin: 4px 0 0;
  font-size: 0.6875rem;
  color: ${colors.gray[500]};
`;

const PlaceMetaPart = styled.span<{ $tone?: "primary" | "secondary" }>`
  display: flex;
  align-items: center;
  color: ${(props) =>
    props.$tone === "primary"
      ? colors.gray[600]
      : props.$tone === "secondary"
        ? colors.gray[400]
        : "inherit"};
`;

const PlaceMetaDot = styled.span`
  display: inline-block;
  width: 2px;
  height: 2px;
  margin: 0 6px;
  border-radius: 50%;
  background-color: ${colors.gray[500]};
`;

const DetailWrap = styled.div``;

const DetailHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const DetailName = styled.h2`
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.32;
  letter-spacing: -0.4px;
  color: ${colors.gray[900]};
`;

const DetailCloseButton = styled.button`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
`;

const DetailMetaLine = styled.p`
  margin: 8px 0 0;
  font-size: 0.75rem;
  color: ${colors.gray[500]};
`;

const DetailMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
`;

const DetailMetaPrimary = styled.span`
  font-size: 0.75rem;
  line-height: 1.4;
  color: ${colors.gray[900]};
`;

const DetailMetaSecondary = styled.span`
  font-size: 0.75rem;
  line-height: 1.4;
  color: ${colors.gray[500]};
`;

const DetailMetaDot = styled.span`
  display: inline-block;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background-color: ${colors.gray[500]};
`;

const DetailVisitLine = styled.p`
  margin: 6px 0 0;
  font-size: 0.8125rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const DetailAddressText = styled.p`
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 0.75rem;
  color: ${colors.gray[600]};
`;

const InlineCopyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`;

const InlineCopyButton = styled.button`
  flex-shrink: 0;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  text-decoration: underline;
  color: ${colors.gray[600]};
  cursor: pointer;
`;

const PlaceNote = styled.p`
  margin: 6px 0 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${colors.primary[500]};
`;

const PlaceBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
`;

const DetailActionRow = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  margin-top: 14px;
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const DetailAction = styled.button`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid ${colors.border};
  border-radius: 9999px;
  background: transparent;
  font-size: 0.8125rem;
  font-weight: 400;
  color: ${colors.gray[900]};
  cursor: pointer;
  white-space: nowrap;
`;

const DetailActionPrimary = styled(DetailAction)`
  border-color: transparent;
  background-color: ${colors.primary[500]};
  color: #ffffff;
  font-weight: 600;
`;

const DetailActionFull = styled(DetailAction)`
  flex: 1;
  justify-content: center;
  height: 40px;
  border-color: transparent;
  border-radius: 9999px;
  background-color: ${colors.gray[700]};
  color: #ffffff;
  padding: 10px 16px;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: -0.28px;
`;

const MaskIcon = styled.span<{ $src: string }>`
  display: inline-block;
  width: 12px;
  height: 12px;
  background-color: currentColor;
  -webkit-mask-image: url("${(props) => props.$src}");
  mask-image: url("${(props) => props.$src}");
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
`;

const DetailPhotoRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const DetailPhoto = styled.img<{ $single: boolean }>`
  flex-shrink: 0;
  width: ${(props) => (props.$single ? "100%" : "150px")};
  height: ${(props) => (props.$single ? "200px" : "180px")};
  border-radius: 8px;
  object-fit: cover;
  background-color: ${colors.gray[50]};
`;

const DetailNotFound = styled.p`
  margin: 32px 0;
  text-align: center;
  color: ${colors.gray[400]};
`;

const NotFoundArea = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const NotFoundText = styled.p`
  margin: 0;
  color: ${colors.gray[400]};
`;
