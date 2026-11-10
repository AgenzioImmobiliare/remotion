import { z } from "zod";
import {
  AbsoluteFill,
  CanvasImage,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadSans } from "@remotion/google-fonts/Inter";

const { fontFamily: serif } = loadSerif("normal", {
  weights: ["700"],
  subsets: ["latin"],
});
const { fontFamily: sans } = loadSans("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
});

export const RealEstateReelSchema = z.object({
  photoUrl: z.string(),
  price: z.string(),
  address: z.string(),
  comune: z.string(),
  agencyName: z.string(),
  agentName: z.string(),
});

type Props = z.infer<typeof RealEstateReelSchema>;

export const RealEstateReel: React.FC<Props> = ({
  photoUrl,
  price,
  address,
  comune,
  agencyName,
  agentName,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill name="RealEstateReel" style={{ backgroundColor: "#0F172A" }}>
      <CanvasImage
        src={photoUrl}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      <AbsoluteFill
        name="Overlay"
        style={{
          background:
            "linear-gradient(180deg, rgba(15,23,42,0) 32%, rgba(15,23,42,.55) 62%, rgba(15,23,42,.97) 100%)",
        }}
      />

      <Interactive.Div
        name="AgencyBadge"
        style={{
          position: "absolute",
          top: 110,
          left: 80,
          right: 80,
          fontFamily: sans,
          fontWeight: 700,
          fontSize: 36,
          letterSpacing: 2,
          color: "#D97706",
          textTransform: "uppercase",
          opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(
            frame,
            [0, 0.5 * fps],
            ["-30px 0px", "0px 0px"],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          ),
        }}
      >
        {agencyName}
      </Interactive.Div>

      <AbsoluteFill
        name="BottomContent"
        style={{
          justifyContent: "flex-end",
          alignItems: "flex-start",
          padding: "0 80px 140px",
        }}
      >
        <Interactive.Div
          name="Address"
          style={{
            fontFamily: sans,
            fontSize: 44,
            fontWeight: 600,
            color: "#fff",
            marginBottom: 24,
            opacity: interpolate(frame, [0.6 * fps, 1.2 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(
              frame,
              [0.6 * fps, 1.2 * fps],
              ["0px 20px", "0px 0px"],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
          }}
        >
          {address} · {comune}
        </Interactive.Div>

        <Interactive.Div
          name="PriceBadge"
          style={{
            display: "inline-flex",
            background: "linear-gradient(135deg, #D97706, #B45309)",
            borderRadius: 24,
            padding: "20px 40px",
            boxShadow: "0 20px 40px rgba(217,119,6,.35)",
            opacity: interpolate(frame, [1 * fps, 1.4 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            scale: interpolate(frame, [1 * fps, 1.6 * fps], [0.7, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 12 }),
              output: "perceptual-scale",
            }),
          }}
        >
          <div
            style={{
              fontFamily: serif,
              fontWeight: 700,
              fontSize: 84,
              lineHeight: 1,
              color: "#0F172A",
            }}
          >
            {price}
          </div>
        </Interactive.Div>

        <Interactive.Div
          name="AgentName"
          style={{
            fontFamily: sans,
            fontSize: 32,
            color: "rgba(255,255,255,.75)",
            marginTop: 28,
            opacity: interpolate(frame, [1.8 * fps, 2.3 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {agentName}
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
