import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const paperLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0F7A5B',
    primaryContainer: '#E8F5F0',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#0F7A5B',
    secondary: '#0F7A5B',
    secondaryContainer: '#F5FBF8',
    background: '#FFFFFF',
    surface: '#F5FBF8',
    surfaceVariant: '#F5FBF8',
    onBackground: '#1E1E1E',
    onSurface: '#1E1E1E',
    onSurfaceVariant: '#666666',
    outline: '#C9E6D9',
    outlineVariant: '#C9E6D9',
  },
};

export const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#19A874',
    primaryContainer: '#1A2E25',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#19A874',
    secondary: '#19A874',
    secondaryContainer: '#1A1A1A',
    background: '#121212',
    surface: '#1A1A1A',
    surfaceVariant: '#242424',
    onBackground: '#F5F5F5',
    onSurface: '#F5F5F5',
    onSurfaceVariant: '#AAAAAA',
    outline: '#2A2A2A',
    outlineVariant: '#333333',
  },
};
