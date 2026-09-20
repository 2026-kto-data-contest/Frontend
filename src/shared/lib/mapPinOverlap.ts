import type { KakaoMapsNamespace, KakaoProjection } from "../api/kakaoMaps";

// 카카오맵 화면 위에서 핀들이 몇 픽셀 안에 있으면 "겹친다"고 볼지 기준입니다.
export const PIN_OVERLAP_THRESHOLD_PX = 44;

// 화면 픽셀 기준 거리로 겹치는 핀들을 한 묶음(클러스터)으로 모읍니다. resolveHiddenPinLabels가
// 이 클러스터링을 그대로 씁니다. 핀 좌표 자체는 절대 옮기지 않습니다 — 실제 위치가 아닌
// 곳에 꽂힌 것처럼 보이는 문제가 있어서, 겹침은 이름표를 줄이는 것으로만 처리합니다.
export function clusterOverlappingPins<T extends { key: string; lat: number; lng: number }>(
  pins: T[],
  kakao: KakaoMapsNamespace,
  projection: KakaoProjection
) {
  const points = pins.map((pin) => ({
    ...pin,
    screen: projection.pointFromCoords(new kakao.LatLng(pin.lat, pin.lng)),
  }));

  const assigned = new Set<string>();
  const clusters: (typeof points)[] = [];
  points.forEach((pin) => {
    if (assigned.has(pin.key)) return;
    const cluster = [pin];
    assigned.add(pin.key);
    points.forEach((other) => {
      if (assigned.has(other.key)) return;
      const distancePx = Math.hypot(pin.screen.x - other.screen.x, pin.screen.y - other.screen.y);
      if (distancePx <= PIN_OVERLAP_THRESHOLD_PX) {
        cluster.push(other);
        assigned.add(other.key);
      }
    });
    clusters.push(cluster);
  });

  return clusters;
}

// 클러스터마다 기준점(유저 현재 위치, 없으면 양조장)과 가장 가까운 핀 하나만 이름표를 보이도록
// 나머지 핀들의 key를 돌려줍니다.
export function resolveHiddenPinLabels(
  pins: { key: string; lat: number; lng: number }[],
  kakao: KakaoMapsNamespace,
  projection: KakaoProjection,
  reference: { lat: number; lng: number } | null
): Set<string> {
  const clusters = clusterOverlappingPins(pins, kakao, projection);

  const hidden = new Set<string>();
  clusters.forEach((cluster) => {
    if (cluster.length <= 1) return;
    let winner = cluster[0];
    if (reference) {
      let bestDistance = Infinity;
      cluster.forEach((pin) => {
        const distance = (pin.lat - reference.lat) ** 2 + (pin.lng - reference.lng) ** 2;
        if (distance < bestDistance) {
          bestDistance = distance;
          winner = pin;
        }
      });
    }
    cluster.forEach((pin) => {
      if (pin.key !== winner.key) hidden.add(pin.key);
    });
  });

  return hidden;
}
