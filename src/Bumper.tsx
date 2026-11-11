import { z } from "zod";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadSans } from "@remotion/google-fonts/Inter";

const { fontFamily: serif } = loadSerif("normal", {
  weights: ["700", "800"],
  subsets: ["latin"],
});
const { fontFamily: sans } = loadSans("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
});

const NAVY = "#0F172A";
const NAVY2 = "#1E293B";
const GOLD = "#D97706";
const GOLD2 = "#B45309";

export const BumperVariant = z.enum([
  "just-listed",
  "sold",
  "open-house",
  "price-drop",
  "intro",
  "outro",
]);

export const BumperSchema = z.object({
  variant: BumperVariant,
  title: z.string(),
  subtitle: z.string(),
  agencyName: z.string(),
  agentName: z.string(),
});

type Props = z.infer<typeof BumperSchema>;

const ICONS: Record<z.infer<typeof BumperVariant>, React.ReactNode> = {
  "just-listed": (
    <path d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
  ),
  sold: <path d="M4 12l5 5L20 6" />,
  "open-house": (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  "price-drop": <path d="M12 3v14m0 0-5-5m5 5 5-5M5 21h14" />,
  intro: <path d="M4 12h16M12 4v16" />,
  outro: <path d="M5 12h14m-6-6 6 6-6 6" />,
};

const LABELS: Record<z.infer<typeof BumperVariant>, string> = {
  "just-listed": "Nuovo incarico",
  sold: "Venduto",
  "open-house": "Open house",
  "price-drop": "Prezzo ribassato",
  intro: "",
  outro: "",
};

export const Bumper: React.FC<Props> = ({
  variant,
  title,
  subtitle,
  agencyName,
  agentName,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const label = LABELS[variant];

  const ringScale = interpolate(frame, [0, 0.9 * fps], [0.4, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.spring({ damping: 11 }),
    output: "perceptual-scale",
  });
  const ringOpacity = interpolate(frame, [0, 0.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleOpacity = interpolate(frame, [0.5 * fps, 1 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const titleTranslate = interpolate(
    frame,
    [0.5 * fps, 1 * fps],
    ["0px 24px", "0px 0px"],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const subOpacity = interpolate(frame, [0.9 * fps, 1.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const badgeOpacity = interpolate(frame, [1.3 * fps, 1.8 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${NAVY2} 0%, ${NAVY} 55%)`,
      }}
    >
      <AbsoluteFill
        name="DecorRing"
        style={{
          alignItems: "center",
          justifyContent: "center",
          opacity: ringOpacity,
        }}
      >
        <div
          style={{
            width: 520,
            height: 520,
            borderRadius: "50%",
            border: `2px solid rgba(217,119,6,.35)`,
            scale: ringScale,
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill
        name="Icon"
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: "translateY(-230px)",
          opacity: ringOpacity,
        }}
      >
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 50px rgba(217,119,6,.4)",
            scale: ringScale,
          }}
        >
          <svg
            width="76"
            height="76"
            viewBox="0 0 24 24"
            fill="none"
            stroke={NAVY}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {ICONS[variant]}
          </svg>
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        name="TextBlock"
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          padding: "0 90px",
          transform: "translateY(40px)",
        }}
      >
        {label ? (
          <Interactive.Div
            name="Label"
            style={{
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 32,
              letterSpacing: 2,
              color: GOLD,
              textTransform: "uppercase",
              marginBottom: 18,
              opacity: titleOpacity,
            }}
          >
            {label}
          </Interactive.Div>
        ) : null}

        <Interactive.Div
          name="Title"
          style={{
            fontFamily: serif,
            fontWeight: 800,
            fontSize: 76,
            lineHeight: 1.08,
            textAlign: "center",
            color: "#fff",
            whiteSpace: "pre-line",
            opacity: titleOpacity,
            translate: titleTranslate,
          }}
        >
          {title}
        </Interactive.Div>

        <Interactive.Div
          name="Subtitle"
          style={{
            fontFamily: sans,
            fontWeight: 400,
            fontSize: 34,
            textAlign: "center",
            color: "rgba(255,255,255,.75)",
            marginTop: 22,
            opacity: subOpacity,
          }}
        >
          {subtitle}
        </Interactive.Div>
      </AbsoluteFill>

      <AbsoluteFill
        name="AgencyBadge"
        style={{
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 130,
        }}
      >
        <div
          style={{
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: 1,
            color: "#fff",
            textTransform: "uppercase",
            opacity: badgeOpacity,
          }}
        >
          {agencyName}
        </div>
        <div
          style={{
            fontFamily: sans,
            fontWeight: 400,
            fontSize: 24,
            color: "rgba(255,255,255,.55)",
            opacity: badgeOpacity,
            marginTop: 6,
          }}
        >
          {agentName}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
