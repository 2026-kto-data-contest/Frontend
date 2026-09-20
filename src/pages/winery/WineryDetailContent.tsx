import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { colors } from "../../shared/styles/colors";
import { BackButton } from "../../shared/components/BackButton";
import { Badge } from "../../shared/components/Badge";
import { Snackbar } from "../../shared/components/Snackbar";
import { useLocalPreferences } from "../../shared/lib/preferences";
import {
  getWineryVisitLabel,
  getRepresentativeTypeLabel,
  buildSummaryBullets,
} from "../../shared/lib/mockWineries";
import type { DrinkProduct, ExperienceProgram, Winery } from "../../shared/lib/mockWineries";
import { loadKakaoMaps } from "../../shared/api/kakaoMaps";
import timeIcon from "../../assets/icon/Time.svg";
import cancelIcon from "../../assets/icon/Cancel.svg";
import liquorIcon from "../../assets/icon/Liquor.svg";
import eventIcon from "../../assets/icon/Event.svg";
import checkIcon from "../../assets/icon/Check.svg";
import articleIcon from "../../assets/icon/Article.svg";
import webIcon from "../../assets/icon/Web.svg";
import topRightIcon from "../../assets/icon/TopRight.svg";
import awardIcon from "../../assets/icon/Award.svg";
import infoIcon from "../../assets/icon/Info.svg";
import downArrowIcon from "../../assets/icon/DownArrow.svg";
import pinIcon from "../../assets/icon/Pin.svg";
import priceIcon from "../../assets/icon/Price.svg";
import uploadIcon from "../../assets/icon/Upload.svg";
import noneImage from "../../assets/img/NoneImage.png";

// WineryDetailPage(독립 페이지)의 고정 헤더 높이만큼, 스크롤이 그 밑을 지나면 헤더에 이름을
// 노출하라고 onScrolledChange로 알려줍니다. Map.tsx의 풀시트 임베드에는 그런 헤더가 없어서
// 그냥 콜백을 안 넘기면 됩니다.
const SCROLL_HEADER_OFFSET = 56;
const DRINK_DESC_LIMIT_CHARS = 79;
const LIST_COLLAPSE_COUNT = 3;
const TOAST_DURATION_MS = 3000;

export interface WineryDetailContentHandle {
  // WineryDetailPage(독립 페이지)가 자기 헤더의 공유 아이콘에서 이 안의 공유 로직(네이티브
  // 공유 → 실패/미지원 시 ShareOverlay 대체 시트)을 그대로 재사용하기 위한 핸들입니다.
  share: () => void;
}

// 양조장 상세 내용(사진·기본 정보·한 줄 요약·술·체험·위치)을 그리는, 데이터만 있으면 어디서든
// 쓸 수 있는 컴포넌트입니다. WineryDetailPage(독립 페이지)와 Map.tsx(지도 바텀시트를 풀시트로
// 끌어올렸을 때)가 이 컴포넌트를 그대로 재사용합니다 — 그래서 지도 쪽에서 아무 페이지 이동 없이
// 같은 내용을 시트 안에서 바로 보여줄 수 있습니다.
export const WineryDetailContent = forwardRef<
  WineryDetailContentHandle,
  {
    winery: Winery;
    onScrolledChange?: (scrolled: boolean) => void;
    // Map.tsx가 지도 바텀시트를 풀시트로 끌어올려 이 컴포넌트를 끼워 넣을 때만 넘깁니다 —
    // 그때만 이 컴포넌트 자체에 뒤로가기·공유 아이콘이 있는 작은 헤더 줄을 그립니다.
    // WineryDetailPage(독립 페이지)는 이미 자기 헤더가 있어서 넘기지 않고, 그러면 이 줄도 그려지지 않습니다.
    onBack?: () => void;
  }
