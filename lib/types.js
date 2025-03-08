import React from "react";

const Section = ({ id, type, content, style }) => {
  return (
    <section
      id={id}
      className={style.customClass}
      style={{
        backgroundColor: style.backgroundColor,
        color: style.textColor,
        paddingTop: style.paddingTop,
        paddingRight: style.paddingRight,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
        borderRadius: style.borderRadius,
        animation: style.animation,
      }}
    >
      {content.title && <h2>{content.title}</h2>}
      {content.subtitle && <h3>{content.subtitle}</h3>}
      {content.description && <p>{content.description}</p>}
      {content.buttonText && content.buttonUrl && (
        <a href={content.buttonUrl} className="btn">
          {content.buttonText}
        </a>
      )}
    </section>
  );
};

export default Section;