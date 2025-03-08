"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { SectionRenderer } from "@/components/wb/section-renderer"
import PropTypes from "prop-types"
import { ElementRenderer } from "@/components/wb/element-renderer"

export function EditorCanvas({
  sections,
  elements,
  selectedSection,
  selectedElement,
  onSelectSection,
  onSelectElement,
  onReorderSections,
  onAddElement,
  device,
}) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnd = (result) => {
    setIsDragging(false)

    if (!result.destination) return

    const items = Array.from(sections)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    onReorderSections(items)
  }

  const getDeviceWidth = () => {
    switch (device) {
      case "mobile":
        return "w-[375px]"
      case "tablet":
        return "w-[768px]"
      default:
        return "w-full"
    }
  }

  const handleElementDrop = (e, sectionId) => {
    e.preventDefault()
    const elementData = e.dataTransfer.getData("element")
    if (elementData) {
      const element = JSON.parse(elementData)
      onAddElement(sectionId, element)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }

  return (
    <div className="flex-1 bg-accent/10 flex items-center justify-center p-6 overflow-hidden">
      <div
        className={cn(
          "bg-white h-full rounded-lg shadow-md overflow-hidden flex flex-col transition-all duration-300",
          getDeviceWidth(),
        )}
      >
        <ScrollArea className="flex-1">
          <DragDropContext onDragStart={() => setIsDragging(true)} onDragEnd={handleDragEnd}>
            <Droppable droppableId="sections">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="min-h-full">
                  {sections.map((section, index) => (
                    <Draggable key={section.id} draggableId={section.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "relative group transition-all",
                            selectedSection?.id === section.id && "ring-2 ring-primary ring-inset",
                            snapshot.isDragging && "opacity-70",
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectSection(section)
                          }}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="absolute top-2 left-2 bg-primary text-white p-1 rounded opacity-0 group-hover:opacity-100 z-10 cursor-move"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M7 2H9V4H7V2Z" fill="currentColor" />
                              <path d="M7 6H9V8H7V6Z" fill="currentColor" />
                              <path d="M7 10H9V12H7V10Z" fill="currentColor" />
                              <path d="M3 2H5V4H3V2Z" fill="currentColor" />
                              <path d="M3 6H5V8H3V6Z" fill="currentColor" />
                              <path d="M3 10H5V12H3V10Z" fill="currentColor" />
                              <path d="M11 2H13V4H11V2Z" fill="currentColor" />
                              <path d="M11 6H13V8H11V6Z" fill="currentColor" />
                              <path d="M11 10H13V12H11V10Z" fill="currentColor" />
                            </svg>
                          </div>
                          <SectionRenderer section={section} />

                          {/* Element Drop Zone */}
                          <div
                            className="min-h-[100px] p-4 border-2 border-dashed border-transparent hover:border-primary/30 transition-colors"
                            onDrop={(e) => handleElementDrop(e, section.id)}
                            onDragOver={handleDragOver}
                          >
                            {/* Render Elements */}
                            {elements[section.id] &&
                              elements[section.id].map((element) => (
                                <div
                                  key={element.id}
                                  className={cn(
                                    "relative my-2 p-2 hover:outline hover:outline-2 hover:outline-blue-200 cursor-pointer",
                                    selectedElement?.id === element.id && "outline outline-2 outline-primary",
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onSelectElement(element, section.id)
                                  }}
                                >
                                  <ElementRenderer element={element} />
                                </div>
                              ))}

                            {(!elements[section.id] || elements[section.id].length === 0) && (
                              <div className="text-center text-muted-foreground text-sm py-4">
                                Drag and drop elements here
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {sections.length === 0 && (
                    <div className="flex items-center justify-center h-full min-h-[300px] text-muted-foreground">
                      Add sections from the sidebar
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </ScrollArea>
      </div>
    </div>
  )
}

EditorCanvas.propTypes = {
  sections: PropTypes.array.isRequired,
  elements: PropTypes.object,
  selectedSection: PropTypes.object,
  selectedElement: PropTypes.object,
  onSelectSection: PropTypes.func.isRequired,
  onSelectElement: PropTypes.func.isRequired,
  onReorderSections: PropTypes.func.isRequired,
  onAddElement: PropTypes.func.isRequired,
  device: PropTypes.oneOf(["desktop", "tablet", "mobile"]).isRequired,
}

