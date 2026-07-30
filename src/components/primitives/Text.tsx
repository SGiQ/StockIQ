import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { palette, type, type TypeVariant } from '@/theme/tokens';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  /** Renders the label variant in caps, matching Imprint's unit banners. */
  uppercase?: boolean;
}

/**
 * The only text component in the app. Going through a variant here rather
 * than styling RNText ad hoc is what keeps 40-odd screens on one type scale.
 */
export function Text({
  variant = 'body',
  color = palette.ink,
  align,
  uppercase,
  style,
  children,
  ...rest
}: TextProps) {
  return (
    <RNText
      {...rest}
      style={[
        type[variant],
        { color },
        align ? { textAlign: align } : null,
        uppercase ? { textTransform: 'uppercase' } : null,
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
