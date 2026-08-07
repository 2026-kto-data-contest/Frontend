import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "../components/header/Header";
import miniBannerIcon from "../../assets/icon/MiniBanner.svg";
import { Chip } from "../../shared/components/Chip";
import { Skeleton } from "../../shared/components/Skeleton";
import { ErrorState } from "../../shared/components/ErrorState";
import { WineryCard } from "../../shared/components/WineryCard";
import { PhotoCard } from "../../shared/components/PhotoCard";
import { colors } from "../../shared/styles/colors";
import { useAuth } from "../../shared/lib/authContext";
import { usePersistentState } from "../../shared/lib/pageState";
import {
  WINERIES,
  getAvailableTypeFilters,
  getAvailableRegionFilters,
  sortByPreference,
  getRecommendedWineries,
} from "../../shared/lib/mockWineries";
import { getSortedCourses } from "../../shared/lib/mockCourses";

const ROTATE_INTERVAL_MS = 3000;
const TYPE_LIST_LIMIT = 3;

type LoadState = "loading" | "success" | "network-error" | "server-error";

export default function Home() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const forcedError = searchParams.get("error");
  const [loadState, setLoadState] = usePersistentState<LoadState>("home:loadState", "loading");
  const availableTypeFilters = getAvailableTypeFilters();
  const availableRegionFilters = getAvailableRegionFilters();
  const [typeFilter, setTypeFilter] = usePersistentState<string>(
    "home:typeFilter",
    availableTypeFilters[0]
  );
  const [regionFilter, setRegionFilter] = usePersistentState<string>(
    "home:regionFilter",
    availableRegionFilters[0]
  );

  const bannerItems = getSortedCourses(auth.hasOnboarded, auth.preferredRegion);
  const [activeBanner, setActiveBanner] = usePersistentState("home:activeBanner", 0);
  const pointerStartX = useRef<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (forcedError === "network") {
        setLoadState("network-error");
      } else if (forcedError === "server") {
        setLoadState("server-error");
      } else {
        setLoadState("success");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [forcedError]);

  const goToBanner = (index: number) => {
    const length = bannerItems.length;
    setActiveBanner(((index % length) + length) % length);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      goToBanner(activeBanner + 1);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [activeBanner]);

  const handleBannerPointerDown = (e: ReactPointerEvent) => {
    pointerStartX.current = e.clientX;
  };

  const handleBannerPointerUp = (e: ReactPointerEvent) => {
    if (pointerStartX.current === null) return;
    const delta = e.clientX - pointerStartX.current;
    pointerStartX.current = null;
    const SWIPE_THRESHOLD = 40;
    if (delta > SWIPE_THRESHOLD) {
      goToBanner(activeBanner - 1);
    } else if (delta < -SWIPE_THRESHOLD) {
      goToBanner(activeBanner + 1);
    }
  };

  const handlePreferenceBannerClick = () => {
    if (auth.hasOnboarded) {
      navigate("/explore");
    } else if (auth.isLoggedIn) {
      navigate("/signin/terms");
    } else {
      navigate("/signin?from=%2F");
    }
  };

  const greeting = !auth.isLoggedIn
    ? { title: "반가워요!\n내 취향 양조장 여행, 전통주로입니다" }
    : auth.hasOnboarded
      ? { title: `${auth.nickname}님\n${auth.preferenceLabel}를 선호하시네요` }
      : { title: `${auth.nickname}님\n나에게 맞는 양조장을 찾아볼까요?` };

  const typeFilteredWineries = sortByPreference(
    WINERIES.filter((winery) => winery.type === typeFilter),
    auth.preferredRegion,
    auth.preferredType,
    auth.preferredTag
  ).slice(0, TYPE_LIST_LIMIT);
  const regionFilteredWineries = WINERIES.filter((winery) => winery.region === regionFilter);
  const recommendedWineries = getRecommendedWineries(
    auth.hasOnboarded,
    auth.preferredRegion,
    auth.preferredType,
    auth.preferredTag
  );

  return (
    <PageContainer>
      <Header />

      {loadState === "loading" && <HomeSkeleton />}

      {loadState === "network-error" && (
        <ErrorState
          title="네트워크 연결 상태가 좋지않아요"
          description={"WIFI, 셀룰러 데이터 연결 상태를 확인하고\n다시 시도해주세요."}
          onRetry={() => navigate("/", { replace: true })}
        />
      )}

      {loadState === "server-error" && (
        <ErrorState
          title="정보를 불러오지 못했어요"
          description={"이용에 불편을 드려 죄송합니다.\n잠시 후 다시 시도해주세요."}
          onRetry={() => navigate("/", { replace: true })}
        />
      )}

      {loadState === "success" && (
        <>
          <Greeting>
            <GreetingTitle>{greeting.title}</GreetingTitle>
          </Greeting>

          <BannerCard>
            <BannerStack
              onPointerDown={handleBannerPointerDown}
              onPointerUp={handleBannerPointerUp}
            >
              {bannerItems.map((item, index) => {
                // 활성 카드 기준 몇 번째 뒤에 있는 카드인지 (0=맨 앞, 1=바로 뒤, 2=그 뒤...). 3장 이상 뒤는 안 그립니다.
                const offset = (index - activeBanner + bannerItems.length) % bannerItems.length;
                if (offset > 2) return null;
                return (
                  <BannerStackItem
                    key={item.id}
                    type="button"
                    $offset={offset}
                    onClick={() =>
                      offset === 0 ? navigate(`/course/${item.id}`) : goToBanner(index)
                    }
                  >
                    <BannerImage />
                    {offset === 0 && (
                      <BannerText>
                        <BannerRegion>{item.region}</BannerRegion>
                        <BannerTitle>{item.title}</BannerTitle>
                        <BannerSubtitle>{item.subtitle}</BannerSubtitle>
                      </BannerText>
                    )}
                  </BannerStackItem>
                );
              })}
            </BannerStack>
          </BannerCard>

          <Dots>
            {bannerItems.map((item, i) => (
              <Dot key={item.id} $active={i === activeBanner} onClick={() => goToBanner(i)} />
            ))}
          </Dots>

          <Section>
            <SectionHeader>
              <SectionTitle>주종별 양조장</SectionTitle>
              <MoreLink type="button" onClick={() => navigate(`/explore?type=${typeFilter}`)}>
                더보기
              </MoreLink>
            </SectionHeader>
            <FilterRow>
              {availableTypeFilters.map((filter) => (
                <Chip
                  key={filter}
                  label={filter}
                  active={filter === typeFilter}
                  onClick={() => setTypeFilter(filter)}
                />
              ))}
            </FilterRow>
            {typeFilteredWineries.length === 0 ? (
              <EmptyNotice>아직 등록된 양조장이 없어요</EmptyNotice>
            ) : (
              <WineryList>
                {typeFilteredWineries.map((winery) => (
                  <WineryCard
                    key={winery.id}
                    winery={winery}
                    onClick={() => navigate(`/winery/${winery.id}`)}
                  />
                ))}
              </WineryList>
            )}
          </Section>

          <PromoBanner type="button" onClick={handlePreferenceBannerClick}>
            <PromoTextArea>
              <PromoTitle>
                {auth.hasOnboarded ? (
                  <>
                    전국의 체험 가능한 양조장을
                    <br />
                    한곳에서 만나보세요
                  </>
                ) : (
                  <>
                    내 취향에 딱 맞는
                    <br />
                    양조장 체험이 궁금하다면?
                  </>
                )}
              </PromoTitle>
              <PromoSubtitle>1분이면 맞춤형 양조장, 여행 코스를 추천해드려요</PromoSubtitle>
            </PromoTextArea>
            <PromoIcon src={miniBannerIcon} alt="" />
          </PromoBanner>

          <Section>
            <SectionHeader>
              <SectionTitle>지역별 양조장</SectionTitle>
              <MoreLink type="button" onClick={() => navigate(`/explore?region=${regionFilter}`)}>
                더보기
              </MoreLink>
            </SectionHeader>
            <FilterRow>
              {availableRegionFilters.map((filter) => (
                <Chip
                  key={filter}
                  label={filter}
                  active={filter === regionFilter}
                  onClick={() => setRegionFilter(filter)}
                />
              ))}
            </FilterRow>
            {regionFilteredWineries.length === 0 ? (
              <EmptyNotice>아직 등록된 양조장이 없어요</EmptyNotice>
            ) : (
              <ScrollRow>
                {regionFilteredWineries.map((winery) => (
                  <PhotoCard
                    key={winery.id}
                    name={winery.name}
                    region={winery.detailRegion}
                    onClick={() => navigate(`/winery/${winery.id}`)}
                  />
                ))}
              </ScrollRow>
            )}
          </Section>

          <Section>
            <SectionHeader>
              <SectionTitle>추천 양조장</SectionTitle>
              <MoreLink type="button" onClick={() => navigate("/explore")}>
                더보기
              </MoreLink>
            </SectionHeader>
            <ScrollRow>
              {recommendedWineries.map((winery) => (
                <PhotoCard
                  key={winery.id}
                  large
                  name={winery.name}
                  region={winery.detailRegion}
                  description={winery.description}
                  onClick={() => navigate(`/winery/${winery.id}`)}
                />
              ))}
            </ScrollRow>
          </Section>
        </>
      )}
    </PageContainer>
  );
}

