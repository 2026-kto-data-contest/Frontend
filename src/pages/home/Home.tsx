import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "../../shared/components/Header";
import miniBannerIcon from "../../assets/icon/MiniBanner.svg";
import { Chip } from "../../shared/components/Chip";
import { Skeleton } from "../../shared/components/Skeleton";
import { ErrorState } from "../../shared/components/ErrorState";
import { Snackbar } from "../../shared/components/Snackbar";
import { WineryCard } from "../../shared/components/WineryCard";
import { PhotoCard } from "../../shared/components/PhotoCard";
import { DotsLoader } from "../../shared/components/DotsLoader";
import { colors } from "../../shared/styles/colors";
import { useAuth } from "../../shared/lib/authContext";
import { usePersistentState } from "../../shared/lib/pageState";
import { ApiError, fetchOnboardingPreferences } from "../../shared/api/api";
import type { OnboardingPreferencesData } from "../../shared/api/api";
import { fetchHome, fetchBreweryFilters, breweryToCardData } from "../../shared/api/breweriesApi";
import type { HomeResponse, BreweryFilterOption } from "../../shared/api/breweriesApi";
import { ALL_TYPE_FILTERS, ALL_REGION_FILTERS } from "../../shared/lib/mockWineries";
import { TASTE_OPTIONS } from "../signin/onboarding/OnboardingTastePage";

const ROTATE_INTERVAL_MS = 3000;
const TYPE_LIST_LIMIT = 3;
const DEFAULT_TYPE_FILTER = "탁주";
const DEFAULT_REGION_FILTER = "수도권";
const GUEST_GREETING_TITLE = "반가워요!";
const GUEST_GREETING_SUBTITLE = "내 취향 양조장 여행, 전통주로입니다";
const ONBOARDING_PROMPT_LABEL = "나에게 맞는 양조장";
const ONBOARDING_PROMPT_SUFFIX = "을 찾아볼까요?";
const PREFERENCE_SUFFIX = "를 선호하시네요!";

type LoadState = "loading" | "success" | "network-error" | "server-error";

// "깔끔함" → "깔끔한"처럼, 저장된 취향 태그를 문장에 들어가는 관형형으로 바꿉니다.
function tagToAdjective(tag: string): string {
  if (tag.endsWith("함")) return `${tag.slice(0, -1)}한`;
  if (tag.endsWith("움")) return `${tag.slice(0, -1)}운`;
  return tag;
}

function buildPreferenceLine(preferences: OnboardingPreferencesData): string {
  const regionLabel = preferences.regions.length === 0 ? "전국" : preferences.regions.join("·");
  const primaryType = preferences.liquorTypes[0];
  const tasteOption = TASTE_OPTIONS.find((option) => option.type === primaryType);
  const adjective = tasteOption?.tag ? `${tagToAdjective(tasteOption.tag)} ` : "";
  return `${regionLabel}의 ${adjective}${primaryType ?? "전통주"}${PREFERENCE_SUFFIX}`;
}

