import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

/**
 * Theme Provider Wrapper
 *
 * Wraps the app with next-themes ThemeProvider.
 * Configured for class-based theming with darkMode: 'class'.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider attribute="class" {...props}>{children}</NextThemesProvider>;
}
