import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Button,
} from "@react-email/components";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thikana.in";

const getTypeIcon = (type) => {
  switch (type) {
    case "message":
      return "💬";
    case "order_update":
      return "📦";
    case "promotion":
      return "🏷️";
    case "system":
      return "⚙️";
    case "test":
      return "🧪";
    default:
      return "🔔";
  }
};

const getTypeColor = (type) => {
  switch (type) {
    case "message":
      return "#0ea5e9"; // sky-500
    case "order_update":
      return "#10b981"; // emerald-500
    case "promotion":
      return "#f59e0b"; // amber-500
    case "system":
      return "#6366f1"; // indigo-500
    case "test":
      return "#8b5cf6"; // violet-500
    default:
      return "#6b7280"; // gray-500
  }
};

const NotificationEmail = ({
  name = "User",
  subject = "New Notification",
  message = "You have a new notification",
  timestamp = new Date().toLocaleString(),
  type = "system",
  sender = "Thikana",
}) => {
  const typeIcon = getTypeIcon(type);
  const typeColor = getTypeColor(type);

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src={`${baseUrl}/logo/black-logo.png`}
            width="150"
            height="50"
            alt="Thikana Logo"
            style={logo}
          />
          <Section style={notification}>
            <div style={iconContainer}>
              <Text
                style={{
                  fontSize: "28px",
                  margin: "0",
                  lineHeight: "1",
                }}
              >
                {typeIcon}
              </Text>
            </div>
            <Heading style={title}>{subject}</Heading>
            <Section
              style={{
                padding: "20px",
                backgroundColor: "#f9fafb",
                borderRadius: "8px",
                marginBottom: "24px",
                borderLeft: `4px solid ${typeColor}`,
              }}
            >
              <Text style={messageText}>{message}</Text>
            </Section>
            <div style={metaContainer}>
              <Text style={meta}>From: {sender}</Text>
              <Text style={meta}>
                Type: {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
              <Text style={meta}>Sent: {timestamp}</Text>
            </div>
            <Hr style={divider} />
            <Section style={buttonContainer}>
              <Button style={button} href={baseUrl}>
                View in App
              </Button>
            </Section>
          </Section>
          <Text style={footer}>
            © {new Date().getFullYear()} Thikana. All Rights Reserved.
          </Text>
          <Text style={footerText}>
            This email was sent to you because you have notifications enabled.
            <br />
            You can manage your email preferences in your account settings.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  color: "#1f2937",
};

const container = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "600px",
};

const logo = {
  margin: "0 auto 20px",
  display: "block",
};

const notification = {
  padding: "30px",
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  boxShadow:
    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
};

const iconContainer = {
  textAlign: "center",
  margin: "0 0 16px",
};

const title = {
  fontSize: "24px",
  fontWeight: "600",
  color: "#111827",
  margin: "0 0 24px",
  textAlign: "center",
};

const messageText = {
  margin: "0",
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#374151",
};

const metaContainer = {
  padding: "0 0 24px",
};

const meta = {
  margin: "0 0 6px",
  fontSize: "14px",
  color: "#6b7280",
};

const divider = {
  border: "none",
  borderTop: "1px solid #e5e7eb",
  margin: "0 0 24px",
};

const buttonContainer = {
  textAlign: "center",
  margin: "0 0 24px",
};

const button = {
  backgroundColor: "#3b82f6",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  padding: "12px 24px",
  textDecoration: "none",
  display: "inline-block",
};

const footer = {
  textAlign: "center",
  fontSize: "14px",
  color: "#6b7280",
  margin: "40px 0 8px",
};

const footerText = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center",
  margin: "0",
  lineHeight: "1.5",
};

export default NotificationEmail;
