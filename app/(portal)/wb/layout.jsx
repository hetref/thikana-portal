import '@/app/globals.css';
import { ToastProvider } from "@/components/ui/use-toast";

export const metadata = {
  title: 'Thikanna - Website Builder, SEO Management, and AI Chatbot',
  description: 'Empower your business with Thikanna - create beautiful websites, optimize SEO, and integrate AI chatbots seamlessly.',
}

export default function RootLayout({ children }) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  )
} 