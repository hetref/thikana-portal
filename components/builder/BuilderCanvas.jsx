"use client";
import React from "react";
import { useDrop } from "react-dnd";
import DroppableZone from "./DroppableZone";

const BuilderCanvas = ({ components, onUpdate }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "COMPONENT",
    drop: (item, monitor) => {
      if (!monitor.didDrop()) {
        onUpdate([
          ...components,
          {
            id: `${item.type}-${Date.now()}`,
            type: item.type,
            content: item.defaultContent,
            styles: item.defaultStyles || {},
          },
        ]);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`min-h-screen p-8 bg-gray-50 ${isOver ? "bg-blue-50" : ""}`}
    >
      {components.map((component, index) => (
        <DroppableZone
          key={component.id}
          component={component}
          index={index}
          components={components}
          onUpdate={onUpdate}
        />
      ))} 
    </div>
  );
};

export default BuilderCanvas;