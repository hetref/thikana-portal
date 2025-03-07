"use client";
import React from "react";
import { useDrag } from "react-dnd";

const DraggableComponent = ({ type, label, defaultContent, defaultStyles }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "COMPONENT",
    item: { type, defaultContent, defaultStyles },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`p-4 border rounded cursor-move hover:bg-gray-50 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {label}
    </div>
  );
};

export default DraggableComponent;
