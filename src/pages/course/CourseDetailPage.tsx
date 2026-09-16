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
import pinIcon from "../../assets/icon/Pin.svg";
import mapIcon from "../../assets/icon/Map.svg";
import restaurantIcon from "../../assets/icon/Restaurant.svg";
import flagIcon from "../../assets/icon/Flag.svg";
import cafeIcon from "../../assets/icon/Cafe.svg";
import bedIcon from "../../assets/icon/Bed.svg";
import liquorIcon from "../../assets/icon/Liquor.svg";
import verifiedIcon from "../../assets/icon/Verified.svg";

type CategoryKey = "restaurants" | "attractions" | "cafes" | "lodging";
type CourseLoadState = "loading" | "ready" | "not_found" | "error";

const CATEGORY_META: Record<CategoryKey, { label: string; icon: string; color: string }> = {
  restaurants: { label: "식당", icon: restaurantIcon, color: "#6E7852" },
  attractions: { label: "관광지", icon: flagIcon, color: "#607478" },
  cafes: { label: "카페·디저트", icon: cafeIcon, color: "#B27060" },
  lodging: { label: "숙소", icon: bedIcon, color: "#8A8A88" },
};
const BREWERY_COLOR = "#FF8A00";
const BREWERY_ICON = liquorIcon;

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
    muted: boolean;
  }[] = [];
  if (winery.lat != null && winery.lng != null) {
    previewPoints.push({
      key: "brewery",
      lat: winery.lat,
      lng: winery.lng,
      icon: BREWERY_ICON,
      color: BREWERY_COLOR,
      muted: false,
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
      muted: true,
    });
  });

  const lats = previewPoints.map((p) => p.lat);
  const lngs = previewPoints.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const PAD = 15;
  const spanLat = maxLat - minLat || 1;
  const spanLng = maxLng - minLng || 1;
  const projected = previewPoints.map((p) => ({
    ...p,
    left: previewPoints.length > 1 ? PAD + ((p.lng - minLng) / spanLng) * (100 - 2 * PAD) : 50,
    top: previewPoints.length > 1 ? PAD + ((maxLat - p.lat) / spanLat) * (100 - 2 * PAD) : 50,
  }));

  return (
    <PageContainer>
      <AppBar
        onBack={() => navigate(-1)}
        title={course?.title ?? `${winery.name} 코스`}
        trailing={
          <ShareButton type="button" aria-label="공유하기" onClick={handleShare}>
            <ShareIcon viewBox="0 0 24 24" aria-hidden>
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81a3 3 0 1 0-3-3c0 .24.04.47.09.7L8.04 9.81A2.99 2.99 0 0 0 3 12a3 3 0 0 0 5.04 2.19l7.12 4.15c-.05.21-.08.43-.08.66a2.92 2.92 0 1 0 2.92-2.92z" />
            </ShareIcon>
          </ShareButton>
        }
      />

      <MapPreview
        type="button"
        aria-label="지도에서 보기"
        onClick={() =>
          navigate(`/map?focus=${winery.id}`, { state: { courseStops: course?.stops } })
        }
      >
        {projected.length === 0 ? (
          <MapPin aria-hidden $bg={BREWERY_COLOR} style={{ left: "50%", top: "50%" }}>
            <MapPinIcon $src={BREWERY_ICON} />
          </MapPin>
        ) : (
          projected.map((point) => (
            <MapPin
              key={point.key}
              aria-hidden
              $muted={point.muted}
              $bg={point.color}
              style={{ left: `${point.left}%`, top: `${point.top}%` }}
            >
              <MapPinIcon $src={point.icon} $small={point.muted} />
            </MapPin>
          ))
        )}
        <MapExpandButton aria-hidden>
          <ExpandIcon viewBox="0 0 24 24" aria-hidden>
            <path d="M4 9V4h5M4 4l6 6M15 4h5v5M20 4l-6 6M20 15v5h-5M20 20l-6-6M9 20H4v-5M4 20l6-6" />
          </ExpandIcon>
        </MapExpandButton>
      </MapPreview>

      <WinerySummary>
        <img src={pinIcon} alt="" width={20} height={20} />
        <WinerySummaryText>
          <WineryName>{winery.name}</WineryName>
          <WineryAddress>{winery.address || winery.detailRegion}</WineryAddress>
        </WinerySummaryText>
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

      {courseState === "ready" &&
        categorySections.map((section) => {
          const categoryColor = CATEGORY_META[section.key].color;
          return (
            <Section key={section.key}>
              <SectionTitle>{CATEGORY_META[section.key].label}</SectionTitle>
              <StopList>
                {section.items.map((item) => {
                  const distanceKm = formatDistanceKm(item.distanceMeters);
                  const badge = item.subcategoryName || item.categoryName;
                  const note = item.pairingComment || item.recommendationReason;
                  const metaParts = [
                    distanceKm ? `양조장에서 ${distanceKm}km` : "거리 정보 없음",
                    badge || undefined,
                  ].filter((part): part is string => Boolean(part));
                  return (
                    <StopRow key={item.contentId}>
                      {item.imageUrl ? (
                        <StopThumb src={item.imageUrl} alt="" />
                      ) : (
                        <StopThumbFallback aria-hidden $color={categoryColor}>
                          <StopThumbIcon $src={CATEGORY_META[section.key].icon} />
                        </StopThumbFallback>
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
                          {metaParts.map((part, index) => (
                            <StopMetaPart key={part}>
                              {index > 0 && <StopMetaDot aria-hidden />}
                              {part}
                            </StopMetaPart>
                          ))}
                        </StopMeta>
                      </StopBody>
                      <ChevronIcon aria-hidden>›</ChevronIcon>
                    </StopRow>
                  );
                })}
              </StopList>
            </Section>
          );
        })}

      <BottomSpacer />

      <MapFab
        type="button"
        onClick={() =>
          navigate(`/map?focus=${winery.id}`, { state: { courseStops: course?.stops } })
        }
      >
        <img src={mapIcon} alt="" width={20} height={20} />
        {courseState === "ready" ? "지도에서 코스 보기" : "지도에서 보기"}
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

const MapPreview = styled.button`
  position: relative;
  margin: 0 16px;
  height: 220px;
  border: none;
  border-radius: 16px;
  background-color: ${colors.gray[50]};
  overflow: hidden;
  cursor: pointer;
  padding: 0;
`;

const MapPin = styled.span<{ $muted?: boolean; $bg: string }>`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
  width: ${(props) => (props.$muted ? "22px" : "32px")};
  height: ${(props) => (props.$muted ? "22px" : "32px")};
  border-radius: 50%;
  background-color: ${(props) => props.$bg};
  border: ${(props) => (props.$muted ? "1.5px" : "2.5px")} solid #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
`;

const MapPinIcon = styled.span<{ $src: string; $small?: boolean }>`
  display: block;
  width: ${(props) => (props.$small ? "12px" : "18px")};
  height: ${(props) => (props.$small ? "12px" : "18px")};
  background-color: #ffffff;
  -webkit-mask-image: url("${(props) => props.$src}");
  mask-image: url("${(props) => props.$src}");
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: 60% 60%;
  mask-size: 60% 60%;
`;

const MapExpandButton = styled.span`
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
`;

const ExpandIcon = styled.svg`
  width: 14px;
  height: 14px;
  fill: none;
  stroke: ${colors.gray[700]};
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
`;

const WinerySummary = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 16px 8px;
  padding: 14px;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.25);
`;

const WinerySummaryText = styled.div`
  flex: 1;
  min-width: 0;
`;

const WineryName = styled.p`
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
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

const Section = styled.section`
  padding: 16px 16px 4px;
`;

const SectionTitle = styled.h2`
  margin: 0 0 12px;
  font-size: 1.125rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const StopList = styled.div`
  display: flex;
  flex-direction: column;
`;

const StopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid ${colors.gray[100]};

  &:first-child {
    border-top: none;
    padding-top: 0;
  }
`;

const StopThumb = styled.img`
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
  background-color: ${colors.gray[50]};
`;

const StopThumbFallback = styled.span<{ $color: string }>`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  background-color: ${colors.gray[50]};
  color: ${(props) => props.$color};
`;

const StopThumbIcon = styled.span<{ $src: string }>`
  display: block;
  width: 24px;
  height: 24px;
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
  color: ${colors.gray[900]};
`;

const StopMeta = styled.p`
  display: flex;
  align-items: center;
  margin: 2px 0 0;
  font-size: 0.6875rem;
  color: ${colors.gray[600]};
`;

const StopMetaPart = styled.span`
  display: flex;
  align-items: center;
  color: ${colors.gray[500]};

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

const ChevronIcon = styled.span`
  flex-shrink: 0;
  font-size: 1.25rem;
  color: ${colors.gray[200]};
`;

const BottomSpacer = styled.div`
  height: 64px;
`;

const MapFab = styled.button`
  position: fixed;
  left: 50%;
  bottom: 76px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  border: none;
  border-radius: 9999px;
  background-color: ${colors.primary[500]};
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 6px 16px rgba(255, 122, 0, 0.35);
  cursor: pointer;
  z-index: 30;
`;

const NotFound = styled.p`
  margin: 40px 0;
  text-align: center;
  color: ${colors.gray[400]};
`;
