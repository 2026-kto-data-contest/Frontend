import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { ErrorState } from "../../shared/components/ErrorState";
import { Skeleton } from "../../shared/components/Skeleton";
import { WineryCard } from "../../shared/components/WineryCard";
import { Button } from "../../shared/components/Button";
import { BackButton } from "../../shared/components/BackButton";
import searchIcon from "../../assets/icon/Search.svg";
import watchIcon from "../../assets/icon/Watch.svg";
import removeIcon from "../../assets/icon/Remove.svg";
import downArrowIcon from "../../assets/icon/DownArrow.svg";
import upArrowIcon from "../../assets/icon/UpArrow.svg";
import mapIcon from "../../assets/icon/Map.svg";
import rightArrowIcon from "../../assets/icon/RightArrow.svg";
import cancelIcon from "../../assets/icon/Cancel.svg";
import { colors } from "../../shared/styles/colors";
import { resolveImageUrl } from "../../shared/api/api";
import { ALL_REGION_FILTERS } from "../../shared/lib/mockWineries";
import {
  breweryToCardData,
  fetchRecommendedBreweries,
  fetchBreweries,
} from "../../shared/api/breweriesApi";
import type { BreweryListItem } from "../../shared/api/breweriesApi";
import {
  searchBreweries,
  fetchSearchSuggestions,
  fetchRecentSearches,
  saveRecentSearch,
  deleteRecentSearch,
  deleteAllRecentSearches,
  fetchRecommendedKeywords,
} from "../../shared/api/searchApi";
import type { SearchSuggestion, RecentSearch, RecentSearchInput } from "../../shared/api/searchApi";
import { useAuth } from "../../shared/lib/authContext";
import { usePersistentState, useLocalStorageState } from "../../shared/lib/pageState";
import { findMatchRange, getChosung, isChosungOnly } from "../../shared/lib/hangul";

type Phase = "idle" | "typing" | "loading" | "results" | "empty" | "error";

const INITIAL_RECENT: string[] = [];
const RECENT_VISIBLE_COUNT = 4;
const RECENT_MAX_COUNT = 10;
const QUERY_MAX_LENGTH = 20;
const SUGGESTION_DEBOUNCE_MS = 200;

function HighlightedText({ text, match }: { text: string; match: string }) {
  const range = findMatchRange(text, match);
  if (!range) return <>{text}</>;
  return (
    <>
      {text.slice(0, range.index)}
      <Highlight>{text.slice(range.index, range.index + range.length)}</Highlight>
      {text.slice(range.index + range.length)}
    </>
  );
}

