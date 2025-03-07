"use client";
import { useEffect } from "react";

const WebsiteRenderer = ({ websiteData }) => {
  // Optional: Add any client-side logic here
  useEffect(() => {
    // Initialize any client-side scripts if needed
  }, []);

  return (
    <html>
      <head>
        <style dangerouslySetInnerHTML={{ __html: websiteData.css }} />
      </head>
      <body>
        <div dangerouslySetInnerHTML={{ __html: websiteData.html }} />
      </body>
    </html>
  );
};

export default WebsiteRenderer;
