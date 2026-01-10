import { useQuery } from "@tanstack/react-query";
import { MessageCircle, User as UserIcon } from "lucide-react";
import type { Message, User } from "@shared/schema";
import Header from "@/components/Header";
import { formatDistanceToNow } from "date-fns";

export default function Messages() {
  // Fetch current user
  const { data: user, isLoading: isLoadingUser, isError: isErrorUser } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // Fetch user's messages
  const { data: messages, isLoading: isLoadingMessages, isError: isErrorMessages } = useQuery<Message[]>({
    queryKey: ['/api/messages', user?.id],
    enabled: !!user,
    retry: false,
  });

  if (isLoadingUser) {
    return (
      <>
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </>
    );
  }

  if (isErrorUser) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error loading messages</h2>
          <p className="text-gray-500 mb-6">Unable to load your account. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to view messages</h2>
          <p className="text-gray-500 mb-6">Create an account to communicate with property agents</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
            data-testid="button-sign-in"
          >
            Sign In
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600">
            {messages?.length || 0} {messages?.length === 1 ? 'message' : 'messages'}
          </p>
        </div>

        {isLoadingMessages ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading messages...</p>
          </div>
        ) : isErrorMessages ? (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error loading messages</h2>
            <p className="text-gray-500 mb-6">Please try refreshing the page</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
            >
              Refresh
            </button>
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No messages yet</h2>
            <p className="text-gray-500 mb-6">Your conversations with agents will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                data-testid={`message-${message.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900">Agent</p>
                      <span className="text-xs text-gray-500">
                        {message.createdAt && formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{message.content}</p>
                    {!message.read && (
                      <div className="mt-2">
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          Unread
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
