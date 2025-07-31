"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import {
  X,
  MessageCircle,
  Send,
  ArrowDownCircleIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { generateId } from "@/lib/utils";
import Loader from "@/components/Loader";

// Custom chat hook to replace @ai-sdk/react
function useCustomChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage = {
      id: generateId(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    const currentInput = input;
    setInput("");

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed with status: ${response.status}`
        );
      }

      const data = await response.json();

      // Add AI response
      setMessages((prev) => [
        ...prev,
        {
          id: data.id || generateId(),
          role: "assistant",
          content:
            data.response || "I'm sorry, I couldn't process that request.",
        },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setError(err.message);

      // Add error message to the chat
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content:
            "Sorry, I encountered an error. Please try again or rephrase your question.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const stop = () => {
    // If we had streaming, this would abort it
    setIsLoading(false);
  };

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
  };
}

function SuggestionBar({ suggestions, onClickSuggestion }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {suggestions.map((suggestion, index) => (
        <Badge
          key={index}
          className="cursor-pointer bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
          onClick={() => onClickSuggestion(suggestion)}
        >
          {suggestion}
        </Badge>
      ))}
    </div>
  );
}

export default function Chatbot() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showChatIcon, setShowChatIcon] = useState(false);
  const chatIconRef = useRef(null);
  const scrollref = useRef(null);
  const [suggestions, setSuggestions] = useState([]);

  // Use our custom hook instead of the SDK's hook
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    error,
  } = useCustomChat();

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen && scrollref.current) {
      scrollref.current.scrollIntoView({ behavior: "smooth" });
    } else if (isChatOpen && scrollref.current) {
      scrollref.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (scrollref.current) {
      scrollref.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        // Add custom logic for generating suggestions
        if (lastMessage.content.includes("help")) {
          setSuggestions([
            "How to get started?",
            "Talk to support",
            "Cancel request",
          ]);
        } else if (lastMessage.content.includes("pricing")) {
          setSuggestions(["View plans", "Request custom quote"]);
        } else {
          setSuggestions(["Tell me more", "Show options", "Contact support"]);
        }
      }
    }
  }, [messages]);

  const handleSuggestionClick = (suggestion) => {
    handleInputChange({ target: { value: suggestion } });
    handleSubmit();
  };

  return (
    <div>
      <AnimatePresence>
        <motion.div className="fixed bottom-4 right-4 z-80">
          <Button
            ref={chatIconRef}
            onClick={toggleChat}
            size="icon"
            className="rounded-full size-14 p-2 shadow-lg"
          >
            {!isChatOpen ? (
              <MessageCircle className="size-7" />
            ) : (
              <ArrowDownCircleIcon />
            )}
          </Button>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {isChatOpen && (
          <motion.div className="fixed bottom-20 right-4 z-50 w-[95%] md:w-[500px]">
            <Card className="border-2 bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg font-bold text-white">
                  Chat with Thikana AI
                </CardTitle>
                <Button
                  onClick={toggleChat}
                  size="sm"
                  variant="ghost"
                  className="px-2 py-0 text-white hover:bg-white/10"
                >
                  <X className="size-4" />
                  <span className="sr-only">Close Chat</span>
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  {messages?.length === 0 && (
                    <div className="w-full mt-32 text-gray-500 items-center justify-center flex gap-3">
                      No messages yet
                    </div>
                  )}
                  {messages?.map((message, index) => (
                    <div
                      key={index}
                      className={`mb-4 ${
                        message.role === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      <div
                        className={`inline-block rounded-lg p-2 ${
                          message.role === "user"
                            ? "bg-white/20 text-white backdrop-blur-sm"
                            : "bg-black/20 text-white backdrop-blur-sm"
                        }`}
                      >
                        <ReactMarkdown
                          children={message.content}
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({
                              node,
                              inline,
                              className,
                              children,
                              ...props
                            }) {
                              return inline ? (
                                <code
                                  {...props}
                                  className="bg-gray-200 px-1 rounded"
                                >
                                  {children}
                                </code>
                              ) : (
                                <pre
                                  {...props}
                                  className="bg-gray-200 p-2 rounded"
                                >
                                  <code>{children}</code>
                                </pre>
                              );
                            },
                            ul: ({ children }) => (
                              <ul className="list-disc ml-4">{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <li className="list-decimal ml-4">{children}</li>
                            ),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="w-full items-center flex justify-center gap-3">
                      <Loader className="h-1 w-1"/>
                      <button
                        className="underline"
                        type="button"
                        onClick={() => stop()}
                      >
                      </button>
                    </div>
                  )}
                  {error && (
                    <div className="w-full items-center flex justify-center gap-3">
                      <div>an error occurred</div>
                      <button
                        className="underline"
                        type="button"
                        onClick={() => setError(null)}
                      >
                        retry
                      </button>
                    </div>
                  )}
                  <div ref={scrollref}></div>
                </ScrollArea>
                {suggestions.length > 0 && (
                  <SuggestionBar
                    suggestions={suggestions}
                    onClickSuggestion={handleSuggestionClick}
                  />
                )}
              </CardContent>
              <CardFooter className="p-0">
                <ScrollArea className="h-[100px]">
                  <form
                    onSubmit={handleSubmit}
                    className="flex w-full items-center space-x-4"
                  >
                    <Input
                      value={input}
                      onChange={handleInputChange}
                      className="flex-1 w-[380px] p-5 ml-5 bg-white/10 border-white/20 text-white placeholder-gray-300 rounded-2xl"
                      placeholder="Type your message here..."
                    />
                    <Button
                      type="submit"
                      className="size-10 bg-white/20 hover:bg-white/30 text-white border-white/20 rounded-2xl"
                      disabled={isLoading}
                      size="icon"
                    >
                      <Send className="size-5" />
                    </Button>
                  </form>
                </ScrollArea>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