export default function Home() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const forcedError = searchParams.get("error");
  const [loadState, setLoadState] = usePersistentState<LoadState>("home:loadState", "loading");
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [typeFilter, setTypeFilter] = usePersistentState<string>(
    "home:typeFilter",
    DEFAULT_TYPE_FILTER
  );
  const [regionFilter, setRegionFilter] = usePersistentState<string>(
    "home:regionFilter",
    DEFAULT_REGION_FILTER
  );

  const bannerItems = home?.recommendedCourses ?? [];
  const [activeBanner, setActiveBanner] = usePersistentState("home:activeBanner", 0);
  const pointerStartX = useRef<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filterErrorToast, setFilterErrorToast] = useState<string | null>(null);
  const [isTypeRefetching, setIsTypeRefetching] = useState(false);
  const [isRegionRefetching, setIsRegionRefetching] = useState(false);
  const prevFiltersRef = useRef({ typeFilter, regionFilter });
  const [preferences, setPreferences] = useState<OnboardingPreferencesData | null>(null);
  const [typeCounts, setTypeCounts] = useState<BreweryFilterOption[]>([]);
  const [regionCounts, setRegionCounts] = useState<BreweryFilterOption[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchBreweryFilters(controller.signal)
      .then((filters) => {
        setTypeCounts(filters.liquorTypes);
        setRegionCounts(filters.regions);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (forcedError === "network" || forcedError === "server") {
      const timer = setTimeout(() => {
        setLoadState(forcedError === "network" ? "network-error" : "server-error");
      }, 500);
      return () => clearTimeout(timer);
    }

    // 개발 모드(StrictMode)에서 같은 효과가 두 번 실행되며 이전 요청이 그대로 남아있으면
    // 느린 백엔드에 동시에 두 번 요청이 몰려 오히려 더 느려집니다. 정리 시점에 실제로
    // 요청 자체를 끊어서(AbortController) 낭비되는 중복 요청을 없앱니다.
    const controller = new AbortController();
    // 이미 한 번 성공적으로 불러온 뒤 칩만 바꾼 경우에는, 전체 화면을 다시 스켈레톤으로
    // 덮지 않고 기존 내용을 보여준 채로 조용히 해당 데이터만 새로 받아옵니다.
    // 다만 탭이 등록됐다는 걸 바로 보여주기 위해 목록 영역만 즉시(동기적으로) 흐리게 표시합니다.
    const isFirstLoad = !home;
    const prevFilters = prevFiltersRef.current;
    const typeChanged = prevFilters.typeFilter !== typeFilter;
    const regionChanged = prevFilters.regionFilter !== regionFilter;
    prevFiltersRef.current = { typeFilter, regionFilter };

    if (isFirstLoad) {
      setLoadState("loading");
    } else {
      // 바뀐 칩이 속한 섹션만 로딩 표시를 띄웁니다. 예를 들어 주종별 칩을 눌렀을 때
      // 지역별 양조장 섹션까지 같이 로딩 처리되면 안 됩니다.
      if (typeChanged) setIsTypeRefetching(true);
      if (regionChanged) setIsRegionRefetching(true);
    }

    fetchHome(regionFilter, typeFilter, controller.signal)
      .then((response) => {
        setHome(response);
        setLoadState("success");
        setIsTypeRefetching(false);
        setIsRegionRefetching(false);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("홈 화면 조회 실패", error);
        if (isFirstLoad) {
          setLoadState(
            error instanceof ApiError && error.status >= 500 ? "server-error" : "network-error"
          );
        } else {
          setFilterErrorToast("필터를 적용하지 못했어요. 다시 시도해주세요.");
        }
        setIsTypeRefetching(false);
        setIsRegionRefetching(false);
      });
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionFilter, typeFilter, forcedError, reloadKey]);

  useEffect(() => {
    if (!filterErrorToast) return;
    const timer = setTimeout(() => setFilterErrorToast(null), 3000);
    return () => clearTimeout(timer);
  }, [filterErrorToast]);

  useEffect(() => {
    if (!auth.isLoggedIn || !auth.hasOnboarded) {
      setPreferences(null);
      return;
    }
    const controller = new AbortController();
    fetchOnboardingPreferences(controller.signal)
      .then(setPreferences)
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("취향 정보 조회 실패", error);
      });
    return () => controller.abort();
  }, [auth.isLoggedIn, auth.hasOnboarded]);

  const goToBanner = (index: number) => {
    const length = bannerItems.length;
    if (length === 0) return;
    setActiveBanner(((index % length) + length) % length);
  };

  useEffect(() => {
    if (bannerItems.length === 0) return;
    const timer = setInterval(() => {
      goToBanner(activeBanner + 1);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBanner, bannerItems.length]);

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
    if (home?.banner.actionPath) {
      navigate(home.banner.actionPath);
      return;
    }
    if (auth.hasOnboarded) {
      navigate("/explore");
    } else if (auth.isLoggedIn && auth.termsAgreed) {
      navigate("/onboarding");
    } else if (auth.isLoggedIn) {
      navigate("/terms");
    } else {
      navigate("/login?from=%2F");
    }
  };

  const handleGreetingActionClick = () => {
    if (!auth.isLoggedIn) return;
    if (!auth.termsAgreed) {
      navigate("/terms");
    } else if (!auth.hasOnboarded) {
      navigate("/onboarding");
    } else {
      navigate("/mypage");
    }
  };

  const greetingTitle = auth.isLoggedIn ? `${auth.nickname}님` : GUEST_GREETING_TITLE;
  const preferenceLine = preferences ? buildPreferenceLine(preferences) : null;

  const typeFilteredWineries = (home?.liquorTypeBreweries.breweries ?? []).slice(
    0,
    TYPE_LIST_LIMIT
  );
  const regionFilteredWineries = home?.regionBreweries.breweries ?? [];
  const recommendedWineries = home?.recommendedBreweries ?? [];

  return (
    <PageContainer>
      <Header />

      {loadState === "loading" && <HomeSkeleton />}

      {loadState === "network-error" && (
        <ErrorState
          title="네트워크 연결 상태가 좋지않아요"
          description={"WIFI, 셀룰러 데이터 연결 상태를 확인하고\n다시 시도해주세요."}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      )}

      {loadState === "server-error" && (
        <ErrorState
          title="정보를 불러오지 못했어요"
          description={"이용에 불편을 드려 죄송합니다.\n잠시 후 다시 시도해주세요."}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      )}

      {loadState === "success" && home && (
        <>
          <Greeting>
            <GreetingTitle>{greetingTitle}</GreetingTitle>
            {!auth.isLoggedIn ? (
              <GreetingTitle>{GUEST_GREETING_SUBTITLE}</GreetingTitle>
            ) : !auth.hasOnboarded ? (
              <GreetingActionLine type="button" onClick={handleGreetingActionClick}>
                <Underline>{ONBOARDING_PROMPT_LABEL}</Underline>
                {ONBOARDING_PROMPT_SUFFIX}
              </GreetingActionLine>
            ) : (
              preferenceLine && (
                <GreetingActionLine type="button" onClick={handleGreetingActionClick}>
                  <Underline>{preferenceLine.slice(0, -PREFERENCE_SUFFIX.length)}</Underline>
                  {PREFERENCE_SUFFIX}
                </GreetingActionLine>
              )
            )}
          </Greeting>

          {bannerItems.length > 0 && (
            <>
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
                        key={item.courseId}
                        type="button"
                        $offset={offset}
                        onClick={() =>
                          offset === 0 ? navigate(`/course/${item.courseId}`) : goToBanner(index)
                        }
                      >
                        <BannerImage
                          style={
                            item.imageUrl
                              ? {
                                  backgroundImage: `url(${item.imageUrl})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }
                              : undefined
                          }
                        />
                        {offset === 0 && (
                          <BannerText>
                            {item.regionLabel && <BannerRegion>{item.regionLabel}</BannerRegion>}
                            <BannerTitle>{item.title}</BannerTitle>
                          </BannerText>
                        )}
                      </BannerStackItem>
                    );
                  })}
                </BannerStack>
              </BannerCard>

              <Dots>
                {bannerItems.map((item, i) => (
                  <Dot
                    key={item.courseId}
                    $active={i === activeBanner}
                    onClick={() => goToBanner(i)}
                  />
                ))}
              </Dots>
            </>
          )}

          <Section>
            <SectionHeader>
              <SectionTitle>주종별 양조장</SectionTitle>
              <MoreLink type="button" onClick={() => navigate(`/explore?type=${typeFilter}`)}>
                더보기
              </MoreLink>
            </SectionHeader>
            <FilterRow>
              {ALL_TYPE_FILTERS.map((filter) => (
                <Chip
                  key={filter}
                  label={filter}
                  count={typeCounts.find((item) => item.value === filter)?.breweryCount}
                  active={filter === typeFilter}
                  onClick={() => setTypeFilter(filter)}
                />
              ))}
            </FilterRow>
            {isTypeRefetching ? (
              <DotsLoader />
            ) : typeFilteredWineries.length === 0 ? (
              <EmptyNotice>아직 등록된 양조장이 없어요</EmptyNotice>
            ) : (
              <WineryList>
                {typeFilteredWineries.map((winery) => (
                  <WineryCard
                    key={winery.breweryId}
                    winery={breweryToCardData(winery)}
                    onClick={() => navigate(`/winery/${winery.breweryId}`)}
                    showBadges={false}
                  />
                ))}
              </WineryList>
            )}
          </Section>

          <PromoBanner type="button" onClick={handlePreferenceBannerClick}>
            <PromoTextArea>
              <PromoTitle>{home.banner.message}</PromoTitle>
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
              {ALL_REGION_FILTERS.map((filter) => (
                <Chip
                  key={filter}
                  label={filter}
                  count={regionCounts.find((item) => item.value === filter)?.breweryCount}
                  active={filter === regionFilter}
                  onClick={() => setRegionFilter(filter)}
                />
              ))}
            </FilterRow>
            {isRegionRefetching ? (
              <DotsLoader />
            ) : regionFilteredWineries.length === 0 ? (
              <EmptyNotice>아직 등록된 양조장이 없어요</EmptyNotice>
            ) : (
              <ScrollRow>
                {regionFilteredWineries.map((winery) => (
                  <PhotoCard
                    key={winery.breweryId}
                    name={winery.businessName}
                    region={breweryToCardData(winery).detailRegion}
                    photoUrl={winery.mainImage?.url}
                    onClick={() => navigate(`/winery/${winery.breweryId}`)}
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
                  key={winery.breweryId}
                  large
                  name={winery.businessName}
                  region={breweryToCardData(winery).detailRegion}
                  description={winery.introduction ?? undefined}
                  photoUrl={winery.mainImage?.url}
                  onClick={() => navigate(`/winery/${winery.breweryId}`)}
                />
              ))}
            </ScrollRow>
          </Section>
        </>
      )}

      <Snackbar message={filterErrorToast} />
    </PageContainer>
  );
}

const HomeSkeleton = () => (
  <SkeletonWrapper>
    <SkeletonGreeting>
      <Skeleton $height="20px" $width="70%" />
      <Skeleton $height="20px" $width="50%" />
    </SkeletonGreeting>
    <Skeleton $height="400px" $radius="24px" />
    <SkeletonSectionHeader>
      <Skeleton $height="20px" $width="110px" />
      <Skeleton $height="16px" $width="36px" />
    </SkeletonSectionHeader>
    <SkeletonChipRow>
      <Skeleton $height="29px" $width="46px" $radius="9999px" />
      <Skeleton $height="29px" $width="46px" $radius="9999px" />
      <Skeleton $height="29px" $width="46px" $radius="9999px" />
      <Skeleton $height="29px" $width="52px" $radius="9999px" />
      <Skeleton $height="29px" $width="52px" $radius="9999px" />
    </SkeletonChipRow>
    {[0, 1, 2].map((i) => (
      <SkeletonRow key={i}>
        <Skeleton $height="136px" $width="100px" $radius="8px" />
        <SkeletonCol>
          <Skeleton $height="12px" $width="40%" />
          <Skeleton $height="16px" $width="80%" />
          <Skeleton $height="14px" $width="90%" />
          <Skeleton $height="14px" $width="60%" />
        </SkeletonCol>
      </SkeletonRow>
    ))}
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
  font-family: "LINE Seed Sans KR";
  font-size: 1.125rem;
  font-weight: 700;
  color: ${colors.gray[900]};
  white-space: pre-line;
`;

const GreetingActionLine = styled.button`
  margin: 0;
  border: none;
  padding: 0;
  background: transparent;
  font-family: "LINE Seed Sans KR";
  font-size: 1.125rem;
  font-weight: 700;
  color: ${colors.gray[900]};
  text-align: left;
  white-space: pre-line;
  cursor: pointer;
`;

const Underline = styled.span`
  text-decoration: underline;
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
  border-radius: 24px;
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
  left: 24px;
  right: 24px;
  bottom: 24px;
  color: ${colors.white};
`;

const BannerRegion = styled.p`
  margin: 0 0 4px;
  font-size: 1rem;
  font-weight: 500;
`;

const BannerTitle = styled.p`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
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
  font-size: 1.125rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const MoreLink = styled.button`
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  color: ${colors.gray[500]};
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
  gap: 4px;
  min-width: 0;
`;

const PromoTitle = styled.p`
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: ${colors.gray[900]};
  line-height: 1.4;
  white-space: pre-line;
`;

const PromoSubtitle = styled.p`
  margin: 0;
  font-size: 0.6875rem;
  color: ${colors.gray[300]};
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

const SkeletonGreeting = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SkeletonSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SkeletonChipRow = styled.div`
  display: flex;
  gap: 8px;
`;

const SkeletonCol = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
`;
