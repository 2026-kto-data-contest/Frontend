import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { Snackbar } from "../../shared/components/Snackbar";
import { colors } from "../../shared/styles/colors";
import { useAuth } from "../../shared/lib/authContext";
import { usePersistentState, useCacheGeneration } from "../../shared/lib/pageState";
import {
  fetchTerms,
  fetchOnboardingPreferences,
  updateOptionalAgreement,
} from "../../shared/api/api";
import type { OnboardingPreferencesData } from "../../shared/api/api";
import { STRENGTH_OPTIONS, ALCOHOL_LEVEL_TO_ID } from "../signin/onboarding/OnboardingStrengthPage";
import bannerBeforeIcon from "../../assets/icon/BannerBefore.svg";
import kakaoLogoIcon from "../../assets/icon/KakaoLogo.svg";
import outwardIcon from "../../assets/icon/Outward.svg";
import chevronRightIcon from "../../assets/icon/ChevronRight.svg";
import chevronRightMutedIcon from "../../assets/icon/ChevronRightMuted.svg";

const FROM_MYPAGE = "%2Fmypage";
const TOAST_DURATION_MS = 3000;

export default function MyPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [preferences, setPreferences] = usePersistentState<OnboardingPreferencesData | null>(
    "mypage:preferences",
    null
  );
  const [preferencesSignature, setPreferencesSignature] = usePersistentState<string | null>(
    "mypage:preferencesSignature",
    null
  );
  const [locationRecommend, setLocationRecommend] = usePersistentState("mypage:locationRecommend", false);
  const [marketing, setMarketing] = usePersistentState("mypage:marketing", false);
  const [termsSignature, setTermsSignature] = usePersistentState<string | null>(
    "mypage:termsSignature",
    null
  );
  const cacheGeneration = useCacheGeneration();
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.isLoggedIn) {
      navigate("/login?from=%2F", { replace: true });
      return;
    }
    // 카카오 로그인만 하고 약관 동의를 마치지 않은 상태(세션은 있지만 termsAgreed=false)로는
    // 마이페이지에 들어올 수 없게, 약관 동의 화면으로 돌려보냅니다.
    if (!auth.termsAgreed) {
      navigate("/terms", { replace: true });
    }
  }, [auth.isLoading, auth.isLoggedIn, auth.termsAgreed, navigate]);

  useEffect(() => {
    if (!auth.isLoggedIn) return;
    const signature = `${auth.isLoggedIn}|${cacheGeneration}`;
    // 탭을 벗어났다가 다시 들어온 경우, 이미 받아온 약관 동의 상태를 그대로 재사용합니다.
    if (termsSignature === signature) return;

    fetchTerms()
      .then((items) => {
        setLocationRecommend(!!items.find((item) => item.code === "LOCATION")?.agreed);
        setMarketing(!!items.find((item) => item.code === "MARKETING")?.agreed);
        setTermsSignature(signature);
      })
      .catch((error) => console.error("약관 동의 상태 조회 실패", error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isLoggedIn, cacheGeneration]);

  useEffect(() => {
    if (!auth.isLoggedIn || !auth.hasOnboarded) return;
    const signature = `${auth.isLoggedIn}|${auth.hasOnboarded}|${cacheGeneration}`;
    // 탭을 벗어났다가 다시 들어온 경우, 이미 받아온 취향 정보를 그대로 재사용합니다.
    if (preferencesSignature === signature) return;

    const controller = new AbortController();
    fetchOnboardingPreferences(controller.signal)
      .then((data) => {
        setPreferences(data);
        setPreferencesSignature(signature);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("취향 정보 조회 실패", error);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isLoggedIn, auth.hasOnboarded, cacheGeneration]);

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

  if (auth.isLoading || !auth.isLoggedIn || !auth.termsAgreed) {
    return null;
  }

  const tasteLabel = preferences?.liquorTypes.join("·") ?? "";
  const regionLabel = preferences
    ? preferences.regions.length === 0
      ? "전국"
      : preferences.regions.join("·")
    : "";
  const strengthLabel = preferences
    ? STRENGTH_OPTIONS.find((option) => option.id === ALCOHOL_LEVEL_TO_ID[preferences.alcoholLevel])
        ?.sub
    : undefined;

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
            <img src={kakaoLogoIcon} alt="" width={13} height={12} />
            kakao
          </KakaoBadge>
          <Email>{auth.email}</Email>
        </ProfileRow>

        {auth.hasOnboarded ? (
          <PreferenceSection>
            <SectionTitle>내 취향</SectionTitle>
            <RowGroup>
              <PreferenceRow
                type="button"
                onClick={() => navigate(`/onboarding/taste?from=${FROM_MYPAGE}`)}
              >
                <PreferenceLabel>주종 취향</PreferenceLabel>
                <PreferenceValue>{tasteLabel || "선택 안 함"}</PreferenceValue>
                <img src={chevronRightIcon} alt="" width={20} height={20} />
              </PreferenceRow>
              <RowDivider />
              <PreferenceRow
                type="button"
                onClick={() => navigate(`/onboarding/region?from=${FROM_MYPAGE}`)}
              >
                <PreferenceLabel>지역</PreferenceLabel>
                <PreferenceValue>{regionLabel || "선택 안 함"}</PreferenceValue>
                <img src={chevronRightIcon} alt="" width={20} height={20} />
              </PreferenceRow>
              <RowDivider />
              <PreferenceRow
                type="button"
                onClick={() => navigate(`/onboarding/strength?from=${FROM_MYPAGE}`)}
              >
                <PreferenceLabel>선호 도수</PreferenceLabel>
                <PreferenceValue>{strengthLabel || "선택 안 함"}</PreferenceValue>
                <img src={chevronRightIcon} alt="" width={20} height={20} />
              </PreferenceRow>
            </RowGroup>
          </PreferenceSection>
        ) : (
          <PromoBanner
            type="button"
            // from을 FROM_MYPAGE("/mypage")로 주면 온보딩 페이지들이 "마이페이지에서 항목 하나만
            // 고치는 중"으로 오인해(isEditMode) 3단계 전체가 아니라 취향 한 항목만 저장하고
            // 끝내버립니다. 아직 온보딩을 마치지 않은 사람용 배너이므로 from을 비워서, 다른
            // 진짜 온보딩 진입점(홈 화면 등)과 똑같이 취향→지역→도수 3단계를 다 거치게 합니다.
            onClick={() => navigate("/onboarding")}
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
          <RowGroup>
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
            <RowDivider />
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
          </RowGroup>
        </Section>

        <Section>
          <SectionTitle>이용 안내</SectionTitle>
          <RowGroup>
            <InfoLinkRow type="button">
              서비스 이용약관 <img src={outwardIcon} alt="" width={18} height={18} />
            </InfoLinkRow>
            <RowDivider />
            <InfoLinkRow type="button">
              개인정보 수집·이용 <img src={outwardIcon} alt="" width={18} height={18} />
            </InfoLinkRow>
            <RowDivider />
            <InfoLinkRow type="button">
              위치기반 서비스 이용약관 <img src={outwardIcon} alt="" width={18} height={18} />
            </InfoLinkRow>
          </RowGroup>
        </Section>

        <Section>
          <SectionTitle>계정</SectionTitle>
          <RowGroup>
            <AccountRow type="button" onClick={() => setLogoutOpen(true)}>
              로그아웃 <img src={chevronRightIcon} alt="" width={18} height={18} />
            </AccountRow>
            <RowDivider />
            <AccountRow type="button" $muted onClick={() => navigate("/mypage/withdraw")}>
              회원탈퇴 <img src={chevronRightMutedIcon} alt="" width={18} height={18} />
            </AccountRow>
          </RowGroup>
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
  padding: 16px 16px 24px;
`;

const Header = styled.h1`
  margin: 0 0 24px;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 132%;
  letter-spacing: -0.4px;
  color: ${colors.gray[900]};
`;

const Nickname = styled.p`
  margin: 0 0 8px;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 132%;
  letter-spacing: -0.48px;
  color: ${colors.black};
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
  padding: 2px 8px;
  border-radius: 9999px;
  background-color: #fee500;
  color: ${colors.gray[900]};
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 140%;
  letter-spacing: -0.28px;
`;

const Email = styled.span`
  font-size: 0.875rem;
  font-weight: 300;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.gray[500]};
`;

const PromoBanner = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
  margin: 24px 0 0;
  padding: 16px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
  background-color: #fff5e6;
`;

const PromoIcon = styled.img`
  flex-shrink: 0;
  width: 48px;
  height: 48px;
`;

const PromoTextArea = styled.span`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const PromoTitle = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.gray[900]};
`;

const PromoSubtitle = styled.span`
  font-size: 0.6875rem;
  line-height: 100%;
  color: ${colors.gray[300]};
`;

const PreferenceSection = styled.div`
  margin-top: 32px;
`;

const RowGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const PreferenceRow = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
`;

const PreferenceLabel = styled.span`
  flex-shrink: 0;
  width: 76px;
  font-size: 0.875rem;
  font-weight: 300;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.gray[500]};
`;

const PreferenceValue = styled.span`
  flex: 1;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.gray[900]};
`;

const Divider = styled.div`
  height: 12px;
  background-color: ${colors.divider};
`;

const BodyBlock = styled.div`
  padding: 8px 16px 32px;
`;

const Section = styled.section`
  padding: 24px 0;
`;

const SectionTitle = styled.h2`
  margin: 0 0 12px;
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 140%;
  letter-spacing: -0.36px;
  color: ${colors.gray[900]};
`;

const RowDivider = styled.div`
  width: 100%;
  height: 1px;
  background-color: ${colors.divider};
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
`;

const SettingText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`;

const SettingLabel = styled.span`
  font-size: 1rem;
  font-weight: 400;
  line-height: 140%;
  letter-spacing: -0.32px;
  color: ${colors.gray[900]};
`;

const SettingDesc = styled.span`
  font-size: 0.8125rem;
  line-height: 100%;
  color: ${colors.gray[500]};
`;

const Switch = styled.button<{ $on: boolean }>`
  flex-shrink: 0;
  position: relative;
  width: 34px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 9999px;
  background-color: ${(props) => (props.$on ? colors.primary[500] : colors.gray[200])};
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SwitchThumb = styled.span<{ $on: boolean }>`
  position: absolute;
  top: 2px;
  left: ${(props) => (props.$on ? "16px" : "2px")};
  width: 16px;
  height: 16px;
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
  padding: 10px 0;
  border: none;
  background: transparent;
  font-size: 1rem;
  font-weight: 400;
  line-height: 140%;
  letter-spacing: -0.32px;
  color: ${colors.gray[900]};
  cursor: pointer;
  text-align: left;
`;

const AccountRow = styled.button<{ $muted?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 0;
  border: none;
  background: transparent;
  font-size: 1rem;
  font-weight: 400;
  line-height: 140%;
  letter-spacing: -0.32px;
  color: ${(props) => (props.$muted ? colors.gray[400] : colors.gray[900])};
  cursor: pointer;
  text-align: left;
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
