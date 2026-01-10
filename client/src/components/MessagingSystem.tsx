import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCircle, X, Send, User } from "lucide-react";

export default function MessagingSystem() {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["/api/messages/unread/count"],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mock conversations for demonstration
  const mockConversations = [
    {
      id: "1",
      participantName: "Agent Sarah Lee",
      participantImage: null,
      lastMessage: "Hi! I have more details about the KLCC apartment.",
      timestamp: "2 min ago",
      unread: true,
      propertyTitle: "Luxury 2BR Apartment KLCC"
    },
    {
      id: "2", 
      participantName: "Agent John Tan",
      participantImage: null,
      lastMessage: "The viewing is confirmed for tomorrow at 2 PM.",
      timestamp: "1 hour ago",
      unread: false,
      propertyTitle: "Modern Condo Mont Kiara"
    },
    {
      id: "3",
      participantName: "Agent Lisa Wong",
      participantImage: null,
      lastMessage: "Thank you for your interest! The rent is negotiable.",
      timestamp: "Yesterday",
      unread: true,
      propertyTitle: "Cozy Studio Bangsar"
    }
  ];

  // Mock messages for selected conversation
  const mockMessages = selectedConversation ? [
    {
      id: "1",
      senderId: selectedConversation === "1" ? "agent1" : "agent2",
      content: "Hello! I saw your inquiry about the property. How can I help you?",
      timestamp: "10:30 AM",
      isOwn: false
    },
    {
      id: "2", 
      senderId: "current-user",
      content: "Hi! I'm interested in viewing the apartment. When would be a good time?",
      timestamp: "10:35 AM",
      isOwn: true
    },
    {
      id: "3",
      senderId: selectedConversation === "1" ? "agent1" : "agent2", 
      content: selectedConversation === "1" 
        ? "I have more details about the KLCC apartment. Would you like to schedule a viewing?"
        : "The viewing is confirmed for tomorrow at 2 PM. I'll send you the exact address.",
      timestamp: "10:45 AM",
      isOwn: false
    }
  ] : [];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-secondary hover:bg-secondary/90 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all relative"
          size="lg"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-6 w-6 text-xs flex items-center justify-center p-0 min-w-[1.5rem]"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Messages Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl h-[80vh] p-0">
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
              <DialogHeader className="p-4 border-b border-gray-200">
                <DialogTitle className="flex items-center justify-between">
                  <span>Messages</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto">
                {mockConversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {mockConversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedConversation === conversation.id
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                            {conversation.participantImage ? (
                              <img 
                                src={conversation.participantImage} 
                                alt={conversation.participantName}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {conversation.participantName}
                              </h4>
                              <span className="text-xs text-gray-500">
                                {conversation.timestamp}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mb-1 truncate">
                              {conversation.propertyTitle}
                            </p>
                            <p className={`text-sm truncate ${
                              conversation.unread ? 'font-medium text-gray-900' : 'text-gray-600'
                            }`}>
                              {conversation.lastMessage}
                            </p>
                            {conversation.unread && (
                              <div className="w-2 h-2 bg-primary rounded-full mt-1"></div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {mockConversations.find(c => c.id === selectedConversation)?.participantName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {mockConversations.find(c => c.id === selectedConversation)?.propertyTitle}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {mockMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.isOwn
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.isOwn ? 'text-primary-foreground/70' : 'text-gray-500'
                          }`}>
                            {message.timestamp}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <Button size="sm">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a conversation to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