export default function SearchPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [query, setQuery] = usePersistentState("search:query", "");
  const [submittedQuery, setSubmittedQuery] = usePersistentState("search:submittedQuery", "");
  const [phase, setPhase] = usePersistentState<Phase>("search:phase", "idle");
  const [localRecent, setLocalRecent] = useLocalStorageState<string[]>(
    "search:recentSearches",
    INITIAL_RECENT
  );
  const [remoteRecent, setRemoteRecent] = useState<RecentSearch[]>([]);
  const [recentExpanded, setRecentExpanded] = usePersistentState("search:recentExpanded", false);
  const [confirmingClearAll, setConfirmingClearAll] = useState(false);
  const [results, setResults] = usePersistentState<BreweryListItem[]>("search:results", []);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recommended, setRecommended] = useState<BreweryListItem[]>([]);
  const [recommendedKeywords, setRecommendedKeywords] = useState<string[]>([]);
  // 백엔드 연관검색어 API는 자음(초성)만 있는 검색어는 매칭을 못 해서(예: "ㄱ" → 빈 배열),
  // 초성만 입력했을 때는 양조장 목록을 미리 받아둔 걸로 프론트에서 직접 초성 매칭합니다.
  const breweryCorpusRef = useRef<BreweryListItem[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchRecommendedBreweries(0, 6, controller.signal)
      .then((page) => {
        if (page.content.length >= 6) {
          setRecommended(page.content);
          return;
        }
        // 추천 양조장이 6개보다 적게 오면, 일반 목록에서 무작위로 채워 항상 6개를 보여줍니다.
        const usedIds = new Set(page.content.map((item) => item.breweryId));
        fetchBreweries({ page: 0, size: 50 }, controller.signal)
          .then((fallback) => {
            const extras = fallback.content
              .filter((item) => !usedIds.has(item.breweryId))
              .sort(() => Math.random() - 0.5)
              .slice(0, 6 - page.content.length);
            setRecommended([...page.content, ...extras]);
          })
          .catch((error) => {
            if (error instanceof DOMException && error.name === "AbortError") return;
            setRecommended(page.content);
          });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRecommended([]);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchRecommendedKeywords(controller.signal)
      .then((list) => setRecommendedKeywords(list.map((item) => item.keyword)))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRecommendedKeywords([]);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    // 검색창을 누른 다음(초성 입력 시점)에야 불러오면 그때부터 로딩이 보여서, 검색 페이지에
    // 들어오자마자 미리 받아둡니다.
    const controller = new AbortController();
    fetchBreweries({ page: 0, size: 200 }, controller.signal)
      .then((page) => {
        breweryCorpusRef.current = page.content;
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setRemoteRecent([]);
      return;
    }
    const controller = new AbortController();
    fetchRecentSearches(RECENT_MAX_COUNT, controller.signal)
      .then(setRemoteRecent)
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("최근 검색어 조회 실패", error);
        setRemoteRecent([]);
      });
    return () => controller.abort();
  }, [isLoggedIn]);

  useEffect(() => {
    const trimmed = query.trim();
    if (phase !== "typing" || !trimmed) {
      setSuggestions([]);
      return;
    }

    // 초성만 입력한 경우: 백엔드가 못 하는 초성 매칭을 양조장 목록으로 직접 합니다.
    if (isChosungOnly(trimmed)) {
      let cancelled = false;
      const applyChosungMatch = (corpus: BreweryListItem[]) => {
        if (cancelled) return;
        const matched: SearchSuggestion[] = corpus
          .filter((brewery) => getChosung(brewery.businessName).includes(trimmed))
          .slice(0, 10)
          .map((brewery) => ({
            type: "BREWERY",
            id: brewery.breweryId,
            keyword: brewery.businessName,
            displayName: brewery.businessName,
          }));
        setSuggestions(matched);
      };
      if (breweryCorpusRef.current) {
        applyChosungMatch(breweryCorpusRef.current);
      } else {
        fetchBreweries({ page: 0, size: 200 })
          .then((page) => {
            breweryCorpusRef.current = page.content;
            applyChosungMatch(page.content);
          })
          .catch(() => {
            if (!cancelled) setSuggestions([]);
          });
      }
      return () => {
        cancelled = true;
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchSearchSuggestions(trimmed, controller.signal)
        .then((list) => setSuggestions(list))
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setSuggestions([]);
        });
    }, SUGGESTION_DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, phase]);

  const runSearch = (keyword: string, suggestion?: SearchSuggestion) => {
    const trimmed = keyword.trim().slice(0, QUERY_MAX_LENGTH);
    if (!trimmed) return;

    setQuery(trimmed);
    setSubmittedQuery(trimmed);
    setPhase("loading");

    searchBreweries(trimmed)
      .then((page) => {
        setResults(page.content);
        setPhase(page.content.length > 0 ? "results" : "empty");
      })
      .catch((error) => {
        console.error("검색 실패", error);
        setPhase("error");
      });

    // 자동완성 항목이면 실제 대상(type·id)을 그대로 저장합니다. 자유 입력 검색은 대상을
    // 특정할 수 없는데, 백엔드는 REGION 타입도 id·displayName이 지원하는 8개 지역명과
    // 정확히 같아야만 받아줘서(그 외엔 400) 지역명이 아닌 자유 입력은 저장을 건너뜁니다.
    const displayName = suggestion?.displayName ?? trimmed;
    const remoteEntry: RecentSearchInput | null = suggestion
      ? {
          type: suggestion.type,
          id: suggestion.id,
          keyword: suggestion.keyword,
          displayName: suggestion.displayName,
        }
      : (ALL_REGION_FILTERS as readonly string[]).includes(trimmed)
        ? { type: "REGION", id: trimmed, keyword: trimmed, displayName: trimmed }
        : null;

    if (isLoggedIn && remoteEntry) {
      saveRecentSearch(remoteEntry)
        .then((saved) => {
          setRemoteRecent((prev) =>
            [
              saved,
              ...prev.filter((item) => !(item.type === saved.type && item.id === saved.id)),
            ].slice(0, RECENT_MAX_COUNT)
          );
        })
        .catch((error) => {
          // 검색 결과 화면에는 영향 없이 넘어가지만, 원인 파악을 위해 콘솔에는 남깁니다.
          console.error("최근 검색어 저장 실패", error);
        });
    } else {
      // 로그인 상태라도 백엔드가 대상(type·id)을 특정할 수 없는 자유 입력 검색은 서버에
      // 저장할 수 없으니, 이 기기에서라도 기억하도록 로컬에 저장합니다(로그인 시 최근
      // 검색어 목록에도 함께 표시됩니다).
      setLocalRecent((prev) =>
        [displayName, ...prev.filter((item) => item !== displayName)].slice(0, RECENT_MAX_COUNT)
      );
    }
  };

  const handleInputChange = (value: string) => {
    const next = value.slice(0, QUERY_MAX_LENGTH);
    setQuery(next);
    setPhase(next ? "typing" : "idle");
  };

  const localRecentItems = localRecent.map((keyword, index) => ({
    key: `local-${keyword}-${index}`,
    label: keyword,
    onSelect: () => runSearch(keyword),
    onRemove: () => setLocalRecent((prev) => prev.filter((_, i) => i !== index)),
  }));

  const recentItems = isLoggedIn
    ? [
        ...remoteRecent.map((item) => ({
          key: `remote-${item.recentSearchId}`,
          label: item.displayName,
          onSelect: () => runSearch(item.keyword),
          onRemove: () => {
            deleteRecentSearch(item.recentSearchId).catch(() => {});
            setRemoteRecent((prev) => prev.filter((r) => r.recentSearchId !== item.recentSearchId));
          },
        })),
        // 서버에 저장할 수 없었던 자유 입력 검색(로컬 폴백)도 로그인 상태의 최근 검색어에
        // 함께 보여줍니다. 이미 서버에 같은 이름으로 저장된 항목은 중복 표시하지 않습니다.
        ...localRecentItems.filter(
          (local) => !remoteRecent.some((remote) => remote.displayName === local.label)
        ),
      ].slice(0, RECENT_MAX_COUNT)
    : localRecentItems;

  const handleClearAllRecent = () => {
    if (isLoggedIn) {
      deleteAllRecentSearches().catch(() => {});
      setRemoteRecent([]);
    }
    setLocalRecent([]);
    setConfirmingClearAll(false);
  };

  const visibleRecent = recentExpanded ? recentItems : recentItems.slice(0, RECENT_VISIBLE_COUNT);

  const resetToIdle = () => {
    setQuery("");
    setSubmittedQuery("");
    setPhase("idle");
  };

  // 검색을 시작하면(입력·결과 화면) 더미 히스토리를 하나만 쌓아두고, 뒤로가기(물리 버튼/
  // 제스처/인앱 버튼)가 눌리면 검색 페이지를 완전히 벗어나기 전에 먼저 입력 화면으로
  // 돌아옵니다. 검색을 여러 번 반복해도 더미 엔트리가 항상 최대 1개만 쌓이도록,
  // 뒤로가기가 아니라 직접 검색어를 지워 idle로 돌아온 경우에는 그 즉시(같은 URL이라
  // 화면엔 안 보임) 더미를 소비해 정리합니다.
  const historyGuardedRef = useRef(false);

  const handleBack = () => {
    if (phase !== "idle" || query) {
      if (historyGuardedRef.current) {
        window.history.back();
      } else {
        resetToIdle();
      }
      return;
    }
    navigate(-1);
  };

  useEffect(() => {
    const leavingIdle = phase !== "idle" || query.length > 0;
    if (leavingIdle && !historyGuardedRef.current) {
      historyGuardedRef.current = true;
      window.history.pushState({ searchGuard: true }, "", window.location.href);
    } else if (!leavingIdle && historyGuardedRef.current) {
      historyGuardedRef.current = false;
      window.history.back();
    }
  }, [phase, query]);

  useEffect(() => {
    const onPopState = () => {
      if (!historyGuardedRef.current) return;
      historyGuardedRef.current = false;
      resetToIdle();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageContainer>
      <SearchHeader>
        <BackButton onClick={handleBack} />
        <InputWrapper>
          <SearchInput
            value={query}
            placeholder="양조장, 전통주를 검색해보세요!"
            maxLength={QUERY_MAX_LENGTH}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch(query);
            }}
          />
          {query ? (
            <ClearButton
              type="button"
              aria-label="입력 지우기"
              onClick={() => handleInputChange("")}
            >
              <img src={cancelIcon} alt="" width={24} height={24} />
            </ClearButton>
          ) : (
            <ClearButton type="button" aria-label="검색" onClick={() => runSearch(query)}>
              <img src={searchIcon} alt="" width={14} height={14} />
            </ClearButton>
          )}
        </InputWrapper>
      </SearchHeader>

      {phase === "idle" && (
        <Content>
          <Section>
            <SectionHeader>
              <SectionTitle>최근 검색어</SectionTitle>
              {recentItems.length > 0 && (
                <TextButton type="button" onClick={() => setConfirmingClearAll(true)}>
                  전체삭제
                </TextButton>
              )}
            </SectionHeader>

            {recentItems.length === 0 ? (
              <EmptyRecent>최근 검색어 내역이 없어요.</EmptyRecent>
            ) : (
              <>
                <RecentList>
                  {visibleRecent.map((item) => (
                    <RecentItem key={item.key}>
                      <RecentLeft type="button" onClick={item.onSelect}>
                        <img src={watchIcon} alt="" width={22} height={22} />
                        {item.label}
                      </RecentLeft>
                      <RemoveButton type="button" aria-label="삭제" onClick={item.onRemove}>
                        <img src={removeIcon} alt="" width={18} height={18} />
                      </RemoveButton>
                    </RecentItem>
                  ))}
                </RecentList>
                {recentItems.length > RECENT_VISIBLE_COUNT && (
                  <>
                    <RecentDivider />
                    <ExpandToggle type="button" onClick={() => setRecentExpanded((prev) => !prev)}>
                      {recentExpanded ? "최근 검색어 접기" : "최근 검색어 더보기"}
                      <img
                        src={recentExpanded ? upArrowIcon : downArrowIcon}
                        alt=""
                        width={12}
                        height={12}
                      />
                    </ExpandToggle>
                  </>
                )}
              </>
            )}
          </Section>

          {recommendedKeywords.length > 0 && (
            <Section>
              <SectionTitle>추천 검색어</SectionTitle>
              <SuggestRow>
                {recommendedKeywords.map((keyword, index) => (
                  <SuggestTag
                    key={`${keyword}-${index}`}
                    type="button"
                    onClick={() => runSearch(keyword)}
                  >
                    {keyword}
                  </SuggestTag>
                ))}
              </SuggestRow>
            </Section>
          )}
        </Content>
      )}

      {phase === "typing" &&
        (suggestions.length > 0 ? (
          <AutocompleteList>
            {suggestions.map((item) => (
              <AutocompleteItem
                key={`${item.type}-${item.id}`}
                type="button"
                onClick={() => runSearch(item.keyword, item)}
              >
                <img src={searchIcon} alt="" width={16} height={16} />
                <AutocompleteText>
                  <HighlightedText text={item.displayName} match={query} />
                </AutocompleteText>
                <img src={rightArrowIcon} alt="" width={16} height={16} />
              </AutocompleteItem>
            ))}
          </AutocompleteList>
        ) : (
          <AutocompleteList />
        ))}

      {phase === "loading" && (
        // Figma "Card/Brewery Type=List, State=Loading" 실측값을 그대로 옮긴 것이며,
        // 아래 검색 결과 WineryCard(thumbSize=115) 실제 모양과 같습니다.
        <ResultSkeletonList>
          {Array.from({ length: 8 }).map((_, index) => (
            <ResultSkeletonRow key={index}>
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
            </ResultSkeletonRow>
          ))}
        </ResultSkeletonList>
      )}

      {phase === "results" && (
        <ResultWrapper>
          <ResultCount>
            '{submittedQuery}' 검색결과 <ResultCountBold>{results.length}개</ResultCountBold>
          </ResultCount>
          <ResultList>
            {results.map((result) => (
              <WineryCard
                key={result.breweryId}
                winery={breweryToCardData(result)}
                onClick={() => navigate(`/winery/${result.breweryId}`)}
                thumbSize={115}
                nameFirst
                showTags={false}
              />
            ))}
          </ResultList>
          <MapButton
            type="button"
            onClick={() =>
              navigate("/map", { state: { searchBreweryIds: results.map((r) => r.breweryId) } })
            }
          >
            <img src={mapIcon} alt="" width={20} height={20} />
            지도에서 {results.length}곳 보기
          </MapButton>
        </ResultWrapper>
      )}

      {phase === "empty" && (
        <EmptyResultWrapper>
          <ErrorState
            title={`'${submittedQuery}' 검색 결과가 없어요`}
            description="철자를 확인하거나 다른 키워드로 검색해보세요"
          />
          <Section>
            <SectionHeader>
              <SectionTitle $large>이런 양조장은 어때요?</SectionTitle>
              {/* 이 섹션만 Figma 색상(#656563)이 다른 화면 더보기 버튼(#b0b0ae)과 달라서
                  공용 TextButton 색을 바꾸지 않고 이 자리에서만 덮어씁니다. */}
              <TextButton
                type="button"
                style={{ color: colors.gray[500] }}
                onClick={() => navigate("/explore")}
              >
                더보기
              </TextButton>
            </SectionHeader>
            <SuggestGrid>
              {recommended.map((winery) => (
                <SuggestCard
                  key={winery.breweryId}
                  type="button"
                  onClick={() => navigate(`/winery/${winery.breweryId}`)}
                >
                  <SuggestPhoto
                    style={{
                      backgroundImage: resolveImageUrl(winery.mainImage?.url)
                        ? `url(${resolveImageUrl(winery.mainImage?.url)})`
                        : undefined,
                    }}
                  />
                  <SuggestInfo>
                    <SuggestName>{winery.businessName}</SuggestName>
                    <SuggestLocation>
                      {winery.sigungu
                        ? `${winery.sido ?? ""} ${winery.sigungu}`.trim()
                        : (winery.sido ?? winery.region ?? "")}
                    </SuggestLocation>
                  </SuggestInfo>
                </SuggestCard>
              ))}
            </SuggestGrid>
          </Section>
        </EmptyResultWrapper>
      )}

      {phase === "error" && (
        <ErrorState
          title="검색에 실패했어요"
          description={"네트워크 상태를 확인하고\n다시 시도해주세요"}
          onRetry={() => runSearch(submittedQuery)}
        />
      )}

      {confirmingClearAll && (
        <ModalOverlay onClick={() => setConfirmingClearAll(false)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalTitle>최근 검색어를 모두 삭제할까요?</ModalTitle>
            <ModalActions>
              <Button
                variant="secondary"
                onClick={() => setConfirmingClearAll(false)}
                style={{ flex: 1 }}
              >
                취소
              </Button>
              <Button variant="primary" onClick={handleClearAllRecent} style={{ flex: 1 }}>
                삭제
              </Button>
            </ModalActions>
          </ModalCard>
        </ModalOverlay>
      )}
    </PageContainer>
  );
}

