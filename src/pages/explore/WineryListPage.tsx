import { useEffect } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Chip } from "../../shared/components/Chip";
import { Skeleton } from "../../shared/components/Skeleton";
import { ErrorState } from "../../shared/components/ErrorState";
import { WineryCard } from "../../shared/components/WineryCard";
import { BackButton } from "../../shared/components/BackButton";
import { colors } from "../../shared/styles/colors";
import {
  WINERIES,
  getAvailableTypeFilters,
  getAvailableRegionFilters,
} from "../../shared/lib/mockWineries";
import { usePersistentState } from "../../shared/lib/pageState";

//임시 탐색페이지

type LoadState = "loading" | "success" | "network-error" | "server-error";

export default function WineryListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forcedError = searchParams.get("error");
  const [loadState, setLoadState] = usePersistentState<LoadState>("explore:loadState", "loading");
  const availableTypes = getAvailableTypeFilters();
  const availableRegions = getAvailableRegionFilters();
  const [selectedTypes, setSelectedTypes] = usePersistentState<string[]>(
    "explore:selectedTypes",
    []
  );
  const [selectedRegions, setSelectedRegions] = usePersistentState<string[]>(
    "explore:selectedRegions",
    []
  );

  useEffect(() => {
    const urlType = searchParams.get("type");
    const urlRegion = searchParams.get("region");
    if (urlType && availableTypes.includes(urlType)) setSelectedTypes([urlType]);
    if (urlRegion && availableRegions.includes(urlRegion)) setSelectedRegions([urlRegion]);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (forcedError === "network") setLoadState("network-error");
      else if (forcedError === "server") setLoadState("server-error");
      else setLoadState("success");
    }, 500);
    return () => clearTimeout(timer);
  }, [forcedError]);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  const resetFilters = () => {
    setSelectedTypes([]);
    setSelectedRegions([]);
  };

  const filtered = WINERIES.filter((winery) => {
    const typeOk = selectedTypes.length === 0 || selectedTypes.includes(winery.type);
    const regionOk = selectedRegions.length === 0 || selectedRegions.includes(winery.region);
    return typeOk && regionOk;
  });

  return (
    <PageContainer>
      <Header>
        <BackButton onClick={() => navigate(-1)} />
        <HeaderTitle>양조장</HeaderTitle>
      </Header>

      <FilterSection>
        <FilterGroup>
          <FilterLabel>주종</FilterLabel>
          <FilterRow>
            {availableTypes.map((type) => (
              <Chip
                key={type}
                label={type}
                active={selectedTypes.includes(type)}
                onClick={() => toggleType(type)}
              />
            ))}
          </FilterRow>
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>지역</FilterLabel>
          <FilterRow>
            {availableRegions.map((region) => (
              <Chip
                key={region}
                label={region}
                active={selectedRegions.includes(region)}
                onClick={() => toggleRegion(region)}
              />
            ))}
          </FilterRow>
        </FilterGroup>
      </FilterSection>

      {loadState === "loading" && (
        <SkeletonList>
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonRow key={index}>
              <Skeleton $width="90px" $height="90px" $radius="12px" />
              <SkeletonCol>
                <Skeleton $height="12px" $width="60%" />
                <Skeleton $height="12px" $width="90%" />
                <Skeleton $height="12px" $width="40%" />
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
          title="양조장 정보를 불러오지 못했어요"
          description={"이용에 불편을 드려 죄송합니다.\n잠시 후 다시 시도해주세요."}
          onRetry={() => setLoadState("loading")}
        />
      )}

      {loadState === "success" && (
        <>
          <ResultCount>양조장 {filtered.length}곳</ResultCount>

          {filtered.length === 0 ? (
            <ErrorState
              title="조건에 맞는 양조장이 없어요"
              description="필터를 다시 선택해보세요"
              onRetry={resetFilters}
              retryLabel="필터 초기화"
              retryIcon="⟲"
            />
          ) : (
            <List>
              {filtered.map((winery) => (
                <WineryCard
                  key={winery.id}
                  winery={winery}
                  showDescription={false}
                  onClick={() => navigate(`/winery/${winery.id}`)}
                />
              ))}
            </List>
          )}
        </>
      )}
    </PageContainer>
  );
}

const PageContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: #ffffff;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
`;

const HeaderTitle = styled.h1`
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const FilterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 16px 16px;
  border-bottom: 1px solid ${colors.gray[100]};
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FilterLabel = styled.span`
  font-size: 0.8125rem;
  font-weight: 700;
  color: ${colors.gray[600]};
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const ResultCount = styled.p`
  margin: 16px 16px 12px;
  font-size: 0.875rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 16px 24px;
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
