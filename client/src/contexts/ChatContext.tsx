import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatContextType {
  isOpen: boolean;
  isExpanded: boolean;
  openChat: () => void;
  closeChat: () => void;
  expandChat: () => void;
  minimizeChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider = ({ children }: ChatProviderProps) => {
  const [isOpen, setIsOpen] = useState(true); // Always visible now
  const [isExpanded, setIsExpanded] = useState(false); // Controls minimized/expanded state

  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);
  const expandChat = () => {
    setIsOpen(true);
    setIsExpanded(true);
  };
  const minimizeChat = () => setIsExpanded(false);

  return (
    <ChatContext.Provider value={{ isOpen, isExpanded, openChat, closeChat, expandChat, minimizeChat }}>
      {children}
    </ChatContext.Provider>
  );
};

