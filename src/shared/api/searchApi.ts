// 실제 배포 백엔드의 통합 검색 · 자동완성 · 최근 검색어 API 클라이언트입니다.
import { API_BASE_URL, ApiError, apiWithCsrf } from "./api";
import type { BreweryListItem, PageResponse } from "./breweriesApi";

async function getJson<T>(
  path: string,
  params?: URLSearchParams,
  signal?: AbortSignal
): Promise<T> {
  const query = params?.toString();
  const response = await fetch(`${API_BASE_URL}${path}${query ? `?${query}` : ""}`, {
    credentials: "omit",
    signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body?.message || `요청이 실패했습니다. (${response.status})`
    );
  }
  return response.json();
}

// 통합 검색: 양조장명 전방일치 > 부분일치 > 취급 제품명 부분일치 순으로 정렬된 결과입니다.
export function searchBreweries(
  keyword: string,
  page = 0,
  size = 20,
  signal?: AbortSignal
): Promise<PageResponse<BreweryListItem>> {
  const qs = new URLSearchParams({ keyword, page: String(page), size: String(size) });
  return getJson<PageResponse<BreweryListItem>>("/api/v1/search", qs, signal);
}

export type SearchTargetType = "BREWERY" | "PRODUCT" | "REGION";

export interface SearchSuggestion {
  type: SearchTargetType;
  id: string;
  keyword: string;
  displayName: string;
}

export function fetchSearchSuggestions(
  keyword: string,
  signal?: AbortSignal
): Promise<SearchSuggestion[]> {
  const qs = new URLSearchParams({ keyword });
  return getJson<SearchSuggestion[]>("/api/v1/search/suggestions", qs, signal);
}

export interface RecentSearch {
  recentSearchId: number;
  type: SearchTargetType;
  id: string;
  keyword: string;
  displayName: string;
  searchedAt: string;
}

export interface RecentSearchInput {
  type: SearchTargetType;
  id: string;
  keyword: string;
  displayName: string;
}

// 로그인 회원 전용입니다. 비로그인 사용자의 최근 검색은 프론트 로컬 저장소로 관리합니다.
export async function fetchRecentSearches(
  limit = 5,
  signal?: AbortSignal
): Promise<RecentSearch[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/search/recent?limit=${limit}`, {
    credentials: "include",
    signal,
  });
  if (response.status === 401) return [];
  if (!response.ok) throw new ApiError(response.status, "최근 검색어를 불러오지 못했습니다.");
  return response.json();
}

export async function saveRecentSearch(input: RecentSearchInput): Promise<RecentSearch> {
  const response = await apiWithCsrf("/api/v1/search/recent", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.json();
}

export async function deleteAllRecentSearches(): Promise<void> {
  await apiWithCsrf("/api/v1/search/recent", { method: "DELETE" });
}

export async function deleteRecentSearch(recentSearchId: number): Promise<void> {
  await apiWithCsrf(`/api/v1/search/recent/${recentSearchId}`, { method: "DELETE" });
}
