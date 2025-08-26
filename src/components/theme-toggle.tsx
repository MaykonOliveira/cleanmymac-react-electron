import React from "react"
import { Moon, Sun, Monitor, ChevronDown } from "lucide-react"
import { useTheme } from "@/contexts/theme-provider"
import * as Select from "@radix-ui/react-select"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const getThemeIcon = (themeType: string) => {
    switch (themeType) {
      case "light":
        return <Sun className="h-4 w-4" />
      case "dark":
        return <Moon className="h-4 w-4" />
      case "system":
        return <Monitor className="h-4 w-4" />
      default:
        return <Sun className="h-4 w-4" />
    }
  }

  const getThemeLabel = (themeType: string) => {
    switch (themeType) {
      case "light":
        return "Claro"
      case "dark":
        return "Escuro"
      case "system":
        return "Sistema"
      default:
        return "Sistema"
    }
  }

  return (
    <Select.Root value={theme} onValueChange={setTheme}>
      <Select.Trigger className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border-0 bg-transparent outline-none">
        <Select.Value>
          <div className="flex items-center space-x-2">
            {getThemeIcon(theme)}
            <span className="text-xs font-medium">{getThemeLabel(theme)}</span>
          </div>
        </Select.Value>
        <Select.Icon>
          <ChevronDown className="h-3 w-3" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="overflow-hidden bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
          <Select.Viewport className="p-1">
            <Select.Item
              value="light"
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer outline-none"
            >
              <Select.ItemText>
                <div className="flex items-center space-x-2">
                  <Sun className="h-4 w-4" />
                  <span>Claro</span>
                </div>
              </Select.ItemText>
            </Select.Item>

            <Select.Item
              value="dark"
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer outline-none"
            >
              <Select.ItemText>
                <div className="flex items-center space-x-2">
                  <Moon className="h-4 w-4" />
                  <span>Escuro</span>
                </div>
              </Select.ItemText>
            </Select.Item>

            <Select.Item
              value="system"
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer outline-none"
            >
              <Select.ItemText>
                <div className="flex items-center space-x-2">
                  <Monitor className="h-4 w-4" />
                  <span>Sistema</span>
                </div>
              </Select.ItemText>
            </Select.Item>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}