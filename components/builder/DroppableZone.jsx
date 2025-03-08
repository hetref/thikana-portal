"use client";
import React, { useState } from "react";
import { useDrop } from "react-dnd";

const DroppableZone = ({ component, index, components, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(component.content);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "COMPONENT",
    drop: (item) => {
      const newComponents = [...components];
      newComponents.splice(index + 1, 0, {
        id: `${item.type}-${Date.now()}`,
        type: item.type,
        content: item.defaultContent,
        styles: item.defaultStyles,
      });
      onUpdate(newComponents);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const handleDelete = () => {
    const newComponents = components.filter((_, i) => i !== index);
    onUpdate(newComponents);
  };

  const handleContentSave = () => {
    const newComponents = [...components];
    newComponents[index] = { ...component, content };
    onUpdate(newComponents);
    setIsEditing(false);
  };

  const renderComponent = () => {
    switch (component.type) {
      case "heading":
        return isEditing ? (
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-2 border"
          />
        ) : (
          <h2 style={component.styles}>{content}</h2>
        );

      case "paragraph":
        return isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-2 border"
          />
        ) : (
          <p style={component.styles}>{content}</p>
        );

      case "image":
        return isEditing ? (
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Image URL"
            className="w-full p-2 border"
          />
        ) : (
          <img src={content} alt="Content" style={component.styles} />
        );

      case "button":
        return isEditing ? (
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-2 border"
          />
        ) : (
          <button style={component.styles}>{content}</button>
        );

      default:
        return <div>Unknown component type</div>;
    }
  };

  return (
    <div
      ref={drop}
      className={`relative my-2 p-4 rounded border ${
        isOver ? "bg-blue-50" : "hover:bg-gray-50"
      }`}
    >
      {renderComponent()}

      <div className="absolute top-2 right-2 space-x-2">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-2 py-1 text-sm bg-blue-500 text-white rounded"
        >
          {isEditing ? "Save" : "Edit"}
        </button>
        <button
          onClick={handleDelete}
          className="px-2 py-1 text-sm bg-red-500 text-white rounded"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default DroppableZone;