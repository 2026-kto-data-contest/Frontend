import { useRef, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { AppBar } from "../../shared/components/AppBar";
import { Snackbar } from "../../shared/components/Snackbar";
import { colors } from "../../shared/styles/colors";
import checkCircleIcon from "../../assets/icon/CheckCircle.svg";

const NOTICE_ITEMS = [
  "회원 탈퇴 시 계정 정보(이메일, 닉네임), 온보딩에서 설정한 취향 정보, 서비스 이용 기록 등 회원과 관련된 개인정보가 삭제됩니다.",
  "다만 관련 법령에 따라 일부 정보는 일정 기간 별도로 보관됩니다. 위치정보 수집·이용·제공사실 확인자료는 「위치정보법」에 따라 6개월, 서비스 접속 기록은 「통신비밀보호법」에 따라 3개월간 다른 개인정보와 분리하여 보관하며, 보관 기간이 지나면 지체 없이 파기합니다.",
  "회원 탈퇴 시 전통주로와 연결된 카카오 계정의 연결도 함께 해제됩니다.",
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
      <AppBar onBack={() => navigate(-1)} title="탈퇴하기" />

      <Content>
        <Lead>탈퇴하시면 아래 정보가 삭제되며, 삭제된 정보는 복구할 수 없습니다.</Lead>
        <NoticeList>
          {NOTICE_ITEMS.map((item) => (
            <NoticeItem key={item}>{item}</NoticeItem>
          ))}
        </NoticeList>
      </Content>

      <Footer>
        <AgreeRow type="button" onClick={() => setChecked((prev) => !prev)}>
          <CheckCircle $active={checked} aria-hidden />
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

const Content = styled.div`
  flex: 1;
  padding: 24px 16px 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
`;

const Lead = styled.p`
  margin: 0 0 24px;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.4;
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
  padding-left: 12px;
  font-size: 0.875rem;
  font-weight: 300;
  line-height: 1.4;
  color: ${colors.gray[400]};

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
  gap: 12px;
  padding: 16px;
`;

const AgreeRow = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 0.875rem;
  font-weight: 300;
  color: ${colors.gray[600]};
  cursor: pointer;
  text-align: left;
`;

const CheckCircle = styled.span<{ $active: boolean }>`
  flex-shrink: 0;
  display: inline-block;
  width: 20px;
  height: 20px;
  background-color: ${(props) => (props.$active ? colors.primary[500] : colors.gray[600])};
  -webkit-mask-image: url("${checkCircleIcon}");
  mask-image: url("${checkCircleIcon}");
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
`;

const WithdrawButton = styled.button`
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background-color: ${colors.gray[50]};
  color: ${colors.gray[300]};
  font-size: 0.875rem;
  font-weight: 300;
  cursor: pointer;

  &:not(:disabled) {
    background-color: ${colors.primary[500]};
    color: #ffffff;
    font-weight: 600;
  }

  &:disabled {
    cursor: not-allowed;
  }
`;
