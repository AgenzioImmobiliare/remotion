import { z } from "zod";
import {
  AbsoluteFill,
  Audio,
  CanvasImage,
  Easing,
  Interactive,
  Sequence,
  interpolate,
  staticFile,
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

export const RealEstateReelMultiSchema = z.object({
  photos: z.array(z.string()).min(1).max(6),
  address: z.string(),
  comune: z.string(),
  price: z.string(),
  agencyName: z.string(),
  agentName: z.string(),
  phone: z.string().optional(),
  agentPhotoUrl: z.string().optional(),
});

type Props = z.infer<typeof RealEstateReelMultiSchema>;

const FPS = 30;
export const COVER_DURATION = 3 * FPS;
export const PHOTO_DURATION = 2.2 * FPS;
export const OUTRO_DURATION = 3.2 * FPS;
/** Le slide si sovrappongono di questi frame: la nuova dissolve in entrata
 * SOPRA la precedente (ancora piena), invece di sparire entrambe verso il
 * nero nello stesso istante. Un vero crossfade, non due dissolvenze separate. */
const OVERLAP = Math.round(0.3 * FPS);
/** Dissolvenza finale a nero, sugli ultimi istanti dell'intero video. */
const END_FADE = Math.round(0.4 * FPS);

export const durationForPhotoCount = (photoCount: number) => {
  const middleCount = Math.max(0, photoCount - 1);
  const transitions = middleCount + 1; // ogni slide dopo la copertina si sovrappone di OVERLAP
  return (
    COVER_DURATION +
    middleCount * PHOTO_DURATION +
    OUTRO_DURATION -
    transitions * OVERLAP
  );
};

export const calculateRealEstateReelMultiMetadata = ({
  props,
}: {
  props: Props;
}) => {
  return {
    durationInFrames: durationForPhotoCount(props.photos.length),
  };
};

/** Dissolvenza solo in entrata: la slide sale da 0 a 1 di opacità nei primi
 * OVERLAP frame (sovrapposti alla coda della slide precedente, ancora
 * piena sotto), poi resta piena fino alla fine — niente fade-out, ci pensa
 * la prossima slide a coprirla allo stesso modo. */
const useFadeIn = () => {
  const frame = useCurrentFrame();
  return interpolate(frame, [0, OVERLAP], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

/** Una foto con movimento Ken Burns: zoom e pan lenti per tutta la sua durata.
 * La direzione alterna per indice, così due foto di fila non si muovono
 * mai allo stesso modo. */
const KenBurnsPhoto: React.FC<{
  src: string;
  durationInFrames: number;
  index: number;
}> = ({ src, durationInFrames, index }) => {
  const frame = useCurrentFrame();
  const zoomIn = index % 2 === 0;
  const scale = interpolate(
    frame,
    [0, durationInFrames],
    zoomIn ? [1, 1.16] : [1.16, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.linear },
  );
  const panX = zoomIn ? [0, -22] : [22, 0];
  const panY = index % 4 < 2 ? [0, -16] : [0, 16];
  const tx = interpolate(frame, [0, durationInFrames], panX, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ty = interpolate(frame, [0, durationInFrames], panY, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill name="KenBurnsClip" style={{ overflow: "hidden" }}>
      <CanvasImage
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          scale,
          translate: `${tx}px ${ty}px`,
        }}
      />
    </AbsoluteFill>
  );
};

const AgencyWordmark: React.FC<{ agencyName: string }> = ({ agencyName }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 0.4 * FPS], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 90,
        left: 80,
        fontFamily: sans,
        fontWeight: 700,
        fontSize: 30,
        letterSpacing: 2,
        color: "#D97706",
        textTransform: "uppercase",
        opacity,
        textShadow: "0 2px 10px rgba(0,0,0,.45)",
      }}
    >
      {agencyName}
    </div>
  );
};

const CoverSlide: React.FC<{
  photoUrl: string;
  address: string;
  comune: string;
  price: string;
  agencyName: string;
}> = ({ photoUrl, address, comune, price, agencyName }) => {
  const frame = useCurrentFrame();
  const opacity = useFadeIn();

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY, opacity }}>
      <KenBurnsPhoto src={photoUrl} durationInFrames={COVER_DURATION} index={0} />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(15,23,42,0) 32%, rgba(15,23,42,.55) 62%, rgba(15,23,42,.97) 100%)",
        }}
      />
      <AgencyWordmark agencyName={agencyName} />
      <AbsoluteFill
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
            opacity: interpolate(frame, [0.6 * FPS, 1.2 * FPS], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(
              frame,
              [0.6 * FPS, 1.2 * FPS],
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
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
            borderRadius: 24,
            padding: "20px 40px",
            boxShadow: "0 20px 40px rgba(217,119,6,.35)",
            opacity: interpolate(frame, [1 * FPS, 1.4 * FPS], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            scale: interpolate(frame, [1 * FPS, 1.6 * FPS], [0.7, 1], {
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
              color: NAVY,
            }}
          >
            {price}
          </div>
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const PhotoSlide: React.FC<{
  photoUrl: string;
  index: number;
  agencyName: string;
}> = ({ photoUrl, index, agencyName }) => {
  const opacity = useFadeIn();
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY, opacity }}>
      <KenBurnsPhoto
        src={photoUrl}
        durationInFrames={PHOTO_DURATION}
        index={index}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(15,23,42,.45) 0%, rgba(15,23,42,0) 22%, rgba(15,23,42,0) 78%, rgba(15,23,42,.55) 100%)",
        }}
      />
      <AgencyWordmark agencyName={agencyName} />
    </AbsoluteFill>
  );
};

