import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styled, { css, keyframes } from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "../../shared/components/Header";
import bannerLoginIcon from "../../assets/img/BannerLogin.png";
import bannerOnboardedIcon from "../../assets/img/BannerOnboarded.png";
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
import { ApiError, fetchOnboardingPreferences, resolveImageUrl } from "../../shared/api/api";
import type { OnboardingPreferencesData } from "../../shared/api/api";
import { fetchHome, breweryToCardData } from "../../shared/api/breweriesApi";
import type { HomeResponse, RecommendedCourseCard } from "../../shared/api/breweriesApi";
import { ALL_TYPE_FILTERS, ALL_REGION_FILTERS } from "../../shared/lib/mockWineries";
import { TASTE_OPTIONS } from "../signin/onboarding/OnboardingTastePage";

const ROTATE_INTERVAL_MS = 3000;
const BANNER_EXIT_DURATION_MS = 700;
// 스택 카드 이동, 나가는 카드 애니메이션이 서로 다른 시간·이징으로 움직이면 중간에 멈칫하는 것처럼
// 보여서, 두 애니메이션 모두 같은 지속시간·이징을 씁니다.
const BANNER_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
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

// 메인 배너 카드(맨 앞 카드든 뒤에 겹친 카드든) 안의 사진+텍스트는 항상 같은 모양입니다.
function BannerCardVisual({ item }: { item: RecommendedCourseCard }) {
  return (
    <>
      <BannerImage
        style={
          item.imageUrl
            ? {
                backgroundImage: `url(${resolveImageUrl(item.imageUrl)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      />
      <BannerText>
        {item.regionLabel && <BannerRegion>{item.regionLabel}</BannerRegion>}
        <BannerTitle>{item.title}</BannerTitle>
      </BannerText>
    </>
  );
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
  const bannerDraggedRef = useRef(false);
  // 넘어가기 직전까지 맨 앞이었던 카드가 회전+페이드되며 빠져나가는 연출(Figma "Card/Recommand-1"
  // 모션)을 위한 상태입니다. 새 엘리먼트를 따로 만들지 않고, 그 카드 자신(같은 key)을 계속
  // 그리면서 애니메이션만 얹기 때문에 화면에 이미 그려져 있던 사진을 그대로 씁니다
  // (새로 만든 엘리먼트에 사진을 다시 그리면 그 순간 한 번 더 로딩되는 것처럼 깜빡였습니다).
  const [exitingCourseId, setExitingCourseId] = useState<string | null>(null);
  const prevActiveBannerRef = useRef(activeBanner);
  const [reloadKey, setReloadKey] = useState(0);
  const [filterErrorToast, setFilterErrorToast] = useState<string | null>(null);
  const [isTypeRefetching, setIsTypeRefetching] = useState(false);
  const [isRegionRefetching, setIsRegionRefetching] = useState(false);
  const prevFiltersRef = useRef({ typeFilter, regionFilter });
  const [preferences, setPreferences] = useState<OnboardingPreferencesData | null>(null);

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

  // 카드가 스택에서 자기 차례가 되는 순간 사진을 처음 디코딩하면 그 프레임에서만 버벅여서,
  // 배너 목록을 받자마자 미리 브라우저 캐시에 올려둡니다.
  useEffect(() => {
    bannerItems.forEach((item) => {
      if (!item.imageUrl) return;
      const img = new Image();
      img.src = resolveImageUrl(item.imageUrl) ?? "";
    });
  }, [bannerItems]);

  useEffect(() => {
    const prevIndex = prevActiveBannerRef.current;
    prevActiveBannerRef.current = activeBanner;
    if (prevIndex === activeBanner || bannerItems.length === 0) return;
    const outgoingItem = bannerItems[prevIndex % bannerItems.length];
    if (!outgoingItem) return;
    setExitingCourseId(outgoingItem.courseId);
    const timer = setTimeout(() => setExitingCourseId(null), BANNER_EXIT_DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBanner]);

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
    bannerDraggedRef.current = false;
  };

  const handleBannerPointerMove = (e: ReactPointerEvent) => {
    if (pointerStartX.current === null) return;
    // 살짝만 움직인 건 드래그로 치지 않습니다(탭 흔들림 정도는 카드 클릭이 그대로 동작해야 함).
    if (Math.abs(e.clientX - pointerStartX.current) > 10) bannerDraggedRef.current = true;
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
  // Figma상 "로그인 전"과 "로그인 후·온보딩 전" 배너는 같은 스타일(주황 배경+서브타이틀+사진)이고,
  // 온보딩을 마친 뒤에만 다른(초록빛 배경, 서브타이틀 없음) 배너를 씁니다.
  // 백엔드 banner.type은 온보딩을 마친 뒤에도 계속 ONBOARDING으로 내려오는 경우가 있어서
  // (실기기로 확인됨) 믿지 않고, 인사말 로직처럼 로그인 상태 auth.hasOnboarded로 직접 판단합니다.
  // 문구도 백엔드 banner.message가 아니라 Figma에 있는 문구를 그대로 씁니다.
  const isPromptBanner = !auth.hasOnboarded;
  const promoTitle = isPromptBanner
    ? "내 취향에 딱 맞는\n양조장 체험이 궁금하다면?"
    : "전국의 체험 가능한 양조장을 \n한곳에서 만나보세요";

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
                  onPointerMove={handleBannerPointerMove}
                  onPointerUp={handleBannerPointerUp}
                >
                  {bannerItems.map((item, index) => {
                    // 활성 카드 기준 몇 번째 뒤에 있는 카드인지 (0=맨 앞, 1=바로 뒤, 2=그 뒤...). 3장 이상 뒤는 안 그립니다.
                    const offset = (index - activeBanner + bannerItems.length) % bannerItems.length;
                    const isExiting = item.courseId === exitingCourseId;
                    if (offset > 2 && !isExiting) return null;
                    return (
                      <BannerStackItem
                        key={item.courseId}
                        type="button"
                        // 방금 맨 앞에서 빠져나가는 카드는 새 offset으로 옮겨가지 않고 맨 앞 자리에
                        // 그대로 고정해둔 채로, 회전+슬라이드+페이드 애니메이션만 그 위에 얹습니다.
                        $offset={isExiting ? 0 : offset}
                        $exiting={isExiting}
                        onClick={() => {
                          // 스와이프로 카드를 넘긴 직후에는 클릭(코스 상세 이동)이 같이 발생하지 않게 막습니다.
                          if (bannerDraggedRef.current) {
                            bannerDraggedRef.current = false;
                            return;
                          }
                          offset === 0 ? navigate(`/course/${item.courseId}`) : goToBanner(index);
                        }}
                      >
                        <BannerCardVisual item={item} />
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

          <PromoBanner type="button" $prompt={isPromptBanner} onClick={handlePreferenceBannerClick}>
            <PromoTextArea>
              <PromoTitle>{promoTitle}</PromoTitle>
              {isPromptBanner && (
                <PromoSubtitle>1분이면 맞춤형 양조장, 여행 코스를 추천해드려요</PromoSubtitle>
              )}
            </PromoTextArea>
            <PromoIcon
              src={isPromptBanner ? bannerLoginIcon : bannerOnboardedIcon}
              alt=""
              $prompt={isPromptBanner}
            />
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
            <ScrollRow $large>
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

// Figma 컴포넌트 라이브러리의 Card/Brewery Loading variant(Compact 120x174, Featured 220x298,
// List 375 wide) 실측값을 그대로 옮긴 것이며, 실제 홈 화면에 있는 섹션을 전부 반영합니다
// (미니배너·지역별/추천 양조장 가로 스크롤이 스켈레톤에 없어서 로딩이 끝나면 화면이 갑자기
// 길어지던 것도 같이 고쳤습니다).
const HomeSkeleton = () => (
  <SkeletonWrapper>
    <SkeletonGreeting>
      <Skeleton $height="20px" $width="70%" />
      <Skeleton $height="20px" $width="50%" />
    </SkeletonGreeting>
    <Skeleton $height="400px" $radius="24px" />
    <SkeletonDots>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} $height="6px" $width="6px" $radius="9999px" />
      ))}
    </SkeletonDots>
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

    <Skeleton $height="100px" />

    <SkeletonSectionHeader>
      <Skeleton $height="20px" $width="90px" />
      <Skeleton $height="16px" $width="36px" />
    </SkeletonSectionHeader>
    <SkeletonChipRow>
      <Skeleton $height="29px" $width="52px" $radius="9999px" />
      <Skeleton $height="29px" $width="46px" $radius="9999px" />
      <Skeleton $height="29px" $width="46px" $radius="9999px" />
      <Skeleton $height="29px" $width="46px" $radius="9999px" />
    </SkeletonChipRow>
    <SkeletonScrollRow>
      {[0, 1, 2].map((i) => (
        <SkeletonCompactCard key={i}>
          <Skeleton $height="120px" $width="120px" $radius="8px" />
          <Skeleton $height="20px" $width="90%" />
          <Skeleton $height="14px" $width="45px" />
        </SkeletonCompactCard>
      ))}
    </SkeletonScrollRow>

    <SkeletonSectionHeader>
      <Skeleton $height="20px" $width="90px" />
      <Skeleton $height="16px" $width="36px" />
    </SkeletonSectionHeader>
    <SkeletonScrollRow>
      {[0, 1].map((i) => (
        <SkeletonFeaturedCard key={i}>
          <Skeleton $height="180px" $radius="0" />
          <SkeletonFeaturedBody>
            <Skeleton $height="18px" $width="70%" />
            <Skeleton $height="12px" $width="40%" />
            <Skeleton $height="16px" $width="100%" />
            <Skeleton $height="16px" $width="55%" />
          </SkeletonFeaturedBody>
        </SkeletonFeaturedCard>
      ))}
    </SkeletonScrollRow>
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
  /* 카드 위치·크기 애니메이션이 매 프레임 페이지 전체 레이아웃을 다시 계산하게 만들면
     아래 콘텐츠가 많을수록 버벅여서(어떤 카드는 괜찮고 어떤 카드는 덜커덩거림), 이 영역
     안에서만 레이아웃이 다시 계산되도록 가둬둡니다. */
  contain: layout paint;
`;

const BannerStack = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  touch-action: pan-y;
  /* BannerText가 카드 자기 자신(앞/중간/뒤마다 폭이 다름)이 아니라 이 폭을 기준으로
     줄바꿈 너비를 잡게 하기 위한 기준점입니다. */
  container-type: inline-size;
`;

// Figma "Card/Recommand Animation" 컴포넌트의 스택 카드 3장(맨 앞/중간/뒤) 실측 inset입니다.
// 351x400 기준 카드 좌표(맨 앞 0,0~335,400 / 중간 43,20~343,380 / 뒤 83,40~351,360)를
// top/right/bottom/left inset으로 그대로 옮긴 것입니다.
const BANNER_STACK_INSETS = [
  { top: 0, right: 16, bottom: 0, left: 0 },
  { top: 20, right: 8, bottom: 20, left: 43 },
  { top: 40, right: 0, bottom: 40, left: 83 },
] as const;

// Figma "Card/Recommand-1" 모션(맨 앞 카드가 넘어갈 때 빠져나가는 효과)입니다.
// 회전과 이동을 동시에 진행해서 비스듬히 날아가듯 왼쪽 밖으로 빠지며 옅어집니다.
const bannerExitAnimation = keyframes`
  0% {
    transform: translateX(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateX(-100%) rotate(-15deg);
    opacity: 0;
  }
`;

const BannerStackItem = styled.button<{ $offset: number; $exiting: boolean }>`
  position: absolute;
  top: ${(props) => BANNER_STACK_INSETS[props.$offset].top}px;
  right: ${(props) => BANNER_STACK_INSETS[props.$offset].right}px;
  bottom: ${(props) => BANNER_STACK_INSETS[props.$offset].bottom}px;
  left: ${(props) => BANNER_STACK_INSETS[props.$offset].left}px;
  border: none;
  padding: 0;
  margin: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  border-radius: 24px;
  overflow: hidden;
  z-index: ${(props) => (props.$exiting ? 4 : 3 - props.$offset)};
  pointer-events: ${(props) => (props.$exiting ? "none" : "auto")};
  box-shadow: 0 1px 12px rgba(0, 0, 0, 0.25);
  will-change: top, right, bottom, left, transform, opacity;
  transition:
    top ${BANNER_EXIT_DURATION_MS}ms ${BANNER_EASE},
    right ${BANNER_EXIT_DURATION_MS}ms ${BANNER_EASE},
    bottom ${BANNER_EXIT_DURATION_MS}ms ${BANNER_EASE},
    left ${BANNER_EXIT_DURATION_MS}ms ${BANNER_EASE};
  ${(props) =>
    props.$exiting &&
    css`
      animation: ${bannerExitAnimation} ${BANNER_EXIT_DURATION_MS}ms ${BANNER_EASE} forwards;
    `}
`;

const BannerImage = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(160deg, #7a5c3e 0%, #3a2a1c 60%, #1c140c 100%);

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.5) 100%);
  }
`;

const BannerText = styled.div`
  position: absolute;
  left: 24px;
  bottom: 24px;
  /* 카드마다 폭이 달라도(앞 카드 기준 폭으로 고정) 줄바꿈이 똑같이 유지되도록
     자기 카드가 아니라 BannerStack 전체 폭을 기준으로 너비를 계산합니다.
     그래야 커졌다 작아졌다 할 때 텍스트가 한 줄↔두 줄로 갑자기 바뀌지 않습니다. */
  width: calc(100cqw - 64px);
  color: ${colors.white};
`;

const BannerRegion = styled.p`
  margin: 0 0 4px;
  font-size: 1rem;
  font-weight: 500;
  opacity: 0.7;
`;

const BannerTitle = styled.p`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
  /* 단어 중간(예: "화이트와인" → "화이"/"트와인")이 아니라 단어(공백) 단위로만 줄바꿈합니다. */
  word-break: keep-all;
  overflow-wrap: break-word;
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

const PromoBanner = styled.button<{ $prompt: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  /* PageContainer의 좌우 padding(16px)을 뚫고 화면 끝까지 꽉 채웁니다. */
  width: calc(100% + 32px);
  margin-left: -16px;
  margin-right: -16px;
  border: none;
  padding: 20px 16px;
  border-radius: 0;
  background-color: ${(props) => (props.$prompt ? colors.primary[50] : "#f3f4ec")};
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

const PromoIcon = styled.img<{ $prompt: boolean }>`
  flex-shrink: 0;
  width: ${(props) => (props.$prompt ? "82px" : "84px")};
  height: ${(props) => (props.$prompt ? "68px" : "60px")};
  object-fit: contain;
`;

const ScrollRow = styled.div<{ $large?: boolean }>`
  display: flex;
  gap: ${(props) => (props.$large ? "20px" : "10px")};
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

const SkeletonDots = styled.div`
  display: flex;
  justify-content: center;
  gap: 6px;
`;

const SkeletonScrollRow = styled.div`
  display: flex;
  gap: 10px;
  overflow: hidden;
`;

const SkeletonCompactCard = styled.div`
  flex-shrink: 0;
  width: 120px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SkeletonFeaturedCard = styled.div`
  flex-shrink: 0;
  width: 220px;
  border-radius: 8px;
  overflow: hidden;
  background-color: #ffffff;
  border: 1px solid ${colors.gray[100]};
`;

const SkeletonFeaturedBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
`;