>(function WineryDetailContent({ winery, onScrolledChange, onBack }, ref) {
  const navigate = useNavigate();
  const preferences = useLocalPreferences();

  const rootRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const mapElRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStartX = useRef<number | null>(null);

  const [imageIndex, setImageIndex] = useState(0);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [drinksExpanded, setDrinksExpanded] = useState(false);
  const [experiencesExpanded, setExperiencesExpanded] = useState(false);
  const [expandedDrinkIds, setExpandedDrinkIds] = useState<Set<string>>(new Set());
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  const shareUrl = `${window.location.origin}/winery/${winery.id}`;

  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${winery.name} - 전통주로`;
    return () => {
      document.title = prevTitle;
    };
  }, [winery]);

  // 이미지 영역을 지나 '양조장 소개' 위치까지 스크롤하면 onScrolledChange로 알려줍니다
  // (WineryDetailPage는 이걸로 헤더를 불투명하게 바꾸고 타이틀을 노출합니다).
  useEffect(() => {
    if (!onScrolledChange) return;
    const rootEl = rootRef.current;
    if (!rootEl) return;
    let scrollParent: HTMLElement | null = rootEl.parentElement;
    while (scrollParent) {
      const style = getComputedStyle(scrollParent);
      if (style.overflowY === "auto" || style.overflowY === "scroll") break;
      scrollParent = scrollParent.parentElement;
    }
    if (!scrollParent) return;

    const handleScroll = () => {
      const introEl = introRef.current;
      if (!introEl) return;
      onScrolledChange(introEl.getBoundingClientRect().top <= SCROLL_HEADER_OFFSET);
    };
    scrollParent.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => scrollParent?.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winery.id, onScrolledChange]);

  // 위치 섹션에 실제 카카오 지도 미리보기를 그립니다. 좌표가 없거나 SDK 로드에 실패하면 조용히 실패 상태만 표시합니다.
  useEffect(() => {
    if (!winery.lat || !winery.lng || !mapElRef.current) return;
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
  }, [winery.id, winery.lat, winery.lng, winery.name]);

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

  const summaryBullets = useMemo(() => buildSummaryBullets(winery), [winery]);
  const representativeType = useMemo(
    () => getRepresentativeTypeLabel(winery, preferences.type),
    [winery, preferences.type]
  );
  const visitLabel = useMemo(() => getWineryVisitLabel(winery), [winery]);

  // API에서 실제 사진을 받아오기 전까지는 항상 기본 이미지를 보여줍니다.
  const photoUrls = winery.photoUrls ?? [];
  const hasPhotos = photoUrls.length > 0;
  const slideCount = hasPhotos ? photoUrls.length : 1;

  const handleShare = useCallback(async () => {
    // text에 소개글을 넣으면 일부 공유 대상(문자 메시지 등)이 제목·본문·링크를 구분 없이
    // 한 줄로 이어붙여 보내버려서, 링크만 깔끔하게 전달되도록 제목과 URL만 넘깁니다.
    const shareData = {
      title: winery.name,
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
  }, [winery.name, shareUrl]);

  useImperativeHandle(ref, () => ({ share: handleShare }), [handleShare]);

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

  const handleDirections = () => {
    const url =
      winery.lat && winery.lng
        ? `https://map.kakao.com/link/to/${encodeURIComponent(winery.name)},${winery.lat},${winery.lng}`
        : `https://map.kakao.com/link/search/${encodeURIComponent(winery.address ?? winery.detailRegion)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <ContentRoot ref={rootRef}>
      {onBack && (
        <EmbeddedHeader>
          <BackButton onClick={onBack} />
          <EmbeddedHeaderShareButton type="button" aria-label="공유하기" onClick={handleShare}>
            <img src={uploadIcon} alt="" width={24} height={24} />
          </EmbeddedHeaderShareButton>
        </EmbeddedHeader>
      )}

      <ImageCarouselWrap>
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
      </ImageCarouselWrap>

      <Body>
        <RegionText>{winery.detailRegion}</RegionText>
        <NameText>{winery.name}</NameText>

        {winery.badges && winery.badges.length > 0 && (
          <BadgeRow>
            {winery.badges.map((badge) => (
              <Badge key={badge} label={badge} tone="gray" shape="flat" size="md" />
            ))}
          </BadgeRow>
        )}

        <InfoCard>
          <InfoCell>
            <img src={liquorIcon} alt="" width={24} height={24} />
            <InfoLabel>대표주종</InfoLabel>
            <InfoValue>{representativeType}</InfoValue>
          </InfoCell>
          {visitLabel && (
            <>
              <InfoDivider />
              <InfoCell>
                <img src={eventIcon} alt="" width={24} height={24} />
                <InfoLabel>방문방식</InfoLabel>
                <InfoValue>{visitLabel}</InfoValue>
              </InfoCell>
            </>
          )}
        </InfoCard>

        {summaryBullets.length > 0 && (
          <SummaryCard>
            <SummaryTitle>이 양조장의 한 줄 요약</SummaryTitle>
            <SummaryList>
              {summaryBullets.map((bullet, index) => (
                <SummaryItem key={bullet} $first={index === 0}>
                  <img src={checkIcon} alt="" width={16} height={16} /> {bullet}
                </SummaryItem>
              ))}
            </SummaryList>
          </SummaryCard>
        )}

        <ActionRow>
          <ActionButton
            type="button"
            disabled={!winery.phone}
            onClick={() => winery.phone && copyToClipboard(winery.phone, "전화번호를 복사했어요!")}
          >
            <img src={articleIcon} alt="" width={20} height={20} /> 연락처
          </ActionButton>
          <ActionButton
            type="button"
            disabled={!winery.homepageUrl}
            onClick={() =>
              winery.homepageUrl &&
              window.open(winery.homepageUrl, "_blank", "noopener,noreferrer")
            }
          >
            <img src={webIcon} alt="" width={20} height={20} /> 홈페이지
          </ActionButton>
          <ActionButton
            type="button"
            onClick={() => navigate(`/course/${winery.id}`, { state: { winery } })}
          >
            <MaskIcon $src={topRightIcon} $size={20} /> 코스보기
          </ActionButton>
        </ActionRow>
      </Body>

      <Divider ref={introRef} />

      {introText && (
        <>
          <Section>
            <SectionTitle>양조장 소개</SectionTitle>
            <IntroText>{introText}</IntroText>
          </Section>

          <Divider />
        </>
      )}

      <Section>
        <SectionTitle>양조장의 술</SectionTitle>
        {drinks.length === 0 ? (
          <EmptyNotice>아직 등록된 술 정보가 없어요.</EmptyNotice>
        ) : (
          <>
            <DrinkList>
              {visibleDrinks.map((drink) => (
                <DrinkCard
                  key={drink.id}
                  drink={drink}
                  expanded={expandedDrinkIds.has(drink.id)}
                  onToggle={() => toggleDrinkExpanded(drink.id)}
                />
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

      {experiences.length > 0 && (
        <>
          <Divider />

          <Section>
            <SectionTitleRow>
              <SectionTitle>체험 프로그램</SectionTitle>
              <TooltipAnchor>
                <TooltipButton
                  type="button"
                  aria-label="체험 프로그램 안내"
                  onClick={() => setTooltipOpen((prev) => !prev)}
                >
                  <img src={infoIcon} alt="" width={16} height={16} />
                </TooltipButton>
                {tooltipOpen && (
                  <TooltipBubble>
                    <TooltipLine>프로그램 금액이 현장에서 변동될 수 있어요</TooltipLine>
                    <TooltipLine>소요시간은 상황에 따라 변동될 수 있어요</TooltipLine>
                  </TooltipBubble>
                )}
              </TooltipAnchor>
            </SectionTitleRow>
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
          </Section>
        </>
      )}

      <Divider />

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
          <DirectionsButton type="button" onClick={handleDirections}>
            <TopRightIcon $src={topRightIcon} /> 길찾기
          </DirectionsButton>
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
    </ContentRoot>
  );
});

function DrinkCard({
  drink,
  expanded,
  onToggle,
}: {
  drink: DrinkProduct;
  expanded: boolean;
  onToggle: () => void;
}) {
  const desc = drink.description ?? "";
  const needsToggle = desc.length > DRINK_DESC_LIMIT_CHARS;
  const awardLabel = drink.awardTier ? (drink.awardLabel ?? "수상") : null;

  return (
    <DrinkCardWrap>
      <DrinkCardHeader>
        <DrinkName>{drink.name}</DrinkName>
        {awardLabel && (
          <AwardInline>
            <img src={awardIcon} alt="" width={16} height={16} /> {awardLabel}
          </AwardInline>
        )}
      </DrinkCardHeader>
      <DrinkMeta>
        {drink.abv}·{drink.volume}·{drink.type}
      </DrinkMeta>
      {desc && (
        <>
          <DrinkDescription $expanded={expanded || !needsToggle}>{desc}</DrinkDescription>
          {needsToggle && (
            <InlineToggleButton type="button" onClick={onToggle}>
              {expanded ? "접기" : "더보기"} <ChevronIcon src={downArrowIcon} alt="" $flip={expanded} />
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
        <TimeChip>
          <img src={timeIcon} alt="" width={16} height={16} />
          {program.durationMinutes ? formatDuration(program.durationMinutes) : "-"}
        </TimeChip>
        <PriceChip>
          <MaskIcon $src={priceIcon} $size={16} />
          {program.price !== undefined ? `${program.price.toLocaleString()}원` : "문의 필요"}
        </PriceChip>
      </ExperienceMeta>
    </ExperienceCardWrap>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}

// 실제 박스를 만들지 않는 순수 ref 앵커입니다 — 스크롤 컨테이너를 찾기 위한 rootRef만 필요할 뿐,
// 레이아웃(페이지든 지도 시트든 그 부모가 이미 잡고 있는)에는 관여하지 않아야 합니다.
const ContentRoot = styled.div`
  display: contents;
`;

// currentColor로 재염색이 필요한 아이콘(고정 색상 SVG를 마스크로 씌워 배경색을 그대로 입힙니다).
const MaskIcon = styled.span<{ $src: string; $size?: number; $color?: string }>`
  display: inline-block;
  flex-shrink: 0;
  width: ${(props) => props.$size ?? 16}px;
  height: ${(props) => props.$size ?? 16}px;
  color: ${(props) => props.$color ?? "inherit"};
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

const TopRightIcon = styled(MaskIcon).attrs({ $size: 20 })``;

const ChevronIcon = styled.img<{ $flip?: boolean }>`
  width: 12px;
  height: 12px;
  transform: rotate(${(props) => (props.$flip ? "180deg" : "0deg")});
  transition: transform 0.15s ease-in-out;
`;

// Map.tsx에 풀시트로 끼워 넣었을 때만 쓰는, 뒤로가기(시트를 mid로 접기)·공유 아이콘 줄입니다.
// WineryDetailPage의 고정 헤더와 같은 자리를 대신하는 것이라 그 Header와 같은 높이를 씁니다.
const EmbeddedHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: ${SCROLL_HEADER_OFFSET}px;
  padding: 8px 16px;
  box-sizing: border-box;
`;

const EmbeddedHeaderShareButton = styled.button`
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

const ImageCarouselWrap = styled.div`
  padding: 0 16px;
`;

const ImageCarousel = styled.div`
  position: relative;
  width: 100%;
  height: 260px;
  border-radius: 16px;
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
  right: 8px;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-radius: 9999px;
  background-color: rgba(0, 0, 0, 0.45);
  color: #ffffff;
  font-size: 0.6875rem;
  line-height: 1;
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  padding: 16px 16px 32px;
`;

const RegionText = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 140%;
  color: ${colors.info.text};
`;

const NameText = styled.h2`
  margin: 4px 0 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 132%;
  letter-spacing: -0.48px;
  color: ${colors.black};
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
`;

const InfoCard = styled.div`
  display: flex;
  align-items: center;
  margin-top: 16px;
`;

const InfoCell = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px;
  text-align: center;
`;

const InfoDivider = styled.div`
  flex-shrink: 0;
  width: 1px;
  height: 64px;
  background-color: ${colors.gray[100]};
`;

const InfoLabel = styled.span`
  font-size: 11px;
  line-height: 1;
  color: ${colors.gray[500]};
`;

const InfoValue = styled.span`
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  color: ${colors.gray[900]};
`;

const SummaryCard = styled.div`
  margin-top: 16px;
  padding: 16px;
  border-radius: 8px;
  background-color: ${colors.gray[50]};
`;

const SummaryTitle = styled.p`
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.black};
`;

const SummaryList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SummaryItem = styled.li<{ $first?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  line-height: 1;
  color: ${(props) => (props.$first ? colors.gray[500] : colors.gray[600])};
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
  padding: 10px 16px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background-color: #ffffff;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${colors.gray[900]};
  cursor: pointer;
  white-space: nowrap;

  &:disabled {
    color: ${colors.gray[300]};
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const ActionButtonPrimary = styled(ActionButton)`
  border-color: transparent;
  background-color: ${colors.primary[500]};
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
  padding: 32px 16px;
`;

const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
`;

const SectionTitle = styled.h3`
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  line-height: 140%;
  letter-spacing: -0.36px;
  color: ${colors.gray[900]};

  ${SectionTitleRow} & {
    margin-bottom: 0;
  }
`;

const IntroText = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 400;
  line-height: 140%;
  letter-spacing: -0.32px;
  color: ${colors.gray[500]};
  white-space: pre-line;
`;

const ToggleTextButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 8px auto 0;
  padding: 8px 0;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.black};
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
  gap: 16px;
`;

const DrinkCardWrap = styled.div`
  padding: 16px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
`;

const DrinkCardHeader = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`;

const DrinkName = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 140%;
  letter-spacing: -0.32px;
  color: ${colors.gray[900]};
`;

const DrinkMeta = styled.p`
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 140%;
  color: ${colors.info.text};
`;

const DrinkDescription = styled.p<{ $expanded: boolean }>`
  margin: 8px 0 0;
  font-size: 14px;
  font-weight: 300;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.gray[500]};
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
  margin-top: 16px;
`;

const AwardInline = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: ${colors.primary[700]};
  font-size: 12px;
  font-weight: 700;
  line-height: 140%;
  white-space: nowrap;
`;

const TooltipAnchor = styled.div`
  position: relative;
`;

const TooltipButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
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
  gap: 15px;
`;

const ExperienceCardWrap = styled.div`
  padding: 16px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
`;

const ExperienceName = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 140%;
  letter-spacing: -0.32px;
  color: ${colors.gray[900]};
`;

const ExperienceDescription = styled.p`
  margin: 8px 0 0;
  font-size: 14px;
  font-weight: 300;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.gray[500]};
`;

const ExperienceMeta = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
`;

const TimeChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 300;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.gray[500]};
`;

const PriceChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.gray[900]};
`;

const AddressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const AddressText = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 300;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.gray[900]};
`;

const CopyLinkButton = styled.button`
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.gray[500]};
  text-decoration: underline;
  cursor: pointer;
`;

const MapPreview = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 300px;
  margin-top: 16px;
  border-radius: 8px;
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
  margin-top: 16px;
  padding-bottom: 25px;
`;

const DirectionsButton = styled(ActionButton)`
  flex: none;
  width: 120px;
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
  background-color: ${colors.primary[500]};
  color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
`;