const PageContainer = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: #ffffff;
`;

const SearchHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 20px 16px 15px;
`;

const InputWrapper = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 9px 40px 7px 12px;
  border: none;
  border-radius: 8px;
  background-color: ${colors.gray[50]};
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-family: Pretendard;
  font-size: 1rem;
  font-weight: 400;
  line-height: 140%;
  letter-spacing: -0.32px;
  color: ${colors.gray[900]};
  outline: none;
  box-sizing: border-box;
  caret-color: ${colors.primary[500]};

  &::placeholder {
    color: ${colors.gray[400]};
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 4px 16px 24px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SectionTitle = styled.h2<{ $large?: boolean }>`
  margin: 0;
  font-size: ${(props) => (props.$large ? "1.125rem" : "1rem")};
  font-weight: 700;
  line-height: 140%;
  letter-spacing: ${(props) => (props.$large ? "-0.36px" : "-0.32px")};
  color: ${colors.gray[900]};
`;

const TextButton = styled.button`
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  color: ${colors.gray[300]};
  cursor: pointer;
`;

const EmptyRecent = styled.p`
  margin: 8px 0;
  font-size: 1rem;
  letter-spacing: -0.32px;
  line-height: 140%;
  color: ${colors.gray[900]};
  text-align: center;
`;

const RecentList = styled.div`
  display: flex;
  flex-direction: column;
`;

const RecentItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
`;

const RecentLeft = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 16px;
  letter-spacing: -0.32px;
  line-height: 140%;
  color: ${colors.gray[900]};
  cursor: pointer;
`;

const RemoveButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
`;

const RecentDivider = styled.div`
  height: 1px;
  background-color: rgba(0, 0, 0, 0.047);
`;

const ExpandToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  align-self: center;
  margin-top: 5px;
  border: none;
  background: transparent;
  font-size: 1rem;
  letter-spacing: -0.32px;
  line-height: 140%;
  color: ${colors.gray[500]};
  cursor: pointer;
`;

const SuggestRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
`;

const SuggestTag = styled.button`
  border: none;
  border-radius: 9999px;
  padding: 8px 12px;
  background-color: #fff5e6;
  color: ${colors.primary[500]};
  font-size: 0.8125rem;
  font-weight: 400;
  cursor: pointer;
`;

const AutocompleteList = styled.div`
  display: flex;
  flex-direction: column;
`;

const AutocompleteItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  padding: 12px 16px;
  font-size: 0.875rem;
  color: ${colors.gray[700]};
  cursor: pointer;
  text-align: left;
`;

const AutocompleteText = styled.span`
  flex: 1;
`;

const Highlight = styled.span`
  color: ${colors.primary[500]};
  font-weight: 600;
`;

const ResultSkeletonList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
`;

const ResultSkeletonRow = styled.div`
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

const ResultWrapper = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px 16px 16px;
`;

const ResultCount = styled.p`
  margin: -8px 0 12px;
  font-size: 0.875rem;
  font-weight: 400;
  color: ${colors.gray[900]};
`;

const ResultCountBold = styled.span`
  font-weight: 700;
`;

const ResultList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 56px;
`;

const MapButton = styled.button`
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  border-radius: 999px;
  padding: 10px 16px;
  background-color: ${colors.primary[500]};
  color: ${colors.white};
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 140%;
  letter-spacing: -0.28px;
  box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.25);
  cursor: pointer;
`;

const EmptyResultWrapper = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 16px 60px;
`;

const SuggestGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px 8px;
`;

// Figma "Card/Place"(검색 결과 없음 화면 전용)를 그대로 옮긴 카드입니다. 다른 화면에서 쓰는
// PhotoCard와 디자인이 달라서 공용 컴포넌트를 재사용하지 않고 이 화면에서만 씁니다.
const SuggestCard = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  width: 100%;
  border: none;
  padding: 0;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
`;

const SuggestPhoto = styled.div`
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  background-color: ${colors.gray[100]};
  background-size: cover;
  background-position: center;
`;

const SuggestInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 8px 4px;
  box-sizing: border-box;
`;

const SuggestName = styled.p`
  margin: 0;
  width: 100%;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.gray[900]};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SuggestLocation = styled.p`
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 400;
  line-height: 100%;
  color: ${colors.gray[400]};
  white-space: nowrap;
`;

const ModalOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 10;
`;

const ModalCard = styled.div`
  width: 260px;
  padding: 24px 20px 20px;
  border-radius: 16px;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ModalTitle = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 7s00;
  color: ${colors.gray[900]};
  text-align: center;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 8px;
`;
