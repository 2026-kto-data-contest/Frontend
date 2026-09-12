import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styled from "styled-components";
import { useNavigate, useParams } from "react-router-dom";
import { colors } from "../../shared/styles/colors";
import { BackButton } from "../../shared/components/BackButton";
import { Badge } from "../../shared/components/Badge";
import { Snackbar } from "../../shared/components/Snackbar";
import { useLocalPreferences } from "../../shared/lib/preferences";
import {
  WINERIES,
  getWineryVisitLabel,
  getRepresentativeTypeLabel,
  buildSummaryBullets,
} from "../../shared/lib/mockWineries";
import type { DrinkProduct, ExperienceProgram } from "../../shared/lib/mockWineries";
import type { Winery } from "../../shared/lib/mockWineries";
import { loadKakaoMaps } from "../../shared/api/kakaoMaps";
import { fetchBreweryDetail, fetchBreweryProducts } from "../../shared/api/breweriesApi";
import { adaptBreweryToWinery } from "../../shared/api/adaptBrewery";
import watchIcon from "../../assets/icon/Watch.svg";
import cancelIcon from "../../assets/icon/Cancel.svg";
import liquorIcon from "../../assets/icon/Liquor.svg";
import eventIcon from "../../assets/icon/Event.svg";
import checkIcon from "../../assets/icon/Check.svg";
import callIcon from "../../assets/icon/Call.svg";
import webIcon from "../../assets/icon/Web.svg";
import topRightIcon from "../../assets/icon/TopRight.svg";
import awardIcon from "../../assets/icon/Award.svg";
import infoIcon from "../../assets/icon/Info.svg";
import downArrowIcon from "../../assets/icon/DownArrow.svg";
import pinIcon from "../../assets/icon/Pin.svg";
import priceIcon from "../../assets/icon/Price.svg";
import noneImage from "../../assets/img/NoneImage.png";

const HEADER_HEIGHT = 52;
const INTRO_LINE_LIMIT_CHARS = 120;
const DRINK_DESC_LIMIT_CHARS = 79;
const LIST_COLLAPSE_COUNT = 3;
const TOAST_DURATION_MS = 3000;

