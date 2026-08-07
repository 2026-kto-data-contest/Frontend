import { useState } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../shared/lib/authContext";
import { Button } from "../../shared/components/Button";

interface TermItem {
  id: string;
  required: boolean;
  label: string;
}

const TERMS_ITEMS: TermItem[] = [
  { id: "service", required: true, label: "서비스 이용약관 동의" },
  { id: "privacy", required: true, label: "개인정보 수집 및 이용 동의" },
  { id: "location", required: false, label: "위치기반 서비스 이용약관" },
  { id: "marketing", required: false, label: "마케팅 정보 수신 동의 (카카오톡, 이메일 등)" },
];

export default function TermsPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || "/";
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const allChecked = TERMS_ITEMS.every((item) => checked[item.id]);
  const canContinue = TERMS_ITEMS.filter((item) => item.required).every((item) => checked[item.id]);

  const toggleAll = () => {
    const next = !allChecked;
    setChecked(Object.fromEntries(TERMS_ITEMS.map((item) => [item.id, next])));
  };

  const toggleItem = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
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
        {TERMS_ITEMS.map((item) => (
          <ItemRow key={item.id}>
            <ItemLeft type="button" onClick={() => toggleItem(item.id)}>
              <CheckCircle $active={!!checked[item.id]} $size={18}>
                ✓
              </CheckCircle>
              <ItemLabel>
                [{item.required ? "필수" : "선택"}] {item.label}
              </ItemLabel>
            </ItemLeft>
            <ViewLink>보기</ViewLink>
          </ItemRow>
        ))}
      </ItemList>

      <Button
        variant="primary"
        disabled={!canContinue}
        style={{ marginTop: 32, width: "100%" }}
        onClick={() => {
          auth.completeOnboarding();
          navigate(from);
        }}
      >
        동의하고 계속하기
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
