import Quill from 'quill';
import React, { createContext, ReactNode, useContext, useState } from 'react';

interface TextEditingContextType {
  activeEditor: Quill | null;
  setActiveEditor: (editor: Quill | null) => void;
  isTextEditing: boolean;
}

const TextEditingContext = createContext<TextEditingContextType | undefined>(
  undefined,
);

interface TextEditingProviderProps {
  children: ReactNode;
}

export const TextEditingProvider: React.FC<TextEditingProviderProps> = ({
  children,
}) => {
  const [activeEditor, setActiveEditor] = useState<Quill | null>(null);

  const value = {
    activeEditor,
    setActiveEditor,
    isTextEditing: activeEditor !== null,
  };

  return (
    <TextEditingContext.Provider value={value}>
      {children}
    </TextEditingContext.Provider>
  );
};

export const useTextEditing = (): TextEditingContextType => {
  const context = useContext(TextEditingContext);
  if (context === undefined) {
    throw new Error('useTextEditing must be used within a TextEditingProvider');
  }
  return context;
};