const HomeSkeleton = () => (
  <SkeletonWrapper>
    <Skeleton $height="16px" $width="60%" />
    <Skeleton $height="13px" $width="42%" />
    <Skeleton $height="220px" $radius="16px" />
    <Skeleton $height="16px" $width="30%" />
    <SkeletonRow>
      <Skeleton $height="90px" $width="90px" $radius="12px" />
      <SkeletonCol>
        <Skeleton $height="12px" $width="90%" />
        <Skeleton $height="12px" $width="70%" />
        <Skeleton $height="12px" $width="50%" />
      </SkeletonCol>
    </SkeletonRow>
    <SkeletonRow>
      <Skeleton $height="90px" $width="90px" $radius="12px" />
      <SkeletonCol>
        <Skeleton $height="12px" $width="90%" />
        <Skeleton $height="12px" $width="70%" />
        <Skeleton $height="12px" $width="50%" />
      </SkeletonCol>
    </SkeletonRow>
  </SkeletonWrapper>
);

const PageContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  box-sizing: border-box;
  background-color: #ffffff;
`;

const Greeting = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 16px;
`;

const GreetingTitle = styled.p`
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 700;
  color: ${colors.gray[900]};
  white-space: pre-line;
`;

const BannerCard = styled.div`
  position: relative;
  height: 400px;
  margin-bottom: 10px;
`;

