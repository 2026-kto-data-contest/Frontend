import styled from "styled-components";

export interface SnackbarProps {
  message: string | null;
}

// 화면 하단에 잠깐 노출되는 토스트 메시지입니다. 노출/숨김 타이밍은 호출하는 쪽에서 관리합니다.
export const Snackbar = ({ message }: SnackbarProps) => {
  if (!message) return null;
  return (
    <Wrapper role="status" aria-live="polite">
      <Bubble>{message}</Bubble>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 76px;
  z-index: 60;
  display: flex;
  justify-content: center;
  padding: 0 16px;
  pointer-events: none;
`;

const Bubble = styled.div`
  padding: 12px 20px;
  border-radius: 9999px;
  background-color: rgba(23, 23, 22, 0.92);
  color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`;
