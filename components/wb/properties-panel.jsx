"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trash2, ChevronRight, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import PropTypes from "prop-types"

export function PropertiesPanel({
  selectedSection,
  selectedElement,
  onUpdateSection,
  onUpdateElement,
  onDeleteSection,
  onDeleteElement,
  onAddElement,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState("content")
  const [localElementValues, setLocalElementValues] = useState({
    style: {},
    content: {}
  });

  // Determine which type of element is selected
  const isPanelForSection = !!selectedSection
  const isPanelForElement = !!selectedElement

  const inputClassName = "mt-1 text-base text-black bg-white border border-gray-300 dark:text-white dark:bg-gray-800"
  const selectClassName = "w-full mt-1 p-2 text-base text-black bg-white border border-gray-300 dark:text-white dark:bg-gray-800 rounded-md"
  const textareaClassName = "mt-1 text-base text-black bg-white border border-gray-300 dark:text-white dark:bg-gray-800 resize-vertical h-32"
  const checkboxClassName = "w-4 h-4 mr-2 border border-gray-300 rounded-sm text-primary"

  // Update local values whenever selectedElement changes
  useEffect(() => {
    if (selectedElement) {
      setLocalElementValues({
        style: { ...(selectedElement.style || {}) },
        content: { ...(selectedElement.content || {}) }
      });
    } else {
      setLocalElementValues({
        style: {},
        content: {}
      });
    }
  }, [selectedElement]);

  // Ensure we have default values for style and content
  const elementStyle = selectedElement?.style || {}
  const elementContent = selectedElement?.content || {}

  const handleTextChange = (field, value) => {
    if (!selectedSection) return
    
    onUpdateSection({
      ...selectedSection,
      content: {
        ...selectedSection.content,
        [field]: value,
      },
    })
  }

  const handleStyleChange = (field, value) => {
    if (!selectedSection) return
    
    onUpdateSection({
      ...selectedSection,
      style: {
        ...selectedSection.style,
        [field]: value,
      },
    })
  }

  const handleElementContentChange = (property, value) => {
    if (!selectedElement) return

    const updatedContent = {
      ...(selectedElement.content || {}),
      [property]: value
    }

    onUpdateElement({
      ...selectedElement,
      content: updatedContent
    })
  }

  const handleElementStyleChange = (property, value) => {
    if (!selectedElement) return

    const updatedStyle = {
      ...(selectedElement.style || {}),
      [property]: value
    }

    onUpdateElement({
      ...selectedElement,
      style: updatedStyle
    })
  }

  return (
    <div 
      key={`properties-panel-${selectedElement?.id || selectedSection?.id || 'empty'}`}
      className={cn(
        "fixed top-0 right-0 h-screen bg-background border-l border-border shadow-lg z-50",
        isCollapsed ? "w-12" : "w-80"
      )}
      style={{
        transition: "width 0.3s ease",
        transform: "translateX(0)",
      }}
    >
      {/* Collapse button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -left-3 top-1/2 transform -translate-y-1/2 bg-background border border-border rounded-full p-1 hover:bg-accent transition-colors z-50"
      >
        {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {!isCollapsed && (
        <ScrollArea className="h-full">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">
              {isPanelForSection
                ? "Section Properties"
                : isPanelForElement
                ? `${selectedElement?.type?.charAt(0).toUpperCase()}${selectedElement?.type?.slice(1)} Properties`
                : "Properties"}
            </h2>
            
            {isPanelForSection && selectedSection && (
              // Section properties
              <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 py-4">
                <TabsList className="grid grid-cols-3 h-10 rounded-none border-b border-border">
                  <TabsTrigger
                    value="content"
                    className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                  >
                    Content
                  </TabsTrigger>
                  <TabsTrigger
                    value="style"
                    className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                  >
                    Style
                  </TabsTrigger>
                  <TabsTrigger
                    value="advanced"
                    className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                  >
                    Advanced
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="p-4 m-0">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Title</label>
                      <Input
                        value={selectedSection.content.title || ""}
                        onChange={(e) => handleTextChange("title", e.target.value)}
                        className={inputClassName}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Subtitle</label>
                      <Input
                        value={selectedSection.content.subtitle || ""}
                        onChange={(e) => handleTextChange("subtitle", e.target.value)}
                        className={inputClassName}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Description</label>
                      <Textarea
                        value={selectedSection.content.description || ""}
                        onChange={(e) => handleTextChange("description", e.target.value)}
                        className={inputClassName}
                      />
                    </div>

                    {selectedSection.content.buttonText !== undefined && (
                      <div>
                        <label className="text-xs text-muted-foreground">Button Text</label>
                        <Input
                          value={selectedSection.content.buttonText || ""}
                          onChange={(e) => handleTextChange("buttonText", e.target.value)}
                          className={inputClassName}
                        />
                      </div>
                    )}

                    {selectedSection.content.buttonUrl !== undefined && (
                      <div>
                        <label className="text-xs text-muted-foreground">Button URL</label>
                        <Input
                          value={selectedSection.content.buttonUrl || ""}
                          onChange={(e) => handleTextChange("buttonUrl", e.target.value)}
                          className={inputClassName}
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="style" className="p-4 m-0">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Text Color</label>
                      <Input
                        type="color"
                        value={elementStyle.color || "#000000"}
                        onChange={(e) => handleElementStyleChange("color", e.target.value)}
                        className={inputClassName}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Background Color</label>
                      <Input
                        type="color"
                        value={elementStyle.backgroundColor || "#ffffff"}
                        onChange={(e) => handleElementStyleChange("backgroundColor", e.target.value)}
                        className={inputClassName}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Font Size</label>
                      <Input
                        type="text"
                        value={elementStyle.fontSize || ""}
                        onChange={(e) => handleElementStyleChange("fontSize", e.target.value)}
                        className={inputClassName}
                        placeholder="16px"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Font Weight</label>
                      <select
                        value={elementStyle.fontWeight || "normal"}
                        onChange={(e) => handleElementStyleChange("fontWeight", e.target.value)}
                        className={selectClassName}
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                        <option value="lighter">Light</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Text Align</label>
                      <select
                        value={elementStyle.textAlign || "left"}
                        onChange={(e) => handleElementStyleChange("textAlign", e.target.value)}
                        className={selectClassName}
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                        <option value="justify">Justify</option>
                      </select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="p-4 m-0">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground">CSS Class</label>
                      <Input
                        value={localElementValues.style.customClass || selectedElement.style.customClass || ""}
                        onChange={(e) => handleElementStyleChange("customClass", e.target.value)}
                        className={inputClassName}
                        placeholder="my-custom-class"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Animation</label>
                      <select
                        value={selectedSection.style.animation || "none"}
                        onChange={(e) => handleStyleChange("animation", e.target.value)}
                        className={selectClassName}
                      >
                        <option value="none">None</option>
                        <option value="fade-in">Fade In</option>
                        <option value="slide-up">Slide Up</option>
                        <option value="slide-down">Slide Down</option>
                        <option value="zoom-in">Zoom In</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">HTML ID</label>
                      <Input
                        value={localElementValues.style.id || selectedElement.style.id || ""}
                        onChange={(e) => handleElementStyleChange("id", e.target.value)}
                        className={inputClassName}
                        placeholder="my-element-id"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {isPanelForElement && selectedElement && (
              // Element properties
              <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 py-4">
                <TabsList className="grid grid-cols-3 h-10 rounded-none border-b border-border">
                  <TabsTrigger
                    value="content"
                    className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                  >
                    Content
                  </TabsTrigger>
                  <TabsTrigger
                    value="style"
                    className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                  >
                    Style
                  </TabsTrigger>
                  <TabsTrigger
                    value="advanced"
                    className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                  >
                    Advanced
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="p-4 m-0">
                  <div className="space-y-4">
                    {(selectedElement?.type === "heading" ||
                      selectedElement?.type === "paragraph" ||
                      selectedElement?.type === "button" ||
                      selectedElement?.type === "submit") && (
                      <div>
                        <label className="text-xs text-muted-foreground">Text Content</label>
                        <Textarea
                          value={elementContent.text || ""}
                          onChange={(e) => handleElementContentChange("text", e.target.value)}
                          className={textareaClassName}
                          placeholder={selectedElement?.type === "button" ? "Button Text" : 
                                       selectedElement?.type === "heading" ? "Heading Text" : 
                                       selectedElement?.type === "paragraph" ? "Paragraph Text" : "Text Content"}
                        />
                      </div>
                    )}

                    {selectedElement?.type === "button" && (
                      <div>
                        <label className="text-xs text-muted-foreground">Button Link URL</label>
                        <Input
                          value={elementContent.url || ""}
                          onChange={(e) => handleElementContentChange("url", e.target.value)}
                          className={inputClassName}
                          placeholder="https://example.com"
                        />
                      </div>
                    )}

                    {selectedElement?.type === "image" && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">Image URL</label>
                          <Input
                            value={elementContent.src || ""}
                            onChange={(e) => handleElementContentChange("src", e.target.value)}
                            className={inputClassName}
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Alt Text</label>
                          <Input
                            value={elementContent.alt || ""}
                            onChange={(e) => handleElementContentChange("alt", e.target.value)}
                            className={inputClassName}
                            placeholder="Image description"
                          />
                        </div>
                      </>
                    )}

                    {(selectedElement.type === "textbox" ||
                      selectedElement.type === "textarea" ||
                      selectedElement.type === "email" ||
                      selectedElement.type === "date") && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">Label</label>
                          <Input
                            value={selectedElement.content.label || ""}
                            onChange={(e) => handleElementContentChange("label", e.target.value)}
                            className={inputClassName}
                            placeholder="Field Label"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Placeholder</label>
                          <Input
                            value={selectedElement.content.placeholder || ""}
                            onChange={(e) => handleElementContentChange("placeholder", e.target.value)}
                            className={inputClassName}
                            placeholder="Placeholder text"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Helper Text</label>
                          <Input
                            value={selectedElement.content.helperText || ""}
                            onChange={(e) => handleElementContentChange("helperText", e.target.value)}
                            className={inputClassName}
                            placeholder="Additional information about this field"
                          />
                        </div>
                        <div className="flex items-center mt-2">
                          <input
                            type="checkbox"
                            id="required"
                            checked={selectedElement.content.required || false}
                            onChange={(e) => handleElementContentChange("required", e.target.checked)}
                            className={checkboxClassName}
                          />
                          <label htmlFor="required" className="text-xs text-muted-foreground">
                            Required
                          </label>
                        </div>
                        {selectedElement.type === "textbox" && (
                          <div className="mt-2">
                            <label className="text-xs text-muted-foreground">Input Type</label>
                            <select
                              value={selectedElement.content.inputType || "text"}
                              onChange={(e) => handleElementContentChange("inputType", e.target.value)}
                              className={selectClassName}
                            >
                              <option value="text">Text</option>
                              <option value="number">Number</option>
                              <option value="password">Password</option>
                              <option value="tel">Telephone</option>
                              <option value="url">URL</option>
                            </select>
                          </div>
                        )}
                      </>
                    )}

                    {selectedElement.type === "checkbox" && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">Label</label>
                          <Input
                            value={selectedElement.content.label || ""}
                            onChange={(e) => handleElementContentChange("label", e.target.value)}
                            className={inputClassName}
                            placeholder="Checkbox Label"
                          />
                        </div>
                        <div className="flex items-center mt-2">
                          <input
                            type="checkbox"
                            id="checked-default"
                            checked={selectedElement.content.checked || false}
                            onChange={(e) => handleElementContentChange("checked", e.target.checked)}
                            className={inputClassName}
                          />
                          <label htmlFor="checked-default" className="text-xs text-muted-foreground">
                            Checked by Default
                          </label>
                        </div>
                        <div className="flex items-center mt-2">
                          <input
                            type="checkbox"
                            id="required-checkbox"
                            checked={selectedElement.content.required || false}
                            onChange={(e) => handleElementContentChange("required", e.target.checked)}
                            className={checkboxClassName}
                          />
                          <label htmlFor="required-checkbox" className="text-xs text-muted-foreground">
                            Required
                          </label>
                        </div>
                      </>
                    )}

                    {selectedElement.type === "date" && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">Label</label>
                          <Input
                            value={selectedElement.content.label || ""}
                            onChange={(e) => handleElementContentChange("label", e.target.value)}
                            className={inputClassName}
                          />
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="required"
                            checked={selectedElement.content.required || false}
                            onChange={(e) => handleElementContentChange("required", e.target.checked)}
                            className={checkboxClassName}
                          />
                          <label htmlFor="required" className="text-xs text-muted-foreground">
                            Required
                          </label>
                        </div>
                      </>
                    )}

                    {selectedElement.type === "list" && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">List Items (one per line)</label>
                          <Textarea
                            value={(selectedElement.content.items || ["Item 1", "Item 2", "Item 3"]).join("\n")}
                            onChange={(e) => handleElementContentChange("items", e.target.value.split("\n"))}
                            className={textareaClassName}
                            placeholder="Item 1&#10;Item 2&#10;Item 3"
                          />
                        </div>
                        <div className="mt-2">
                          <label className="text-xs text-muted-foreground">List Type</label>
                          <select
                            value={selectedElement.content.listType || "ul"}
                            onChange={(e) => handleElementContentChange("listType", e.target.value)}
                            className={selectClassName}
                          >
                            <option value="ul">Unordered List</option>
                            <option value="ol">Ordered List</option>
                          </select>
                        </div>
                      </>
                    )}

                    {selectedElement.type === "divider" && (
                      <div>
                        <label className="text-xs text-muted-foreground">Divider Style</label>
                        <select
                          value={selectedElement.content.dividerStyle || "solid"}
                          onChange={(e) => handleElementContentChange("dividerStyle", e.target.value)}
                          className={selectClassName}
                        >
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                          <option value="dotted">Dotted</option>
                        </select>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="style" className="p-4 m-0">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Margin</label>
                      <Input
                        type="text"
                        value={localElementValues.style.margin || selectedElement.style.margin || "0px"}
                        onChange={(e) => handleElementStyleChange("margin", e.target.value)}
                        className={inputClassName}
                        placeholder="0px or 10px 20px"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Padding</label>
                      <Input
                        type="text"
                        value={localElementValues.style.padding || selectedElement.style.padding || "0px"}
                        onChange={(e) => handleElementStyleChange("padding", e.target.value)}
                        className={inputClassName}
                        placeholder="0px or 10px 20px"
                      />
                    </div>

                    {(selectedElement.type === "heading" ||
                      selectedElement.type === "paragraph" ||
                      selectedElement.type === "button" ||
                      selectedElement.type === "textbox" ||
                      selectedElement.type === "textarea" ||
                      selectedElement.type === "checkbox" ||
                      selectedElement.type === "email" ||
                      selectedElement.type === "date" ||
                      selectedElement.type === "submit" ||
                      selectedElement.type === "list") && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">Font Size</label>
                          <Input
                            type="number"
                            value={localElementValues.style.fontSize?.replace('px', '') || selectedElement.style.fontSize?.replace('px', '') || "16"}
                            onChange={(e) => handleElementStyleChange("fontSize", `${e.target.value}px`)}
                            className={inputClassName}
                            min="8"
                            max="72"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Font Weight</label>
                          <select 
                            value={localElementValues.style.fontWeight || selectedElement.style.fontWeight || "normal"}
                            onChange={(e) => handleElementStyleChange("fontWeight", e.target.value)}
                            className={selectClassName}
                          >
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                            <option value="lighter">Lighter</option>
                            <option value="bolder">Bolder</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                            <option value="300">300</option>
                            <option value="400">400</option>
                            <option value="500">500</option>
                            <option value="600">600</option>
                            <option value="700">700</option>
                            <option value="800">800</option>
                            <option value="900">900</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Text Align</label>
                          <select
                            value={localElementValues.style.textAlign || selectedElement.style.textAlign || "left"}
                            onChange={(e) => handleElementStyleChange("textAlign", e.target.value)}
                            className={selectClassName}
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                            <option value="justify">Justify</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Line Height</label>
                          <Input
                            value={selectedElement.style.lineHeight || ""}
                            onChange={(e) => handleElementStyleChange("lineHeight", e.target.value)}
                            className={inputClassName}
                            placeholder="1.5"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Letter Spacing</label>
                          <Input
                            value={selectedElement.style.letterSpacing || ""}
                            onChange={(e) => handleElementStyleChange("letterSpacing", e.target.value)}
                            className={inputClassName}
                            placeholder="normal"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="text-xs text-muted-foreground">Text Color</label>
                      <div className="flex mt-1">
                        <Input
                          type="color"
                          value={localElementValues.style.color || selectedElement.style.color || "#000000"}
                          onChange={(e) => handleElementStyleChange("color", e.target.value)}
                          className="w-12 h-8 p-1 border border-gray-300"
                        />
                        <Input
                          value={localElementValues.style.color || selectedElement.style.color || "#000000"}
                          onChange={(e) => handleElementStyleChange("color", e.target.value)}
                          className={`flex-1 ml-2 ${inputClassName}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Background Color</label>
                      <div className="flex mt-1">
                        <Input
                          type="color"
                          value={localElementValues.style.backgroundColor || selectedElement.style.backgroundColor || "#ffffff"}
                          onChange={(e) => handleElementStyleChange("backgroundColor", e.target.value)}
                          className="w-12 h-8 p-1 border border-gray-300"
                        />
                        <Input
                          value={localElementValues.style.backgroundColor || selectedElement.style.backgroundColor || "#ffffff"}
                          onChange={(e) => handleElementStyleChange("backgroundColor", e.target.value)}
                          className={`flex-1 ml-2 ${inputClassName}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Border Style</label>
                      <select
                        value={localElementValues.style.borderStyle || selectedElement.style.borderStyle || "solid"}
                        onChange={(e) => handleElementStyleChange("borderStyle", e.target.value)}
                        className={selectClassName}
                      >
                        <option value="none">None</option>
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                        <option value="double">Double</option>
                      </select>
                    </div>
                    
                    {localElementValues.style.borderStyle && localElementValues.style.borderStyle !== "none" && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">Border Width</label>
                          <Input
                            type="text"
                            value={localElementValues.style.borderWidth || selectedElement.style.borderWidth || "0px"}
                            onChange={(e) => handleElementStyleChange("borderWidth", e.target.value)}
                            className={inputClassName}
                            placeholder="0px or 1px"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Border Color</label>
                          <div className="flex mt-1">
                            <Input
                              type="color"
                              value={localElementValues.style.borderColor || selectedElement.style.borderColor || "#000000"}
                              onChange={(e) => handleElementStyleChange("borderColor", e.target.value)}
                              className="w-12 h-8 p-1 border border-gray-300"
                            />
                            <Input
                              value={localElementValues.style.borderColor || selectedElement.style.borderColor || "#000000"}
                              onChange={(e) => handleElementStyleChange("borderColor", e.target.value)}
                              className={`flex-1 ml-2 ${inputClassName}`}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="text-xs text-muted-foreground">Border Radius</label>
                      <Input
                        type="text"
                        value={localElementValues.style.borderRadius || selectedElement.style.borderRadius || "0px"}
                        onChange={(e) => handleElementStyleChange("borderRadius", e.target.value)}
                        className={inputClassName}
                        placeholder="0px or 5px"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Width</label>
                      <Input
                        type="text"
                        value={localElementValues.style.width || selectedElement.style.width || ""}
                        onChange={(e) => handleElementStyleChange("width", e.target.value)}
                        className={inputClassName}
                        placeholder="auto, 100%, 200px"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Height</label>
                      <Input
                        type="text"
                        value={localElementValues.style.height || selectedElement.style.height || ""}
                        onChange={(e) => handleElementStyleChange("height", e.target.value)}
                        className={inputClassName}
                        placeholder="auto, 100%, 200px"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Min Width</label>
                      <Input
                        value={selectedElement.style.minWidth || ""}
                        onChange={(e) => handleElementStyleChange("minWidth", e.target.value)}
                        className={inputClassName}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Min Height</label>
                      <Input
                        value={selectedElement.style.minHeight || ""}
                        onChange={(e) => handleElementStyleChange("minHeight", e.target.value)}
                        className={inputClassName}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Max Width</label>
                      <Input
                        value={selectedElement.style.maxWidth || ""}
                        onChange={(e) => handleElementStyleChange("maxWidth", e.target.value)}
                        className={inputClassName}
                        placeholder="none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Max Height</label>
                      <Input
                        value={selectedElement.style.maxHeight || ""}
                        onChange={(e) => handleElementStyleChange("maxHeight", e.target.value)}
                        className={inputClassName}
                        placeholder="none"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="p-4 m-0">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground">CSS Class</label>
                      <Input
                        value={localElementValues.style.customClass || selectedElement.style.customClass || ""}
                        onChange={(e) => handleElementStyleChange("customClass", e.target.value)}
                        className={inputClassName}
                        placeholder="my-custom-class"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">HTML ID</label>
                      <Input
                        value={localElementValues.style.id || selectedElement.style.id || ""}
                        onChange={(e) => handleElementStyleChange("id", e.target.value)}
                        className={inputClassName}
                        placeholder="my-element-id"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground">Display</label>
                      <select
                        value={localElementValues.style.display || selectedElement.style.display || ""}
                        onChange={(e) => handleElementStyleChange("display", e.target.value)}
                        className={selectClassName}
                      >
                        <option value="">Default</option>
                        <option value="block">Block</option>
                        <option value="inline">Inline</option>
                        <option value="inline-block">Inline Block</option>
                        <option value="flex">Flex</option>
                        <option value="grid">Grid</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                    
                    {localElementValues.style.display === "flex" && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">Flex Direction</label>
                          <select
                            value={localElementValues.style.flexDirection || selectedElement.style.flexDirection || "row"}
                            onChange={(e) => handleElementStyleChange("flexDirection", e.target.value)}
                            className={selectClassName}
                          >
                            <option value="row">Row</option>
                            <option value="column">Column</option>
                            <option value="row-reverse">Row Reverse</option>
                            <option value="column-reverse">Column Reverse</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Justify Content</label>
                          <select
                            value={localElementValues.style.justifyContent || selectedElement.style.justifyContent || "flex-start"}
                            onChange={(e) => handleElementStyleChange("justifyContent", e.target.value)}
                            className={selectClassName}
                          >
                            <option value="flex-start">Start</option>
                            <option value="flex-end">End</option>
                            <option value="center">Center</option>
                            <option value="space-between">Space Between</option>
                            <option value="space-around">Space Around</option>
                            <option value="space-evenly">Space Evenly</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Align Items</label>
                          <select
                            value={localElementValues.style.alignItems || selectedElement.style.alignItems || "stretch"}
                            onChange={(e) => handleElementStyleChange("alignItems", e.target.value)}
                            className={selectClassName}
                          >
                            <option value="stretch">Stretch</option>
                            <option value="flex-start">Start</option>
                            <option value="flex-end">End</option>
                            <option value="center">Center</option>
                            <option value="baseline">Baseline</option>
                          </select>
                        </div>
                      </>
                    )}
                    
                    <div>
                      <label className="text-xs text-muted-foreground">Position</label>
                      <select
                        value={selectedElement.style.position || ""}
                        onChange={(e) => handleElementStyleChange("position", e.target.value)}
                        className={selectClassName}
                      >
                        <option value="">Default</option>
                        <option value="static">Static</option>
                        <option value="relative">Relative</option>
                        <option value="absolute">Absolute</option>
                        <option value="fixed">Fixed</option>
                        <option value="sticky">Sticky</option>
                      </select>
                    </div>
                    
                    {selectedElement.style.position && selectedElement.style.position !== "static" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Top</label>
                          <Input
                            value={selectedElement.style.top || ""}
                            onChange={(e) => handleElementStyleChange("top", e.target.value)}
                            className={inputClassName}
                            placeholder="auto"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Right</label>
                          <Input
                            value={selectedElement.style.right || ""}
                            onChange={(e) => handleElementStyleChange("right", e.target.value)}
                            className={inputClassName}
                            placeholder="auto"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Bottom</label>
                          <Input
                            value={selectedElement.style.bottom || ""}
                            onChange={(e) => handleElementStyleChange("bottom", e.target.value)}
                            className={inputClassName}
                            placeholder="auto"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Left</label>
                          <Input
                            value={selectedElement.style.left || ""}
                            onChange={(e) => handleElementStyleChange("left", e.target.value)}
                            className={inputClassName}
                            placeholder="auto"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-muted-foreground">Opacity</label>
                      <Input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={selectedElement.style.opacity || "1"}
                        onChange={(e) => handleElementStyleChange("opacity", e.target.value)}
                        className="w-full mt-1"
                      />
                      <div className="text-center text-xs mt-1">
                        {selectedElement.style.opacity || "1"}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground">Transition</label>
                      <Input
                        value={selectedElement.style.transition || ""}
                        onChange={(e) => handleElementStyleChange("transition", e.target.value)}
                        className={inputClassName}
                        placeholder="all 0.3s ease"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground">Transform</label>
                      <Input
                        value={selectedElement.style.transform || ""}
                        onChange={(e) => handleElementStyleChange("transform", e.target.value)}
                        className={inputClassName}
                        placeholder="translate(0, 0) rotate(0) scale(1)"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground">Box Shadow</label>
                      <Input
                        value={selectedElement.style.boxShadow || ""}
                        onChange={(e) => handleElementStyleChange("boxShadow", e.target.value)}
                        className={inputClassName}
                        placeholder="0px 0px 10px rgba(0,0,0,0.1)"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground">Z-Index</label>
                      <Input
                        value={selectedElement.style.zIndex || ""}
                        onChange={(e) => handleElementStyleChange("zIndex", e.target.value)}
                        className={inputClassName}
                        placeholder="auto"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground">Cursor</label>
                      <select
                        value={selectedElement.style.cursor || ""}
                        onChange={(e) => handleElementStyleChange("cursor", e.target.value)}
                        className={selectClassName}
                      >
                        <option value="">Default</option>
                        <option value="pointer">Pointer</option>
                        <option value="default">Default</option>
                        <option value="text">Text</option>
                        <option value="move">Move</option>
                        <option value="not-allowed">Not Allowed</option>
                        <option value="grab">Grab</option>
                        <option value="help">Help</option>
                        <option value="wait">Wait</option>
                      </select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

PropertiesPanel.propTypes = {
  selectedSection: PropTypes.object,
  selectedElement: PropTypes.object,
  onUpdateSection: PropTypes.func.isRequired,
  onUpdateElement: PropTypes.func.isRequired,
  onDeleteSection: PropTypes.func.isRequired,
  onDeleteElement: PropTypes.func.isRequired,
  onAddElement: PropTypes.func.isRequired,
}

