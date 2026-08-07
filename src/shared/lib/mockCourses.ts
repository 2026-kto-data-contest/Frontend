export interface Course {
  id: string;
  region: string;
  title: string;
  subtitle: string;
}

export const BANNER_ITEMS: Course[] = [
  {
    id: "1",
    region: "전남 해남",
    title: "장독대가 잘보이는 아름다운 양조장",
    subtitle: "양조장 양조장 - 코스 이동",
  },
  {
    id: "2",
    region: "경북 문경",
    title: "고즈넉한 산골의 증류주 여행",
    subtitle: "고운달 양조장 - 코스 이동",
  },
  {
    id: "3",
    region: "제주 서귀포",
    title: "바다를 품은 청주 한 잔",
    subtitle: "청정 바다 양조장 - 코스 이동",
  },
];

export function getSortedCourses(hasOnboarded: boolean, preferredRegion: string): Course[] {
  if (!hasOnboarded) return BANNER_ITEMS;
  return [...BANNER_ITEMS].sort((a, b) => {
    const aMatch = a.region.includes(preferredRegion) ? 0 : 1;
    const bMatch = b.region.includes(preferredRegion) ? 0 : 1;
    return aMatch - bMatch;
  });
}
