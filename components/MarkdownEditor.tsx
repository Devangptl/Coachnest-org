"use client";

import QuillEditor from "./QuillEditor";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Approximate row count — converted to minHeight (rows × 24 px) */
  rows?: number;
}

export default function MarkdownEditor({ value, onChange, placeholder, rows = 16 }: Props) {
  return (
    <QuillEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      minHeight={rows * 24}
    />
  );
}
