"use client"

import PropTypes from "prop-types"

export function ThemeProvider({ children }) {
  // This is a simplified component that just renders children
  // The theme functionality has been removed
  return <>{children}</>
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useTheme = () => {
  // This is a dummy hook that returns a fixed light theme
  return {
    theme: "light",
    setTheme: () => {},
  }
}

