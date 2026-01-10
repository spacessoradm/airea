import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Bot, User, Loader2, Brain, Minimize2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useChatContext } from "@/contexts/ChatContext";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function AIChat() {
  const { isOpen, isExpanded, openChat, closeChat, expandChat, minimizeChat } = useChatContext();
  
  // No dragging - just fixed positioning
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "🏠 Hello! I'm Airea, your intelligent property assistant. I'm here to help you:\n\n✨ Find properties using natural language\n📊 Get market insights and pricing data\n🎯 Receive personalized recommendations\n📍 Explore neighborhoods and amenities\n\nJust ask me anything about Malaysian real estate - I understand conversational queries like \"Find me a family-friendly condo under RM800k near good schools\"",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest('/api/ai/chat', 'POST', { message });
    },
    onSuccess: (response: any) => {
      const aiMessage: Message = {
        id: Date.now().toString(),
        content: response.reply,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    },
    onError: (error) => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    
    chatMutation.mutate(inputMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // No dragging handlers needed

  const chatWidget = (
    <div 
      className="fixed bottom-4 right-4 flex flex-col items-end space-y-4"
      style={{
        zIndex: 2147483647, // Maximum z-index value
        pointerEvents: 'none'
      }}
    >
        
        {/* Expanded Chat Window */}
        {isExpanded && (
          <Card 
            className="w-80 h-[500px] max-h-[calc(100vh-2rem)] shadow-2xl border-0 bg-white rounded-2xl overflow-hidden"
            style={{ 
              pointerEvents: 'auto',
              transform: 'translateY(-100%)',
              marginBottom: '4.5rem'
            }}
          >
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Airea AI Assistant</CardTitle>
                    <p className="text-blue-100 text-xs">Your Smart Property Guide</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={minimizeChat}
                    className="text-white hover:bg-white/20 p-1 h-7 w-7 rounded-lg"
                    data-testid="chat-minimize-button"
                  >
                    <Minimize2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeChat}
                    className="text-white hover:bg-white/20 p-1 h-7 w-7 rounded-lg"
                    data-testid="chat-close-button"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-1 mt-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-blue-100 text-xs">Online</span>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex flex-col h-[400px]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start space-x-2 max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                        message.sender === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white border border-gray-200'
                      }`}>
                        {message.sender === 'user' ? (
                          <User className="h-3 w-3" />
                        ) : (
                          <Bot className="h-3 w-3 text-blue-600" />
                        )}
                      </div>
                      <div className={`px-3 py-2 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                      }`}>
                        <p className="text-xs leading-relaxed">{message.content}</p>
                        <p className={`text-xs mt-1 opacity-70 ${
                          message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Loading indicator */}
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                        <Bot className="h-3 w-3 text-blue-600" />
                      </div>
                      <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg rounded-bl-sm">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                          <span className="text-xs text-gray-600">Typing...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-200 bg-white">
                <div className="flex items-center space-x-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={chatMutation.isPending}
                    className="flex-1 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    data-testid="chat-input"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || chatMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-2 h-9"
                    data-testid="chat-send-button"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Button - Always visible when not expanded */}
        {!isExpanded && (
          <div 
            className="group cursor-pointer"
            onClick={expandChat}
            data-testid="floating-chat-button"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="relative">
              {/* Notification dot */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
              
              {/* Main button */}
              <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center cursor-pointer">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-xl">
                💬 Chat with AI Assistant
                <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        )}
    </div>
  );

  // Render using portal to ensure it's always on top and properly positioned
  return typeof window !== 'undefined' 
    ? createPortal(chatWidget, document.body)
    : null;
}