export default function WineryDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const preferences = useLocalPreferences();
  const mockWinery = WINERIES.find((item) => item.id === id);
  const [remoteWinery, setRemoteWinery] = useState<Winery | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const winery = mockWinery ?? remoteWinery ?? undefined;

  // 목데이터에 없는 id(BRW-xxx 등 실제 양조장)면 실제 백엔드에서 상세·제품을 가져와 같은 화면으로 그립니다.
  // (개발 모드 StrictMode의 이중 실행으로 느린 백엔드에 중복 요청이 몰리지 않도록 정리 시 실제로 요청을 끊습니다.)
  useEffect(() => {
    if (mockWinery || !id) return;
    const controller = new AbortController();
    setRemoteLoading(true);
    setRemoteWinery(null);
    Promise.all([
      fetchBreweryDetail(id, controller.signal),
      fetchBreweryProducts(id, 0, 50, controller.signal),
    ])
      .then(([detail, productsPage]) => {
        setRemoteWinery(adaptBreweryToWinery(detail, productsPage.content));
        setRemoteLoading(false);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("양조장 상세 조회 실패", error);
        setRemoteWinery(null);
        setRemoteLoading(false);
      });
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mockWinery]);

  const pageRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const mapElRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStartX = useRef<number | null>(null);

  const [scrolled, setScrolled] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [introExpanded, setIntroExpanded] = useState(false);
  const [drinksExpanded, setDrinksExpanded] = useState(false);
  const [experiencesExpanded, setExperiencesExpanded] = useState(false);
  const [expandedDrinkIds, setExpandedDrinkIds] = useState<Set<string>>(new Set());
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  const shareUrl = winery ? `${window.location.origin}/winery/${winery.id}` : "";

  useEffect(() => {
    if (!winery) return;
    const prevTitle = document.title;
    document.title = `${winery.name} - 전통주로`;
    return () => {
      document.title = prevTitle;
    };
  }, [winery]);

  // 이미지 영역을 지나 '양조장 소개' 위치까지 스크롤하면 헤더를 불투명하게 바꾸고 타이틀을 노출합니다.
  useEffect(() => {
    const pageEl = pageRef.current;
    if (!pageEl) return;
    let scrollParent: HTMLElement | null = pageEl.parentElement;
    while (scrollParent) {
      const style = getComputedStyle(scrollParent);
      if (style.overflowY === "auto" || style.overflowY === "scroll") break;
      scrollParent = scrollParent.parentElement;
    }
    if (!scrollParent) return;

    const handleScroll = () => {
      const introEl = introRef.current;
      if (!introEl) return;
      setScrolled(introEl.getBoundingClientRect().top <= HEADER_HEIGHT);
    };
    scrollParent.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => scrollParent?.removeEventListener("scroll", handleScroll);
  }, [winery?.id]);

  // 위치 섹션에 실제 카카오 지도 미리보기를 그립니다. 좌표가 없거나 SDK 로드에 실패하면 조용히 실패 상태만 표시합니다.
  useEffect(() => {
    if (!winery?.lat || !winery?.lng || !mapElRef.current) return;
    let cancelled = false;
    const lat = winery.lat;
    const lng = winery.lng;

    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !mapElRef.current) return;
        const position = new kakao.LatLng(lat, lng);
        const map = new kakao.Map(mapElRef.current, { center: position, level: 4 });
        new kakao.Marker({ map, position, title: winery.name });
        requestAnimationFrame(() => map.relayout());
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("카카오맵 로드 실패", error);
        setMapFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [winery?.id, winery?.lat, winery?.lng]);

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch {
      showToast("복사에 실패했어요. 다시 시도해주세요.");
    }
  };

  const summaryBullets = useMemo(() => (winery ? buildSummaryBullets(winery) : []), [winery]);
  const representativeType = useMemo(
    () => (winery ? getRepresentativeTypeLabel(winery, preferences.type) : ""),
    [winery, preferences.type]
  );
  const visitLabel = useMemo(() => (winery ? getWineryVisitLabel(winery) : null), [winery]);

  if (!winery) {
    return (
      <PageContainer>
        <PlainHeader>
          <BackButton onClick={() => navigate(-1)} />
        </PlainHeader>
        <NotFoundWrap>
          {remoteLoading ? (
            <NotFoundTitle>양조장 정보를 불러오는 중이에요...</NotFoundTitle>
          ) : (
            <>
              <NotFoundTitle>양조장을 찾을 수 없어요</NotFoundTitle>
              <NotFoundDesc>삭제되었거나 잘못된 경로예요.</NotFoundDesc>
            </>
          )}
        </NotFoundWrap>
      </PageContainer>
    );
  }

  // API에서 실제 사진을 받아오기 전까지는 항상 기본 이미지를 보여줍니다.
  const photoUrls = winery.photoUrls ?? [];
  const hasPhotos = photoUrls.length > 0;
  const slideCount = hasPhotos ? photoUrls.length : 1;

  const handleShare = async () => {
    const shareData = {
      title: winery.name,
      text: winery.intro ?? winery.description,
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // 사용자가 공유를 취소한 경우 등은 조용히 무시합니다.
      }
      return;
    }
    setShareSheetOpen(true);
  };

  const handleBannerPointerDown = (e: ReactPointerEvent) => {
    pointerStartX.current = e.clientX;
  };

  const handleBannerPointerUp = (e: ReactPointerEvent) => {
    if (pointerStartX.current === null) return;
    const delta = e.clientX - pointerStartX.current;
    pointerStartX.current = null;
    const SWIPE_THRESHOLD = 40;
    if (delta > SWIPE_THRESHOLD) {
      setImageIndex((prev) => (prev - 1 + slideCount) % slideCount);
    } else if (delta < -SWIPE_THRESHOLD) {
      setImageIndex((prev) => (prev + 1) % slideCount);
    }
  };

  const toggleDrinkExpanded = (drinkId: string) => {
    setExpandedDrinkIds((prev) => {
      const next = new Set(prev);
      if (next.has(drinkId)) next.delete(drinkId);
      else next.add(drinkId);
      return next;
    });
  };

  const drinks = winery.drinks ?? [];
  const visibleDrinks = drinksExpanded ? drinks : drinks.slice(0, LIST_COLLAPSE_COUNT);

  const experiences = winery.experiences ?? [];
  const visibleExperiences = experiencesExpanded
    ? experiences
    : experiences.slice(0, LIST_COLLAPSE_COUNT);

  const introText = winery.intro ?? winery.description;
  const introNeedsToggle = introText.length > INTRO_LINE_LIMIT_CHARS;

  const handleDirections = () => {
    const url =
      winery.lat && winery.lng
        ? `https://map.kakao.com/link/to/${encodeURIComponent(winery.name)},${winery.lat},${winery.lng}`
        : `https://map.kakao.com/link/search/${encodeURIComponent(winery.address ?? winery.detailRegion)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <PageContainer ref={pageRef}>
      <Header $solid={scrolled}>
        <BackButton onClick={() => navigate(-1)} onDark={!scrolled} />
        {scrolled && <HeaderTitle>{winery.name}</HeaderTitle>}
        <ShareButton type="button" aria-label="공유하기" $onDark={!scrolled} onClick={handleShare}>
          <ShareIcon viewBox="0 0 24 24" aria-hidden>
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81a3 3 0 1 0-3-3c0 .24.04.47.09.7L8.04 9.81A2.99 2.99 0 0 0 3 12a3 3 0 0 0 5.04 2.19l7.12 4.15c-.05.21-.08.43-.08.66a2.92 2.92 0 1 0 2.92-2.92z" />
          </ShareIcon>
        </ShareButton>
      </Header>

      <ImageCarousel onPointerDown={handleBannerPointerDown} onPointerUp={handleBannerPointerUp}>
        {hasPhotos ? (
          <>
            <ImageSlide src={photoUrls[imageIndex]} alt="" />
            {slideCount > 1 && (
              <ImageCounter>
                {imageIndex + 1}/{slideCount}
              </ImageCounter>
            )}
          </>
        ) : (
          <ImageSlide src={noneImage} alt="" />
        )}
      </ImageCarousel>

      <Body>
        <RegionText>{winery.detailRegion}</RegionText>
        <NameText>{winery.name}</NameText>

        {winery.badges && winery.badges.length > 0 && (
          <BadgeRow>
            {winery.badges.map((badge) => (
              <Badge key={badge} label={badge} tone="gray" />
            ))}
          </BadgeRow>
        )}

        <InfoCard>
          <InfoCell>
            <img src={liquorIcon} alt="" width={20} height={20} />
            <InfoLabel>대표주종</InfoLabel>
            <InfoValue>{representativeType}</InfoValue>
          </InfoCell>
          {visitLabel && (
            <InfoCell>
              <img src={eventIcon} alt="" width={20} height={20} />
              <InfoLabel>방문방식</InfoLabel>
              <InfoValue>{visitLabel}</InfoValue>
            </InfoCell>
          )}
        </InfoCard>

        {summaryBullets.length > 0 && (
          <SummaryCard>
            <SummaryTitle>이 양조장의 한 줄 요약</SummaryTitle>
            <SummaryList>
              {summaryBullets.map((bullet) => (
                <SummaryItem key={bullet}>
                  <img src={checkIcon} alt="" width={14} height={14} /> {bullet}
                </SummaryItem>
              ))}
            </SummaryList>
          </SummaryCard>
        )}

        <ActionRow>
          {winery.phone && (
            <ActionButton
              type="button"
              onClick={() => copyToClipboard(winery.phone!, "전화번호를 복사했어요!")}
            >
              <img src={callIcon} alt="" width={16} height={16} /> 번호 복사
            </ActionButton>
          )}
          {winery.homepageUrl && (
            <ActionButton
              type="button"
              onClick={() => window.open(winery.homepageUrl, "_blank", "noopener,noreferrer")}
            >
              <img src={webIcon} alt="" width={16} height={16} /> 홈페이지
            </ActionButton>
          )}
          <ActionButtonPrimary
            type="button"
            onClick={() => navigate(`/course/${winery.id}`, { state: { winery } })}
          >
            <TopRightIcon $src={topRightIcon} /> 코스보기
          </ActionButtonPrimary>
        </ActionRow>
      </Body>

      <Divider />

      <Section ref={introRef}>
        <SectionTitle>양조장 소개</SectionTitle>
        <IntroText $expanded={introExpanded}>{introText}</IntroText>
        {introNeedsToggle && (
          <ToggleTextButton type="button" onClick={() => setIntroExpanded((prev) => !prev)}>
            {introExpanded ? "접기" : "더보기"}{" "}
            <ChevronIcon src={downArrowIcon} alt="" $flip={introExpanded} />
          </ToggleTextButton>
        )}
      </Section>

      <Section>
        <SectionTitle>양조장의 술</SectionTitle>
        {drinks.length === 0 ? (
          <EmptyNotice>아직 등록된 술 정보가 없어요.</EmptyNotice>
        ) : (
          <>
            <DrinkList>
              {visibleDrinks.map((drink) => (
                <DrinkCard key={drink.id} drink={drink} />
              ))}
            </DrinkList>
            {drinks.length > LIST_COLLAPSE_COUNT && (
              <ToggleTextButton type="button" onClick={() => setDrinksExpanded((prev) => !prev)}>
                {drinksExpanded ? "접기" : "더보기"}{" "}
                <ChevronIcon src={downArrowIcon} alt="" $flip={drinksExpanded} />
              </ToggleTextButton>
            )}
          </>
        )}
      </Section>

      <Section>
        <SectionTitleRow>
          <SectionTitle>체험 프로그램</SectionTitle>
          <TooltipAnchor>
            <TooltipButton
              type="button"
              aria-label="체험 프로그램 안내"
              onClick={() => setTooltipOpen((prev) => !prev)}
            >
              <img src={infoIcon} alt="" width={14} height={14} />
            </TooltipButton>
            {tooltipOpen && (
              <TooltipBubble>
                <TooltipLine>프로그램 금액이 현장에서 변동될 수 있어요</TooltipLine>
                <TooltipLine>소요시간은 상황에 따라 변동될 수 있어요</TooltipLine>
              </TooltipBubble>
            )}
          </TooltipAnchor>
        </SectionTitleRow>
        {experiences.length === 0 ? (
          <EmptyNotice>아직 운영 중인 체험 프로그램이 없어요.</EmptyNotice>
        ) : (
          <>
            <ExperienceList>
              {visibleExperiences.map((program) => (
                <ExperienceCard key={program.id} program={program} />
              ))}
            </ExperienceList>
            {experiences.length > LIST_COLLAPSE_COUNT && (
              <ToggleTextButton
                type="button"
                onClick={() => setExperiencesExpanded((prev) => !prev)}
              >
                {experiencesExpanded ? "접기" : "더보기"}{" "}
                <ChevronIcon src={downArrowIcon} alt="" $flip={experiencesExpanded} />
              </ToggleTextButton>
            )}
          </>
        )}
      </Section>

      <Section>
        <SectionTitle>위치</SectionTitle>
        <AddressRow>
          <AddressText>{winery.address ?? winery.detailRegion}</AddressText>
          <CopyLinkButton
            type="button"
            onClick={() =>
              copyToClipboard(winery.address ?? winery.detailRegion, "주소를 복사했어요!")
            }
          >
            복사
          </CopyLinkButton>
        </AddressRow>
        <MapPreview>
          {winery.lat && winery.lng && !mapFailed ? (
            <MapEl ref={mapElRef} />
          ) : (
            <img src={pinIcon} alt="" width={32} height={32} />
          )}
          <MapExpandButton
            type="button"
            aria-label="지도 크게 보기"
            onClick={() => navigate(`/map?focus=${winery.id}`, { state: { winery } })}
          >
            <ExpandIcon viewBox="0 0 24 24" aria-hidden>
              <path d="M4 9V4h5M4 4l6 6M15 4h5v5M20 4l-6 6M20 15v5h-5M20 20l-6-6M9 20H4v-5M4 20l6-6" />
            </ExpandIcon>
          </MapExpandButton>
        </MapPreview>
        <LocationActionRow>
          <ActionButton type="button" onClick={handleDirections}>
            <TopRightIcon $src={topRightIcon} /> 길찾기
          </ActionButton>
          <ActionButtonPrimary
            type="button"
            onClick={() => navigate(`/course/${winery.id}`, { state: { winery } })}
          >
            추천코스 보기
          </ActionButtonPrimary>
        </LocationActionRow>
      </Section>

      {shareSheetOpen && (
        <ShareOverlay onClick={() => setShareSheetOpen(false)}>
          <ShareSheet onClick={(e) => e.stopPropagation()}>
            <ShareSheetHeader>
              <ShareSheetTitle>공유하기</ShareSheetTitle>
              <ShareSheetClose type="button" onClick={() => setShareSheetOpen(false)}>
                <img src={cancelIcon} alt="닫기" width={24} height={24} />
              </ShareSheetClose>
            </ShareSheetHeader>
            <ShareOptionRow>
              <ShareOptionButton
                type="button"
                onClick={() => {
                  setShareSheetOpen(false);
                  copyToClipboard(shareUrl, "링크를 복사했어요!");
                }}
              >
                <ShareOptionIcon $bg="#fee500" aria-hidden>
                  💬
                </ShareOptionIcon>
                카카오톡
              </ShareOptionButton>
              <ShareOptionButton
                type="button"
                onClick={() => {
                  setShareSheetOpen(false);
                  window.open(
                    `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(winery.name)}`,
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
              >
                <ShareOptionIcon $bg="#000000" $light aria-hidden>
                  𝕏
                </ShareOptionIcon>
                X
              </ShareOptionButton>
            </ShareOptionRow>
            <LinkCopyRow>
              <LinkInput readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
              <LinkCopyButton
                type="button"
                onClick={() => copyToClipboard(shareUrl, "링크를 복사했어요!")}
              >
                URL 복사
              </LinkCopyButton>
            </LinkCopyRow>
          </ShareSheet>
        </ShareOverlay>
      )}

      <Snackbar message={toast} />
    </PageContainer>
  );

  function DrinkCard({ drink }: { drink: DrinkProduct }) {
    const isExpanded = expandedDrinkIds.has(drink.id);
    const desc = drink.description ?? "";
    const needsToggle = desc.length > DRINK_DESC_LIMIT_CHARS;
    const awardLabel = drink.awardTier ? (drink.awardLabel ?? "수상") : null;

    return (
      <DrinkCardWrap>
        <DrinkCardHeader>
          <DrinkName>{drink.name}</DrinkName>
          {awardLabel && (
            <AwardInline>
              <img src={awardIcon} alt="" width={14} height={14} /> {awardLabel}
            </AwardInline>
          )}
        </DrinkCardHeader>
        <DrinkMeta>
          {drink.abv}·{drink.volume}·{drink.type}
        </DrinkMeta>
        {desc && (
          <>
            <DrinkDescription $expanded={isExpanded || !needsToggle}>{desc}</DrinkDescription>
            {needsToggle && (
              <InlineToggleButton type="button" onClick={() => toggleDrinkExpanded(drink.id)}>
                {isExpanded ? "접기" : "더보기"}{" "}
                <ChevronIcon src={downArrowIcon} alt="" $flip={isExpanded} />
              </InlineToggleButton>
            )}
          </>
        )}
        {drink.tags && drink.tags.length > 0 && (
          <DrinkTagRow>
            {drink.tags.map((tag) => (
              <Badge key={tag} label={tag} tone="gray" />
            ))}
          </DrinkTagRow>
        )}
      </DrinkCardWrap>
    );
  }

  function ExperienceCard({ program }: { program: ExperienceProgram }) {
    return (
      <ExperienceCardWrap>
        <ExperienceName>{program.name}</ExperienceName>
        <ExperienceDescription>{program.description}</ExperienceDescription>
        <ExperienceMeta>
          <MetaChip>
            <MaskIcon $src={watchIcon} $size={14} />
            {program.durationMinutes ? formatDuration(program.durationMinutes) : "문의 필요"}
          </MetaChip>
          {program.price !== undefined && (
            <MetaChip>
              <MaskIcon $src={priceIcon} $size={14} />
              {program.price.toLocaleString()}원
            </MetaChip>
          )}
        </ExperienceMeta>
      </ExperienceCardWrap>
    );
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}

const PageContainer = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: #ffffff;
`;

const PlainHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
`;

const Header = styled.div<{ $solid: boolean }>`
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  height: ${HEADER_HEIGHT}px;
  padding: 0 16px;
  box-sizing: border-box;
  background-color: ${(props) => (props.$solid ? "#ffffff" : "transparent")};
  border-bottom: ${(props) => (props.$solid ? `1px solid ${colors.gray[100]}` : "none")};
  transition: background-color 0.15s ease-in-out;
`;

const HeaderTitle = styled.h1`
  flex: 1;
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const ShareButton = styled.button<{ $onDark: boolean }>`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-left: auto;
  border: none;
  border-radius: 50%;
  background: ${(props) => (props.$onDark ? "rgba(0, 0, 0, 0.3)" : "transparent")};
  color: ${(props) => (props.$onDark ? "#ffffff" : colors.gray[900])};
  cursor: pointer;
`;

const ShareIcon = styled.svg`
  width: 18px;
  height: 18px;
  fill: currentColor;
`;

// currentColor로 재염색이 필요한 아이콘(고정 색상 SVG를 마스크로 씌워 배경색을 그대로 입힙니다).
const MaskIcon = styled.span<{ $src: string; $size?: number }>`
  display: inline-block;
  flex-shrink: 0;
  width: ${(props) => props.$size ?? 16}px;
  height: ${(props) => props.$size ?? 16}px;
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

const TopRightIcon = styled(MaskIcon).attrs({ $size: 14 })``;

const ChevronIcon = styled.img<{ $flip?: boolean }>`
  width: 12px;
  height: 12px;
  transform: rotate(${(props) => (props.$flip ? "180deg" : "0deg")});
  transition: transform 0.15s ease-in-out;
