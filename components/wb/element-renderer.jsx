import PropTypes from "prop-types"
import { cn } from "../../lib/utils"

export function ElementRenderer({
  element,
  isSelected,
  onClick,
  isPreview = false
}) {
  const { type, content, style } = element

  // Create a clean style object that avoids conflicts between shorthand and specific properties
  const getCleanStyles = () => {
    const cleanStyles = { ...style };
    
    // Handle margin conflicts
    if (cleanStyles.marginTop || cleanStyles.marginRight || cleanStyles.marginBottom || cleanStyles.marginLeft) {
      // If any specific margin is set, don't use the shorthand margin
      delete cleanStyles.margin;
    }
    
    // Handle padding conflicts
    if (cleanStyles.paddingTop || cleanStyles.paddingRight || cleanStyles.paddingBottom || cleanStyles.paddingLeft) {
      // If any specific padding is set, don't use the shorthand padding
      delete cleanStyles.padding;
    }
    
    // Handle border conflicts
    if (cleanStyles.borderTopWidth || cleanStyles.borderRightWidth || cleanStyles.borderBottomWidth || cleanStyles.borderLeftWidth) {
      // If any specific border width is set, don't use the shorthand borderWidth
      delete cleanStyles.borderWidth;
    }
    
    return cleanStyles;
  };
  
  // Apply cleaned styles to avoid conflicts
  const cleanStyle = getCleanStyles();
  
  // Create a safe style object with fallbacks
  const elementStyle = {
    ...cleanStyle,
    cursor: isPreview ? 'default' : 'pointer',
    outline: isSelected && !isPreview ? '2px solid rgb(var(--primary))' : 'none',
    position: 'relative',
  };
  
  // Only add hover effect when not in preview
  const elementClassName = cn(
    style.customClass,
    !isPreview && 'hover:outline hover:outline-2 hover:outline-primary/20'
  );

  const handleClick = (e) => {
    if (!isPreview) {
      e.stopPropagation()
      onClick?.(element)
    }
  }

  const renderElement = () => {
    switch (type) {
      case "heading":
        return (
          <h2 
            className={elementClassName}
            style={elementStyle}
            onClick={handleClick}
          >
            {content.text}
          </h2>
        )
      
      case "paragraph":
        return (
          <p 
            className={elementClassName}
            style={elementStyle}
            onClick={handleClick}
          >
            {content.text}
          </p>
        )
      
      case "button":
        return (
          <button
            className={cn(elementClassName, "transition-colors")}
            style={elementStyle}
            onClick={isPreview ? undefined : handleClick}
          >
            {content.text}
          </button>
        )
      
      case "image":
        return (
          <img
            src={content.src}
            alt={content.alt}
            className={elementClassName}
            style={elementStyle}
            onClick={handleClick}
          />
        )
      
      case "divider":
        return (
          <hr
            className={elementClassName}
            style={elementStyle}
            onClick={handleClick}
          />
        )
      
      case "list":
        return (
          <ul 
            className={elementClassName}
            style={elementStyle}
            onClick={handleClick}
          >
            {content.items?.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )
      
      // Form elements
      case "textbox":
        return (
          <div className={elementClassName} style={elementStyle} onClick={handleClick}>
            {content.label && (
              <label className="block text-sm font-medium mb-1">
                {content.label}
              </label>
            )}
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              placeholder={content.placeholder}
              disabled={isPreview}
            />
          </div>
        )
      
      case "textarea":
        return (
          <div className={elementClassName} style={elementStyle} onClick={handleClick}>
            {content.label && (
              <label className="block text-sm font-medium mb-1">
                {content.label}
              </label>
            )}
            <textarea
              className="w-full px-3 py-2 border rounded-md"
              placeholder={content.placeholder}
              disabled={isPreview}
            />
          </div>
        )
      
      case "checkbox":
        return (
          <div className={elementClassName} style={elementStyle} onClick={handleClick}>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                disabled={isPreview}
              />
              <span>{content.label}</span>
            </label>
          </div>
        )
      
      case "email":
        return (
          <div className={elementClassName} style={elementStyle} onClick={handleClick}>
            {content.label && (
              <label className="block text-sm font-medium mb-1">
                {content.label}
              </label>
            )}
            <input
              type="email"
              className="w-full px-3 py-2 border rounded-md"
              placeholder={content.placeholder}
              disabled={isPreview}
            />
          </div>
        )
      
      case "date":
        return (
          <div className={elementClassName} style={elementStyle} onClick={handleClick}>
            {content.label && (
              <label className="block text-sm font-medium mb-1">
                {content.label}
              </label>
            )}
            <input
              type="date"
              className="w-full px-3 py-2 border rounded-md"
              disabled={isPreview}
            />
          </div>
        )
      
      case "submit":
        return (
          <button
            type="submit"
            className={cn(elementClassName, "transition-colors")}
            style={elementStyle}
            onClick={isPreview ? undefined : handleClick}
          >
            {content.text || "Submit"}
          </button>
        )
      
      default:
        return null
    }
  }

  return renderElement()
}

ElementRenderer.propTypes = {
  element: PropTypes.object.isRequired,
  isSelected: PropTypes.bool,
  onClick: PropTypes.func,
  isPreview: PropTypes.bool,
}

