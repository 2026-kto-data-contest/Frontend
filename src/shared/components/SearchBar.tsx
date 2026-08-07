import React, { useState } from "react";
import styled from "styled-components";
import { colors } from "../styles/colors";

export interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  onSearch?: (value: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "검색어를 입력하세요",
  defaultValue = "",
  onSearch,
}) => {
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(value);
  };

  return (
    <SearchForm onSubmit={handleSubmit} role="search">
      <SearchIcon aria-hidden>⌕</SearchIcon>
      <SearchInput
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
    </SearchForm>
  );
};

const SearchForm = styled.form`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 9999px;
  background-color: ${colors.gray[100]};
  border: 1px solid transparent;

  &:focus-within {
    border-color: ${colors.primary[500]};
    background-color: ${colors.white};
  }
`;

const SearchIcon = styled.span`
  font-size: 1rem;
  color: ${colors.gray[400]};
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.9375rem;
  color: ${colors.gray[900]};

  &::placeholder {
    color: ${colors.gray[400]};
  }
`;
