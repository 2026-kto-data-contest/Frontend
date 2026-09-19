import type { KakaoMapsNamespace, KakaoProjection } from "../api/kakaoMaps";

// 카카오맵 화면 위에서 핀들이 몇 픽셀 안에 있으면 "겹친다"고 볼지 기준입니다.
export const PIN_OVERLAP_THRESHOLD_PX = 44;
// 겹친 핀들을 펼칠 때 원래 겹침 중심에서 최소 이만큼은 떨어뜨립니다(클러스터가 크면 더 키웁니다).
export const PIN_SPREAD_RADIUS_PX = 18;
// 흩어놓은 핀들끼리 서로 최소 이만큼(픽셀)은 떨어지도록 보장합니다 — 선택 시 커지는 핀(32px)과
// 이름표까지 감안한 여유값입니다.
export const PIN_MIN_SEPARATION_PX = 40;

// 화면 픽셀 기준 거리로 겹치는 핀들을 한 묶음(클러스터)으로 모읍니다. 라벨 숨김·아이콘
// 흩뿌리기 둘 다 이 클러스터링을 그대로 재사용합니다.
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

// 겹친 핀 아이콘들이 서로 완전히 가려지지 않도록, 클러스터마다 원래 겹침 중심을 기준으로
// 작은 원 모양으로 흩어놓은 좌표를 돌려줍니다(클러스터가 아닌 핀은 결과에 포함되지 않습니다 —
// 원래 좌표를 그대로 쓰면 됩니다).
export function resolveOverlapOffsets(
  pins: { key: string; lat: number; lng: number }[],
  kakao: KakaoMapsNamespace,
  projection: KakaoProjection
): Record<string, { lat: number; lng: number }> {
  const clusters = clusterOverlappingPins(pins, kakao, projection);

  const offsets: Record<string, { lat: number; lng: number }> = {};
  clusters.forEach((cluster) => {
    if (cluster.length <= 1) return;
    const centerX = cluster.reduce((sum, pin) => sum + pin.screen.x, 0) / cluster.length;
    const centerY = cluster.reduce((sum, pin) => sum + pin.screen.y, 0) / cluster.length;
    // 원 위에 N개를 균등하게 놓았을 때 이웃끼리의 간격이 핀 하나 크기보다 작으면 여전히
    // 겹쳐 보이므로, 클러스터가 클수록 반지름을 키워 최소 간격을 보장합니다.
    const radius = Math.max(
      PIN_SPREAD_RADIUS_PX,
      PIN_MIN_SEPARATION_PX / (2 * Math.sin(Math.PI / cluster.length))
    );
    cluster.forEach((pin, index) => {
      const angle = (index / cluster.length) * Math.PI * 2 - Math.PI / 2;
      const point = new kakao.Point(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
      const latlng = projection.coordsFromPoint(point);
      offsets[pin.key] = { lat: latlng.getLat(), lng: latlng.getLng() };
    });
  });

  return offsets;
}
