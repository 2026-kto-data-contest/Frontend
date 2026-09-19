import { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { Button } from "../../shared/components/Button";
import { colors } from "../../shared/styles/colors";
import { useAuth } from "../../shared/lib/authContext";
import { fetchTerms, saveTermsAgreements, continueAuth, ApiError } from "../../shared/api/api";
import type { TermItem } from "../../shared/api/api";
import closeXIcon from "../../assets/icon/CloseX.svg";
import checkMarkIcon from "../../assets/icon/CheckMark.svg";
import checkMarkMutedIcon from "../../assets/icon/CheckMarkMuted.svg";
import checkCircleOutlineIcon from "../../assets/icon/CheckCircleOutline.svg";
import checkCircleOutlineMutedIcon from "../../assets/icon/CheckCircleOutlineMuted.svg";

// "보기"를 눌렀을 때 상세 약관 페이지로 이동하는 항목들입니다(연령확인 제외).
// 아직 그 페이지가 없어서, 페이지가 생기면 여기서 실제 경로로 연결해주세요.
const VIEWABLE_TERM_CODES = new Set(["SERVICE_USE", "PRIVACY", "LOCATION", "MARKETING"]);

// 백엔드가 내려주는 약관 제목을 그대로 쓰지 않고 화면 문구를 고정하고 싶은 항목입니다.
const TERM_TITLE_OVERRIDES: Record<string, string> = {
  MARKETING: "마케팅 수신 동의 (카카오톡, 이메일 등)",
};

function displayTermTitle(item: TermItem): string {
  return TERM_TITLE_OVERRIDES[item.code] ?? item.title;
}

// 백엔드가 아직 contentUrl을 내려주지 않아서, 실제 약관 문서 링크가 생길 때까지 프론트에서
// 코드별로 직접 지정해둡니다. 백엔드가 contentUrl을 채워주기 시작하면 이 값은 자연히
// 안 쓰이게 되므로(resolveTermContentUrl이 item.contentUrl을 우선함) 그때 지워도 됩니다.
const TERM_CONTENT_URL_OVERRIDES: Record<string, string> = {
  SERVICE_USE:
    "https://nonstop-platinum-949.notion.site/3e0a70bfeb5d804e8579ffe9e5cebc34?source=copy_link",
  PRIVACY:
    "https://nonstop-platinum-949.notion.site/3e0a70bfeb5d806d9a9fe4e8e2b32788?source=copy_link",
  LOCATION:
    "https://nonstop-platinum-949.notion.site/3e0a70bfeb5d80b5a0a6df4f9935eb8d?source=copy_link",
  MARKETING:
    "https://nonstop-platinum-949.notion.site/3e0a70bfeb5d80c2a6e0e1d92f443f57?source=copy_link",
};

function resolveTermContentUrl(item: TermItem): string | null {
  return item.contentUrl ?? TERM_CONTENT_URL_OVERRIDES[item.code] ?? null;
}

// 백엔드 조회가 실패했을 때(오프라인 등) 화면이 비지 않도록 쓰는 기본값입니다.
const FALLBACK_TERMS: TermItem[] = [
  {
    code: "SERVICE_USE",
    version: "1",
    title: "서비스 이용약관 동의",
    required: true,
    contentUrl: null,
    agreed: false,
  },
  {
    code: "PRIVACY",
    version: "1",
    title: "개인정보 수집 및 이용 동의",
    required: true,
    contentUrl: null,
    agreed: false,
  },
  {
    code: "LOCATION",
    version: "1",
    title: "위치기반 서비스 이용약관",
    required: false,
    contentUrl: null,
    agreed: false,
  },
  {
    code: "MARKETING",
    version: "1",
    title: "마케팅 수신 동의 (카카오톡, 이메일 등)",
    required: false,
    contentUrl: null,
    agreed: false,
  },
];

export default function TermsPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [terms, setTerms] = useState<TermItem[]>(FALLBACK_TERMS);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // "만 19세 이상" 확인은 아직 백엔드 약관 목록에 없어서(추후 연동 예정), 화면만 먼저
  // 만들어두고 이 항목만 로컬 상태로 관리합니다. 저장(saveTermsAgreements)에는 보내지
  // 않고, 필수 항목이라 전체동의·계속하기 가능 여부 판단에는 함께 포함합니다.
  const [ageVerified, setAgeVerified] = useState(false);

  useEffect(() => {
    fetchTerms()
      .then((items) => {
        setTerms(items);
        setChecked(Object.fromEntries(items.map((item) => [item.code, item.agreed])));
      })
      .catch((error) => {
        console.error("약관 조회 실패", error);
      });
  }, []);

  const allChecked = ageVerified && terms.every((item) => checked[item.code]);
  const canContinue =
    ageVerified && terms.filter((item) => item.required).every((item) => checked[item.code]);

  const toggleAll = () => {
    const next = !allChecked;
    setAgeVerified(next);
    setChecked(Object.fromEntries(terms.map((item) => [item.code, next])));
  };

  const toggleItem = (code: string) => {
    setChecked((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await saveTermsAgreements(
        terms.map((item) => ({ code: item.code, agreed: !!checked[item.code] }))
      );
      const { nextPath } = await continueAuth();
      await auth.refresh();
      navigate(nextPath);
    } catch (error) {
      console.error("약관 저장 실패", error);
      const message =
        error instanceof ApiError
          ? error.status === 400
            ? "필수 약관에 모두 동의해주세요."
            : error.message
          : "약관 저장에 실패했어요. 다시 시도해주세요.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 약관 동의는 최초 가입 절차의 일부라, 여기서 취소하면 가입 자체를 안 한 셈 쳐야 합니다.
  // 로그인 세션을 지워서 다음에 다시 시도할 때 카카오 인가부터 새로 거치게 하고, 로그인
  // 화면으로 보냅니다. (이 화면 직전 브라우저 히스토리는 카카오 로그인 리다이렉트 체인이라
  // navigate(-1)을 쓰면 카카오 플랫폼으로 되돌아가 버려서, 히스토리를 타지 않고 직접 이동시킵니다.)
  const handleClose = async () => {
    await auth.logout();
    navigate("/login", { replace: true });
  };

  return (
    <PageContainer>
      <CloseButton type="button" aria-label="닫기" onClick={handleClose}>
        <img src={closeXIcon} alt="" width={24} height={24} />
      </CloseButton>

      <Title>
        서비스 이용에
        <br />
        필요한 동의만 받고있어요
      </Title>

      <AllAgreeRow type="button" onClick={toggleAll}>
        <img
          src={allChecked ? checkCircleOutlineIcon : checkCircleOutlineMutedIcon}
          alt=""
          width={24}
          height={24}
        />
        <AllAgreeLabel>모두 동의합니다.</AllAgreeLabel>
      </AllAgreeRow>

      <Divider />

      <ItemList>
        <ItemRow>
          <ItemLeft type="button" onClick={() => setAgeVerified((prev) => !prev)}>
            <img
              src={ageVerified ? checkMarkIcon : checkMarkMutedIcon}
              alt=""
              width={24}
              height={24}
            />
            <ItemLabel>[필수] 만 19세 이상입니다</ItemLabel>
          </ItemLeft>
        </ItemRow>
        {terms.map((item) => (
          <ItemRow key={item.code}>
            <ItemLeft type="button" onClick={() => toggleItem(item.code)}>
              <img
                src={checked[item.code] ? checkMarkIcon : checkMarkMutedIcon}
                alt=""
                width={24}
                height={24}
              />
              <ItemLabel>
                [{item.required ? "필수" : "선택"}] {displayTermTitle(item)}
              </ItemLabel>
            </ItemLeft>
            {VIEWABLE_TERM_CODES.has(item.code) &&
              (resolveTermContentUrl(item) ? (
                <ViewLink
                  as="a"
                  href={resolveTermContentUrl(item)!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  보기
                </ViewLink>
              ) : (
                <ViewLink as="button" type="button">
                  보기
                </ViewLink>
              ))}
          </ItemRow>
        ))}
      </ItemList>

      {errorMessage && <ErrorText>{errorMessage}</ErrorText>}

      <Button
        variant="primary"
        size="lg"
        disabled={!canContinue || isSubmitting}
        style={{ marginTop: "auto", width: "100%", height: 52, borderRadius: 8 }}
        onClick={handleSubmit}
      >
        {isSubmitting ? "처리 중..." : "동의하고 계속하기"}
      </Button>
    </PageContainer>
  );
}

const PageContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px 24px 48px;
  box-sizing: border-box;
  background-color: #ffffff;
`;

const CloseButton = styled.button`
  align-self: flex-start;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  margin: 0 0 24px;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 132%;
  letter-spacing: -0.4px;
  color: ${colors.gray[900]};
`;

const AllAgreeRow = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  border: none;
  background: transparent;
  padding: 8px 0;
  cursor: pointer;
`;

const AllAgreeLabel = styled.span`
  font-size: 1rem;
  font-weight: 700;
  line-height: 140%;
  letter-spacing: -0.32px;
  color: ${colors.gray[900]};
`;

const Divider = styled.div`
  width: 100%;
  height: 1px;
  margin: 4px 0;
  background-color: ${colors.divider};
`;

const ItemList = styled.div`
  display: flex;
  flex-direction: column;
`;

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
`;

const ItemLeft = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
`;

const ItemLabel = styled.span`
  font-size: 0.875rem;
  font-weight: 300;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.gray[600]};
  text-align: left;
`;

const ViewLink = styled.span`
  flex-shrink: 0;
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  font-size: 0.8125rem;
  line-height: 100%;
  color: ${colors.gray[300]};
  text-decoration: underline;
  cursor: pointer;
`;

const ErrorText = styled.p`
  margin: 16px 0 0;
  font-size: 0.8125rem;
  color: #ef4444;
  text-align: center;
`;
