'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
});

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function QuillEditor({ value, onChange, placeholder }: QuillEditorProps) {
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only set to true on client side
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        <div>Loading editor...</div>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={{
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            ['link'],
            ['clean']
          ],
        }}
        style={{ minHeight: '300px' }}
      />
    </div>
  );
}

