// 카카오맵 JavaScript SDK를 지연 로딩합니다. 여러 화면에서 동시에 호출해도 스크립트는 한 번만 붙습니다.
// SDK 자체 타입(kakao.maps.*)은 프로젝트에 별도 @types가 없어 필요한 범위만 최소로 선언해 씁니다.

declare global {
  interface Window {
    kakao?: {
      maps: KakaoMapsNamespace;
    };
  }
}

export interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

export interface KakaoLatLngBounds {
  getSouthWest(): KakaoLatLng;
  getNorthEast(): KakaoLatLng;
  extend(latlng: KakaoLatLng): void;
}

export interface KakaoMapInstance {
  setCenter(latlng: KakaoLatLng): void;
  getCenter(): KakaoLatLng;
  setLevel(level: number): void;
  getLevel(): number;
  getBounds(): KakaoLatLngBounds;
  setBounds(
    bounds: KakaoLatLngBounds,
    paddingTop?: number,
    paddingRight?: number,
    paddingBottom?: number,
    paddingLeft?: number
  ): void;
  relayout(): void;
  /** 지도를 픽셀 단위로 이동합니다(마우스 드래그와 동일한 효과). */
  panBy(dx: number, dy: number): void;
  getProjection(): KakaoProjection;
  /** 코스 상세의 미리보기 지도처럼, 스크롤 중인 페이지 안에 들어가는 비인터랙티브 지도에 씁니다. */
  setDraggable(draggable: boolean): void;
  setZoomable(zoomable: boolean): void;
}

export interface KakaoProjection {
  /** 위경도를 지도 컨테이너 기준 화면 픽셀 좌표로 변환합니다(핀 겹침 판정에 사용). */
  pointFromCoords(latlng: KakaoLatLng): KakaoPoint;
  /** 지도 컨테이너 기준 화면 픽셀 좌표를 위경도로 변환합니다(핀을 화면상 원하는 위치로 옮길 때 사용). */
  coordsFromPoint(point: KakaoPoint): KakaoLatLng;
}

export interface KakaoMarkerInstance {
  setMap(map: KakaoMapInstance | null): void;
}

export interface KakaoCustomOverlayInstance {
  setMap(map: KakaoMapInstance | null): void;
}

export interface KakaoMapsNamespace {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  Map: new (
    container: HTMLElement,
    options: {
      center: KakaoLatLng;
      level?: number;
      draggable?: boolean;
      scrollwheel?: boolean;
      disableDoubleClickZoom?: boolean;
    }
  ) => KakaoMapInstance;
  Marker: new (options: {
    map?: KakaoMapInstance;
    position: KakaoLatLng;
    title?: string;
    image?: unknown;
  }) => KakaoMarkerInstance;
  MarkerImage: new (src: string, size: KakaoSize, options?: { offset?: KakaoPoint }) => unknown;
  Size: new (width: number, height: number) => KakaoSize;
  Point: new (x: number, y: number) => KakaoPoint;
  CustomOverlay: new (options: {
    map?: KakaoMapInstance;
    position: KakaoLatLng;
    content: string | HTMLElement;
    yAnchor?: number;
    clickable?: boolean;
  }) => KakaoCustomOverlayInstance;
  event: {
    addListener(target: unknown, type: string, handler: (...args: unknown[]) => void): void;
  };
}

interface KakaoSize {
  width: number;
  height: number;
}

export interface KakaoPoint {
  x: number;
  y: number;
}

let loadingPromise: Promise<KakaoMapsNamespace> | null = null;

// 스크립트가 onload·onerror 어느 쪽도 부르지 않고 멈추는 경우(네트워크 지연·차단 등)를 대비해
// 일정 시간 안에 끝나지 않으면 타임아웃으로 실패 처리합니다. 무한 로딩 화면을 막기 위함입니다.
const LOAD_TIMEOUT_MS = 8000;

export function loadKakaoMaps(): Promise<KakaoMapsNamespace> {
  if (window.kakao?.maps) return Promise.resolve(window.kakao.maps);
  if (loadingPromise) return loadingPromise;

  const appKey = import.meta.env.VITE_KAKAO_MAP_JS_KEY;
  if (!appKey) {
    return Promise.reject(new Error("카카오맵 JavaScript 키가 설정되지 않았습니다."));
  }

  loadingPromise = new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      loadingPromise = null;
      reject(
        new Error("카카오맵을 불러오는 데 시간이 너무 오래 걸려요. 네트워크 상태를 확인해주세요.")
      );
    }, LOAD_TIMEOUT_MS);

    const settle = (run: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      run();
    };

    const existing = document.getElementById("kakao-maps-sdk");
    const onReady = () => {
      if (!window.kakao) {
        settle(() => reject(new Error("카카오맵 SDK를 불러오지 못했습니다.")));
        return;
      }
      window.kakao.maps.load(() => settle(() => resolve(window.kakao!.maps)));
    };

    if (existing) {
      onReady();
      return;
    }

    const script = document.createElement("script");
    script.id = "kakao-maps-sdk";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.async = true;
    script.onload = onReady;
    script.onerror = () => {
      loadingPromise = null;
      settle(() => reject(new Error("카카오맵 SDK를 불러오지 못했습니다.")));
    };
    document.head.appendChild(script);
  });

  return loadingPromise;
}
