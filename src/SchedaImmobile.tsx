import { z } from "zod";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadSans } from "@remotion/google-fonts/Inter";

const { fontFamily: sans } = loadSans("normal", {
  weights: ["400", "600", "700", "800"],
  subsets: ["latin"],
});

const ORANGE = "#D97706";
const ORANGE2 = "#EA7B0A";

export const SchedaImmobileSchema = z.object({
  comune: z.string(),
  tipo: z.string(),
  stato: z.string(),
  price: z.string(),
  mq: z.string().optional(),
  locali: z.string().optional(),
  bagni: z.string().optional(),
  /** Classe energetica (es. "C"): va messa solo se verificata, mai inventata. */
  classeEnergetica: z.string().optional(),
});

type Props = z.infer<typeof SchedaImmobileSchema>;

const FPS = 30;

/** Scheda dati immobile a schermo intero: stesso stile dell'esempio allegato
 * (sfondo scuro con vigenetta calda, titolo comune, prezzo enorme, card
 * con superficie/locali/bagni e, quando nota, la classe energetica). */
export const SchedaImmobile: React.FC<Props> = ({
  comune,
  tipo,
  stato,
  price,
  mq,
  locali,
  bagni,
  classeEnergetica,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 0.45 * FPS], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const headerY = interpolate(frame, [0, 0.45 * FPS], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const priceOpacity = interpolate(frame, [0.45 * FPS, 0.9 * FPS], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const priceScale = interpolate(frame, [0.45 * FPS, 1.05 * FPS], [0.85, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.spring({ damping: 13 }),
    output: "perceptual-scale",
  });

  const cards: {
    icon: React.ReactNode;
    value: string;
    label: string;
    highlight?: boolean;
    extra?: React.ReactNode;
  }[] = [];
  if (mq)
    cards.push({
      icon: (
        <path d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
      ),
      value: `${mq} m²`,
      label: "superficie",
    });
  if (locali)
    cards.push({
      icon: (
        <>
          <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
          <path d="M5 12V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
          <path d="M2 18h20" />
        </>
      ),
      value: locali,
      label: "locali",
    });
  if (bagni)
    cards.push({
      icon: (
        <>
          <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z" />
          <path d="M6 12V6a2 2 0 0 1 3.2-1.6" />
          <path d="M4 19v2M18 19v2" />
        </>
      ),
      value: bagni,
      label: "bagni",
    });
  if (classeEnergetica)
    cards.push({
      icon: null,
      value: classeEnergetica,
      label: "",
      highlight: true,
      extra: (
        <div
          style={{
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 24,
            color: "#fff",
            lineHeight: 1.15,
          }}
        >
          Classe
          <br />
          energetica
        </div>
      ),
    });

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse 70% 55% at 50% 32%, #3A2212 0%, #1C1007 55%, #0E0906 100%)",
      }}
    >
      <AbsoluteFill style={{ padding: "0 90px", justifyContent: "flex-start" }}>
        <div style={{ height: "35vh" }} />

        <Interactive.Div
          name="Header"
          style={{
            opacity: headerOpacity,
            translate: `0px ${headerY}px`,
          }}
        >
          <div
            style={{
              fontFamily: sans,
              fontWeight: 800,
              fontSize: 68,
              letterSpacing: 1,
              color: "#fff",
              textTransform: "uppercase",
              lineHeight: 1.05,
            }}
          >
            {comune}
          </div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 32,
              color: ORANGE2,
              marginTop: 6,
            }}
          >
            {tipo} · {stato}
          </div>
          <div
            style={{
              width: 310,
              height: 3,
              background: ORANGE,
              marginTop: 22,
              borderRadius: 2,
            }}
          />
        </Interactive.Div>

        <Interactive.Div
          name="Price"
          style={{
            fontFamily: sans,
            fontWeight: 800,
            fontSize: 90,
            color: "#fff",
            marginTop: 30,
            opacity: priceOpacity,
            scale: priceScale,
          }}
        >
          {price}
        </Interactive.Div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
            marginTop: 46,
            maxWidth: 900,
          }}
        >
          {cards.map((c, i) => {
            const start = 1.1 * FPS + i * 0.12 * FPS;
            const op = interpolate(frame, [start, start + 0.4 * FPS], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const ty = interpolate(
              frame,
              [start, start + 0.4 * FPS],
              [16, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            return (
              <div
                key={i}
                style={{
                  background: c.highlight
                    ? `linear-gradient(135deg, ${ORANGE}, ${ORANGE2})`
                    : "rgba(255,255,255,.07)",
                  borderRadius: 18,
                  padding: "22px 24px",
                  opacity: op,
                  translate: `0px ${ty}px`,
                  display: c.extra ? "flex" : "block",
                  alignItems: c.extra ? "center" : undefined,
                  gap: c.extra ? 16 : undefined,
                }}
              >
                {c.icon ? (
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={ORANGE}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ display: "block", marginBottom: 14 }}
                  >
                    {c.icon}
                  </svg>
                ) : null}
                {c.highlight ? (
                  <div
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: "50%",
                      background: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontFamily: sans,
                      fontWeight: 800,
                      fontSize: 32,
                      color: ORANGE,
                    }}
                  >
                    {c.value}
                  </div>
                ) : (
                  <div
                    style={{
                      fontFamily: sans,
                      fontWeight: 800,
                      fontSize: 38,
                      color: "#fff",
                      lineHeight: 1.1,
                    }}
                  >
                    {c.value}
                  </div>
                )}
                {c.extra ? (
                  c.extra
                ) : c.label ? (
                  <div
                    style={{
                      fontFamily: sans,
                      fontWeight: 600,
                      fontSize: 20,
                      color: "rgba(255,255,255,.55)",
                      marginTop: 6,
                    }}
                  >
                    {c.label}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <EndFade durationInFrames={durationInFrames} />
    </AbsoluteFill>
  );
};

const EndFade: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [durationInFrames - 0.5 * FPS, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill
      style={{ backgroundColor: "#0E0906", opacity, pointerEvents: "none" }}
    />
  );
};
