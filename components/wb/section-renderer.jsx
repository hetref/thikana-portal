"use client"

import { cn } from "@/lib/utils"
import PropTypes from "prop-types"
import { ElementRenderer } from "./element-renderer"

const getGridClass = (type) => {
  switch (type) {
    case "services":
      return "grid-cols-1 md:grid-cols-3"
    case "features":
      return "grid-cols-1 md:grid-cols-2"
    case "testimonials":
      return "grid-cols-1 md:grid-cols-3"
    case "team":
      return "grid-cols-1 md:grid-cols-4"
    case "gallery":
      return "grid-cols-1 md:grid-cols-3"
    default:
      return "grid-cols-1"
  }
}

export function SectionRenderer({
  section,
  elements = [],
  isSelected,
  onSelect,
  onReorder,
  onAddElement,
  isPreview = false
}) {
  const { type, content = {}, style = {} } = section

  console.log("Rendering section:", { type, content, style })
  console.log("Section elements:", elements)

  const sectionStyle = {
    backgroundColor: style?.backgroundColor || undefined,
    color: style?.textColor || undefined,
    paddingTop: style?.paddingTop || undefined,
    paddingRight: style?.paddingRight || undefined,
    paddingBottom: style?.paddingBottom || undefined,
    paddingLeft: style?.paddingLeft || undefined,
    borderRadius: style?.borderRadius || undefined,
  }

  // Add default content if not provided
  const defaultContent = {
    title: "",
    subtitle: "",
    description: "",
    buttonText: "",
    ...content
  }

  const handleDragOver = (e) => {
    if (isPreview) return
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    if (isPreview) return
    e.preventDefault()
    e.stopPropagation()
    
    try {
      const elementData = JSON.parse(e.dataTransfer.getData("element"))
      onAddElement?.(section.id, elementData)
    } catch (error) {
      console.error("Error adding element:", error)
    }
  }

  const renderSection = () => {
    switch (type) {
      case "hero":
        return (
          <div className="text-center py-20 px-4" style={sectionStyle}>
            <h1 className="text-4xl font-bold mb-4">{defaultContent.title || "Welcome to Your Website"}</h1>
            <p className="text-xl mb-8">{defaultContent.subtitle || "Create beautiful websites with ease"}</p>
            <p className="mb-8 max-w-2xl mx-auto">
              {defaultContent.description || "This is a hero section. Edit this text to make it your own."}
            </p>
            {defaultContent.buttonText && (
              <button className="bg-primary text-white px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
                {defaultContent.buttonText}
              </button>
            )}
          </div>
        )

      case "about":
        return (
          <div className="py-16 px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 text-center">{defaultContent.title || "About Us"}</h2>
              <p className="text-lg mb-6 text-center">{defaultContent.subtitle || "Learn more about our company"}</p>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="rounded-lg overflow-hidden bg-accent/20 h-64 flex items-center justify-center">
                    <img
                      src="/placeholder.svg?height=300&width=400"
                      alt="About us"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div>
                  <p className="mb-4">
                    {defaultContent.description || "This is the about section. Add your company description here."}
                  </p>
                  {defaultContent.buttonText && (
                    <button className="bg-primary text-white px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
                      {defaultContent.buttonText}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )

      case "services":
        return (
          <div className="py-16 px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 text-center">{defaultContent.title || "Our Services"}</h2>
              <p className="text-lg mb-12 text-center">{defaultContent.subtitle || "What we can do for you"}</p>
              <div className="grid md:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={`service-${section.id}-${i}`} className="bg-background p-6 rounded-lg shadow-sm border border-border">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 16V12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 8H12.01"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium mb-2">Service {i}</h3>
                    <p className="text-muted-foreground">
                      This is a service description. Edit this text to describe your service.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case "contact":
        return (
          <div className="py-16 px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 text-center">{defaultContent.title || "Contact Us"}</h2>
              <p className="text-lg mb-8 text-center">{defaultContent.subtitle || "Get in touch with our team"}</p>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="mb-6">
                    {defaultContent.description ||
                      "We'd love to hear from you. Fill out the form and we'll get back to you as soon as possible."}
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 8V16"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M8 12H16"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium">Email</h3>
                        <p className="text-sm text-muted-foreground">contact@example.com</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M22 16.92V19.92C22 20.4704 21.7893 20.9996 21.4142 21.3747C21.0391 21.7498 20.5099 21.9605 19.96 21.96C18.2 22.09 16.48 21.89 14.87 21.37C13.38 20.88 12.01 20.12 10.8 19.15C9.62 18.22 8.57 17.17 7.64 15.99C6.67 14.78 5.91 13.41 5.42 11.92C4.9 10.31 4.7 8.59 4.83 6.83C4.83 6.28 5.04 5.75 5.41 5.38C5.79 5 6.32 4.79 6.87 4.79H9.87C10.3304 4.78993 10.7745 4.94881 11.1184 5.24006C11.4623 5.53131 11.6836 5.93724 11.74 6.39C11.86 7.39 12.09 8.37 12.42 9.31C12.5532 9.71686 12.5565 10.1608 12.4292 10.5695C12.302 10.9783 12.0519 11.3322 11.71 11.58L10.62 12.67C11.4775 13.9836 12.5301 15.1543 13.76 16.14L14.85 15.05C15.0978 14.7081 15.4517 14.458 15.8605 14.3308C16.2692 14.2035 16.7131 14.2068 17.12 14.34C18.06 14.67 19.04 14.9 20.04 15.02C20.4947 15.0764 20.9026 15.2987 21.1946 15.6446C21.4866 15.9905 21.6448 16.4373 21.64 16.9L22 16.92Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium">Phone</h3>
                        <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-background p-6 rounded-lg shadow-sm border border-border">
                  <form className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <input type="text" className="w-full p-2 mt-1 border border-input rounded-md" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <input type="email" className="w-full p-2 mt-1 border border-input rounded-md" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Message</label>
                      <textarea className="w-full p-2 mt-1 border border-input rounded-md h-24 resize-none"></textarea>
                    </div>
                    <button className="bg-primary text-white px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors w-full">
                      Send Message
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )

      case "testimonials":
        return (
          <div className="py-16 px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 text-center">{defaultContent.title || "Testimonials"}</h2>
              <p className="text-lg mb-12 text-center">{defaultContent.subtitle || "What our clients say"}</p>
              <div className="grid md:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={`testimonial-${section.id}-${i}`} className="bg-background p-6 rounded-lg shadow-sm border border-border text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto mb-4 overflow-hidden">
                      <img
                        src="/placeholder.svg?height=64&width=64"
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="text-xl font-medium mb-2">Client {i}</h3>
                    <p className="text-muted-foreground">
                      This is a testimonial. Edit this text to add a client's testimonial.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case "team":
        return (
          <div className="py-16 px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 text-center">{defaultContent.title || "Our Team"}</h2>
              <p className="text-lg mb-12 text-center">{defaultContent.subtitle || "Meet the people behind our success"}</p>
              <div className="grid md:grid-cols-4 gap-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={`team-member-${section.id}-${i}`} className="text-center">
                    <div className="w-32 h-32 bg-primary/10 rounded-full mx-auto mb-4 overflow-hidden">
                      <img
                        src="/placeholder.svg?height=128&width=128"
                        alt="Team member"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="text-xl font-medium mb-2">Team Member {i}</h3>
                    <p className="text-muted-foreground">
                      This is a team member. Edit this text to add a team member's name and role.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case "features":
        return (
          <div className="py-16 px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 text-center">{defaultContent.title || "Features"}</h2>
              <p className="text-lg mb-12 text-center">{defaultContent.subtitle || "What makes us different"}</p>
              <div className="grid md:grid-cols-2 gap-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={`feature-${section.id}-${i}`} className="flex items-start">
                    <div className="mr-4 bg-primary/10 p-3 rounded-full text-primary">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M9 12L11 14L15 10M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-medium mb-2">Feature {i}</h3>
                      <p className="text-muted-foreground">
                        This is a feature. Edit this text to describe the feature.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case "gallery":
        return (
          <div className="py-16 px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 text-center">{defaultContent.title || "Gallery"}</h2>
              <p className="text-lg mb-12 text-center">{defaultContent.subtitle || "Our work in pictures"}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={`gallery-item-${section.id}-${i}`} className="aspect-square bg-accent/20 rounded-lg overflow-hidden">
                    <img
                      src="/placeholder.svg?height=400&width=400"
                      alt={`Gallery image ${i}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="py-12 px-4 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {defaultContent.title || `${type.charAt(0).toUpperCase() + type.slice(1)} Section`}
            </h2>
            <p>{defaultContent.description || `This is a ${type} section. Edit the properties to customize it.`}</p>
          </div>
        )
    }
  }

  return (
    <div
      className={cn(
        "relative p-4 my-8 rounded-lg transition-all",
        !isPreview && "hover:outline hover:outline-2 hover:outline-primary/20",
        isSelected && !isPreview && "outline outline-2 outline-primary"
      )}
      style={sectionStyle}
      onClick={(e) => {
        if (!isPreview) {
          e.stopPropagation()
          onSelect?.(section)
        }
      }}
      {...(!isPreview && {
        onDragOver: handleDragOver,
        onDrop: handleDrop
      })}
    >
      {!isPreview && (
        <div className="absolute -top-3 left-4 bg-muted px-2 py-0.5 rounded text-xs font-medium text-muted-foreground">
          {type}
        </div>
      )}

      {renderSection()}

      <div className={cn("grid gap-8", getGridClass(type))}>
        {elements.map((element) => (
          <ElementRenderer
            key={element.id}
            element={element}
            isPreview={isPreview}
          />
        ))}
      </div>
    </div>
  )
}

SectionRenderer.propTypes = {
  section: PropTypes.object.isRequired,
  elements: PropTypes.array,
  isSelected: PropTypes.bool,
  onSelect: PropTypes.func,
  onReorder: PropTypes.func,
  onAddElement: PropTypes.func,
  isPreview: PropTypes.bool,
}

