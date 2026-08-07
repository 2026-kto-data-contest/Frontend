import { useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { ErrorState } from "../../shared/components/ErrorState";
import { Skeleton } from "../../shared/components/Skeleton";
import { WineryCard } from "../../shared/components/WineryCard";
import { PhotoCard } from "../../shared/components/PhotoCard";
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
import {
  SUGGESTED_KEYWORDS,
  WINERIES,
  searchWineries,
  getAutocompleteSuggestions,
} from "../../shared/lib/mockWineries";
import type { Winery } from "../../shared/lib/mockWineries";
import { usePersistentState } from "../../shared/lib/pageState";
import { findMatchRange } from "../../shared/lib/hangul";

type Phase = "idle" | "typing" | "loading" | "results" | "empty";

const INITIAL_RECENT: string[] = [];
const RECENT_VISIBLE_COUNT = 4;
const RECENT_MAX_COUNT = 10;
const QUERY_MAX_LENGTH = 20;

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
  const [query, setQuery] = usePersistentState("search:query", "");
  const [submittedQuery, setSubmittedQuery] = usePersistentState("search:submittedQuery", "");
  const [phase, setPhase] = usePersistentState<Phase>("search:phase", "idle");
  const [recentSearches, setRecentSearches] = usePersistentState<string[]>(
    "search:recentSearches",
    INITIAL_RECENT
  );
  const [recentExpanded, setRecentExpanded] = usePersistentState("search:recentExpanded", false);
  const [confirmingClearAll, setConfirmingClearAll] = useState(false);
  const [results, setResults] = usePersistentState<Winery[]>("search:results", []);

  const runSearch = (keyword: string) => {
    const trimmed = keyword.trim().slice(0, QUERY_MAX_LENGTH);
    if (!trimmed) return;

    setQuery(trimmed);
    setSubmittedQuery(trimmed);
    setRecentSearches((prev) =>
      [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, RECENT_MAX_COUNT)
    );
    setPhase("loading");

    setTimeout(() => {
      const matched = searchWineries(trimmed);
      setResults(matched);
      setPhase(matched.length > 0 ? "results" : "empty");
    }, 600);
  };

  const handleInputChange = (value: string) => {
    const next = value.slice(0, QUERY_MAX_LENGTH);
    setQuery(next);
    setPhase(next ? "typing" : "idle");
  };

  const handleRemoveRecent = (index: number) => {
    setRecentSearches((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAllRecent = () => {
    setRecentSearches([]);
    setConfirmingClearAll(false);
  };

  const handleBack = () => {
    if (phase !== "idle" || query) {
      setQuery("");
      setSubmittedQuery("");
      setPhase("idle");
      return;
    }
    navigate(-1);
  };

  const autocompleteSuggestions = phase === "typing" ? getAutocompleteSuggestions(query) : [];
  const visibleRecent = recentExpanded
    ? recentSearches
    : recentSearches.slice(0, RECENT_VISIBLE_COUNT);
  const emptySuggestions = WINERIES.slice(0, 6);

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
          {query && (
            <ClearButton
              type="button"
              aria-label="입력 지우기"
              onClick={() => handleInputChange("")}
            >
              <img src={cancelIcon} alt="" width={18} height={18} />
            </ClearButton>
          )}
        </InputWrapper>
        {(phase === "idle" || phase === "typing") && (
          <IconButton type="button" aria-label="검색" onClick={() => runSearch(query)}>
            <img src={searchIcon} alt="" width={19} height={19} />
          </IconButton>
        )}
      </SearchHeader>

      {phase === "idle" && (
        <Content>
          <Section>
            <SectionHeader>
              <SectionTitle>최근 검색어</SectionTitle>
              {recentSearches.length > 0 && (
                <TextButton type="button" onClick={() => setConfirmingClearAll(true)}>
                  전체삭제
                </TextButton>
              )}
            </SectionHeader>

            {recentSearches.length === 0 ? (
              <EmptyRecent>최근 검색어 내역이 없어요.</EmptyRecent>
            ) : (
              <>
                <RecentList>
                  {visibleRecent.map((keyword, index) => (
                    <RecentItem key={`${keyword}-${index}`}>
                      <RecentLeft type="button" onClick={() => runSearch(keyword)}>
                        <img src={watchIcon} alt="" width={16} height={16} />
                        {keyword}
                      </RecentLeft>
                      <RemoveButton
                        type="button"
                        aria-label="삭제"
                        onClick={() => handleRemoveRecent(index)}
                      >
                        <img src={removeIcon} alt="" width={14} height={14} />
                      </RemoveButton>
                    </RecentItem>
                  ))}
                </RecentList>
                {recentSearches.length > RECENT_VISIBLE_COUNT && (
                  <ExpandToggle type="button" onClick={() => setRecentExpanded((prev) => !prev)}>
                    {recentExpanded ? "최근 검색어 접기" : "최근 검색어 더보기"}
                    <img
                      src={recentExpanded ? upArrowIcon : downArrowIcon}
                      alt=""
                      width={12}
                      height={12}
                    />
                  </ExpandToggle>
                )}
              </>
            )}
          </Section>

          <Section>
            <SectionTitle>추천 검색어</SectionTitle>
            <SuggestRow>
              {SUGGESTED_KEYWORDS.map((keyword, index) => (
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
        </Content>
      )}

      {phase === "typing" &&
        (autocompleteSuggestions.length > 0 ? (
          <AutocompleteList>
            {autocompleteSuggestions.map((winery) => (
              <AutocompleteItem
                key={winery.id}
                type="button"
                onClick={() => runSearch(winery.name)}
              >
                <img src={searchIcon} alt="" width={16} height={16} />
                <AutocompleteText>
                  <HighlightedText text={`${winery.name} · ${winery.productName}`} match={query} />
                </AutocompleteText>
                <img src={rightArrowIcon} alt="" width={16} height={16} />
              </AutocompleteItem>
            ))}
          </AutocompleteList>
        ) : (
          <AutocompleteList />
        ))}

      {phase === "loading" && (
        <ResultSkeletonList>
          {Array.from({ length: 5 }).map((_, index) => (
            <ResultSkeletonRow key={index}>
              <Skeleton $width="80px" $height="80px" $radius="12px" />
              <SkeletonCol>
                <Skeleton $height="12px" $width="60%" />
                <Skeleton $height="12px" $width="90%" />
                <Skeleton $height="12px" $width="40%" />
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
                key={result.id}
                winery={result}
                onClick={() => navigate(`/winery/${result.id}`)}
                thumbSize={115}
                nameFirst
                showTags={false}
              />
            ))}
          </ResultList>
          <MapButton type="button" onClick={() => navigate("/map")}>
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
              <SectionTitle>이런 양조장은 어때요?</SectionTitle>
              <TextButton type="button" onClick={() => navigate("/explore")}>
                더보기
              </TextButton>
            </SectionHeader>
            <SuggestGrid>
              {emptySuggestions.map((winery) => (
                <PhotoCard
                  key={winery.id}
                  fluid
                  name={winery.name}
                  region={winery.detailRegion}
                  onClick={() => navigate(`/winery/${winery.id}`)}
                />
              ))}
            </SuggestGrid>
          </Section>
        </EmptyResultWrapper>
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
  padding: 12px 16px;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
`;

const InputWrapper = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 32px 10px 12px;
  border: 1px solid ${colors.gray[200]};
  border-radius: 8px;
  background-color: ${colors.gray[50]};
  font-size: 0.875rem;
  color: ${colors.gray[900]};
  outline: none;
  box-sizing: border-box;
  caret-color: #ff7a00;

  &::placeholder {
    color: ${colors.gray[400]};
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
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

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const TextButton = styled.button`
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  color: ${colors.gray[400]};
  cursor: pointer;
`;

const EmptyRecent = styled.p`
  margin: 8px 0;
  font-size: 0.875rem;
  color: ${colors.gray[400]};
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
  padding: 8px 0;
`;

const RecentLeft = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 0.875rem;
  color: ${colors.gray[800]};
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

const ExpandToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  align-self: center;
  margin-top: 8px;
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  color: ${colors.gray[400]};
  cursor: pointer;
`;

const SuggestRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;

const SuggestTag = styled.button`
  border: none;
  border-radius: 9999px;
  padding: 8px 14px;
  background-color: #fdf0e2;
  color: #b5691a;
  font-size: 0.8125rem;
  font-weight: 500;
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
  color: #ff7a00;
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

const ResultWrapper = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px 16px 16px;
`;

const ResultCount = styled.p`
  margin: 4px 0 12px;
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
  position: absolute;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 9999px;
  padding: 10px 20px;
  background-color: #ff7a00;
  color: ${colors.white};
  font-size: 0.8125rem;
  font-weight: 700;
  box-shadow: 0 8px 16px rgba(255, 122, 0, 0.35);
  cursor: pointer;
`;

const EmptyResultWrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 16px 24px;
  gap: 50px;
`;

const SuggestGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
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
  font-weight: 700;
  color: ${colors.gray[900]};
  text-align: center;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 8px;
`;
