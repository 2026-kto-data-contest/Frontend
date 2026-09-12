import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { Button } from "../../shared/components/Button";
import { Snackbar } from "../../shared/components/Snackbar";
import { colors } from "../../shared/styles/colors";
import { useAuth } from "../../shared/lib/authContext";
import { usePersistentState } from "../../shared/lib/pageState";
import { fetchTerms, updateOptionalAgreement } from "../../shared/api/api";
import { TASTE_OPTIONS } from "../signin/onboarding/OnboardingTastePage";
import { STRENGTH_OPTIONS } from "../signin/onboarding/OnboardingStrengthPage";
import bannerBeforeIcon from "../../assets/icon/BannerBefore.svg";
import rightArrowIcon from "../../assets/icon/RightArrow.svg";

const FROM_MYPAGE = "%2Fmypage";
const TOAST_DURATION_MS = 3000;

export default function MyPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [selectedTaste] = usePersistentState<string[]>("onboarding:taste", []);
  const [selectedRegion] = usePersistentState<string[]>("onboarding:region", []);
  const [selectedStrength] = usePersistentState<string>("onboarding:strength", "");
  const [locationRecommend, setLocationRecommend] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!auth.isLoggedIn) return;
    fetchTerms()
      .then((items) => {
        setLocationRecommend(!!items.find((item) => item.code === "LOCATION")?.agreed);
        setMarketing(!!items.find((item) => item.code === "MARKETING")?.agreed);
      })
      .catch((error) => console.error("약관 동의 상태 조회 실패", error));
  }, [auth.isLoggedIn]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  };

  const toggleAgreement = async (
    code: "LOCATION" | "MARKETING",
    current: boolean,
    setter: (value: boolean) => void
  ) => {
    const next = !current;
    setter(next); // 낙관적으로 먼저 반영합니다.
    setSavingCode(code);
    try {
      await updateOptionalAgreement(code, next);
    } catch (error) {
      console.error(`${code} 동의 변경 실패`, error);
      setter(current); // 저장 실패 시 원래 상태로 되돌립니다.
      showToast("설정을 저장하지 못했어요. 다시 시도해주세요.");
    } finally {
      setSavingCode(null);
    }
  };

  if (auth.isLoading) {
    return (
      <PageContainer>
        <Header>마이</Header>
      </PageContainer>
    );
  }

  if (!auth.isLoggedIn) {
    return (
      <PageContainer>
        <Header>마이</Header>
        <EmptyState>
          <EmptyText>로그인하고 전통주로의 다양한 기능을 이용해보세요.</EmptyText>
          <Button variant="primary" onClick={() => navigate("/login?from=%2Fmypage")}>
            로그인
          </Button>
        </EmptyState>
      </PageContainer>
    );
  }

  const tasteLabel = TASTE_OPTIONS.filter(
    (option) => selectedTaste.includes(option.id) && option.type
  )
    .map((option) => option.type)
    .join("·");
  const regionLabel = selectedRegion.join("·");
  const strengthLabel = STRENGTH_OPTIONS.find((option) => option.id === selectedStrength)?.sub;

  const handleLogout = async () => {
    setLogoutOpen(false);
    await auth.logout();
    navigate("/");
  };

  return (
    <PageContainer>
      <TopBlock>
        <Header>마이</Header>

        <Nickname>{auth.nickname}님</Nickname>
        <ProfileRow>
          <KakaoBadge>
            <KakaoIcon aria-hidden viewBox="0 0 24 24">
              <path d="M12 3C6.48 3 2 6.58 2 11c0 2.79 1.86 5.24 4.66 6.65-.2.73-.73 2.67-.84 3.09-.13.51.19.5.4.37.16-.11 2.55-1.73 3.58-2.43.71.1 1.45.16 2.2.16 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
            </KakaoIcon>
            kakao
          </KakaoBadge>
          <Email>{auth.email}</Email>
        </ProfileRow>

        {auth.hasOnboarded ? (
          <PreferenceSection>
            <SectionTitle>내 취향</SectionTitle>
            <PreferenceRow
              type="button"
              onClick={() => navigate(`/onboarding/taste?from=${FROM_MYPAGE}`)}
            >
              <PreferenceLabel>주종 취향</PreferenceLabel>
              <PreferenceValue>{tasteLabel || "선택 안 함"}</PreferenceValue>
              <img src={rightArrowIcon} alt="" width={20} height={20} />
            </PreferenceRow>
            <PreferenceRow
              type="button"
              onClick={() => navigate(`/onboarding/region?from=${FROM_MYPAGE}`)}
            >
              <PreferenceLabel>지역</PreferenceLabel>
              <PreferenceValue>{regionLabel || "선택 안 함"}</PreferenceValue>
              <img src={rightArrowIcon} alt="" width={20} height={20} />
            </PreferenceRow>
            <PreferenceRow
              type="button"
              onClick={() => navigate(`/onboarding/strength?from=${FROM_MYPAGE}`)}
            >
              <PreferenceLabel>선호 도수</PreferenceLabel>
              <PreferenceValue>{strengthLabel || "선택 안 함"}</PreferenceValue>
              <img src={rightArrowIcon} alt="" width={20} height={20} />
            </PreferenceRow>
          </PreferenceSection>
        ) : (
          <PromoBanner
            type="button"
            onClick={() => navigate(`/onboarding/taste?from=${FROM_MYPAGE}`)}
          >
            <PromoIcon src={bannerBeforeIcon} alt="" />
            <PromoTextArea>
              <PromoTitle>취향에 맞는 양조장을 찾아보세요</PromoTitle>
              <PromoSubtitle>1분이면 딱맞는 양조장과 여행 코스를 추천해드려요</PromoSubtitle>
            </PromoTextArea>
          </PromoBanner>
        )}
      </TopBlock>

      <Divider />

      <BodyBlock>
        <Section>
          <SectionTitle>설정</SectionTitle>
          <SettingRow>
            <SettingText>
              <SettingLabel>위치 기반 추천 사용</SettingLabel>
              <SettingDesc>현재 위치를 활용해 가까운 양조장을 찾아드려요</SettingDesc>
            </SettingText>
            <Switch
              type="button"
              role="switch"
              aria-checked={locationRecommend}
              $on={locationRecommend}
              disabled={savingCode === "LOCATION"}
              onClick={() => toggleAgreement("LOCATION", locationRecommend, setLocationRecommend)}
            >
              <SwitchThumb $on={locationRecommend} />
            </Switch>
          </SettingRow>
          <SettingRow>
            <SettingText>
              <SettingLabel>혜택 및 이벤트 소식 받기</SettingLabel>
              <SettingDesc>전통주로만의 새로운 소식을 받아보세요</SettingDesc>
            </SettingText>
            <Switch
              type="button"
              role="switch"
              aria-checked={marketing}
              $on={marketing}
              disabled={savingCode === "MARKETING"}
              onClick={() => toggleAgreement("MARKETING", marketing, setMarketing)}
            >
              <SwitchThumb $on={marketing} />
            </Switch>
          </SettingRow>
        </Section>

        <Section>
          <SectionTitle>이용 안내</SectionTitle>
          <InfoLinkRow type="button">
            서비스 이용약관 <span aria-hidden>↗</span>
          </InfoLinkRow>
          <InfoLinkRow type="button">
            개인정보 수집·이용 <span aria-hidden>↗</span>
          </InfoLinkRow>
          <InfoLinkRow type="button">
            위치기반 서비스 이용약관 <span aria-hidden>↗</span>
          </InfoLinkRow>
        </Section>

        <Section>
          <SectionTitle>계정</SectionTitle>
          <AccountRow type="button" onClick={() => setLogoutOpen(true)}>
            로그아웃 <img src={rightArrowIcon} alt="" width={20} height={20} />
          </AccountRow>
          <AccountRow type="button" onClick={() => navigate("/mypage/withdraw")}>
            회원탈퇴 <img src={rightArrowIcon} alt="" width={20} height={20} />
          </AccountRow>
        </Section>
      </BodyBlock>

      {logoutOpen && (
        <ModalOverlay onClick={() => setLogoutOpen(false)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalTitle>로그아웃</ModalTitle>
            <ModalDesc>현재 계정에서 로그아웃할까요?</ModalDesc>
            <ModalActions>
              <ModalCancelButton type="button" onClick={() => setLogoutOpen(false)}>
                취소
              </ModalCancelButton>
              <ModalConfirmButton type="button" onClick={handleLogout}>
                로그아웃
              </ModalConfirmButton>
            </ModalActions>
          </ModalCard>
        </ModalOverlay>
      )}

      <Snackbar message={toast} />
    </PageContainer>
  );
}

const PageContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: #ffffff;
`;

const TopBlock = styled.div`
  padding: 12px 16px 24px;
`;

const Header = styled.h1`
  margin: 0 0 20px;
  font-size: 1.0625rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const Nickname = styled.p`
  margin: 0 0 8px;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const ProfileRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const KakaoBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 9999px;
  background-color: #fee500;
  color: #191919;
  font-size: 0.75rem;
  font-weight: 600;
`;

const KakaoIcon = styled.svg`
  width: 12px;
  height: 12px;
  fill: #191919;
`;

const Email = styled.span`
  font-size: 0.8125rem;
  color: ${colors.gray[500]};
`;

const PromoBanner = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 0;
  padding: 16px;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
  background-color: #fff5e6;
`;

const PromoIcon = styled.img`
  flex-shrink: 0;
  width: 40px;
  height: 40px;
`;

const PromoTextArea = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const PromoTitle = styled.span`
  font-size: 0.875rem;
  font-weight: 700;
  color: #7a4a1f;
`;

const PromoSubtitle = styled.span`
  font-size: 0.75rem;
  color: #a06a3a;
`;

const PreferenceSection = styled.div`
  margin-top: 24px;
`;

const PreferenceRow = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
`;

const PreferenceLabel = styled.span`
  flex-shrink: 0;
  width: 76px;
  font-size: 0.875rem;
  color: ${colors.gray[500]};
`;

