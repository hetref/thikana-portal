"use client";
import React from "react";
import DraggableComponent from "./DraggableComponent";

const ComponentSidebar = () => {
  const components = [
    {
      type: "heading",
      label: "Heading",
      defaultContent: "New Heading",
      defaultStyles: {
        fontSize: "2rem",
        fontWeight: "bold",
        color: "#000000",
      },
    },
    {
      type: "paragraph",
      label: "Text Block",
      defaultContent: "Add your text here",
      defaultStyles: {
        fontSize: "1rem",
        color: "#333333",
      },
    },
    {
      type: "image",
      label: "Image",
      defaultContent: "https://via.placeholder.com/300",
      defaultStyles: {
        width: "100%",
        maxWidth: "300px",
      },
    },
    {
      type: "button",
      label: "Button",
      defaultContent: "Click Me",
      defaultStyles: {
        backgroundColor: "#3B82F6",
        color: "white",
        padding: "0.5rem 1rem",
        borderRadius: "0.25rem",
      },
    },
  ];

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Components</h2>
      <div className="space-y-4">
        {components.map((component) => (
          <DraggableComponent key={component.type} {...component} />
        ))}
      </div>
    </div>
  );
};

export default ComponentSidebar;