`;

const ImageCarousel = styled.div`
  position: relative;
  width: 100%;
  height: 260px;
  margin-top: -${HEADER_HEIGHT}px;
  touch-action: pan-y;
  overflow: hidden;
`;

const ImageSlide = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ImageCounter = styled.span`
  position: absolute;
  right: 12px;
  bottom: 12px;
  padding: 3px 8px;
  border-radius: 9999px;
  background-color: rgba(0, 0, 0, 0.5);
  color: #ffffff;
  font-size: 0.6875rem;
  font-weight: 600;
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  padding: 16px 16px 20px;
`;

const RegionText = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  color: ${colors.gray[400]};
`;

const NameText = styled.h2`
  margin: 4px 0 0;
  font-size: 1.375rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
`;

const InfoCard = styled.div`
  display: flex;
  margin-top: 16px;
  border: 1px solid ${colors.gray[100]};
  border-radius: 12px;
  overflow: hidden;
`;

const InfoCell = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 14px 8px;
  text-align: center;

  & + & {
    border-left: 1px solid ${colors.gray[100]};
  }
`;

const InfoLabel = styled.span`
  font-size: 0.6875rem;
  color: ${colors.gray[400]};
`;

const InfoValue = styled.span`
  font-size: 0.875rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const SummaryCard = styled.div`
  margin-top: 16px;
  padding: 16px;
  border-radius: 12px;
  background-color: ${colors.gray[50]};
`;

