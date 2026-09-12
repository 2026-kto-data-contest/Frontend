import { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { Button } from "../../shared/components/Button";
import { useAuth } from "../../shared/lib/authContext";
import { fetchTerms, saveTermsAgreements, continueAuth, ApiError } from "../../shared/api/api";
import type { TermItem } from "../../shared/api/api";

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
    title: "마케팅 정보 수신 동의 (카카오톡, 이메일 등)",
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

  const allChecked = terms.every((item) => checked[item.code]);
  const canContinue = terms.filter((item) => item.required).every((item) => checked[item.code]);

  const toggleAll = () => {
    const next = !allChecked;
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

  return (
    <PageContainer>
      <CloseButton type="button" aria-label="닫기" onClick={() => navigate(-1)}>
        ✕
      </CloseButton>

      <Title>
        서비스 이용에
        <br />
        필요한 동의만 받고있어요
      </Title>

      <AllAgreeRow type="button" onClick={toggleAll}>
        <CheckCircle $active={allChecked} $size={22}>
          ✓
        </CheckCircle>
        <AllAgreeLabel>모두 동의합니다.</AllAgreeLabel>
      </AllAgreeRow>

      <Divider />

      <ItemList>
        {terms.map((item) => (
          <ItemRow key={item.code}>
            <ItemLeft type="button" onClick={() => toggleItem(item.code)}>
              <CheckCircle $active={!!checked[item.code]} $size={18}>
                ✓
              </CheckCircle>
              <ItemLabel>
                [{item.required ? "필수" : "선택"}] {item.title}
              </ItemLabel>
            </ItemLeft>
            {item.contentUrl && (
              <ViewLink as="a" href={item.contentUrl} target="_blank" rel="noopener noreferrer">
                보기
              </ViewLink>
            )}
          </ItemRow>
        ))}
      </ItemList>

      {errorMessage && <ErrorText>{errorMessage}</ErrorText>}

      <Button
        variant="primary"
        disabled={!canContinue || isSubmitting}
        style={{ marginTop: 32, width: "100%" }}
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
  padding: 24px;
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
  color: #111827;
  font-size: 1rem;
  cursor: pointer;
  padding: 0;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  margin: 0 0 24px;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.4;
  color: #111827;
`;

const AllAgreeRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
`;

const AllAgreeLabel = styled.span`
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
`;

const Divider = styled.hr`
  width: 100%;
  margin: 16px 0;
  border: none;
  border-top: 1px solid #e5e7eb;
`;

const ItemList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const ItemLeft = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
`;

const ItemLabel = styled.span`
  font-size: 0.875rem;
  color: #374151;
  text-align: left;
`;

const ViewLink = styled.span`
  flex-shrink: 0;
  font-size: 0.8125rem;
  color: #9ca3af;
  text-decoration: underline;
`;

const CheckCircle = styled.span<{ $active: boolean; $size: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  border-radius: 50%;
  font-size: ${(props) => props.$size * 0.6}px;
  font-weight: 700;
  color: ${(props) => (props.$active ? "#ffffff" : "#9ca3af")};
  background-color: ${(props) => (props.$active ? "#ff7a00" : "#f3f4f6")};
  border: 1px solid ${(props) => (props.$active ? "transparent" : "#e5e7eb")};
`;

const ErrorText = styled.p`
  margin: 16px 0 0;
  font-size: 0.8125rem;
  color: #ef4444;
  text-align: center;
`;
