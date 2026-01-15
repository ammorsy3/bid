import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Sparkles, PanelRightOpen, PanelRightClose, Rocket } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  tenderData?: Record<string, any>;
}

export default function TenderAICopilot() {
  const [, navigate] = useLocation();
  const { activeCompany } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tenderDraft, setTenderDraft] = useState<Record<string, any>>({});
  const [showPreview, setShowPreview] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: companyProfile } = useQuery({
    queryKey: ["/api/companies", activeCompany?.id, "profile"],
    enabled: !!activeCompany?.id,
  });

  const profile = companyProfile as any;
  const company = activeCompany as any;
  const companyData = {
    name: company?.name || "",
    bio: profile?.bio || "",
    category: company?.category || "",
    city: company?.city || "",
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      sendInitialMessage();
    }
  }, []);

  const sendInitialMessage = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: null,
          companyData,
          chatHistory: [],
          tenderDraft,
        }),
      });

      await processStreamResponse(response);
    } catch (error) {
      console.error("Error sending initial message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const processStreamResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    const messageId = Date.now().toString();

    setMessages((prev) => [...prev, { id: messageId, role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        try {
          const event = JSON.parse(line.slice(6));

          if (event.content) {
            fullContent += event.content;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId ? { ...m, content: fullContent } : m
              )
            );
          }

          if (event.done && event.parsed) {
            const parsed = event.parsed;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      content: parsed.message || fullContent,
                      suggestions: parsed.suggestions,
                      tenderData: parsed.tenderData,
                    }
                  : m
              )
            );

            if (parsed.tenderData) {
              setTenderDraft((prev) => ({ ...prev, ...parsed.tenderData }));
            }

            if (parsed.readyToLaunch) {
              setIsReady(true);
            }
          } else if (event.done && event.raw) {
            try {
              const parsed = JSON.parse(event.raw);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === messageId
                    ? { ...m, content: parsed.message || event.raw }
                    : m
                )
              );
            } catch {
              setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, content: fullContent } : m))
              );
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content.trim(),
          companyData,
          chatHistory: [...chatHistory, { role: "user", content: content.trim() }],
          tenderDraft,
        }),
      });

      await processStreamResponse(response);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleLaunchTender = async () => {
    try {
      const response = await fetch("/api/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tenderDraft),
      });

      if (response.ok) {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error creating tender:", error);
    }
  };

  const hasPreviewContent = Object.keys(tenderDraft).length > 0;

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950">
      {/* Minimal Header */}
      <header className="h-14 border-b border-gray-100 dark:border-gray-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img
            src={logoPath}
            alt="Bid"
            className="h-8 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/dashboard")}
          />
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#E25E45]" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              AI Copilot
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasPreviewContent && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={showPreview ? "Hide preview" : "Show preview"}
            >
              {showPreview ? (
                <PanelRightClose className="h-5 w-5 text-gray-500" />
              ) : (
                <PanelRightOpen className="h-5 w-5 text-gray-500" />
              )}
            </button>
          )}
          <button
            onClick={() => navigate("/tenders/new")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="max-w-3xl mx-auto px-4 py-6">
              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E25E45] to-[#ff8066] flex items-center justify-center shrink-0">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%]",
                        message.role === "user"
                          ? "bg-[#E25E45] text-white rounded-2xl rounded-tr-md px-4 py-3"
                          : "bg-gray-50 dark:bg-gray-900 rounded-2xl rounded-tl-md px-4 py-3"
                      )}
                    >
                      <p
                        className={cn(
                          "text-[15px] leading-relaxed whitespace-pre-wrap",
                          message.role === "assistant" && "text-gray-900 dark:text-white"
                        )}
                      >
                        {message.content}
                      </p>

                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {message.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300 transition-all hover:border-[#E25E45] hover:text-[#E25E45]"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E25E45] to-[#ff8066] flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl rounded-tl-md px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
            <div className="max-w-3xl mx-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex items-center gap-3"
              >
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe what you need..."
                    disabled={isLoading}
                    className="pr-12 h-12 text-[15px] border-gray-200 dark:border-gray-700 rounded-xl focus-visible:ring-[#E25E45]"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isLoading || !input.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 p-0 bg-[#E25E45] hover:bg-[#d54d35] rounded-lg"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {isReady && (
                  <Button
                    type="button"
                    onClick={handleLaunchTender}
                    className="h-12 px-6 bg-green-600 hover:bg-green-700 rounded-xl gap-2"
                  >
                    <Rocket className="h-4 w-4" />
                    Launch
                  </Button>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Floating Preview Panel */}
        {showPreview && hasPreviewContent && (
          <div className="w-80 border-l border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-4 overflow-y-auto">
            <div className="sticky top-0">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Your Tender
              </h3>

              <div className="space-y-4">
                {tenderDraft.title && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wide">
                      Title
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white font-medium mt-0.5">
                      {tenderDraft.title}
                    </p>
                  </div>
                )}

                {tenderDraft.serviceDescription && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wide">
                      Description
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                      {tenderDraft.serviceDescription}
                    </p>
                  </div>
                )}

                {tenderDraft.budget && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wide">
                      Budget
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white font-medium mt-0.5">
                      {typeof tenderDraft.budget === "object"
                        ? `SAR ${tenderDraft.budget.min?.toLocaleString()} - ${tenderDraft.budget.max?.toLocaleString()}`
                        : `SAR ${tenderDraft.budget.toLocaleString()}`}
                    </p>
                  </div>
                )}

                {tenderDraft.timeline && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wide">
                      Timeline
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                      {tenderDraft.timeline}
                    </p>
                  </div>
                )}

                {tenderDraft.deliverables && tenderDraft.deliverables.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wide">
                      Deliverables
                    </label>
                    <ul className="text-sm text-gray-900 dark:text-white mt-0.5 space-y-1">
                      {tenderDraft.deliverables.map((d: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[#E25E45] mt-1">•</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {tenderDraft.submissionDeadline && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border-l-2 border-[#E25E45]">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wide">
                      Deadline
                    </label>
                    <p className="text-sm text-[#E25E45] font-medium mt-0.5">
                      {tenderDraft.submissionDeadline}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