const SummaryTitle = styled.p`
  margin: 0 0 8px;
  font-size: 0.875rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const SummaryList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SummaryItem = styled.li`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  color: ${colors.gray[600]};
  line-height: 1.5;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`;

const ActionButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px;
  border: 1px solid ${colors.gray[200]};
  border-radius: 8px;
  background-color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${colors.gray[700]};
  cursor: pointer;
  white-space: nowrap;
`;

const ActionButtonPrimary = styled(ActionButton)`
  border-color: transparent;
  background-color: #ff7a00;
  color: #ffffff;

  &:disabled {
    background-color: ${colors.gray[200]};
    color: ${colors.gray[400]};
    cursor: not-allowed;
  }
`;

const Divider = styled.div`
  height: 8px;
  background-color: ${colors.gray[50]};
`;

const Section = styled.section`
  padding: 24px 16px;

  & + & {
    border-top: 1px solid ${colors.gray[100]};
  }
`;

const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
`;

const SectionTitle = styled.h3`
  margin: 0 0 12px;
  font-size: 1rem;
  font-weight: 700;
  color: ${colors.gray[900]};

  ${SectionTitleRow} & {
    margin-bottom: 0;
  }
`;

const IntroText = styled.p<{ $expanded: boolean }>`
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: ${colors.gray[600]};
  white-space: pre-line;
  ${(props) =>
    !props.$expanded &&
    `
    display: -webkit-box;
    -webkit-line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `}
