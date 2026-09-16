import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styled from "styled-components";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { colors } from "../../shared/styles/colors";
import { AppBar } from "../../shared/components/AppBar";
import { Snackbar } from "../../shared/components/Snackbar";
import { DotsLoader } from "../../shared/components/DotsLoader";
import { Badge } from "../../shared/components/Badge";
import { PhotoCard } from "../../shared/components/PhotoCard";
import { WINERIES, getRepresentativeTypeLabel, getWineryVisitLabel } from "../../shared/lib/mockWineries";
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
import { loadKakaoMaps } from "../../shared/api/kakaoMaps";
import type {
  KakaoMapsNamespace,
  KakaoMapInstance,
  KakaoCustomOverlayInstance,
} from "../../shared/api/kakaoMaps";
import callIcon from "../../assets/icon/Call.svg";
import webIcon from "../../assets/icon/Web.svg";
import topRightIcon from "../../assets/icon/TopRight.svg";
import liquorIcon from "../../assets/icon/Liquor.svg";
import bedIcon from "../../assets/icon/Bed.svg";
import cafeIcon from "../../assets/icon/Cafe.svg";
import flagIcon from "../../assets/icon/Flag.svg";
import restaurantIcon from "../../assets/icon/Restaurant.svg";
import awardIcon from "../../assets/icon/Award.svg";
import noneImage from "../../assets/img/NoneImage.png";

type CategoryKey = "brewery" | "restaurants" | "attractions" | "cafes" | "lodging";
type LoadState = "loading" | "ready" | "error";
type SheetMode = "list" | "detail";
type DetailKind = "winery" | "place" | "stop";
type PlacesLoadState = "idle" | "loading" | "ready" | "error" | "zoomed_out";

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
// 식당·카페·숙소·관광지는 전국에 워낙 많아서, 넓게 축소한 상태로 조회하면 특정 지역(수도권 등)
// 결과가 한쪽에 몰려 찍히면서 마치 그 지역 것만 보여주는 것처럼 보입니다. 양조장은 수가 적어
// 전국을 봐도 문제없어서 그대로 두고, 나머지 카테고리만 일정 축척 이상에서는 조회를 건너뜁니다.
const PLACE_DENSITY_ZOOM_LIMIT = 12;
// 양조장을 선택했을 때 바텀시트의 기본 높이입니다. 사용자가 핸들로 직접 늘리거나 줄일 수 있습니다.
const DETAIL_SHEET_HEIGHT = 320;

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
    note: stop.pairingComment || stop.recommendationReason || undefined,
  };
}

