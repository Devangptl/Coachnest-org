"use client";

import QuillEditor from "./QuillEditor";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Approximate row count — converted to minHeight (rows × 24 px) */
  rows?: number;
  /** Optional image picker — called when user clicks the toolbar image button. */
  onPickImage?: () => Promise<string | null | undefined>;
}

export default function MarkdownEditor({ value, onChange, placeholder, rows = 16, onPickImage }: Props) {
  return (
    <QuillEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      minHeight={rows * 24}
      onPickImage={onPickImage}
    />
  );
}