`;

const ToggleTextButton = styled.button`
  display: flex;
  align-items: center;
  gap: 2px;
  margin: 12px auto 0;
  padding: 6px 14px;
  border: 1px solid ${colors.gray[200]};
  border-radius: 9999px;
  background: #ffffff;
  font-size: 0.8125rem;
  color: ${colors.gray[600]};
  cursor: pointer;
`;

const EmptyNotice = styled.p`
  margin: 8px 0;
  font-size: 0.8125rem;
  color: ${colors.gray[400]};
`;

const DrinkList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DrinkCardWrap = styled.div`
  padding: 14px;
  border: 1px solid ${colors.gray[100]};
  border-radius: 12px;
`;

const DrinkCardHeader = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`;

const DrinkName = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const DrinkMeta = styled.p`
  margin: 4px 0 0;
  font-size: 0.75rem;
  color: ${colors.gray[400]};
`;

const DrinkDescription = styled.p<{ $expanded: boolean }>`
  margin: 8px 0 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: ${colors.gray[600]};
  ${(props) =>
    !props.$expanded &&
    `
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `}
`;

const InlineToggleButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: 4px;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${colors.gray[400]};
  cursor: pointer;
`;

const DrinkTagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
`;

const AwardInline = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #ff7a00;
  font-size: 0.8125rem;
  font-weight: 700;
  white-space: nowrap;
