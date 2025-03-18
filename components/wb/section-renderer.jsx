"use client"

import { cn } from "@/lib/utils"
import PropTypes from "prop-types"
import { ElementRenderer } from "./element-renderer"
import React from "react"

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

const ProductCard = ({ product, layout, style }) => {
  if (!product) return null;
  
  console.log("[ProductCard] Rendering product:", product.id, product.name);
  
  return (
    <div 
      className="product-card bg-white rounded-md overflow-hidden transition-all hover:shadow-lg"
      style={{
        backgroundColor: style?.backgroundColor || "#ffffff",
        color: style?.textColor || "#111827",
        borderRadius: style?.borderRadius || "8px",
        boxShadow: style?.boxShadow || "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      {product.imageUrl ? (
        <div className="product-image relative aspect-[1/1]">
          <img 
            src={product.imageUrl} 
            alt={product.name || "Product"} 
            className="object-cover w-full h-full"
          />
          {product.quantity <= 5 && product.quantity > 0 && (
            <span className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-semibold px-2 py-1 rounded">
              Only {product.quantity} left
            </span>
          )}
          {product.quantity === 0 && (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
              Out of stock
            </span>
          )}
          {product.category && (
            <span className="absolute bottom-2 left-2 bg-gray-800 bg-opacity-70 text-white text-xs font-semibold px-2 py-1 rounded">
              {product.category}
            </span>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
          <div className="text-center p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>No image</p>
          </div>
        </div>
      )}
      
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 line-clamp-2">{product.name}</h3>
        
        {product.price !== undefined && (
          <div className="text-lg font-bold mb-2">
            ₹{typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
          </div>
        )}
        
        {product.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
        )}
        
        <div className="flex justify-between items-center mt-2 mb-3">
          {product.purchaseCount !== undefined && (
            <span className="text-xs text-gray-500">
              {product.purchaseCount} sold
            </span>
          )}
          {product.quantity !== undefined && (
            <span className="text-xs text-gray-500">
              {product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
            </span>
          )}
        </div>
        
        <button 
          className={`w-full py-2 px-4 rounded transition-colors ${
            product.quantity > 0 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
          }`}
          disabled={product.quantity <= 0}
        >
          {product.quantity > 0 ? 'View Details' : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
};

export function SectionRenderer({
  section,
  elements = [],
  isSelected,
  onSelect,
  onReorder,
  onAddElement,
  isPreview = false,
  onDeleteSection,
  userProducts
}) {
  const { type, content = {}, style = {} } = section

  console.log(`[SectionRenderer] Rendering section: ${type}, isPreview: ${isPreview}, userProducts: ${userProducts?.length || 0}`)
  
  // If this is a product section and we have products, log them for debugging
  if (type === "products" && userProducts && userProducts.length > 0) {
    console.log(`[SectionRenderer] Product section with ${userProducts.length} products:`)
    console.log(`[SectionRenderer] First product:`, userProducts[0])
  }

  // Use an ID + content hash as key to force re-renders when content changes
  const contentKey = `${section.id}-${JSON.stringify(content).slice(0, 50)}`;
  
  const sectionStyle = {
    backgroundColor: style?.backgroundColor || undefined,
    color: style?.textColor || undefined,
    paddingTop: style?.paddingTop || undefined,
    paddingRight: style?.paddingRight || undefined,
    paddingBottom: style?.paddingBottom || undefined,
    paddingLeft: style?.paddingLeft || undefined,
    borderRadius: style?.borderRadius || undefined,
    textAlign: style?.textAlign || undefined,
    fontSize: style?.fontSize || undefined,
    fontWeight: style?.fontWeight || undefined,
  }

  // Directly use content values without default fallbacks
  const title = content?.title || "";
  const subtitle = content?.subtitle || "";
  const description = content?.description || "";
  const buttonText = content?.buttonText || "";
  const buttonUrl = content?.buttonUrl || "#";

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
          <div className="text-center py-20 px-4" style={sectionStyle} key={`hero-${section.id}-${contentKey}`}>
            <h1 className="text-4xl font-bold mb-4">{title}</h1>
            <p className="text-xl mb-8">{subtitle}</p>
            <p className="mb-8 max-w-2xl mx-auto">
              {description}
            </p>
            {buttonText && (
              <button className="bg-primary text-white px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
                {buttonText}
              </button>
            )}
          </div>
        )

      case "about":
        return (
          <div className="py-16 px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 text-center">{title}</h2>
              <p className="text-lg mb-6 text-center">{subtitle}</p>
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
                    {description}
                  </p>
                  {buttonText && (
                    <button className="bg-primary text-white px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
                      {buttonText}
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
              <h2 className="text-3xl font-bold mb-6 text-center">{title}</h2>
              <p className="text-lg mb-12 text-center">{subtitle}</p>
              <div className="grid md:grid-cols-3 gap-8">
                {content.services && content.services.map((service, index) => (
                  <div key={`service-${section.id}-${index}`} className="bg-background p-6 rounded-lg shadow-sm border border-border">
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
                    <h3 className="text-xl font-medium mb-2">{service.title}</h3>
                    <p className="text-muted-foreground">{service.description}</p>
                  </div>
                ))}
                {(!content.services || content.services.length === 0) && (
                  <div className="col-span-3 text-center p-8 border border-dashed border-border rounded-lg">
                    <p className="text-muted-foreground">
                      No service cards defined. Add cards in the properties panel.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case "contact":
        return (
          <div className="py-16 px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 text-center">{title}</h2>
              <p className="text-lg mb-8 text-center">{subtitle}</p>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="mb-6">
                    {description}
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
                        <p className="text-sm text-muted-foreground">{content.email || "contact@example.com"}</p>
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
                        <p className="text-sm text-muted-foreground">{content.phone || "+1 (555) 123-4567"}</p>
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
              <h2 className="text-3xl font-bold mb-6 text-center">{title}</h2>
              <p className="text-lg mb-12 text-center">{subtitle}</p>
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
              <h2 className="text-3xl font-bold mb-6 text-center">{title}</h2>
              <p className="text-lg mb-12 text-center">{subtitle}</p>
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
              <h2 className="text-3xl font-bold mb-6 text-center">{title}</h2>
              <p className="text-lg mb-12 text-center">{subtitle}</p>
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
              <h2 className="text-3xl font-bold mb-6 text-center">{title}</h2>
              <p className="text-lg mb-12 text-center">{subtitle}</p>
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

      case "products":
        console.log(`[Section ${section.id}] Rendering products section with userProducts:`, userProducts);
        
        // Show test product if userProducts is empty or not provided
        let productsToDisplay = userProducts && userProducts.length > 0 
          ? userProducts 
          : [{ 
              id: "sample-1",
              name: "Sample Product",
              description: "This is a sample product to show how the card looks",
              price: 299,
              imageUrl: "/placeholder.svg?height=300&width=300",
              category: "Sample",
              quantity: 10,
              purchaseCount: 5
            }];
            
        console.log(`[Section ${section.id}] Products to display:`, productsToDisplay);
        
        return (
          <div className="p-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">{content.title || "Our Products"}</h2>
              <p className="text-xl mb-2">{content.subtitle || "Browse our collection"}</p>
              <p>{content.description || "Discover our carefully curated selection of products."}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {productsToDisplay.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  style={style.productCardStyle || {}}
                />
              ))}
            </div>
            
            {content.buttonText && content.buttonUrl && (
              <div className="text-center mt-8">
                <a 
                  href={content.buttonUrl} 
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md"
                >
                  {content.buttonText}
                </a>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="p-12 text-center border rounded">
            <h3 className="text-xl">Unknown section type: {type}</h3>
          </div>
        );
    }
  }

  return (
    <div
      id={`section-${section.id}`}
      key={contentKey}
      className={cn(
        "w-full section-wrapper relative",
        isSelected && !isPreview && "outline outline-2 outline-blue-500",
        !isPreview && "cursor-pointer"
      )}
      style={sectionStyle}
      onClick={(e) => {
        if (isPreview) return;
        e.stopPropagation();
        onSelect?.(section.id);
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

      {isSelected && !isPreview && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log(`Attempting to delete section: ${section.id}, type: ${type}`);
            if (onDeleteSection) {
              onDeleteSection(section.id);
            } else {
              console.error('onDeleteSection is not defined!');
            }
          }}
          className="absolute -top-3 right-4 bg-destructive/10 hover:bg-destructive/20 text-destructive px-2 py-0.5 rounded text-xs font-medium transition-colors z-50"
        >
          Delete
        </button>
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
  onDeleteSection: PropTypes.func,
  userProducts: PropTypes.array,
}

