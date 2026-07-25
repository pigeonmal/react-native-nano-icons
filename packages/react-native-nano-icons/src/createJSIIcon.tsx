import {
  Platform,
  Text,
  type AccessibilityRole,
  type ColorValue,
  type TextStyle,
} from 'react-native';

import type { FC } from 'react';
import type { GlyphEntry, NanoGlyphMapInput } from './core/types';
import { loadDynamicFont, useDynamicFontPending } from './loadDynamicFont';
import type { IconComponent } from './types';

const DEFAULT_ICON_SIZE = 12;
const FALLBACK_GLYPH = '?';
type IconProps<Name> = {
  name: Name;
  size?: number;
  color?: ColorValue;
  allowFontScaling?: boolean;
  style?: TextStyle;
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityElementsHidden?: boolean; // iOS
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants'; // Android
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
   * Decode every icon once when the icon set is created.
   *
   * The render path then performs only:
   *   glyphs[name]
   *
   * Object lookup is used instead of Map because icon names are strings.
   */
  const glyphs = Object.create(null) as Record<string, string>;
  const iconEntries = glyphMap.i as Record<string, GlyphEntry>;

  for (const name in iconEntries) {
    const firstLayer = iconEntries[name]?.[1]?.[0];

    glyphs[name] = firstLayer
      ? String.fromCodePoint(firstLayer[0])
      : FALLBACK_GLYPH;
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

  /*
   * Static-font fast path:
   * no font-loading hook is called during render.
   */
  function StaticIcon({
    name,
    size = DEFAULT_ICON_SIZE,
    color,
    style,
    allowFontScaling = false,
    accessible,
    accessibilityLabel,
    accessibilityRole = 'image',
    accessibilityElementsHidden,
    importantForAccessibility,
    testID,
  }: IconProps<keyof GM['i']>) {
    const resolvedColor = Array.isArray(color) ? color[0] : color;

    const glyph = glyphs[name as string] ?? FALLBACK_GLYPH;

    return (
      <Text
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
            color: resolvedColor as ColorValue | undefined,
          },
          style,
        ]}>
        {glyph}
      </Text>
    );
  }

  /*
   * Dynamic-font path:
   * isolated from static icons so static icons do not execute the hook.
   */
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
