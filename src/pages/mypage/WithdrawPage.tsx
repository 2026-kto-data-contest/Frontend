import { useRef, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { BackButton } from "../../shared/components/BackButton";
import { Snackbar } from "../../shared/components/Snackbar";
import { colors } from "../../shared/styles/colors";

const NOTICE_ITEMS = [
  "탈퇴 시 계정 정보와 저장된 취향, 활동 내역이 모두 삭제되며 복구할 수 없어요.",
  "찜한 양조장, 최근 검색어 등 개인화된 데이터도 함께 삭제돼요.",
  "탈퇴 후에는 동일한 카카오 계정으로 다시 로그인해도 이전 정보를 확인할 수 없어요.",
  "진행 중인 예약이나 문의가 있다면 탈퇴 전에 먼저 처리해주세요.",
];

const TOAST_DURATION_MS = 3000;

export default function WithdrawPage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  };

  const handleWithdraw = () => {
    // TODO: 회원 탈퇴 API가 아직 없어서, 준비 중임을 알리고 실제로는 탈퇴를 진행하지 않습니다.
    // 백엔드에 DELETE /api/v1/members/me 같은 엔드포인트가 생기면 이 부분을 실제 호출로 교체해주세요.
    showToast("회원 탈퇴 기능은 아직 준비 중이에요. 빠른 시일 내에 지원할게요.");
  };

  return (
    <PageContainer>
      <Header>
        <BackButton onClick={() => navigate(-1)} />
        <HeaderTitle>탈퇴하기</HeaderTitle>
      </Header>

      <Content>
        <Lead>탈퇴하기 전에 아래 내용을 꼭 확인해주세요.</Lead>
        <NoticeList>
          {NOTICE_ITEMS.map((item) => (
            <NoticeItem key={item}>{item}</NoticeItem>
          ))}
        </NoticeList>
      </Content>

      <Footer>
        <AgreeRow type="button" onClick={() => setChecked((prev) => !prev)}>
          <CheckCircle $active={checked} aria-hidden>
            ✓
          </CheckCircle>
          위 유의사항을 모두 확인하였고, 탈퇴 할게요
        </AgreeRow>
        <WithdrawButton type="button" disabled={!checked} onClick={handleWithdraw}>
          탈퇴하기
        </WithdrawButton>
      </Footer>

      <Snackbar message={toast} />
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

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
`;

const HeaderTitle = styled.h1`
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const Content = styled.div`
  flex: 1;
  padding: 8px 16px 16px;
  overflow-y: auto;
`;

const Lead = styled.p`
  margin: 0 0 20px;
  font-size: 0.9375rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const NoticeList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const NoticeItem = styled.li`
  position: relative;
  padding-left: 14px;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: ${colors.gray[600]};

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 8px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: ${colors.gray[400]};
  }
`;

const Footer = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border-top: 1px solid ${colors.gray[100]};
`;

const AgreeRow = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 0.8125rem;
  color: ${colors.gray[700]};
  cursor: pointer;
  text-align: left;
`;

const CheckCircle = styled.span<{ $active: boolean }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 0.6875rem;
  font-weight: 700;
  color: ${(props) => (props.$active ? "#ffffff" : colors.gray[400])};
  background-color: ${(props) => (props.$active ? "#ff7a00" : colors.gray[100])};
  border: 1px solid ${(props) => (props.$active ? "transparent" : colors.gray[200])};
`;

const WithdrawButton = styled.button`
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 8px;
  background-color: ${colors.gray[900]};
  color: #ffffff;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    background-color: ${colors.gray[200]};
    color: ${colors.gray[400]};
    cursor: not-allowed;
  }
`;