const OutroSlide: React.FC<{
  agencyName: string;
  agentName: string;
  phone?: string;
  agentPhotoUrl?: string;
}> = ({ agencyName, agentName, phone, agentPhotoUrl }) => {
  const frame = useCurrentFrame();
  const opacity = useFadeIn();

  const ringScale = interpolate(frame, [0, 0.9 * FPS], [0.4, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.spring({ damping: 11 }),
    output: "perceptual-scale",
  });
  const ringOpacity = interpolate(frame, [0, 0.4 * FPS], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleOpacity = interpolate(frame, [0.5 * FPS, 1 * FPS], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const badgeOpacity = interpolate(frame, [1.3 * FPS, 1.8 * FPS], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const phoneOpacity = interpolate(frame, [1.7 * FPS, 2.2 * FPS], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.spring({ damping: 14 }),
  });

  const initials = agentName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${NAVY2} 0%, ${NAVY} 55%)`,
        opacity,
      }}
    >
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          opacity: ringOpacity,
          transform: "translateY(-260px)",
        }}
      >
        <div
          style={{
            width: 440,
            height: 440,
            borderRadius: "50%",
            border: "2px solid rgba(217,119,6,.35)",
            scale: ringScale,
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: "translateY(-260px)",
          opacity: ringOpacity,
        }}
      >
        {agentPhotoUrl ? (
          <CanvasImage
            src={agentPhotoUrl}
            style={{
              width: 150,
              height: 150,
              borderRadius: "50%",
              objectFit: "cover",
              boxShadow: "0 20px 50px rgba(217,119,6,.4)",
              scale: ringScale,
            }}
          />
        ) : (
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
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 54,
              color: NAVY,
            }}
          >
            {initials}
          </div>
        )}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          padding: "0 90px",
        }}
      >
        <Interactive.Div
          name="Title"
          style={{
            fontFamily: serif,
            fontWeight: 800,
            fontSize: 72,
            lineHeight: 1.08,
            textAlign: "center",
            color: "#fff",
            opacity: titleOpacity,
          }}
        >
          Ti interessa?
        </Interactive.Div>
        <Interactive.Div
          name="Subtitle"
          style={{
            fontFamily: sans,
            fontWeight: 400,
            fontSize: 32,
            textAlign: "center",
            color: "rgba(255,255,255,.75)",
            marginTop: 20,
            opacity: titleOpacity,
          }}
        >
          Scrivici in DM o prenota una visita
        </Interactive.Div>

        {phone ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              marginTop: 40,
              padding: "16px 34px",
              borderRadius: 999,
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(217,119,6,.5)",
              opacity: phoneOpacity,
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke={GOLD}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
            </svg>
            <div
              style={{
                fontFamily: sans,
                fontWeight: 700,
                fontSize: 36,
                color: "#fff",
                letterSpacing: 0.5,
              }}
            >
              {phone}
            </div>
          </div>
        ) : null}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 110,
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

export const RealEstateReelMulti: React.FC<Props> = ({
  photos,
  address,
  comune,
  price,
  agencyName,
  agentName,
  phone,
  agentPhotoUrl,
}) => {
  const { durationInFrames } = useVideoConfig();

  // Ogni slide dopo la prima inizia OVERLAP frame prima che la precedente
  // finisca "nominalmente": essendo dopo nel JSX, si disegna sopra e la
  // copre dissolvendo in entrata, un vero crossfade senza mai scendere al nero.
  const coverFrom = 0;
  let cursor = COVER_DURATION;

  const middlePhotos = photos.slice(1);
  const middleSequences = middlePhotos.map((url, i) => {
    const from = cursor - OVERLAP;
    cursor = from + PHOTO_DURATION;
    return { url, from, index: i + 1 };
  });

  const outroFrom = cursor - OVERLAP;

  return (
    <AbsoluteFill name="RealEstateReelMulti" style={{ backgroundColor: NAVY }}>
      <Audio src={staticFile("music-ambient.mp3")} loop volume={0.35} />

      <Sequence from={coverFrom} durationInFrames={COVER_DURATION} layout="none">
        <CoverSlide
          photoUrl={photos[0]}
          address={address}
          comune={comune}
          price={price}
          agencyName={agencyName}
        />
      </Sequence>

      {middleSequences.map(({ url, from, index }) => (
        <Sequence
          key={index}
          from={from}
          durationInFrames={PHOTO_DURATION}
          layout="none"
        >
          <PhotoSlide photoUrl={url} index={index} agencyName={agencyName} />
        </Sequence>
      ))}

      <Sequence from={outroFrom} durationInFrames={OUTRO_DURATION} layout="none">
        <OutroSlide
          agencyName={agencyName}
          agentName={agentName}
          phone={phone}
          agentPhotoUrl={agentPhotoUrl}
        />
      </Sequence>

      <EndFade durationInFrames={durationInFrames} />
    </AbsoluteFill>
  );
};

/** Dissolvenza a nero sugli ultimi istanti, così il video non si taglia di netto. */
const EndFade: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [durationInFrames - END_FADE, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill
      style={{ backgroundColor: NAVY, opacity, pointerEvents: "none" }}
    />
  );
};
