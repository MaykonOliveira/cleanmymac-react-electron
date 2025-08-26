import React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/contexts/theme-provider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else if (theme === "dark") {
      setTheme("system")
    } else {
      setTheme("light")
    }
  }

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-4 w-4" />
      case "dark":
        return <Moon className="h-4 w-4" />
      default:
        return <Sun className="h-4 w-4" />
    }
  }

  const getThemeLabel = () => {
    switch (theme) {
      case "light":
        return "Claro"
      case "dark":
        return "Escuro"
      default:
        return "Sistema"
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      title={`Tema: ${getThemeLabel()}`}
    >
      {getThemeIcon()}
      <span className="text-xs font-medium">{getThemeLabel()}</span>
    </button>
  )
}