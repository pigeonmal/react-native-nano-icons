import type { FC } from 'react';
import {
  Platform,
  Text,
  type AccessibilityRole,
  type ColorValue,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import type { NanoGlyphMapInput } from './core/types';
import { loadDynamicFont, useDynamicFontPending } from './loadDynamicFont';
import type { IconComponent } from './types';

const DEFAULT_ICON_SIZE = 12;
const FALLBACK_GLYPH = '';

type IconProps<Name> = {
  name: Name;
  size?: number;
  color?: ColorValue;
  allowFontScaling?: boolean;
  style?: StyleProp<TextStyle>;
  onPress?: () => void;
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityElementsHidden?: boolean;
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
  testID?: string;
};

export function createJSIIcon<GM extends NanoGlyphMapInput>(
  glyphMap: GM
): IconComponent<GM>;

export function createJSIIcon<GM extends NanoGlyphMapInput>(
  glyphMap: GM,
  font: unknown
): IconComponent<GM>;

export function createJSIIcon<GM extends NanoGlyphMapInput>(
  glyphMap: GM,
  font?: unknown
): IconComponent<GM> {
  const fontBasename = glyphMap.m.f;
  const isDynamic = glyphMap.m.l === 'd';
  const managedFont = isDynamic && font != null;

  const fontFamily =
    Platform.OS === 'windows' ? `/Assets/${fontBasename}` : fontBasename;

  /*
   * Store only the decoded character.
   *
   * Advance width, layer colors and additional layers are ignored.
   */
  const glyphs = Object.create(null) as Record<string, string>;
  const iconEntries = glyphMap.i as Record<
    string,
    readonly [unknown, readonly (readonly [number, unknown])[]]
  >;

  for (const name in iconEntries) {
    const codepoint = iconEntries[name]?.[1]?.[0]?.[0];

    glyphs[name] =
      codepoint == null ? FALLBACK_GLYPH : String.fromCodePoint(codepoint);
  }

  const baseStyle: TextStyle = {
    fontFamily,
    fontWeight: 'normal',
    fontStyle: 'normal',
    includeFontPadding: false,
    padding: 0,
    margin: 0,
  };

  if (managedFont) {
    void loadDynamicFont(fontBasename, font).catch((error: unknown) => {
      if (__DEV__) {
        console.warn(
          `[react-native-nano-icons] Failed to load "${fontBasename}".`,
          error
        );
      }
    });
  }

  function StaticIcon({
    name,
    size = DEFAULT_ICON_SIZE,
    color,
    style,
    onPress,
    allowFontScaling = false,
    accessible,
    accessibilityLabel,
    accessibilityRole = 'image',
    accessibilityElementsHidden,
    importantForAccessibility,
    testID,
  }: IconProps<keyof GM['i']>) {
    return (
      <Text
        onPress={onPress}
        selectable={false}
        allowFontScaling={allowFontScaling}
        accessible={accessible}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel ?? String(name)}
        accessibilityElementsHidden={accessibilityElementsHidden}
        importantForAccessibility={importantForAccessibility}
        testID={testID}
        style={[
          baseStyle,
          {
            fontSize: size,
            color,
          },
          style,
        ]}>
        {glyphs[name as string] ?? FALLBACK_GLYPH}
      </Text>
    );
  }

  function DynamicIcon(props: IconProps<keyof GM['i']>) {
    const pending = useDynamicFontPending(true, fontBasename);

    if (pending) {
      return null;
    }

    return <StaticIcon {...props} />;
  }

  const Icon = (managedFont ? DynamicIcon : StaticIcon) as FC<
    IconProps<keyof GM['i']>
  >;

  Icon.displayName = `JSIIcon(${fontBasename})`;

  const IconComponentResult = Icon as unknown as IconComponent<GM>;

  IconComponentResult.loadFont = (override) =>
    isDynamic
      ? loadDynamicFont(fontBasename, override ?? font, {
          force: true,
        })
      : Promise.resolve();

  return IconComponentResult;
}
