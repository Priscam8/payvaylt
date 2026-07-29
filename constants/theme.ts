/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0b66da';
const tintColorDark = '#78b4ff';

export const Colors = {
  light: {
    text: '#15233d',
    background: '#fbfcfe',
    tint: tintColorLight,
    icon: '#6f809b',
    tabIconDefault: '#95a7be',
    tabIconSelected: tintColorLight,
    surface: '#ffffff',
    surfaceMuted: '#f6f9fc',
    border: '#e4ebf2',
    accent: '#69c63d',
    accentSoft: '#f6fbf3',
    primarySoft: '#f2f7fd',
    highlight: '#fffaf0',
  },
  dark: {
    text: '#f5f8ff',
    background: '#091423',
    tint: tintColorDark,
    icon: '#8ea9cd',
    tabIconDefault: '#607898',
    tabIconSelected: tintColorDark,
    surface: '#10213a',
    surfaceMuted: '#183255',
    border: '#2d4b72',
    accent: '#7cd548',
    accentSoft: '#17321d',
    primarySoft: '#14345f',
    highlight: '#4b3b11',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