const BannerStack = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  touch-action: pan-y;
`;

const BannerStackItem = styled.button<{ $offset: number }>`
  position: absolute;
  top: ${(props) => props.$offset * 6}px;
  bottom: ${(props) => props.$offset * 6}px;
  left: 0;
  right: ${(props) => (2 - props.$offset) * 12}px;
  border: none;
  padding: 0;
  margin: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  border-radius: 16px;
  overflow: hidden;
  z-index: ${(props) => 3 - props.$offset};
  opacity: ${(props) => (props.$offset === 0 ? 1 : props.$offset === 1 ? 0.85 : 0.55)};
  transition:
    top 0.45s ease,
    bottom 0.45s ease,
    right 0.45s ease,
    opacity 0.45s ease;
`;

const BannerImage = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(160deg, #7a5c3e 0%, #3a2a1c 60%, #1c140c 100%);
`;

const BannerText = styled.div`
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 28px;
  color: ${colors.white};
`;

const BannerRegion = styled.p`
  margin: 0 0 4px;
  font-size: 0.75rem;
  opacity: 0.85;
`;

const BannerTitle = styled.p`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.4;
`;

const BannerSubtitle = styled.p`
  margin: 2px 0 0;
  font-size: 0.8125rem;
  opacity: 0.85;
`;

const Dots = styled.div`
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 24px;
`;

const Dot = styled.button<{ $active: boolean }>`
  width: 6px;
  height: 6px;
  border: none;
  border-radius: 9999px;
  padding: 0;
  background-color: ${(props) => (props.$active ? colors.gray[900] : colors.gray[300])};
  transition: background-color 0.2s ease-in-out;
  cursor: pointer;
`;

const Section = styled.section`
  padding-bottom: 35px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const MoreLink = styled.button`
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  color: ${colors.gray[400]};
  cursor: pointer;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  width: calc(100% + 32px);
  margin-left: -16px;
  padding: 0 16px 16px;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const EmptyNotice = styled.p`
  margin: 24px 0;
  text-align: center;
  font-size: 0.875rem;
  color: ${colors.gray[400]};
`;

const WineryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const PromoBanner = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  /* PageContainer의 좌우 padding(16px)을 뚫고 화면 끝까지 꽉 채웁니다. */
  width: calc(100% + 32px);
  margin-left: -16px;
  margin-right: -16px;
  border: none;
  padding: 24px 20px;
  border-radius: 0;
  background-color: #fff5e6;
  margin-bottom: 24px;
  cursor: pointer;
  text-align: left;
`;

const PromoTextArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`;

const PromoTitle = styled.p`
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 700;
  color: ${colors.gray[900]};
  line-height: 1.4;
`;

const PromoSubtitle = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  color: ${colors.gray[500]};
  line-height: 1.4;
`;

const PromoIcon = styled.img`
  flex-shrink: 0;
  width: 82px;
  height: 68px;
`;

const ScrollRow = styled.div`
  display: flex;
  gap: 10px;
  overflow-x: auto;
  /* PageContainer의 좌우 padding(16px) 안에서 스크롤 영역이 끝나면 카드가 화면 끝이 아니라
     패딩 안쪽에서 어중간하게 잘려 보입니다. 영역 자체를 화면 끝까지 넓히고, 안쪽 여백은
     padding으로 대신 줘서 카드가 실제 화면 끝에서 자연스럽게 잘리도록 합니다. */
  width: calc(100% + 32px);
  margin-left: -16px;
  padding: 0 16px;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const SkeletonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
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
