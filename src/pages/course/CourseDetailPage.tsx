import { useEffect, useState } from "react";
import styled from "styled-components";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { colors } from "../../shared/styles/colors";
import { AppBar } from "../../shared/components/AppBar";
import { DotsLoader } from "../../shared/components/DotsLoader";
import { WINERIES } from "../../shared/lib/mockWineries";
import type { Winery } from "../../shared/lib/mockWineries";
import { ApiError } from "../../shared/api/api";
import { fetchBreweryDetail, fetchRecommendedCourse } from "../../shared/api/breweriesApi";
import type {
  RecommendedCourseDetail,
  RecommendedCourseStop,
  CourseStopType,
} from "../../shared/api/breweriesApi";
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
const BREWERY_COLOR = "#FF8A00";

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

function formatDistanceKm(distanceMeters: number | null): string | null {
  if (distanceMeters == null) return null;
  return (distanceMeters / 1000).toFixed(1);
}

export default function CourseDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  // 양조장 상세 화면에서 이미 조회해둔 전체 정보를 넘겨받으면 재조회를 건너뜁니다.
  const navStateWinery = (location.state as { winery?: Winery } | null)?.winery;

  const [winery, setWinery] = useState<CourseWineryInfo | null>(null);
  const [wineryLoading, setWineryLoading] = useState(true);
  const [course, setCourse] = useState<RecommendedCourseDetail | null>(null);
  const [courseState, setCourseState] = useState<CourseLoadState>("loading");

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
    const shareData = {
      title: `${winery.name} 코스`,
      text: course?.title ?? `${winery.name} 코스`,
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
        <AppBar onBack={() => navigate(-1)} />
        <DotsLoader />
      </PageContainer>
    );
  }

  if (!winery) {
    return (
      <PageContainer>
        <AppBar onBack={() => navigate(-1)} />
        <NotFound>코스 정보를 찾을 수 없어요</NotFound>
      </PageContainer>
    );
  }

  // 실제 위·경도 비율로 미리보기 박스 안 마커 위치를 계산합니다(양조장 좌표가 없으면 중앙에 고정).
  const previewPoints: {
    key: string;
    lat: number;
    lng: number;
    icon: string;
    color: string;
    label?: string;
    isBrewery: boolean;
  }[] = [];
  if (winery.lat != null && winery.lng != null) {
    previewPoints.push({
      key: "brewery",
      lat: winery.lat,
      lng: winery.lng,
      icon: pinBreweryIcon,
      color: BREWERY_COLOR,
      isBrewery: true,
    });
  }
  course?.stops.forEach((stop) => {
    const key = CATEGORY_BY_STOP_TYPE[stop.type];
    if (!key) return;
    previewPoints.push({
      key: stop.contentId,
      lat: stop.latitude,
      lng: stop.longitude,
      icon: CATEGORY_META[key].icon,
      color: CATEGORY_META[key].color,
      label: stop.name,
      isBrewery: false,
    });
  });

  // 양조장 좌표를 박스 정중앙(50%, 50%)에 고정하고, 나머지 장소는 양조장 기준 상대
  // 위치로 투영합니다. 실제 거리를 그대로 선형 축척하면 가까운 장소들이 중앙에 몰려
  // 서로/양조장 핀과 겹쳐 보이므로, 제곱근 축척 + 최소 반지름으로 가까운 장소들을
  // 바깥쪽으로 밀어내 겹침을 줄입니다.
  const brewery = previewPoints.find((p) => p.isBrewery) ?? previewPoints[0];
  const centerLat = brewery?.lat ?? 0;
  const centerLng = brewery?.lng ?? 0;
  const PAD = 12;
  const MAX_RADIUS = 50 - PAD;
  const MIN_RADIUS = 16;
  const distances = previewPoints.map((p) => Math.hypot(p.lat - centerLat, p.lng - centerLng));
  const maxDistance = Math.max(0, ...distances) || 1;
  const baseAngles = previewPoints.map((p) => Math.atan2(p.lat - centerLat, p.lng - centerLng));

  // 방향(각도)이 비슷한 장소끼리는 라벨이 겹치므로, 양조장이 아닌 장소들을 각도순으로
  // 정렬한 뒤 인접한 항목 사이 각도가 너무 좁으면 서로 밀어내 최소 간격을 확보합니다.
  const MIN_ANGLE_GAP = (20 * Math.PI) / 180;
  const adjustedAngles = [...baseAngles];
  const stopOrder = previewPoints
    .map((_, index) => index)
    .filter((index) => !previewPoints[index].isBrewery)
    .sort((a, b) => baseAngles[a] - baseAngles[b]);
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 1; i < stopOrder.length; i++) {
      const prevIndex = stopOrder[i - 1];
      const curIndex = stopOrder[i];
      const gap = adjustedAngles[curIndex] - adjustedAngles[prevIndex];
      if (gap < MIN_ANGLE_GAP) {
        const shift = (MIN_ANGLE_GAP - gap) / 2;
        adjustedAngles[prevIndex] -= shift;
        adjustedAngles[curIndex] += shift;
      }
    }
  }

  const projected = previewPoints.map((p, index) => {
    const distance = distances[index];
    const angle = adjustedAngles[index];
    const radius =
      distance === 0
        ? 0
        : MIN_RADIUS + Math.sqrt(distance / maxDistance) * (MAX_RADIUS - MIN_RADIUS);
    return {
      ...p,
      left: 50 + Math.cos(angle) * radius,
      top: 50 - Math.sin(angle) * radius,
    };
  });

  return (
    <PageContainer>
      <AppBar
        onBack={() => navigate(-1)}
        title={course?.title ?? `${winery.name} 코스`}
        align="left"
        trailing={
          <ShareButton type="button" aria-label="공유하기" onClick={handleShare}>
            <img src={uploadIcon} alt="" width={24} height={24} />
          </ShareButton>
        }
      />

      <MapPreview aria-hidden>
        {projected.length === 0 ? (
          <BreweryPin style={{ left: "50%", top: "50%" }}>
            <img src={pinBreweryIcon} alt="" width={32} height={32} />
          </BreweryPin>
        ) : (
          projected.map((point) =>
            point.isBrewery ? (
              <BreweryPin key={point.key} style={{ left: `${point.left}%`, top: `${point.top}%` }}>
                <img src={point.icon} alt="" width={32} height={32} />
              </BreweryPin>
            ) : (
              <StopPin key={point.key} style={{ left: `${point.left}%`, top: `${point.top}%` }}>
                <StopPinDot $bg={point.color}>
                  <StopPinIcon $src={point.icon} />
                </StopPinDot>
                <StopPinLabel>{point.label}</StopPinLabel>
              </StopPin>
            )
          )
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
                    const note = item.pairingComment || item.recommendationReason;
                    const metaParts = [
                      distanceKm ? `양조장에서 ${distanceKm}km` : "거리 정보 없음",
                      badge || undefined,
                    ].filter((part): part is string => Boolean(part));
                    return (
                      <StopRow key={item.contentId} $divider={index > 0}>
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

const BreweryPin = styled.span`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
`;

const StopPin = styled.span`
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transform: translate(-50%, -50%);
`;

const StopPinDot = styled.span<{ $bg: string }>`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid #ffffff;
  background-color: ${(props) => props.$bg};
`;

const StopPinIcon = styled.span<{ $src: string }>`
  display: block;
  width: 9.8px;
  height: 9.8px;
  background-color: #ffffff;
  -webkit-mask-image: url("${(props) => props.$src}");
  mask-image: url("${(props) => props.$src}");
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
`;

const StopPinLabel = styled.span`
  font-size: 11px;
  line-height: 1;
  color: ${colors.gray[900]};
  white-space: nowrap;
`;

const MapExpandButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
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

const StopRow = styled.div<{ $divider?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-top: ${(props) => (props.$divider ? `1px solid ${colors.divider}` : "none")};
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
