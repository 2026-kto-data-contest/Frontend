import { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate, useNavigationType, useSearchParams } from "react-router-dom";
import { Skeleton } from "../../shared/components/Skeleton";
import { ErrorState } from "../../shared/components/ErrorState";
import { WineryCard } from "../../shared/components/WineryCard";
import searchIcon from "../../assets/icon/Search.svg";
import { colors } from "../../shared/styles/colors";
import { usePersistentState } from "../../shared/lib/pageState";
import { useAuth } from "../../shared/lib/authContext";
import { ApiError } from "../../shared/api/api";
import {
  fetchBreweries,
  fetchRecommendedBreweries,
  breweryToCardData,
} from "../../shared/api/breweriesApi";
import type { BreweryListItem, BreweryListParams } from "../../shared/api/breweriesApi";
import { FilterBar } from "./FilterBar";
import { FilterSheet, EMPTY_FILTERS } from "./FilterSheet";
import type { SectionKey, WineryFilters } from "./FilterSheet";
import { ExplorePromoBanner } from "./ExplorePromoBanner";

type LoadState = "loading" | "success" | "network-error" | "server-error";

const CATEGORY_KEYS: SectionKey[] = [
  "types",
  "regions",
  "strengths",
  "visitConditions",
  "histories",
];

// 도수 버킷 → API의 minAbv/maxAbv 근사 범위. API는 구간 하나만 받기 때문에
// 여러 버킷을 동시에 고르면 서버 응답은 넉넉하게 받아온 뒤 아래 matchesFilters로 정확히 좁힙니다.
const STRENGTH_BOUNDS: Record<string, [number, number]> = {
  "14도 이하": [0, 14],
  "15도 ~ 29도": [15, 29],
  "30도 이상": [30, 100],
};

function buildBreweryParams(filters: WineryFilters): BreweryListParams {
  const params: BreweryListParams = { page: 0, size: 100 };

  if (filters.regions.length > 0) params.region = filters.regions;

  // 백엔드 liquorType 파라미터는 '기타'를 허용하지 않아서 걸러냅니다.
  // (기타를 취급하는 곳은 아래 matchesFilters의 클라이언트 필터가 마저 처리합니다.)
  const serverLiquorTypes = filters.types.filter((type) => type !== "기타");
  if (serverLiquorTypes.length > 0) params.liquorType = serverLiquorTypes;

  if (filters.visitConditions.includes("상시 방문")) params.alwaysVisit = "Y";
  if (filters.visitConditions.includes("예약 방문")) params.reservationVisit = "Y";

  if (filters.strengths.length > 0) {
    const bounds = filters.strengths.map((bucket) => STRENGTH_BOUNDS[bucket]);
    params.minAbv = Math.min(...bounds.map(([lo]) => lo));
    params.maxAbv = Math.max(...bounds.map(([, hi]) => hi));
  }

  return params;
}

function strengthOverlaps(item: BreweryListItem, bucket: string): boolean {
  const [lo, hi] = STRENGTH_BOUNDS[bucket];
  if (item.alcoholMin == null || item.alcoholMax == null) return false;
  return item.alcoholMin <= hi && item.alcoholMax >= lo;
}

// 서버 파라미터는 효율을 위한 1차 좁히기일 뿐이고, 정확한 최종 판정은 항상 여기서 합니다.
function matchesFilters(item: BreweryListItem, filters: WineryFilters): boolean {
  const typeOk =
    filters.types.length === 0 || filters.types.some((type) => item.liquorTypes.includes(type));
  const regionOk =
    filters.regions.length === 0 || (item.region != null && filters.regions.includes(item.region));
  const strengthOk =
    filters.strengths.length === 0 ||
    filters.strengths.some((bucket) => strengthOverlaps(item, bucket));
  const visitOk =
    filters.visitConditions.length === 0 ||
    filters.visitConditions.some((condition) =>
      condition === "상시 방문" ? item.alwaysVisitState === "Y" : item.reservationVisitState === "Y"
    );
  const historyOk =
    filters.histories.length === 0 ||
    filters.histories.some((history) => item.featureTags.includes(history));
  return typeOk && regionOk && strengthOk && visitOk && historyOk;
}