// 바텀시트는 리스트·상세 모드 구분 없이 딱 세 가지 높이만 가집니다:
// collapsed(핸들+카테고리 칩 줄까지만), mid(320px), full(검색바까지 가리는 최대 높이).
function getSnapPoints(areaHeight: number) {
  const safeHeight = areaHeight || 600;
  const full = Math.max(260, safeHeight - 72);
  return {
    collapsed: Math.min(96, full),
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
}): HTMLDivElement {
  const { emoji, iconSrc, color, label, selected, dimmed } = options;
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

  const text = document.createElement("span");
  text.textContent = label;
  text.style.cssText = `
    font-size:${selected ? 12 : 11}px;font-weight:${selected ? "700" : "400"};color:#171716;
    white-space:nowrap;
    -webkit-text-stroke:3px #ffffff;
    paint-order:stroke fill;
  `;

  wrap.appendChild(circle);
  wrap.appendChild(text);
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
  } | null;
  const navStateWinery =
    navState?.winery && navState.winery.id === focusId ? navState.winery : undefined;

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
  const activeCategoryRef = useRef<CategoryKey>("brewery");
  const userPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const refetchPlacesRef = useRef<(category: CategoryKey) => void>(() => {});
  const placesAbortRef = useRef<AbortController | null>(null);

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [areaHeight, setAreaHeight] = useState(0);

  const [activeCategory, setActiveCategory] = useState<CategoryKey>("brewery");
  const [sheetMode, setSheetMode] = useState<SheetMode>(isCourseMode ? "detail" : "list");
  const [detailKind, setDetailKind] = useState<DetailKind>("winery");
  const [selectedId, setSelectedId] = useState<string | null>(focusId);
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
  const [courseStops, setCourseStops] = useState<RecommendedCourseStop[]>([]);
  const [recommendedBreweries, setRecommendedBreweries] = useState<MapRecommendedBrewery[]>([]);
  const [awardedLiquors, setAwardedLiquors] = useState<MapAwardedLiquor[]>([]);
  const [mapMenus, setMapMenus] = useState<MapMenu[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);

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

  // 지도에 양조장이 하나도 안 보일 때 목록 대신 보여줄 기본 콘텐츠(추천 양조장·수상 전통주·추천 메뉴)입니다.
  useEffect(() => {
    const controller = new AbortController();
    fetchMapRecommendedBreweries(0, 4, controller.signal)
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
      refetchPlaces(activeCategory);
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

  function refetchPlaces(category: CategoryKey) {
    const mapCategory = MAP_PLACE_CATEGORY[category];
    const kakao = kakaoRef.current;
    const map = mapInstanceRef.current;
    if (!mapCategory || !kakao || !map) return;

    // 지도를 계속 움직이면 'idle'마다 새 요청이 쌓일 수 있어, 이전 요청은 항상 끊고 최신 것만 남깁니다.
    placesAbortRef.current?.abort();

    if (category !== "brewery" && map.getLevel() >= PLACE_DENSITY_ZOOM_LIMIT) {
      setPlaces([]);
      setPlacesLoadState("zoomed_out");
      return;
    }

    const controller = new AbortController();
    placesAbortRef.current = controller;

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const position = userPositionRef.current;

    setPlacesLoadState("loading");
    fetchMapPlaces(
      { south: sw.getLat(), west: sw.getLng(), north: ne.getLat(), east: ne.getLng() },
      mapCategory,
      position ?? undefined,
      0,
      100,
      controller.signal
    )
      .then((page) => {
        setPlaces(page.content);
        setPlacesLoadState("ready");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("장소 조회 실패", error);
        setPlacesLoadState("error");
      });
  }
  refetchPlacesRef.current = refetchPlaces;

  // 지도 인스턴스는 최초 1회만 생성합니다.
  useEffect(() => {
    let cancelled = false;
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !mapElRef.current) return;
        kakaoRef.current = kakao;
        const initialFocusWinery = mockFocusWinery ?? navStateWinery;
        const initialCenter =
          isCourseMode && initialFocusWinery?.lat && initialFocusWinery?.lng
            ? { lat: initialFocusWinery.lat, lng: initialFocusWinery.lng }
            : DEFAULT_CLUSTER_CENTER;
        const map = new kakao.Map(mapElRef.current, {
          center: new kakao.LatLng(initialCenter.lat, initialCenter.lng),
          level: isCourseMode ? FOCUS_LEVEL : DEFAULT_LEVEL,
        });
        mapInstanceRef.current = map;
        kakao.event.addListener(map, "idle", () => {
          if (!isCourseMode) refetchPlacesRef.current(activeCategoryRef.current);
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

  // 양조장 정보·코스 정거장이 (비동기로) 준비되면, 양조장과 코스 장소가 모두 한 화면에
  // 들어오도록 지도 범위를 다시 맞춰줍니다. 정거장이 아직 없으면 양조장 중심으로만 맞춥니다.
  useEffect(() => {
    if (!isCourseMode || loadState !== "ready" || !focusWinery?.lat || !focusWinery?.lng) return;
    const kakao = kakaoRef.current;
    const map = mapInstanceRef.current;
    if (!kakao || !map) return;

    const validStops = courseStops.filter(
      (stop) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude)
    );

    if (validStops.length === 0) {
      map.setCenter(new kakao.LatLng(focusWinery.lat, focusWinery.lng));
      map.setLevel(FOCUS_LEVEL);
      return;
    }

    const bounds = new kakao.LatLngBounds();
    bounds.extend(new kakao.LatLng(focusWinery.lat, focusWinery.lng));
    validStops.forEach((stop) => bounds.extend(new kakao.LatLng(stop.latitude, stop.longitude)));
    // 하단 시트가 지도 아래쪽 절반 가까이 덮으므로, 핀이 시트 뒤에 가려지지 않게 아래쪽 여백을 넉넉히 둡니다.
    map.setBounds(bounds, 80, 40, 260, 40);
  }, [isCourseMode, loadState, focusWinery, courseStops]);

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
    setSheetHeight(isCourseMode ? points.mid : points.collapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaHeight]);

  // 위치 동의 상태를 최초 진입 시 한 번 확인합니다(코스 모드에서는 생략).
  useEffect(() => {
    if (isCourseMode) return;
    let cancelled = false;
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
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 카테고리를 바꾸면 그 카테고리의 실제 장소를(양조장 포함) 새로 조회합니다.
  useEffect(() => {
    if (loadState !== "ready" || isCourseMode) return;
    refetchPlaces(activeCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, loadState, isCourseMode]);

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

    places.forEach((place) => {
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
  }, [loadState, places, activeCategory, isCourseMode, detailKind, selectedPlace, selectedId]);

  // 코스 모드에서 실제 추천 코스 정거장(식당·관광지·카페·숙소) 마커를 그립니다.
  useEffect(() => {
    const kakao = kakaoRef.current;
    const map = mapInstanceRef.current;
    if (!kakao || !map || loadState !== "ready" || !isCourseMode) return;

    stopOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    stopOverlaysRef.current = [];

    courseStops.forEach((stop) => {
      const category = STOP_TYPE_TO_CATEGORY[stop.type];
      if (!category) return;
      const isSelected = detailKind === "stop" && selectedStop?.contentId === stop.contentId;
      const el = createPinElement({
        emoji: CATEGORY_META[category].icon,
        iconSrc: CATEGORY_PIN_ICON[category],
        color: CATEGORY_META[category].color,
        label: stop.name,
        selected: isSelected,
        dimmed: false,
      });
      el.addEventListener("click", () => handleSelectStop(stop));
      const overlay = new kakao.CustomOverlay({
        map,
        position: new kakao.LatLng(stop.latitude, stop.longitude),
        content: el,
        yAnchor: 1,
        clickable: true,
      });
      stopOverlaysRef.current.push(overlay);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadState, isCourseMode, courseStops, detailKind, selectedStop]);

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
      const kakao = kakaoRef.current;
      const map = mapInstanceRef.current;
      if (kakao && map && focusWinery?.lat && focusWinery?.lng) {
        map.setCenter(new kakao.LatLng(focusWinery.lat, focusWinery.lng));
        map.setLevel(FOCUS_LEVEL);
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

  // 바텀시트가 지도 아래쪽을 덮는 만큼, 핀이 "시트를 제외한 나머지 지도 영역"의 가운데 오도록
  // 시트 높이의 절반만큼 지도를 아래로 더 이동시켜(panBy) 핀이 화면상 더 위쪽에 보이게 합니다.
  function focusMapOn(lat: number, lng: number, coveredBottom = 0) {
    const kakao = kakaoRef.current;
    const map = mapInstanceRef.current;
    if (kakao && map) {
      map.setCenter(new kakao.LatLng(lat, lng));
      map.setLevel(FOCUS_LEVEL);
      if (coveredBottom > 0) map.panBy(0, coveredBottom / 2);
    }
  }

  function handleSelectWinery(id: string) {
    setSelectedId(id);
    setDetailKind("winery");
    setSheetMode("detail");
    setSheetHeight(getSnapPoints(areaHeight).mid);
    const winery = WINERIES.find((item) => item.id === id);
    if (winery?.lat && winery?.lng) focusMapOn(winery.lat, winery.lng, DETAIL_SHEET_HEIGHT);
  }

  // 양조장 핀·목록만 지도 포커스를 옮깁니다. 그 외 장소(식당·카페 등)는 이미 화면에 보이는
  // 상태에서 누른 것이므로 별도 카드(FloatingCard)만 띄우고 지도는 그대로 둡니다.
  function handleSelectPlace(place: MapPlace) {
    if (place.category === "BREWERY") {
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
  }

  function handleSelectStop(stop: RecommendedCourseStop) {
    setSelectedStop(stop);
    setDetailKind("stop");
  }

  const handleCloseDetail = () => {
    setSelectedId(null);
    setDetailKind("winery");
    setSheetMode("list");
    setSheetHeight(getSnapPoints(areaHeight).collapsed);
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
    const delta = dragRef.current.startY - e.clientY;
    const next = Math.min(
      points.full,
      Math.max(points.collapsed - 40, dragRef.current.startHeight + delta)
    );
    setSheetHeight(next);
  };

  const handleDragEnd = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsDragging(false);
    const points = getSnapPoints(areaHeight);
    const candidates = [points.collapsed, points.mid, points.full];
    setSheetHeight((current) =>
      candidates.reduce((a, b) => (Math.abs(b - current) < Math.abs(a - current) ? b : a))
    );
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

  // 양조장 정보를 아직 못 찾은 게 "로딩 중"이 아니라 "완전히 실패"했을 때만 지도를 아예 안 그립니다.
  // 로딩 중에는 아래 메인 렌더가 그대로 진행되어야 <MapEl>이 마운트되고 카카오맵이 초기화됩니다
  // (여기서 일찍 return하면 <MapEl>이 없는 채로 지도 초기화 effect가 한 번만 실행되고 끝나버려,
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

  const consentActive = !isCourseMode && showLocationConsent;
  const floatingInfo =
    detailKind === "place" && selectedPlace
      ? placeToInfo(selectedPlace)
      : detailKind === "stop" && selectedStop
        ? stopToInfo(selectedStop)
        : null;
  // 장소 카드(FloatingCard)가 떠 있을 때는 바텀시트 자체가 사라지므로 피해야 할 높이가 없습니다.
  const activeSheetHeight = consentActive ? 190 : floatingInfo ? 0 : sheetHeight;
  const isSheetFullyExpanded =
    !consentActive && !floatingInfo && sheetHeight >= getSnapPoints(areaHeight).full - 2;

  return (
    <PageContainer>
      {isCourseMode ? (
        <AppBar
          onBack={() => navigate(-1)}
          title={focusWinery ? `${focusWinery.name} 코스` : "코스"}
          trailing={
            focusWinery && (
              <ShareButton
                type="button"
                aria-label="공유하기"
                onClick={() => handleShareWinery(focusWinery)}
              >
                <ShareIcon viewBox="0 0 24 24" aria-hidden>
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81a3 3 0 1 0-3-3c0 .24.04.47.09.7L8.04 9.81A2.99 2.99 0 0 0 3 12a3 3 0 0 0 5.04 2.19l7.12 4.15c-.05.21-.08.43-.08.66a2.92 2.92 0 1 0 2.92-2.92z" />
                </ShareIcon>
              </ShareButton>
            )
          }
        />
      ) : null}

      <MapArea ref={areaRef}>
        <MapEl ref={mapElRef} />

        {!isCourseMode && !isSheetFullyExpanded && (
          <SearchBarButton type="button" onClick={() => navigate("/search")}>
            <SearchGlyph viewBox="0 0 24 24" aria-hidden>
              <circle cx="11" cy="11" r="6" />
              <line x1="20" y1="20" x2="15.5" y2="15.5" />
            </SearchGlyph>
            <SearchPlaceholder>양조장·전통주 검색</SearchPlaceholder>
          </SearchBarButton>
        )}

        {loadState === "loading" && (
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

        {loadState === "ready" && (
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
              <LocationGlyph viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </LocationGlyph>
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
                      const active = activeCategory === key;
                      return (
                        <CategoryChip
                          key={key}
                          type="button"
                          $active={active}
                          onClick={() => {
                            const wasMenuMode = selectedMenu != null;
                            setSelectedMenu(null);
                            setActiveCategory(key);
                            if (wasMenuMode) refetchPlaces(key);
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

                  {placesLoadState === "loading" && <DotsLoader />}
                  {placesLoadState === "zoomed_out" && (
                    <EmptyCategoryNotice>
                      지도를 조금 더 확대하면 {CATEGORY_META[activeCategory].label} 정보가 보여요.
                    </EmptyCategoryNotice>
                  )}
                  {placesLoadState === "error" && (
                    <EmptyCategoryNotice>
                      목록을 불러오지 못했어요. 지도를 조금 움직여보세요.
                    </EmptyCategoryNotice>
                  )}
                  {placesLoadState === "ready" &&
                    places.length === 0 &&
                    (activeCategory === "brewery" ? (
                      recommendedBreweries.length > 0 ? (
                        <>
                          <RecommendedSection>
                            <RecommendedTitle>전통주로에서 추천하는 양조장</RecommendedTitle>
                            <RecommendedGrid>
                              {recommendedBreweries.map((item) => {
                                const region = item.address.split(" ").slice(0, 2).join(" ");
                                return (
                                  <PhotoCard
                                    key={item.breweryId}
                                    fluid
                                    name={item.businessName}
                                    region={
                                      item.liquorTypes.length > 0
                                        ? `${formatLiquorTypes(item.liquorTypes)} · ${region}`
                                        : region
                                    }
                                    photoUrl={item.mainImage?.url}
                                    onClick={() => navigate(`/winery/${item.breweryId}`)}
                                  />
                                );
                              })}
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
                                      src={item.image?.url ?? noneImage}
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
                        </>
                      ) : (
                        // 양조장은 "정보가 없어요" 문구 대신, 추천 콘텐츠가 도착할 때까지 로딩 표시로 대신합니다.
                        <DotsLoader />
                      )
                    ) : (
                      <EmptyCategoryNotice>
                        이 지역에는 {CATEGORY_META[activeCategory].label} 정보가 없어요.
                      </EmptyCategoryNotice>
                    ))}
                  {placesLoadState === "ready" && places.length > 0 && (
                    <PlaceList>
                      {places.map((place) => {
                        const subtitleParts = [
                          place.categoryName || undefined,
                          place.distance != null
                            ? `${place.distance.toFixed(1)}km`
                            : place.roadAddressName || undefined,
                        ].filter((part): part is string => Boolean(part));
                        const thumbSrc =
                          place.imageUrl ?? (place.category === "BREWERY" ? noneImage : null);
                        const badges =
                          place.category === "BREWERY" ? breweryBadges[place.placeId] : undefined;
                        return (
                          <PlaceRow
                            key={place.placeId}
                            type="button"
                            onClick={() => handleSelectPlace(place)}
                          >
                            {thumbSrc ? (
                              <PlaceThumb src={thumbSrc} alt="" />
                            ) : (
                              <PlaceThumbFallback aria-hidden>
                                {CATEGORY_META[activeCategory].icon}
                              </PlaceThumbFallback>
                            )}
                            <PlaceBody>
                              <PlaceName>{place.placeName}</PlaceName>
                              <PlaceMeta>
                                {subtitleParts.map((part, index) => (
                                  <PlaceMetaPart key={part}>
                                    {index > 0 && <PlaceMetaDot aria-hidden />}
                                    {part}
                                  </PlaceMetaPart>
                                ))}
                              </PlaceMeta>
                              {badges && badges.length > 0 && (
                                <PlaceBadgeRow>
                                  {badges.map((badge) => (
                                    <Badge key={badge} label={badge} tone="gray" />
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
                    onClose={handleCloseDetail}
                    onShare={handleShareWinery}
                    onDirections={handleDirections}
                    onCopyPhone={(phone) => copyToClipboard(phone, "전화번호를 복사했어요!")}
                    onNavigateCourse={(courseId) => navigate(`/course/${courseId}`)}
                  />
                ) : wineryDetailLoading ? (
                  <DotsLoader />
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
      </MapArea>

      <Snackbar message={toast} />
    </PageContainer>
  );
}

function DetailContent({
  winery,
  showClose,
  onClose,
  onShare,
  onDirections,
  onCopyPhone,
  onNavigateCourse,
}: {
  winery: Winery;
  showClose: boolean;
  onClose: () => void;
  onShare: (winery: Winery) => void;
  onDirections: (winery: Winery) => void;
  onCopyPhone: (phone: string) => void;
  onNavigateCourse: (courseId: string) => void;
}) {
  const representativeType = getRepresentativeTypeLabel(winery);
  const visitLabel = getWineryVisitLabel(winery);
  const experienceCount = winery.experiences?.length ?? 0;
  const photoUrls = winery.photoUrls && winery.photoUrls.length > 0 ? winery.photoUrls : [noneImage];

  return (
    <DetailWrap>
      <DetailHeaderRow>
        <DetailName>{winery.name}</DetailName>
        {showClose && (
          <DetailCloseButton type="button" aria-label="닫기" onClick={onClose}>
            ×
          </DetailCloseButton>
        )}
      </DetailHeaderRow>

      <DetailMetaLine>
        {representativeType}
        {experienceCount > 0 ? ` · 체험 프로그램 ${experienceCount}개` : ""}
      </DetailMetaLine>
      {visitLabel && <DetailVisitLine>{visitLabel}</DetailVisitLine>}
      <DetailAddressText>{winery.address ?? winery.detailRegion}</DetailAddressText>

      <DetailActionRow>
        <DetailActionPrimary type="button" onClick={() => onNavigateCourse(winery.id)}>
          <MaskIcon $src={topRightIcon} /> 추천코스
        </DetailActionPrimary>
        <DetailAction type="button" onClick={() => onShare(winery)}>
          공유
        </DetailAction>
        {winery.phone && (
          <DetailAction type="button" onClick={() => onCopyPhone(winery.phone!)}>
            <MaskIcon $src={callIcon} /> 연락처
          </DetailAction>
        )}
        {winery.homepageUrl && (
          <DetailAction
            type="button"
            onClick={() => window.open(winery.homepageUrl, "_blank", "noopener,noreferrer")}
          >
            <MaskIcon $src={webIcon} /> 홈페이지
          </DetailAction>
        )}
        <DetailAction type="button" onClick={() => onDirections(winery)}>
          <MaskIcon $src={topRightIcon} /> 길찾기
        </DetailAction>
      </DetailActionRow>

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
            ×
          </DetailCloseButton>
        )}
      </DetailHeaderRow>

      {info.note && <PlaceNote>{info.note}</PlaceNote>}

      <DetailMetaLine>
        {info.categoryLabel}
        {info.distanceLabel ? ` · ${info.distanceLabel}` : ""}
      </DetailMetaLine>

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

const ShareIcon = styled.svg`
  width: 18px;
  height: 18px;
  fill: currentColor;
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
  top: 12px;
  left: 16px;
  right: 16px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  border-radius: 9999px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  text-align: left;
`;

const SearchGlyph = styled.svg`
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  fill: none;
  stroke: ${colors.gray[400]};
  stroke-width: 2;
  stroke-linecap: round;
`;

const SearchPlaceholder = styled.span`
  font-size: 0.8125rem;
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

const LocationGlyph = styled.svg`
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
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
  padding: 8px 20px 24px;
  border-radius: 20px 20px 0 0;
  background: #ffffff;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.1);
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
  font-size: 1.0625rem;
  font-weight: 700;
  line-height: 1.4;
  text-align: left;
  color: ${colors.gray[900]};
`;

const ConsentDesc = styled.p`
  margin: 8px 0 0;
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
  margin-top: 20px;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background-color: ${colors.primary[500]};
  color: #ffffff;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    background-color: ${colors.gray[200]};
    cursor: not-allowed;
  }
`;

const ConsentSkipButton = styled.button`
  align-self: center;
  margin-top: 10px;
  border: none;
  background: transparent;
  padding: 4px;
  font-size: 0.8125rem;
  color: ${colors.gray[400]};
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
  border-radius: 20px 20px 0 0;
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
  bottom: 16px;
  z-index: 9;
  max-height: 60%;
  overflow-y: auto;
  padding: 20px 16px;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
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
  padding: 0 16px 20px;
  box-sizing: border-box;
`;

const ChipRow = styled.div`
  display: flex;
  gap: 8px;
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
  width: 14px;
  height: 14px;
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

const RecommendedSection = styled.div`
  padding: 12px 0 24px;
`;

const RecommendedTitle = styled.h2`
  margin: 0 0 12px;
  font-size: 1.125rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const RecommendedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

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
  gap: 16px;
  padding: 15px 0;
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

const PlaceThumbFallback = styled.span`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  background-color: ${colors.gray[50]};
  font-size: 1.5rem;
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

const PlaceMetaPart = styled.span`
  display: flex;
  align-items: center;
`;

const PlaceMetaDot = styled.span`
  display: inline-block;
  width: 2px;
  height: 2px;
  margin: 0 6px;
  border-radius: 50%;
  background-color: ${colors.gray[500]};
`;

const DetailWrap = styled.div`
  padding-top: 4px;
`;

const DetailHeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
`;

const DetailName = styled.h2`
  flex: 1;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
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
  font-size: 1.25rem;
  line-height: 1;
  color: ${colors.gray[400]};
  cursor: pointer;
`;

const DetailMetaLine = styled.p`
  margin: 6px 0 0;
  font-size: 0.75rem;
  color: ${colors.gray[500]};
`;

const DetailVisitLine = styled.p`
  margin: 4px 0 0;
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
  padding: 4px 10px;
  border: 1px solid ${colors.gray[200]};
  border-radius: 9999px;
  background: #ffffff;
  font-size: 0.75rem;
  font-weight: 600;
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
  background: #ffffff;
  font-size: 0.8125rem;
  font-weight: 400;
  color: ${colors.gray[700]};
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
  border-color: transparent;
  border-radius: 12px;
  background-color: ${colors.gray[900]};
  color: #ffffff;
  padding: 12px;
  font-size: 0.8125rem;
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
  margin-top: 14px;
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const DetailPhoto = styled.img<{ $single: boolean }>`
  flex-shrink: 0;
  width: ${(props) => (props.$single ? "100%" : "150px")};
  height: ${(props) => (props.$single ? "200px" : "180px")};
  border-radius: 10px;
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