`;

const TooltipAnchor = styled.div`
  position: relative;
`;

const TooltipButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: ${colors.gray[100]};
  color: ${colors.gray[500]};
  font-size: 0.6875rem;
  cursor: pointer;
`;

const TooltipBubble = styled.div`
  position: absolute;
  top: 24px;
  left: 0;
  z-index: 5;
  width: 264px;
  padding: 12px 14px;
  border-radius: 10px;
  background-color: rgba(23, 23, 22, 0.92);
  color: #ffffff;
  font-size: 0.8125rem;
  line-height: 1.6;
`;

const TooltipLine = styled.p`
  margin: 0;
  padding-left: 12px;
  text-indent: -12px;

  &::before {
    content: "· ";
  }
`;

const ExperienceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ExperienceCardWrap = styled.div`
  padding: 14px;
  border: 1px solid ${colors.gray[100]};
  border-radius: 12px;
`;

const ExperienceName = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const ExperienceDescription = styled.p`
  margin: 4px 0 0;
  font-size: 0.8125rem;
  color: ${colors.gray[500]};
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
`;

const ExperienceMeta = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const MetaChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${colors.gray[900]};
`;

const AddressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AddressText = styled.p`
  flex: 1;
  margin: 0;
  font-size: 0.875rem;
  color: ${colors.gray[700]};
`;

const CopyLinkButton = styled.button`
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

const MapPreview = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 160px;
  margin-top: 12px;
  border-radius: 12px;
  background-color: ${colors.gray[50]};
  overflow: hidden;
`;

const MapEl = styled.div`
  width: 100%;
  height: 100%;
`;

const MapExpandButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
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

const LocationActionRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

const NotFoundWrap = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

const NotFoundTitle = styled.p`
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const NotFoundDesc = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  color: ${colors.gray[400]};
`;

const ShareOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background-color: rgba(0, 0, 0, 0.4);
`;

const ShareSheet = styled.div`
  margin-top: auto;
  display: flex;
  flex-direction: column;
  padding: 16px 16px 24px;
  border-radius: 20px 20px 0 0;
  background-color: #ffffff;
  box-sizing: border-box;
`;

const ShareSheetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const ShareSheetTitle = styled.p`
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const ShareSheetClose = styled.button`
  display: flex;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
`;

const ShareOptionRow = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
`;

const ShareOptionButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  font-size: 0.75rem;
  color: ${colors.gray[700]};
  cursor: pointer;
`;

const ShareOptionIcon = styled.span<{ $bg: string; $light?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: ${(props) => props.$bg};
  color: ${(props) => (props.$light ? "#ffffff" : "#191919")};
  font-size: 1.25rem;
`;

const LinkCopyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 4px 14px;
  border: 1px solid ${colors.gray[200]};
  border-radius: 9999px;
`;

const LinkInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.8125rem;
  color: ${colors.gray[600]};
`;

const LinkCopyButton = styled.button`
  flex-shrink: 0;
  padding: 8px 14px;
  border: none;
  border-radius: 9999px;
  background-color: #ff7a00;
  color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
`;
