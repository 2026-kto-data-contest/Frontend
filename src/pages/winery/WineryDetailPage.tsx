import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useParams } from "react-router-dom";
import { colors } from "../../shared/styles/colors";
import { BackButton } from "../../shared/components/BackButton";
import { DotsLoader } from "../../shared/components/DotsLoader";
import { useSmartBack } from "../../shared/lib/pageState";
import { WINERIES } from "../../shared/lib/mockWineries";
import type { Winery } from "../../shared/lib/mockWineries";
import { fetchBreweryDetail, fetchBreweryProducts } from "../../shared/api/breweriesApi";
import { adaptBreweryToWinery } from "../../shared/api/adaptBrewery";
import uploadIcon from "../../assets/icon/Upload.svg";
import { WineryDetailContent } from "./WineryDetailContent";
import type { WineryDetailContentHandle } from "./WineryDetailContent";

const HEADER_HEIGHT = 56;

export default function WineryDetailPage() {
  const { id } = useParams();
  // 공유 링크로 이 페이지에 곧장 들어왔으면(인앱 이전 화면이 없으면) 뒤로가기를 홈으로 보냅니다.
  const handleBack = useSmartBack();
  const mockWinery = WINERIES.find((item) => item.id === id);
  const [remoteWinery, setRemoteWinery] = useState<Winery | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const winery = mockWinery ?? remoteWinery ?? undefined;
  const [scrolled, setScrolled] = useState(false);
  const contentRef = useRef<WineryDetailContentHandle>(null);

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

  if (!winery) {
    return (
      <PageContainer>
        <PlainHeader>
          <BackButton onClick={handleBack} />
        </PlainHeader>
        <NotFoundWrap>
          {remoteLoading ? (
            <DotsLoader />
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

  return (
    <PageContainer>
      <Header>
        <HeaderSide>
          <BackButton onClick={handleBack} />
        </HeaderSide>
        <HeaderTitle>{scrolled ? winery.name : ""}</HeaderTitle>
        <HeaderSide $end>
          <HeaderShareButton
            type="button"
            aria-label="공유하기"
            onClick={() => contentRef.current?.share()}
          >
            <img src={uploadIcon} alt="" width={24} height={24} />
          </HeaderShareButton>
        </HeaderSide>
      </Header>

      <WineryDetailContent ref={contentRef} winery={winery} onScrolledChange={setScrolled} />
    </PageContainer>
  );
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

const Header = styled.div`
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  height: ${HEADER_HEIGHT}px;
  padding: 8px 16px;
  box-sizing: border-box;
  background-color: #ffffff;
`;

const HeaderSide = styled.div<{ $end?: boolean }>`
  flex-shrink: 0;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: ${(props) => (props.$end ? "flex-end" : "flex-start")};
`;

const HeaderTitle = styled.h1`
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 140%;
  letter-spacing: -0.36px;
  color: ${colors.gray[900]};
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const HeaderShareButton = styled.button`
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