const PreferenceValue = styled.span`
  flex: 1;
  font-size: 0.9375rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const Divider = styled.div`
  height: 8px;
  background-color: ${colors.gray[50]};
`;

const BodyBlock = styled.div`
  padding: 8px 16px 32px;
`;

const Section = styled.section`
  padding: 24px 0;

  & + & {
    border-top: 1px solid ${colors.gray[100]};
  }
`;

const SectionTitle = styled.h2`
  margin: 0 0 8px;
  font-size: 1rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
`;

const SettingText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const SettingLabel = styled.span`
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${colors.gray[900]};
`;

const SettingDesc = styled.span`
  font-size: 0.75rem;
  color: ${colors.gray[400]};
`;

const Switch = styled.button<{ $on: boolean }>`
  flex-shrink: 0;
  position: relative;
  width: 44px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 9999px;
  background-color: ${(props) => (props.$on ? "#ff7a00" : colors.gray[200])};
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SwitchThumb = styled.span<{ $on: boolean }>`
  position: absolute;
  top: 3px;
  left: ${(props) => (props.$on ? "21px" : "3px")};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: left 0.2s ease-in-out;
`;

const InfoLinkRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 0;
  border: none;
  background: transparent;
  font-size: 0.9375rem;
  color: ${colors.gray[700]};
  cursor: pointer;
  text-align: left;
`;

const AccountRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 0;
  border: none;
  background: transparent;
  font-size: 0.9375rem;
  color: ${colors.gray[700]};
  cursor: pointer;
  text-align: left;
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
`;

const EmptyText = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  color: ${colors.gray[500]};
  text-align: center;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background-color: rgba(0, 0, 0, 0.4);
  box-sizing: border-box;
`;

const ModalCard = styled.div`
  width: 100%;
  max-width: 300px;
  padding: 24px 20px 20px;
  border-radius: 16px;
  background-color: #ffffff;
  box-sizing: border-box;
`;

const ModalTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 1.0625rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const ModalDesc = styled.p`
  margin: 0 0 20px;
  font-size: 0.875rem;
  color: ${colors.gray[500]};
`;

const ModalActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ModalCancelButton = styled.button`
  flex: 1;
  padding: 12px;
  border: 1px solid ${colors.gray[200]};
  border-radius: 8px;
  background-color: #ffffff;
  color: ${colors.gray[700]};
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
`;

const ModalConfirmButton = styled.button`
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background-color: ${colors.gray[900]};
  color: #ffffff;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
`;
