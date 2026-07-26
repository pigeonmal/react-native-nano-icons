import type { FC } from 'react';
import {
  Platform,
  Text,
  type ColorValue,
  type TextProps,
  type TextStyle,
} from 'react-native';

import type { NanoGlyphMapInput } from './core/types';
import { loadDynamicFont, useDynamicFontPending } from './loadDynamicFont';

const DEFAULT_ICON_SIZE = 12;
const FALLBACK_GLYPH = '';

type IconProps<Name> = Omit<TextProps, 'children' | 'style' | 'ref'> & {
  name: Name;
  size?: number;
  color?: ColorValue;
  style?: TextProps['style'];
};

type IconComponent<GM extends NanoGlyphMapInput> = FC<
  IconProps<keyof GM['i']>
> & {
  loadFont: (font?: number | string | { uri: string }) => Promise<void>;
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
   * Decode each glyph once.
   *
   * Only the first layer's codepoint is retained.
   * Width, source color and additional layers are ignored.
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

  /*
   * This object is created once per icon set.
   */
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
    allowFontScaling = false,
    ...textProps
  }: IconProps<keyof GM['i']>) {
    const glyph = glyphs[name as string] ?? FALLBACK_GLYPH;

    return (
      <Text
        {...textProps}
        selectable={false}
        allowFontScaling={allowFontScaling}
        style={[
          baseStyle,
          {
            fontSize: size,
            color,
          },
          style,
        ]}>
        {glyph}
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

  const IconComponentResult = Icon as IconComponent<GM>;

  IconComponentResult.loadFont = (override) =>
    isDynamic
      ? loadDynamicFont(fontBasename, override ?? font, { force: true })
      : Promise.resolve();

  return IconComponentResult;
}