export default function WineryListPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const forcedError = searchParams.get("error");
  const [loadState, setLoadState] = usePersistentState<LoadState>("explore:loadState", "loading");
  const [items, setItems] = useState<BreweryListItem[]>([]);
  const [filters, setFilters] = usePersistentState<WineryFilters>("explore:filters", EMPTY_FILTERS);
  const [filterOrder, setFilterOrder] = usePersistentState<SectionKey[]>("explore:filterOrder", []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSection, setSheetSection] = useState<SectionKey>("types");
  const navigationType = useNavigationType();
  // 프로모션 배너(온보딩 완료 상태) 클릭 시 취향 맞춤 양조장을 조회하는 동안 중복 클릭을 막습니다.
  const [bannerLoading, setBannerLoading] = useState(false);

  useEffect(() => {
    const urlType = searchParams.get("type");
    const urlRegion = searchParams.get("region");
    if (urlType || urlRegion) {
      setFilters((prev) => ({
        ...prev,
        types: urlType ? [urlType] : prev.types,
        regions: urlRegion ? [urlRegion] : prev.regions,
      }));
    } else if (navigationType !== "POP") {
      // 홈 화면 칩에서 "더보기"로 넘어올 때(?type=..)만 필터가 적용되어야 하고, 뒤로가기로
      // 돌아온 게 아니라 하단 네비 등으로 새로 들어온 경우에는 예전에 남아있던 필터가
      // 이어지면 안 되므로 초기화합니다.
      setFilters(EMPTY_FILTERS);
      setFilterOrder([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (forcedError === "network" || forcedError === "server") {
      const timer = setTimeout(() => {
        setLoadState(forcedError === "network" ? "network-error" : "server-error");
      }, 500);
      return () => clearTimeout(timer);
    }

    const controller = new AbortController();
    setLoadState("loading");
    fetchBreweries(buildBreweryParams(filters), controller.signal)
      .then((response) => {
        setItems(response.content);
        setLoadState("success");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("양조장 목록 조회 실패", error);
        setLoadState(
          error instanceof ApiError && error.status >= 500 ? "server-error" : "network-error"
        );
      });
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, forcedError]);

  const openFilter = (section?: SectionKey) => {
    setSheetSection(section ?? filterOrder[0] ?? "types");
    setSheetOpen(true);
  };

  const clearCategory = (key: SectionKey) => {
    setFilters((prev) => ({ ...prev, [key]: [] }));
    setFilterOrder((prev) => prev.filter((item) => item !== key));
  };

  const applyFilters = (next: WineryFilters) => {
    setFilters(next);
    setFilterOrder((prev) => {
      const activeKeys = CATEGORY_KEYS.filter((key) => next[key].length > 0);
      const stillActive = prev.filter((key) => activeKeys.includes(key));
      const newlyActive = activeKeys.filter((key) => !stillActive.includes(key));
      return [...stillActive, ...newlyActive];
    });
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setFilterOrder([]);
  };

  const activeCount =
    filters.types.length +
    filters.regions.length +
    filters.strengths.length +
    filters.visitConditions.length +
    filters.histories.length;

  const filtered = items.filter((item) => matchesFilters(item, filters));

  return (
    <PageContainer>
      <Header>
        <HeaderTitle>양조장</HeaderTitle>
        <SearchButton type="button" aria-label="검색" onClick={() => navigate("/search")}>
          <img src={searchIcon} alt="" width={20} height={20} />
        </SearchButton>
      </Header>

      <FilterBar
        filters={filters}
        filterOrder={filterOrder}
        activeCount={activeCount}
        onOpenFilter={openFilter}
        onClearCategory={clearCategory}
      />

      {loadState === "loading" && (
        // Figma "Card/Brewery Type=List, State=Loading" 실측값(썸네일 115x115, 제목/위치/설명
        // 2줄/배지 2개)을 그대로 옮긴 것이며, 아래 WineryCard(thumbSize=115) 실제 모양과 같습니다.
        <SkeletonList>
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonRow key={index}>
              <Skeleton $width="115px" $height="115px" $radius="8px" />
              <SkeletonCol>
                <Skeleton $height="18px" $width="120px" />
                <Skeleton $height="12px" $width="45px" />
                <Skeleton $height="14px" $width="90%" />
                <Skeleton $height="14px" $width="65%" />
                <SkeletonBadgeRow>
                  <Skeleton $height="19px" $width="51px" $radius="4px" />
                  <Skeleton $height="19px" $width="70px" $radius="4px" />
                </SkeletonBadgeRow>
              </SkeletonCol>
            </SkeletonRow>
          ))}
        </SkeletonList>
      )}

      {loadState === "network-error" && (
        <ErrorState
          title="네트워크 연결 상태가 좋지않아요"
          description={"WIFI, 셀룰러 데이터 연결 상태를 확인하고\n다시 시도해주세요."}
          onRetry={() => setLoadState("loading")}
        />
      )}

      {loadState === "server-error" && (
        <ErrorState
          title="정보를 불러오지 못했어요"
          description={"이용에 불편을 드려 죄송합니다.\n잠시 후 다시 시도해주세요."}
          onRetry={() => setLoadState("loading")}
        />
      )}

      {loadState === "success" && (
        <>
          {filtered.length === 0 ? (
            <ErrorState
              title="조건에 맞는 양조장이 없어요"
              description={"선택한 필터를 조정하거나 초기화해주세요."}
              onRetry={resetFilters}
              retryLabel="필터 초기화"
            />
          ) : (
            <>
              <ExplorePromoBanner
                hasOnboarded={auth.hasOnboarded}
                loading={bannerLoading}
                onClick={async () => {
                  if (auth.hasOnboarded) {
                    // 취향과 일치하는 양조장을 그 자리에서 새로 조회해 그중 1곳을 무작위로
                    // 골라 추천 코스로 이동합니다(클릭 시점에 바로 조회해 타이밍 문제를 피함).
                    setBannerLoading(true);
                    try {
                      const page = await fetchRecommendedBreweries(0, 6);
                      if (page.content.length > 0) {
                        const picked =
                          page.content[Math.floor(Math.random() * page.content.length)];
                        navigate(`/course/${picked.breweryId}`);
                      } else {
                        navigate("/");
                      }
                    } catch (error) {
                      console.error("취향 맞춤 양조장 조회 실패", error);
                      navigate("/");
                    } finally {
                      setBannerLoading(false);
                    }
                  } else if (auth.isLoggedIn && auth.termsAgreed) {
                    navigate("/onboarding?from=%2Fexplore");
                  } else if (auth.isLoggedIn) {
                    navigate("/terms?from=%2Fexplore");
                  } else {
                    navigate("/login?from=%2F");
                  }
                }}
              />

              <List>
                {filtered.map((item) => (
                  <WineryCard
                    key={item.breweryId}
                    winery={breweryToCardData(item)}
                    thumbSize={115}
                    nameFirst
                    showTags={false}
                    onClick={() => navigate(`/winery/${item.breweryId}`)}
                  />
                ))}
              </List>
            </>
          )}
        </>
      )}

      <FilterSheet
        open={sheetOpen}
        initialFilters={filters}
        initialSection={sheetSection}
        onClose={() => setSheetOpen(false)}
        onApply={applyFilters}
      />
    </PageContainer>
  );
}

const PageContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow-x: hidden;
  background-color: #ffffff;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
`;

const HeaderTitle = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 132%;
  letter-spacing: -0.4px;
  color: ${colors.gray[900]};
`;

const SearchButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px 16px 24px;
`;

const SkeletonList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
`;

const SkeletonRow = styled.div`
  display: flex;
  gap: 12px;
`;

const SkeletonCol = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
`;

const SkeletonBadgeRow = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 4px;
`;
