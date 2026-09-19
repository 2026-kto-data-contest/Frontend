import { Fragment, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { colors } from "../../shared/styles/colors";
import { AppBar } from "../../shared/components/AppBar";
import { DotsLoader } from "../../shared/components/DotsLoader";
import { WINERIES } from "../../shared/lib/mockWineries";
import type { Winery } from "../../shared/lib/mockWineries";
import { useSmartBack } from "../../shared/lib/pageState";
import { ApiError } from "../../shared/api/api";
import { fetchBreweryDetail, fetchRecommendedCourse } from "../../shared/api/breweriesApi";
import type {
  RecommendedCourseDetail,
  RecommendedCourseStop,
  CourseStopType,
} from "../../shared/api/breweriesApi";
import { loadKakaoMaps } from "../../shared/api/kakaoMaps";
import type {
  KakaoMapsNamespace,
  KakaoMapInstance,
  KakaoCustomOverlayInstance,
} from "../../shared/api/kakaoMaps";
import { resolveHiddenPinLabels, resolveOverlapOffsets } from "../../shared/lib/mapPinOverlap";
import mapIcon from "../../assets/icon/Map.svg";
import restaurantIcon from "../../assets/icon/Restaurant.svg";
import flagIcon from "../../assets/icon/Flag.svg";
import cafeIcon from "../../assets/icon/Cafe.svg";
import bedIcon from "../../assets/icon/Bed.svg";
import verifiedIcon from "../../assets/icon/Verified.svg";
import uploadIcon from "../../assets/icon/Upload.svg";
import pinBreweryIcon from "../../assets/icon/MapPinBrewery.svg";
import pinOrangeIcon from "../../assets/icon/PinOrange.svg";
import expandArrowsIcon from "../../assets/icon/ExpandArrows.svg";
import chevronRightIcon from "../../assets/icon/CourseChevronRight.svg";
import fallbackRestaurant from "../../assets/icon/CourseFallbackRestaurant.svg";
import fallbackAttraction from "../../assets/icon/CourseFallbackAttraction.svg";
import fallbackCafe from "../../assets/icon/CourseFallbackCafe.svg";
import fallbackLodging from "../../assets/icon/CourseFallbackLodging.svg";

type CategoryKey = "restaurants" | "attractions" | "cafes" | "lodging";
type CourseLoadState = "loading" | "ready" | "not_found" | "error";

const CATEGORY_META: Record<
  CategoryKey,
  { label: string; icon: string; color: string; fallback: string }
> = {
  restaurants: {
    label: "식당",
    icon: restaurantIcon,
    color: "#6E7852",
    fallback: fallbackRestaurant,
  },
  attractions: { label: "관광지", icon: flagIcon, color: "#607478", fallback: fallbackAttraction },
  cafes: { label: "카페 · 디저트", icon: cafeIcon, color: "#B27060", fallback: fallbackCafe },
  lodging: { label: "숙소", icon: bedIcon, color: "#8A8A88", fallback: fallbackLodging },
};

// 관광공사 세부 분류를 화면 카테고리 4종으로 정규화합니다. 문화시설·전통시장·기타는 '가볼 만한 곳'에 포함합니다.
const CATEGORY_BY_STOP_TYPE: Partial<Record<CourseStopType, CategoryKey>> = {
  RESTAURANT: "restaurants",
  TOURIST_ATTRACTION: "attractions",
  CULTURAL_FACILITY: "attractions",
  MARKET: "attractions",
  CAFE: "cafes",
  ACCOMMODATION: "lodging",
  ETC: "attractions",
};

interface CourseWineryInfo {
  id: string;
  name: string;
  address: string;
  detailRegion: string;
  lat?: number;
  lng?: number;
}

// 장소가 양조장 하나뿐일 때(정거장이 아직 없거나 0개) 쓰는 기본 줌 레벨입니다.
const PREVIEW_DEFAULT_LEVEL = 4;
// 핀·이름표가 미리보기 박스 가장자리에 잘리지 않도록 setBounds에 주는 여백(픽셀)입니다.
const PREVIEW_BOUNDS_PADDING = { top: 30, right: 30, bottom: 40, left: 30 };

function createPreviewBreweryPin(iconSrc: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = "display:flex;align-items:center;justify-content:center;";
  const img = document.createElement("img");
  img.src = iconSrc;
  img.alt = "";
  img.width = 32;
  img.height = 32;
  el.appendChild(img);
  return el;
}

function createPreviewStopPin(options: {
  iconSrc: string;
  color: string;
  label: string;
  showLabel: boolean;
}): HTMLDivElement {
  const { iconSrc, color, label, showLabel } = options;
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:4px;";

  const dot = document.createElement("div");
  dot.style.cssText = `
    flex-shrink:0;display:flex;align-items:center;justify-content:center;
    width:18px;height:18px;border-radius:50%;
    border:1px solid #ffffff;background-color:${color};
  `;
  const icon = document.createElement("span");
  icon.style.cssText = `
    display:block;width:9.8px;height:9.8px;background-color:#ffffff;
    -webkit-mask-image:url("${iconSrc}");mask-image:url("${iconSrc}");
    -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;
    -webkit-mask-position:center;mask-position:center;
    -webkit-mask-size:contain;mask-size:contain;
  `;
  dot.appendChild(icon);
  wrap.appendChild(dot);

  if (showLabel) {
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size:11px;line-height:1;color:#171716;white-space:nowrap;
      -webkit-text-stroke:3px #ffffff;paint-order:stroke fill;
    `;
    wrap.appendChild(labelEl);
  }
  return wrap;
}

function formatDistanceKm(distanceMeters: number | null): string | null {
  if (distanceMeters == null) return null;
  return (distanceMeters / 1000).toFixed(1);
}

export default function CourseDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  // 공유 링크로 이 페이지에 곧장 들어왔으면(인앱 이전 화면이 없으면) 뒤로가기를 홈으로 보냅니다.
  const handleBack = useSmartBack();
  // 양조장 상세 화면에서 이미 조회해둔 전체 정보를 넘겨받으면 재조회를 건너뜁니다.
  const navStateWinery = (location.state as { winery?: Winery } | null)?.winery;

  const [winery, setWinery] = useState<CourseWineryInfo | null>(null);
  const [wineryLoading, setWineryLoading] = useState(true);
  const [course, setCourse] = useState<RecommendedCourseDetail | null>(null);
  const [courseState, setCourseState] = useState<CourseLoadState>("loading");

  const mapElRef = useRef<HTMLDivElement>(null);
  const kakaoRef = useRef<KakaoMapsNamespace | null>(null);
  const mapInstanceRef = useRef<KakaoMapInstance | null>(null);
  const pinOverlaysRef = useRef<KakaoCustomOverlayInstance[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    setWineryLoading(true);
    const mock = WINERIES.find((item) => item.id === id);
    if (navStateWinery && navStateWinery.id === id) {
      setWinery({
        id: navStateWinery.id,
        name: navStateWinery.name,
        address: navStateWinery.address ?? navStateWinery.detailRegion,
        detailRegion: navStateWinery.detailRegion,
        lat: navStateWinery.lat,
        lng: navStateWinery.lng,
      });
      setWineryLoading(false);
    } else if (mock) {
      setWinery({
        id: mock.id,
        name: mock.name,
        address: mock.address ?? mock.detailRegion,
        detailRegion: mock.detailRegion,
        lat: mock.lat,
        lng: mock.lng,
      });
      setWineryLoading(false);
    } else {
      fetchBreweryDetail(id, controller.signal)
        .then((detail) => {
          setWinery({
            id: detail.breweryId,
            name: detail.businessName,
            address: detail.address || detail.sido || detail.region || "",
            detailRegion: detail.sido ?? detail.region ?? "",
            lat: detail.latitude ?? undefined,
            lng: detail.longitude ?? undefined,
          });
          setWineryLoading(false);
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          console.error("양조장 정보 조회 실패", error);
          setWinery(null);
          setWineryLoading(false);
        });
    }

    setCourseState("loading");
    setCourse(null);
    fetchRecommendedCourse(id, controller.signal)
      .then((data) => {
        setCourse(data);
        setCourseState("ready");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("추천 코스 조회 실패", error);
        setCourseState(error instanceof ApiError && error.status === 404 ? "not_found" : "error");
      });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navStateWinery]);

  // 미리보기 지도(카카오맵)를 한 번만 만듭니다. 스크롤 중인 페이지 안에 들어가므로
  // 드래그·휠줌은 꺼서 페이지 스크롤과 충돌하지 않게 합니다.
  useEffect(() => {
    if (!winery?.lat || !winery?.lng || !mapElRef.current) return;
    let cancelled = false;
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !mapElRef.current) return;
        kakaoRef.current = kakao;
        const map = new kakao.Map(mapElRef.current, {
          center: new kakao.LatLng(winery.lat!, winery.lng!),
          level: PREVIEW_DEFAULT_LEVEL,
          draggable: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
        });
        map.setDraggable(false);
        map.setZoomable(false);
        mapInstanceRef.current = map;
        setMapReady(true);
        requestAnimationFrame(() => map.relayout());
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("코스 미리보기 지도 로드 실패", error);
        setMapFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winery?.lat, winery?.lng]);

  // 양조장·코스 정거장 핀을 그리고, 전부 화면에 들어오는 한도 안에서 최대한 확대해
  // 이름표가 서로 겹치지 않게 합니다.
  useEffect(() => {
    const kakao = kakaoRef.current;
    const map = mapInstanceRef.current;
    if (!kakao || !map || !mapReady || !winery?.lat || !winery?.lng) return;
    // 아래 forEach 콜백 안에서도 숫자로 좁혀진 타입을 그대로 쓰기 위해 지역 변수로 뽑아둡니다.
    const wineryLat = winery.lat;
    const wineryLng = winery.lng;

    pinOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    pinOverlaysRef.current = [];

    const validStops = (course?.stops ?? []).filter(
      (stop) =>
        CATEGORY_BY_STOP_TYPE[stop.type] &&
        Number.isFinite(stop.latitude) &&
        Number.isFinite(stop.longitude)
    );

    if (validStops.length === 0) {
      map.setCenter(new kakao.LatLng(wineryLat, wineryLng));
      map.setLevel(PREVIEW_DEFAULT_LEVEL);
    } else {
      // 양조장 핀이 항상 미리보기 지도 한가운데 오도록, 각 정거장의 양조장 기준 대칭점도
      // 함께 bounds에 포함시킵니다. 이렇게 하면 bounds가 양조장을 중심으로 좌우대칭이 되어,
      // setBounds가 계산하는 중심이 곧 양조장 좌표가 됩니다(그 다음 setCenter는 안전망).
      const bounds = new kakao.LatLngBounds();
      bounds.extend(new kakao.LatLng(wineryLat, wineryLng));
      validStops.forEach((stop) => {
        const dLat = stop.latitude - wineryLat;
        const dLng = stop.longitude - wineryLng;
        bounds.extend(new kakao.LatLng(stop.latitude, stop.longitude));
        bounds.extend(new kakao.LatLng(wineryLat - dLat, wineryLng - dLng));
      });
      map.setBounds(
        bounds,
        PREVIEW_BOUNDS_PADDING.top,
        PREVIEW_BOUNDS_PADDING.right,
        PREVIEW_BOUNDS_PADDING.bottom,
        PREVIEW_BOUNDS_PADDING.left
      );
      map.setCenter(new kakao.LatLng(wineryLat, wineryLng));
    }

    // 확대를 마친 뒤의 화면 기준으로 겹침을 판정해야 실제로 겹치는 핀만 처리합니다.
    const projection = map.getProjection();
    const stopPins = validStops.map((stop) => ({
      key: stop.contentId,
      lat: stop.latitude,
      lng: stop.longitude,
    }));
    const hiddenLabels = resolveHiddenPinLabels(stopPins, kakao, projection, {
      lat: wineryLat,
      lng: wineryLng,
    });
    // 이름표를 숨기는 것만으로는 아이콘끼리 여전히 겹쳐 보이므로, 겹친 핀들은 원래 위치
    // 주위로 살짝 흩어 그려 아이콘 자체가 서로 가리지 않게 합니다.
    const overlapOffsets = resolveOverlapOffsets(stopPins, kakao, projection);

    // 카카오맵 CustomOverlay는 나중에 그린 것이 위로 쌓이므로, 이름표가 남아 다른 핀을
    // 가릴 수 있는 정거장을 먼저 그리고(뒤에 깔림), 이름표를 숨긴 정거장을 그 위에 그립니다.
    const orderedStops = [...validStops].sort(
      (a, b) => Number(hiddenLabels.has(b.contentId)) - Number(hiddenLabels.has(a.contentId))
    );

    orderedStops.forEach((stop) => {
      const key = CATEGORY_BY_STOP_TYPE[stop.type]!;
      const position = overlapOffsets[stop.contentId] ?? {
        lat: stop.latitude,
        lng: stop.longitude,
      };
      const overlay = new kakao.CustomOverlay({
        map,
        position: new kakao.LatLng(position.lat, position.lng),
        content: createPreviewStopPin({
          iconSrc: CATEGORY_META[key].icon,
          color: CATEGORY_META[key].color,
          label: stop.name,
          showLabel: !hiddenLabels.has(stop.contentId),
        }),
        yAnchor: 1,
      });
      pinOverlaysRef.current.push(overlay);
    });

    // 양조장 핀은 정거장 핀·이름표에 절대 가려지지 않도록 맨 마지막(맨 위)에 그립니다.
    const breweryOverlay = new kakao.CustomOverlay({
      map,
      position: new kakao.LatLng(wineryLat, wineryLng),
      content: createPreviewBreweryPin(pinBreweryIcon),
      yAnchor: 1,
    });
    pinOverlaysRef.current.push(breweryOverlay);
  }, [mapReady, winery?.lat, winery?.lng, course]);

  const stopsByCategory: Record<CategoryKey, RecommendedCourseStop[]> = {
    restaurants: [],
    attractions: [],
    cafes: [],
    lodging: [],
  };
  course?.stops.forEach((stop) => {
    const key = CATEGORY_BY_STOP_TYPE[stop.type];
    if (key) stopsByCategory[key].push(stop);
  });

  const categorySections = (Object.keys(CATEGORY_META) as CategoryKey[])
    .map((key) => ({ key, items: stopsByCategory[key] }))
    .filter((section) => section.items.length > 0);

  const handleShare = async () => {
    if (!winery) return;
    // text를 넘기면 일부 공유 대상(문자 메시지 등)이 제목·본문·링크를 한 줄로 이어붙여
    // 보내버려서, 링크만 깔끔하게 전달되도록 제목과 URL만 넘깁니다.
    const shareData = {
      title: `${winery.name} 코스`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // 사용자가 공유를 취소한 경우는 조용히 무시합니다.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // 클립보드 접근이 막힌 환경에서는 조용히 무시합니다.
    }
  };

  if (wineryLoading) {
    return (
      <PageContainer>
        <AppBar onBack={handleBack} />
        <DotsLoader />
      </PageContainer>
    );
  }

  if (!winery) {
    return (
      <PageContainer>
        <AppBar onBack={handleBack} />
        <NotFound>코스 정보를 찾을 수 없어요</NotFound>
      </PageContainer>
    );
  }

  const hasWineryCoords = winery.lat != null && winery.lng != null;

  return (
    <PageContainer>
      <AppBar
        onBack={handleBack}
        title={course?.title ?? `${winery.name} 코스`}
        align="left"
        trailing={
          <ShareButton type="button" aria-label="공유하기" onClick={handleShare}>
            <img src={uploadIcon} alt="" width={24} height={24} />
          </ShareButton>
        }
      />

      <MapPreview aria-hidden>
        {hasWineryCoords && !mapFailed ? (
          <MapPreviewEl ref={mapElRef} />
        ) : (
          <BreweryPin style={{ left: "50%", top: "50%" }}>
            <img src={pinBreweryIcon} alt="" width={32} height={32} />
          </BreweryPin>
        )}
        <MapExpandButton
          type="button"
          aria-label="지도 탭으로 이동"
          onClick={() =>
            navigate(`/map?focus=${winery.id}`, { state: { courseStops: course?.stops } })
          }
        >
          <img src={expandArrowsIcon} alt="" width={16} height={16} />
        </MapExpandButton>
      </MapPreview>

      <WinerySummary>
        <WineryInfo>
          <img src={pinOrangeIcon} alt="" width={22} height={22} />
          <WinerySummaryText>
            <WineryName>{winery.name}</WineryName>
            <WineryAddress>{winery.address || winery.detailRegion}</WineryAddress>
          </WinerySummaryText>
        </WineryInfo>
        <DetailButton type="button" onClick={() => navigate(`/winery/${winery.id}`)}>
          상세보기
        </DetailButton>
      </WinerySummary>

      {courseState === "loading" && <DotsLoader />}
      {courseState === "not_found" && (
        <NotFound>아직 이 양조장의 추천 코스가 준비되지 않았어요</NotFound>
      )}
      {courseState === "error" && (
        <NotFound>코스 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</NotFound>
      )}

      {courseState === "ready" && (
        <CourseList>
          {categorySections.map((section) => {
            const categoryColor = CATEGORY_META[section.key].color;
            return (
              <Section key={section.key}>
                <SectionTitle>{CATEGORY_META[section.key].label}</SectionTitle>
                <StopList>
                  {section.items.map((item, index) => {
                    const distanceKm = formatDistanceKm(item.distanceMeters);
                    const badge = item.subcategoryName || item.categoryName;
                    // 페어링 코멘트는 Figma대로 식당 섹션의 첫 번째 항목에만 보여줍니다.
                    const note =
                      section.key === "restaurants" && index === 0
                        ? item.pairingComment || item.recommendationReason
                        : undefined;
                    const metaParts = [
                      distanceKm ? `양조장에서 ${distanceKm}km` : "거리 정보 없음",
                      badge || undefined,
                    ].filter((part): part is string => Boolean(part));
                    return (
                      <Fragment key={item.contentId}>
                        {index > 0 && <StopDivider />}
                        <StopRow>
                        {item.imageUrl ? (
                          <StopThumb src={item.imageUrl} alt="" />
                        ) : (
                          <StopThumbFallback
                            src={CATEGORY_META[section.key].fallback}
                            alt=""
                            width={64}
                            height={64}
                          />
                        )}
                        <StopBody>
                          {note && (
                            <PairingNote $color={categoryColor}>
                              <PairingIcon $src={verifiedIcon} $color={categoryColor} />
                              {note}
                            </PairingNote>
                          )}
                          <StopName>{item.name}</StopName>
                          <StopMeta>
                            {metaParts.map((part, partIndex) => (
                              <StopMetaPart key={part}>
                                {partIndex > 0 && <StopMetaDot aria-hidden />}
                                {part}
                              </StopMetaPart>
                            ))}
                          </StopMeta>
                        </StopBody>
                        {item.placeUrl ? (
                          <ChevronButton
                            type="button"
                            aria-label={`${item.name} 카카오맵에서 보기`}
                            onClick={() =>
                              window.open(item.placeUrl!, "_blank", "noopener,noreferrer")
                            }
                          >
                            <img src={chevronRightIcon} alt="" width={20} height={20} />
                          </ChevronButton>
                        ) : (
                          <img src={chevronRightIcon} alt="" width={20} height={20} />
                        )}
                        </StopRow>
                      </Fragment>
                    );
                  })}
                </StopList>
              </Section>
            );
          })}
        </CourseList>
      )}

      <BottomSpacer />

      <MapFab
        type="button"
        onClick={() =>
          navigate(`/map?focus=${winery.id}`, { state: { courseStops: course?.stops } })
        }
      >
        <img src={mapIcon} alt="" width={20} height={20} />
        {courseState === "ready" ? "지도에서 보기" : "지도에서 보기"}
      </MapFab>
    </PageContainer>
  );
}

const PageContainer = styled.div`
  flex: 1;
  position: relative;
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
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
`;

const MapPreview = styled.div`
  position: relative;
  margin: 0 16px;
  height: 250px;
  border-radius: 8px;
  background-color: ${colors.gray[50]};
  overflow: hidden;
`;

// 카카오맵 인스턴스가 들어갈 컨테이너입니다. 실제 핀은 useEffect에서 CustomOverlay로 그립니다.
const MapPreviewEl = styled.div`
  width: 100%;
  height: 100%;
`;

// 좌표가 없거나 지도 로드에 실패했을 때만 쓰는 정적 대체 화면입니다.
const BreweryPin = styled.span`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
`;

const MapExpandButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  /* 카카오맵 SDK가 내부 레이어(타일·오버레이 pane)에 z-index를 직접 지정해서, 이 버튼도
     z-index 없이 DOM 순서에만 맡기면 지도 레이어에 덮여 안 보일 수 있습니다. */
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 9999px;
  background: #ffffff;
  box-shadow: 0 0.875px 0.875px rgba(0, 0, 0, 0.25);
  cursor: pointer;
`;

const WinerySummary = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 16px 16px 25px;
  padding: 12px 16px;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 0 1px rgba(0, 0, 0, 0.25);
`;

const WineryInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 4px;
`;

const WinerySummaryText = styled.div`
  flex: 1;
  min-width: 0;
`;

const WineryName = styled.p`
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.gray[900]};
`;

const WineryAddress = styled.p`
  margin: 2px 0 0;
  font-size: 0.75rem;
  color: ${colors.gray[400]};
`;

const DetailButton = styled.button`
  flex-shrink: 0;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  background: ${colors.gray[50]};
  font-size: 0.8125rem;
  font-weight: 400;
  color: ${colors.gray[900]};
  cursor: pointer;
`;

const CourseList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  margin: 0;
  height: 25px;
  padding: 0 16px;
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 140%;
  letter-spacing: -0.36px;
  color: ${colors.gray[900]};
`;

const StopList = styled.div`
  display: flex;
  flex-direction: column;
`;

const StopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
`;

// Figma의 "Horizontal"(Inset)처럼 구분선 양옆에 16px 여백을 둡니다(카드 폭 그대로 걸치지 않음).
const StopDivider = styled.div`
  height: 1px;
  margin: 0 16px;
  background-color: ${colors.divider};
`;

const StopThumb = styled.img`
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
  background-color: ${colors.gray[50]};
`;

const StopThumbFallback = styled.img`
  flex-shrink: 0;
  width: 64px;
  height: 64px;
`;

const StopBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const PairingNote = styled.p<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0 0 4px;
  font-size: 0.6875rem;
  font-weight: 400;
  color: ${(props) => props.$color};
`;

const PairingIcon = styled.span<{ $src: string; $color: string }>`
  flex-shrink: 0;
  display: block;
  width: 12px;
  height: 12px;
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

const StopName = styled.p`
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.gray[900]};
`;

const StopMeta = styled.p`
  display: flex;
  align-items: center;
  margin: 4px 0 0;
  font-size: 0.6875rem;
  line-height: 1;
  color: ${colors.gray[600]};
`;

const StopMetaPart = styled.span`
  display: flex;
  align-items: center;
  color: ${colors.gray[400]};

  &:first-child {
    color: ${colors.gray[600]};
  }
`;

const StopMetaDot = styled.span`
  display: inline-block;
  width: 2px;
  height: 2px;
  margin: 0 6px;
  border-radius: 50%;
  background-color: ${colors.gray[500]};
`;

const ChevronButton = styled.button`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  margin: -8px;
  border: none;
  background: transparent;
  cursor: pointer;
`;

// 하단 고정 "지도에서 보기" 버튼(bottom 36px + 버튼 자체 높이)이 마지막 카드를
// 가리지 않도록, 그 버튼 높이만큼 스크롤 여유 공간을 확보합니다.
const BottomSpacer = styled.div`
  height: 96px;
`;

const MapFab = styled.button`
  position: fixed;
  left: 50%;
  bottom: 36px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  border: none;
  border-radius: 9999px;
  background-color: ${colors.primary[500]};
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 140%;
  letter-spacing: -0.28px;
  white-space: nowrap;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  z-index: 30;
`;

const NotFound = styled.p`
  margin: 40px 0;
  text-align: center;
  color: ${colors.gray[400]};
`;
