"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
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
import { getOpacity } from "@mui/material/styles/createColorScheme";
import { duration } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";

export default function Chatbot() {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [showChatIcon, setShowChatIcon] = useState(false);
    const chatIconRef = useRef(null);
    const {messages, input, handleInputChange, handleSubmit, isLoading, stop, reload, error} = useChat({ api: "/api/gemini" });

    useEffect(() => {
        const handleScroll = () => {
            if(window.scrollY > 200) {
                setShowChatIcon(true);
            } else {
                setShowChatIcon(false);
                setIsChatOpen(false);
            }
        };

    handleScroll();

    window.addEventListener("scroll", handleScroll);
    return() => {
        window.removeEventListener("scroll", handleScroll);
    };

    }, []);
    const toggleChat = () => {
        setIsChatOpen(!isChatOpen);
    };

    return (
        <div>
            <AnimatePresence>
                {showChatIcon && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-4 right-4 z-50"
                    >
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
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isChatOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-20 right-4 z-50 w-[95%] md:w-[500px]"
                    >
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
                                            No msg
                                        </div>
                                    )}
                                    {messages?.map((message, index) => (
                                        <div key={index} className={`mb-4 ${
                                            message.role === "user" ? "text-right" : "text-left"
                                        }`}>
                                            <div className={`inline-block rounded-lg ${message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                                <ReactMarkdown 
                                                    children={message.content}
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        code({ node, inline, className, children, ...props }) {
                                                            return inline ? (
                                                                <code {...props} className="bg-gray-200 px-1 rounded">{children}</code>
                                                            ) :(
                                                                <pre {...props} className="bg-gray-200 p-2 rounded">
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
                                            <button className="underline" type="button" onClick={() => stop()}>abort</button>
                                        </div>
                                    )}
                                    {error && (
                                        <div className="w-full items-center flex justify-center gap-3">
                                            <div>an error occurred</div>
                                            <button className="underline" type="button" onClick={() => reload()}>retry</button>
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                            <CardFooter>
                                <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
                                    <Input value={input} onChange={handleInputChange} className="flex-1" placeholder="Type your message here" />
                                    <Button type="submit" className="size-9" disabled={isLoading} size="icon">
                                        <Send className="size-4" />
                                    </Button>
                                </form>
                            </CardFooter>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}