import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Sparkles, Plus, Trash2, MessageSquare, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
}

interface ConversationData {
  id: number;
  title: string;
  messages?: ChatMessage[];
}

export default function AIChat() {
  const [input, setInput] = useState("");
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations, isLoading: convLoading } = useQuery<ConversationData[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: activeConv } = useQuery<ConversationData>({
    queryKey: ["/api/conversations", activeConversation],
    enabled: !!activeConversation,
  });

  const createConversation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });
      return res.json();
    },
    onSuccess: (data: ConversationData) => {
      setActiveConversation(data.id);
      setLocalMessages([]);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      setActiveConversation(null);
      setLocalMessages([]);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages, streamingContent, localMessages]);

  useEffect(() => {
    if (activeConv?.messages) {
      setLocalMessages([]);
    }
  }, [activeConv?.messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    let convId = activeConversation;
    if (!convId) {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: input.slice(0, 50) }),
      });
      const conv = await res.json();
      convId = conv.id;
      setActiveConversation(conv.id);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    }

    const userMessage = input.trim();
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");
    setLocalMessages(prev => [...prev, { role: "user", content: userMessage }]);

    try {
      const response = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              fullContent += data.content;
              setStreamingContent(fullContent);
            }
            if (data.done) {
              setIsStreaming(false);
              setStreamingContent("");
              setLocalMessages([]);
              queryClient.invalidateQueries({ queryKey: ["/api/conversations", convId] });
              queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
            }
            if (data.error) {
              setIsStreaming(false);
              setStreamingContent("");
              setLocalMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setIsStreaming(false);
      setStreamingContent("");
      setLocalMessages(prev => [...prev, { role: "assistant", content: "Failed to connect. Please try again." }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const serverMessages = activeConv?.messages || [];
  const displayMessages: ChatMessage[] = [
    ...serverMessages,
    ...localMessages,
    ...(streamingContent ? [{ role: "assistant" as const, content: streamingContent }] : []),
  ];

  return (
    <div className="h-full flex flex-col md:flex-row">
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#00FFA3]/10 flex-col hidden md:flex bg-black/20">
        <div className="p-3 border-b border-[#00FFA3]/10 flex gap-2">
          <Link href="/">
            <Button size="icon" variant="ghost" className="text-white/60 hover:text-white md:hidden" data-testid="button-back-chat">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            className="flex-1 gap-2 border-[#00FFA3]/20 text-white hover:bg-[#00FFA3]/10 hover:text-[#00FFA3]"
            onClick={() => createConversation.mutate()}
            data-testid="button-new-chat"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1 p-2">
          {convLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)}
            </div>
          ) : conversations && conversations.length > 0 ? (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors group ${
                    activeConversation === conv.id ? "bg-[#00FFA3]/10 text-[#00FFA3]" : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                  onClick={() => setActiveConversation(conv.id)}
                  data-testid={`conversation-item-${conv.id}`}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm truncate flex-1">{conv.title}</span>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation.mutate(conv.id);
                    }}
                    data-testid={`button-delete-conversation-${conv.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/30 text-center p-4">No conversations yet</p>
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-2 p-3 border-b border-[#00FFA3]/10 md:hidden">
          <Link href="/">
            <Button size="icon" variant="ghost" className="text-white/60 hover:text-white" data-testid="button-back-chat-mobile">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <span className="text-sm font-display font-bold text-white">AI Advisor</span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            className="gap-1 border-[#00FFA3]/20 text-white hover:bg-[#00FFA3]/10 hover:text-[#00FFA3] text-xs"
            onClick={() => createConversation.mutate()}
            data-testid="button-new-chat-mobile"
          >
            <Plus className="w-3 h-3" />
            New
          </Button>
        </div>
        {displayMessages.length === 0 && !isStreaming ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-full bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-[#00FFA3]" />
              </div>
              <h2 className="text-xl font-display font-bold text-white mb-3" data-testid="text-chat-welcome">
                AI Advisor
              </h2>
              <p className="text-sm text-white/50 leading-relaxed mb-6">
                Ask about match predictions, team form, betting strategies, odds analysis, and more. I analyze real-time football data to provide intelligent insights.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "Best bets for today's Premier League matches?",
                  "Analyze Arsenal vs Chelsea head-to-head",
                  "Which BTTS picks have highest confidence?",
                  "Give me 3 value bets for this weekend",
                ].map((prompt, i) => (
                  <button
                    key={i}
                    className="p-3 rounded-md border border-white/10 bg-white/5 text-left text-xs text-white/60 transition-colors hover:bg-[#00FFA3]/5 hover:border-[#00FFA3]/20 hover:text-white"
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                    data-testid={`button-suggestion-${i}`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-3xl mx-auto space-y-4">
              {displayMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-[#00FFA3]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#00FFA3] text-black font-medium"
                        : "bg-white/5 border border-white/10 text-white"
                    }`}
                    data-testid={`message-${msg.role}-${i}`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    {isStreaming && i === displayMessages.length - 1 && msg.role === "assistant" && (
                      <span className="inline-block w-1.5 h-4 bg-[#00FFA3] animate-pulse ml-1" />
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}

        <div className="p-4 border-t border-[#00FFA3]/10">
          <div className="max-w-3xl mx-auto flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about match predictions, betting strategies, team analysis..."
              className="flex-1 resize-none rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#00FFA3] min-h-[44px] max-h-[120px]"
              rows={1}
              disabled={isStreaming}
              data-testid="input-chat-message"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="bg-[#00FFA3] text-black hover:bg-[#00FFA3]/80"
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
