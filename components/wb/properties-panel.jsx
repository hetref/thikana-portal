"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import PropTypes from "prop-types";

export function PropertiesPanel({
  selectedSection,
  selectedElement,
  onUpdateSection,
  onUpdateElement,
  onDeleteSection,
  onDeleteElement,
  onAddElement,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("content");
  const [localElementValues, setLocalElementValues] = useState({
    style: {},
    content: {},
  });

  // Component state to track text input fields independently
  const [textInputs, setTextInputs] = useState({});

  // Initialize text inputs when selectedSection changes
  useEffect(() => {
    if (selectedSection) {
      setTextInputs({
        title: selectedSection.content?.title || "",
        subtitle: selectedSection.content?.subtitle || "",
        description: selectedSection.content?.description || "",
        buttonText: selectedSection.content?.buttonText || "",
        buttonUrl: selectedSection.content?.buttonUrl || "",
        email: selectedSection.content?.email || "",
        phone: selectedSection.content?.phone || "",
      });
    }
  }, [selectedSection?.id]); // Only reinitialize when section ID changes

  // Determine which type of element is selected
  const isPanelForSection = !!selectedSection;
  const isPanelForElement = !!selectedElement;

  const inputClassName =
    "mt-1 text-base text-black bg-white border border-gray-300";
  const selectClassName =
    "w-full mt-1 p-2 text-base text-black bg-white border border-gray-300 rounded-md";
  const textareaClassName =
    "mt-1 text-base text-black bg-white border border-gray-300 resize-vertical h-32";
  const checkboxClassName =
    "w-4 h-4 mr-2 border border-gray-300 rounded-sm text-primary";

  // Update local values whenever selectedElement changes
  useEffect(() => {
    if (selectedElement) {
      setLocalElementValues({
        style: { ...(selectedElement.style || {}) },
        content: { ...(selectedElement.content || {}) },
      });
    } else {
      setLocalElementValues({
        style: {},
        content: {},
      });
    }
  }, [selectedElement]);

  // Ensure we have default values for style and content
  const elementStyle = selectedElement?.style || {};
  const elementContent = selectedElement?.content || {};

  // Add debounce functionality to prevent too many updates
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Create debounced update functions for better performance
  const debouncedUpdateSection = useCallback(
    debounce((updatedSection) => {
      console.log("Debounced section update:", updatedSection);
      onUpdateSection(updatedSection);
    }, 300),
    [onUpdateSection]
  );

  // When text changes, update local state immediately and debounce the parent update
  const handleTextChange = (field, value) => {
    if (!selectedSection) return;

    // Update local state immediately for responsive UI
    setTextInputs((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Create updated section object
    const updatedSection = {
      ...selectedSection,
      content: {
        ...selectedSection.content,
        [field]: value,
      },
    };

    // Use debounced update for performance
    debouncedUpdateSection(updatedSection);
  };

  const handleStyleChange = (field, value) => {
    if (!selectedSection) return;

    const updatedSection = {
      ...selectedSection,
      style: {
        ...selectedSection.style,
        [field]: value,
      },
    };

    console.log("Updating section with new style:", updatedSection.style);
    onUpdateSection(updatedSection);
  };

  const handleElementContentChange = (property, value) => {
    if (!selectedElement) return;

    // Update local state
    setLocalElementValues((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        [property]: value,
      },
    }));

    // Update parent component
    const updatedContent = {
      ...(selectedElement.content || {}),
      [property]: value,
    };

    onUpdateElement({
      ...selectedElement,
      content: updatedContent,
    });
  };

  const handleElementStyleChange = (property, value) => {
    if (!selectedElement) return;

    // Update local state first
    setLocalElementValues((prev) => ({
      ...prev,
      style: {
        ...prev.style,
        [property]: value,
      },
    }));

    // Create a new style object with all existing styles
    const updatedStyle = {
      ...(selectedElement.style || {}),
      [property]: value,
    };

    // Log the updated style for debugging
    console.log("Updating element style:", updatedStyle);

    // Update the parent component with the complete style object
    onUpdateElement({
      ...selectedElement,
      style: updatedStyle,
    });
  };

  return (
    <div
      key={`properties-panel-${
        selectedElement?.id || selectedSection?.id || "empty"
      }`}
      className={cn(
        "fixed top-0 right-0 h-screen bg-background border-l border-border shadow-lg z-50",
        isCollapsed ? "w-2" : "w-80"
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                {isPanelForSection
                  ? "Section Properties"
                  : isPanelForElement
                  ? `${selectedElement?.type
                      ?.charAt(0)
                      .toUpperCase()}${selectedElement?.type?.slice(
                      1
                    )} Properties`
                  : "Properties"}
              </h2>

              {isPanelForSection && selectedSection && (
                <button
                  onClick={() => {
                    if (
                      onDeleteSection &&
                      selectedSection &&
                      selectedSection.id
                    ) {
                      console.log(
                        `Deleting section with ID: ${selectedSection.id}`
                      );
                      onDeleteSection(selectedSection.id);
                    } else {
                      console.error(
                        "Cannot delete section: onDeleteSection is not defined or section ID is missing"
                      );
                    }
                  }}
                  className="px-3 py-1 bg-destructive text-destructive-foreground text-xs rounded hover:bg-destructive/90 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              )}

              {isPanelForElement && (
                <button
                  onClick={() => {
                    if (
                      onDeleteElement &&
                      selectedElement &&
                      selectedElement.id
                    ) {
                      console.log(
                        `Deleting element with ID: ${selectedElement.id}`
                      );
                      if (selectedElement.sectionId) {
                        onDeleteElement(
                          selectedElement.sectionId,
                          selectedElement.id
                        );
                      } else {
                        console.error(
                          "Cannot delete element: section ID is missing"
                        );
                      }
                    } else {
                      console.error(
                        "Cannot delete element: onDeleteElement is not defined or element ID is missing"
                      );
                    }
                  }}
                  className="px-3 py-1 bg-destructive text-destructive-foreground text-xs rounded hover:bg-destructive/90 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              )}
            </div>

            {isPanelForSection && selectedSection && (
              // Section properties
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="px-4 py-4"
              >
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
                      <label className="text-xs text-muted-foreground">
                        Title
                      </label>
                      <Input
                        value={textInputs.title || ""}
                        onChange={(e) =>
                          handleTextChange("title", e.target.value)
                        }
                        className={inputClassName}
                        placeholder="Enter title"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">
                        Subtitle
                      </label>
                      <Input
                        value={textInputs.subtitle || ""}
                        onChange={(e) =>
                          handleTextChange("subtitle", e.target.value)
                        }
                        className={inputClassName}
                        placeholder="Enter subtitle"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">
                        Description
                      </label>
                      <Textarea
                        value={textInputs.description || ""}
                        onChange={(e) =>
                          handleTextChange("description", e.target.value)
                        }
                        className={textareaClassName}
                        placeholder="Enter section description"
                      />
                    </div>

                    {selectedSection?.type === "contact" && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Email
                          </label>
                          <Input
                            value={textInputs.email}
                            onChange={(e) =>
                              handleTextChange("email", e.target.value)
                            }
                            className={inputClassName}
                            placeholder="Enter contact email"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">
                            Phone
                          </label>
                          <Input
                            value={textInputs.phone}
                            onChange={(e) =>
                              handleTextChange("phone", e.target.value)
                            }
                            className={inputClassName}
                            placeholder="Enter contact phone"
                          />
                        </div>
                      </>
                    )}

                    {selectedSection?.content?.buttonText !== undefined && (
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Button Text
                        </label>
                        <Input
                          value={textInputs.buttonText || ""}
                          onChange={(e) =>
                            handleTextChange("buttonText", e.target.value)
                          }
                          className={inputClassName}
                          placeholder="Enter button text"
                        />
                      </div>
                    )}

                    {selectedSection?.content?.buttonUrl !== undefined && (
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Button URL
                        </label>
                        <Input
                          value={textInputs.buttonUrl || ""}
                          onChange={(e) =>
                            handleTextChange("buttonUrl", e.target.value)
                          }
                          className={inputClassName}
                          placeholder="Enter URL"
                        />
                      </div>
                    )}

                    {/* Service Cards Editor - only for services sections */}
                    {selectedSection?.type === "services" &&
                      selectedSection?.content?.services && (
                        <div className="mt-6 border-t pt-4">
                          <div className="flex justify-between items-center mb-3">
                            <label className="text-sm font-medium">
                              Service Cards
                            </label>
                            <button
                              onClick={() => {
                                const newService = {
                                  title: "New Service",
                                  description: "Description of the new service",
                                };

                                const updatedSection = {
                                  ...selectedSection,
                                  content: {
                                    ...selectedSection.content,
                                    services: [
                                      ...(selectedSection.content.services ||
                                        []),
                                      newService,
                                    ],
                                  },
                                };

                                onUpdateSection(updatedSection);
                              }}
                              className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90 transition-colors"
                            >
                              Add Card
                            </button>
                          </div>

                          {selectedSection.content.services.map(
                            (service, index) => (
                              <div
                                key={index}
                                className="mb-4 p-3 border rounded-md"
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-medium">
                                    Card {index + 1}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const updatedServices = [
                                        ...selectedSection.content.services,
                                      ];
                                      updatedServices.splice(index, 1);

                                      const updatedSection = {
                                        ...selectedSection,
                                        content: {
                                          ...selectedSection.content,
                                          services: updatedServices,
                                        },
                                      };

                                      onUpdateSection(updatedSection);
                                    }}
                                    className="text-destructive hover:text-destructive/80"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  <div>
                                    <label className="text-xs text-muted-foreground">
                                      Title
                                    </label>
                                    <Input
                                      value={service.title || ""}
                                      onChange={(e) => {
                                        const updatedServices = [
                                          ...selectedSection.content.services,
                                        ];
                                        updatedServices[index] = {
                                          ...service,
                                          title: e.target.value,
                                        };

                                        const updatedSection = {
                                          ...selectedSection,
                                          content: {
                                            ...selectedSection.content,
                                            services: updatedServices,
                                          },
                                        };

                                        onUpdateSection(updatedSection);
                                      }}
                                      className={inputClassName}
                                      placeholder="Service title"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-xs text-muted-foreground">
                                      Description
                                    </label>
                                    <Textarea
                                      value={service.description || ""}
                                      onChange={(e) => {
                                        const updatedServices = [
                                          ...selectedSection.content.services,
                                        ];
                                        updatedServices[index] = {
                                          ...service,
                                          description: e.target.value,
                                        };

                                        const updatedSection = {
                                          ...selectedSection,
                                          content: {
                                            ...selectedSection.content,
                                            services: updatedServices,
                                          },
                                        };

                                        onUpdateSection(updatedSection);
                                      }}
                                      className={textareaClassName}
                                      placeholder="Service description"
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                  </div>
                </TabsContent>

                <TabsContent value="style" className="p-4 m-0">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Text Color
                      </label>
                      <Input
                        type="color"
                        value={selectedSection?.style?.textColor || "#000000"}
                        onChange={(e) =>
                          handleStyleChange("textColor", e.target.value)
                        }
                        className={inputClassName}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">
                        Background Color
                      </label>
                      <Input
                        type="color"
                        value={
                          selectedSection?.style?.backgroundColor || "#ffffff"
                        }
                        onChange={(e) =>
                          handleStyleChange("backgroundColor", e.target.value)
                        }
                        className={inputClassName}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">
                        Padding Top
                      </label>
                      <Input
                        type="text"
                        value={selectedSection?.style?.paddingTop || ""}
                        onChange={(e) =>
                          handleStyleChange("paddingTop", e.target.value)
                        }
                        className={inputClassName}
                        placeholder="80px"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">
                        Padding Bottom
                      </label>
                      <Input
                        type="text"
                        value={selectedSection?.style?.paddingBottom || ""}
                        onChange={(e) =>
                          handleStyleChange("paddingBottom", e.target.value)
                        }
                        className={inputClassName}
                        placeholder="80px"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">
                        Font Size
                      </label>
                      <Input
                        type="text"
                        value={selectedSection?.style?.fontSize || ""}
                        onChange={(e) =>
                          handleStyleChange("fontSize", e.target.value)
                        }
                        className={inputClassName}
                        placeholder="16px"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">
                        Font Weight
                      </label>
                      <select
                        value={selectedSection?.style?.fontWeight || "normal"}
                        onChange={(e) =>
                          handleStyleChange("fontWeight", e.target.value)
                        }
                        className={selectClassName}
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                        <option value="lighter">Light</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">
                        Text Align
                      </label>
                      <select
                        value={selectedSection?.style?.textAlign || "left"}
                        onChange={(e) =>
                          handleStyleChange("textAlign", e.target.value)
                        }
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
                      <label className="text-xs text-muted-foreground">
                        CSS Class
                      </label>
                      <Input
                        value={selectedSection?.style?.customClass || ""}
                        onChange={(e) =>
                          handleStyleChange("customClass", e.target.value)
                        }
                        className={inputClassName}
                        placeholder="my-custom-class"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Animation
                      </label>
                      <select
                        value={selectedSection?.style?.animation || "none"}
                        onChange={(e) =>
                          handleStyleChange("animation", e.target.value)
                        }
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
                      <label className="text-xs text-muted-foreground">
                        HTML ID
                      </label>
                      <Input
                        value={selectedSection?.style?.id || ""}
                        onChange={(e) =>
                          handleStyleChange("id", e.target.value)
                        }
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
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="px-4 py-4"
              >
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
                        <label className="text-xs text-muted-foreground">
                          Text Content
                        </label>
                        <Textarea
                          value={elementContent.text || ""}
                          onChange={(e) =>
                            handleElementContentChange("text", e.target.value)
                          }
                          className={textareaClassName}
                          placeholder={
                            selectedElement?.type === "button"
                              ? "Button Text"
                              : selectedElement?.type === "heading"
                              ? "Heading Text"
                              : selectedElement?.type === "paragraph"
                              ? "Paragraph Text"
                              : "Text Content"
                          }
                        />
                      </div>
                    )}

                    {selectedElement?.type === "button" && (
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Button Link URL
                        </label>
                        <Input
                          value={elementContent.url || ""}
                          onChange={(e) =>
                            handleElementContentChange("url", e.target.value)
                          }
                          className={inputClassName}
                          placeholder="https://example.com"
                        />
                      </div>
                    )}

                    {selectedElement?.type === "image" && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Image URL
                          </label>
                          <Input
                            value={elementContent.src || ""}
                            onChange={(e) =>
                              handleElementContentChange("src", e.target.value)
                            }
                            className={inputClassName}
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Alt Text
                          </label>
                          <Input
                            value={elementContent.alt || ""}
                            onChange={(e) =>
                              handleElementContentChange("alt", e.target.value)
                            }
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
                          <label className="text-xs text-muted-foreground">
                            Label
                          </label>
                          <Input
                            value={selectedElement.content.label || ""}
                            onChange={(e) =>
                              handleElementContentChange(
                                "label",
                                e.target.value
                              )
                            }
                            className={inputClassName}
                            placeholder="Field Label"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Placeholder
                          </label>
                          <Input
                            value={selectedElement.content.placeholder || ""}
                            onChange={(e) =>
                              handleElementContentChange(
                                "placeholder",
                                e.target.value
                              )
                            }
                            className={inputClassName}
                            placeholder="Placeholder text"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Helper Text
                          </label>
                          <Input
                            value={selectedElement.content.helperText || ""}
                            onChange={(e) =>
                              handleElementContentChange(
                                "helperText",
                                e.target.value
                              )
                            }
                            className={inputClassName}
                            placeholder="Additional information about this field"
                          />
                        </div>
                        <div className="flex items-center mt-2">
                          <input
                            type="checkbox"
                            id="required"
                            checked={selectedElement.content.required || false}
                            onChange={(e) =>
                              handleElementContentChange(
                                "required",
                                e.target.checked
                              )
                            }
                            className={checkboxClassName}
                          />
                          <label
                            htmlFor="required"
                            className="text-xs text-muted-foreground"
                          >
                            Required
                          </label>
                        </div>
                        {selectedElement.type === "textbox" && (
                          <div className="mt-2">
                            <label className="text-xs text-muted-foreground">
                              Input Type
                            </label>
                            <select
                              value={
                                selectedElement.content.inputType || "text"
                              }
                              onChange={(e) =>
                                handleElementContentChange(
                                  "inputType",
                                  e.target.value
                                )
                              }
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
                          <label className="text-xs text-muted-foreground">
                            Label
                          </label>
                          <Input
                            value={selectedElement.content.label || ""}
                            onChange={(e) =>
                              handleElementContentChange(
                                "label",
                                e.target.value
                              )
                            }
                            className={inputClassName}
                            placeholder="Checkbox Label"
                          />
                        </div>
                        <div className="flex items-center mt-2">
                          <input
                            type="checkbox"
                            id="checked-default"
                            checked={selectedElement.content.checked || false}
                            onChange={(e) =>
                              handleElementContentChange(
                                "checked",
                                e.target.checked
                              )
                            }
                            className={inputClassName}
                          />
                          <label
                            htmlFor="checked-default"
                            className="text-xs text-muted-foreground"
                          >
                            Checked by Default
                          </label>
                        </div>
                        <div className="flex items-center mt-2">
                          <input
                            type="checkbox"
                            id="required-checkbox"
                            checked={selectedElement.content.required || false}
                            onChange={(e) =>
                              handleElementContentChange(
                                "required",
                                e.target.checked
                              )
                            }
                            className={checkboxClassName}
                          />
                          <label
                            htmlFor="required-checkbox"
                            className="text-xs text-muted-foreground"
                          >
                            Required
                          </label>
                        </div>
                      </>
                    )}

                    {selectedElement.type === "date" && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Label
                          </label>
                          <Input
                            value={selectedElement.content.label || ""}
                            onChange={(e) =>
                              handleElementContentChange(
                                "label",
                                e.target.value
                              )
                            }
                            className={inputClassName}
                          />
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="required"
                            checked={selectedElement.content.required || false}
                            onChange={(e) =>
                              handleElementContentChange(
                                "required",
                                e.target.checked
                              )
                            }
                            className={checkboxClassName}
                          />
                          <label
                            htmlFor="required"
                            className="text-xs text-muted-foreground"
                          >
                            Required
                          </label>
                        </div>
                      </>
                    )}

                    {selectedElement.type === "list" && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            List Items (one per line)
                          </label>
                          <Textarea
                            value={(
                              selectedElement.content.items || [
                                "Item 1",
                                "Item 2",
                                "Item 3",
                              ]
                            ).join("\n")}
                            onChange={(e) =>
                              handleElementContentChange(
                                "items",
                                e.target.value.split("\n")
                              )
                            }
                            className={textareaClassName}
                            placeholder="Item 1&#10;Item 2&#10;Item 3"
                          />
                        </div>
                        <div className="mt-2">
                          <label className="text-xs text-muted-foreground">
                            List Type
                          </label>
                          <select
                            value={selectedElement.content.listType || "ul"}
                            onChange={(e) =>
                              handleElementContentChange(
                                "listType",
                                e.target.value
                              )
                            }
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
                        <label className="text-xs text-muted-foreground">
                          Divider Style
                        </label>
                        <select
                          value={
                            selectedElement.content.dividerStyle || "solid"
                          }
                          onChange={(e) =>
                            handleElementContentChange(
                              "dividerStyle",
                              e.target.value
                            )
                          }
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
                    {selectedElement?.type === "button" ? (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Button Style
                          </label>
                          <select
                            value={
                              localElementValues.style.buttonStyle || "default"
                            }
                            onChange={(e) =>
                              handleElementStyleChange(
                                "buttonStyle",
                                e.target.value
                              )
                            }
                            className={selectClassName}
                          >
                            <option value="default">Default</option>
                            <option value="primary">Primary</option>
                            <option value="secondary">Secondary</option>
                            <option value="outline">Outline</option>
                            <option value="link">Link</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">
                            Button Size
                          </label>
                          <select
                            value={
                              localElementValues.style.buttonSize || "default"
                            }
                            onChange={(e) =>
                              handleElementStyleChange(
                                "buttonSize",
                                e.target.value
                              )
                            }
                            className={selectClassName}
                          >
                            <option value="sm">Small</option>
                            <option value="default">Default</option>
                            <option value="lg">Large</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">
                            Text Color
                          </label>
                          <div className="flex mt-1">
                            <Input
                              type="color"
                              value={
                                localElementValues.style.color || "#000000"
                              }
                              onChange={(e) =>
                                handleElementStyleChange(
                                  "color",
                                  e.target.value
                                )
                              }
                              className="w-12 h-8 p-1 border border-gray-300"
                            />
                            <Input
                              value={
                                localElementValues.style.color || "#000000"
                              }
                              onChange={(e) =>
                                handleElementStyleChange(
                                  "color",
                                  e.target.value
                                )
                              }
                              className={`flex-1 ml-2 ${inputClassName}`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">
                            Background Color
                          </label>
                          <div className="flex mt-1">
                            <Input
                              type="color"
                              value={
                                localElementValues.style.backgroundColor ||
                                "#ffffff"
                              }
                              onChange={(e) =>
                                handleElementStyleChange(
                                  "backgroundColor",
                                  e.target.value
                                )
                              }
                              className="w-12 h-8 p-1 border border-gray-300"
                            />
                            <Input
                              value={
                                localElementValues.style.backgroundColor ||
                                "#ffffff"
                              }
                              onChange={(e) =>
                                handleElementStyleChange(
                                  "backgroundColor",
                                  e.target.value
                                )
                              }
                              className={`flex-1 ml-2 ${inputClassName}`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">
                            Border Radius
                          </label>
                          <Input
                            type="range"
                            min="0"
                            max="50"
                            step="1"
                            value={parseInt(
                              localElementValues.style.borderRadius || "0"
                            )}
                            onChange={(e) =>
                              handleElementStyleChange(
                                "borderRadius",
                                `${e.target.value}px`
                              )
                            }
                            className="w-full mt-1"
                          />
                          <div className="text-center text-xs mt-1">
                            {localElementValues.style.borderRadius || "0px"}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">
                            Padding
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground">
                                Horizontal
                              </label>
                              <Input
                                type="range"
                                min="0"
                                max="50"
                                step="1"
                                value={parseInt(
                                  localElementValues.style.paddingX || "10"
                                )}
                                onChange={(e) =>
                                  handleElementStyleChange(
                                    "paddingX",
                                    `${e.target.value}px`
                                  )
                                }
                                className="w-full mt-1"
                              />
                              <div className="text-center text-xs mt-1">
                                {localElementValues.style.paddingX || "10px"}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">
                                Vertical
                              </label>
                              <Input
                                type="range"
                                min="0"
                                max="50"
                                step="1"
                                value={parseInt(
                                  localElementValues.style.paddingY || "5"
                                )}
                                onChange={(e) =>
                                  handleElementStyleChange(
                                    "paddingY",
                                    `${e.target.value}px`
                                  )
                                }
                                className="w-full mt-1"
                              />
                              <div className="text-center text-xs mt-1">
                                {localElementValues.style.paddingY || "5px"}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">
                            Font Weight
                          </label>
                          <select
                            value={
                              localElementValues.style.fontWeight || "normal"
                            }
                            onChange={(e) =>
                              handleElementStyleChange(
                                "fontWeight",
                                e.target.value
                              )
                            }
                            className={selectClassName}
                          >
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                            <option value="500">Medium</option>
                            <option value="600">Semibold</option>
                          </select>
                        </div>

                        <div className="flex items-center mt-2">
                          <input
                            type="checkbox"
                            id="hover-effect"
                            checked={
                              localElementValues.style.hoverEffect || false
                            }
                            onChange={(e) =>
                              handleElementStyleChange(
                                "hoverEffect",
                                e.target.checked
                              )
                            }
                            className={checkboxClassName}
                          />
                          <label
                            htmlFor="hover-effect"
                            className="text-xs text-muted-foreground"
                          >
                            Enable hover effect
                          </label>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Text Color
                          </label>
                          <div className="flex mt-1">
                            <Input
                              type="color"
                              value={elementStyle.color || "#000000"}
                              onChange={(e) =>
                                handleElementStyleChange(
                                  "color",
                                  e.target.value
                                )
                              }
                              className="w-12 h-8 p-1 border border-gray-300"
                            />
                            <Input
                              value={elementStyle.color || "#000000"}
                              onChange={(e) =>
                                handleElementStyleChange(
                                  "color",
                                  e.target.value
                                )
                              }
                              className={`flex-1 ml-2 ${inputClassName}`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">
                            Background Color
                          </label>
                          <div className="flex mt-1">
                            <Input
                              type="color"
                              value={elementStyle.backgroundColor || "#ffffff"}
                              onChange={(e) =>
                                handleElementStyleChange(
                                  "backgroundColor",
                                  e.target.value
                                )
                              }
                              className="w-12 h-8 p-1 border border-gray-300"
                            />
                            <Input
                              value={elementStyle.backgroundColor || "#ffffff"}
                              onChange={(e) =>
                                handleElementStyleChange(
                                  "backgroundColor",
                                  e.target.value
                                )
                              }
                              className={`flex-1 ml-2 ${inputClassName}`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">
                            Font Size
                          </label>
                          <Input
                            type="text"
                            value={elementStyle.fontSize || ""}
                            onChange={(e) =>
                              handleElementStyleChange(
                                "fontSize",
                                e.target.value
                              )
                            }
                            className={inputClassName}
                            placeholder="16px"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">
                            Font Weight
                          </label>
                          <select
                            value={elementStyle.fontWeight || "normal"}
                            onChange={(e) =>
                              handleElementStyleChange(
                                "fontWeight",
                                e.target.value
                              )
                            }
                            className={selectClassName}
                          >
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                            <option value="lighter">Light</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">
                            Text Align
                          </label>
                          <select
                            value={elementStyle.textAlign || "left"}
                            onChange={(e) =>
                              handleElementStyleChange(
                                "textAlign",
                                e.target.value
                              )
                            }
                            className={selectClassName}
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                            <option value="justify">Justify</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="p-4 m-0">
                  <div className="space-y-4">
                    {selectedElement?.type === "button" ? (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            CSS Class
                          </label>
                          <Input
                            value={localElementValues.style.customClass || ""}
                            onChange={(e) =>
                              handleElementStyleChange(
                                "customClass",
                                e.target.value
                              )
                            }
                            className={inputClassName}
                            placeholder="my-custom-class"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            HTML ID
                          </label>
                          <Input
                            value={localElementValues.style.id || ""}
                            onChange={(e) =>
                              handleElementStyleChange("id", e.target.value)
                            }
                            className={inputClassName}
                            placeholder="my-element-id"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Animation on Hover
                          </label>
                          <select
                            value={localElementValues.style.animation || "none"}
                            onChange={(e) =>
                              handleElementStyleChange(
                                "animation",
                                e.target.value
                              )
                            }
                            className={selectClassName}
                          >
                            <option value="none">None</option>
                            <option value="pulse">Pulse</option>
                            <option value="bounce">Bounce</option>
                            <option value="scale">Scale</option>
                            <option value="shadow">Shadow</option>
                          </select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            CSS Class
                          </label>
                          <Input
                            value={localElementValues.style.customClass || ""}
                            onChange={(e) =>
                              handleElementStyleChange(
                                "customClass",
                                e.target.value
                              )
                            }
                            className={inputClassName}
                            placeholder="my-custom-class"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Animation
                          </label>
                          <select
                            value={localElementValues.style.animation || "none"}
                            onChange={(e) =>
                              handleElementStyleChange(
                                "animation",
                                e.target.value
                              )
                            }
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
                          <label className="text-xs text-muted-foreground">
                            HTML ID
                          </label>
                          <Input
                            value={localElementValues.style.id || ""}
                            onChange={(e) =>
                              handleElementStyleChange("id", e.target.value)
                            }
                            className={inputClassName}
                            placeholder="my-element-id"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

PropertiesPanel.propTypes = {
  selectedSection: PropTypes.object,
  selectedElement: PropTypes.object,
  onUpdateSection: PropTypes.func.isRequired,
  onUpdateElement: PropTypes.func.isRequired,
  onDeleteSection: PropTypes.func.isRequired,
  onDeleteElement: PropTypes.func.isRequired,
  onAddElement: PropTypes.func.isRequired,
};
