import Svg, { Path } from 'react-native-svg';

export function SpeakerIcon({
  size = 22,
  color,
  muted = false,
}: {
  size?: number;
  color: string;
  muted?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path
        d="M4 9.5v5h3.5l4.5 3.8V5.7L7.5 9.5H4z"
        stroke={color}
        fill="none"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {muted ? (
        <Path
          d="M15.5 9l5 5m0-5l-5 5"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      ) : (
        <Path
          d="M15.5 8.5a5 5 0 010 7M18 6a8 8 0 010 12"
          stroke={color}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}
