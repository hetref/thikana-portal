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
  Loader2,
  ArrowDownCircleIcon,
} from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { motion, AnimatePresence } from "framer-motion";

function SuggestionBar({ suggestions, onClickSuggestion }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {suggestions.map((suggestion, index) => (
        <Badge
          key={index}
          className="cursor-pointer hover:bg-gray-200"
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
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    reload,
    error,
  } = useChat({ api: "/api/gemini" });
  const scrollRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setShowChatIcon(true);
      } else {
        setShowChatIcon(false);
        // setIsChatOpen(false);
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  useEffect(() => {
    if (isChatOpen && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isChatOpen, messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
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
    <div style={{ zIndex: "9999999" }}>
      <AnimatePresence>
        <motion.div className="fixed bottom-4 right-4 z-80">
          <Button
            ref={chatIconRef}
            onClick={toggleChat}
            size="icon"
            className="rounded-full size-14 p-2 shadow-lg font-bold"
            placeholder="Chat with Thikana AI"
          >
            {!isChatOpen ? (
              <MessageCircle className="size-7 text-lg" />
            ) : (
              <ArrowDownCircleIcon />
            )}
          </Button>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {isChatOpen && (
          <motion.div className="fixed bottom-20 right-4 z-50 w-[95%] md:w-[500px]">
            <Card className="border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg font-bold">
                  Chat with Thikana AI
                </CardTitle>
                <Button
                  onClick={toggleChat}
                  size="sm"
                  variant="ghost"
                  className="px-2 py-0"
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
                            ? "bg-black text-white"
                            : "bg-muted"
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
                      <Loader2 className="animate-spin h-5 w-5 text-primary" />
                      <button
                        className="underline"
                        type="button"
                        onClick={() => stop()}
                      >
                        loading
                      </button>
                    </div>
                  )}
                  {error && (
                    <div className="w-full items-center flex justify-center gap-3">
                      <div>an error occurred</div>
                      <button
                        className="underline"
                        type="button"
                        onClick={() => reload()}
                      >
                        retry
                      </button>
                    </div>
                  )}
                  <div ref={scrollRef}></div>
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
                      className="flex-1 w-[380px] p-5 ml-5"
                      placeholder="Type your message here..."
                    />
                    <Button
                      type="submit"
                      className="size-10"
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
