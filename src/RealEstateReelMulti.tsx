import { z } from "zod";
import {
  AbsoluteFill,
  Audio,
  CanvasImage,
  Easing,
  Interactive,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadSans } from "@remotion/google-fonts/Inter";
import { SchedaImmobile } from "./SchedaImmobile";

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
  /** Copertina (primo elemento, sempre una foto) + contenuti intermedi: foto
   * o clip video, in qualunque ordine — una clip si riconosce dall'estensione
   * del file (.mp4/.mov/.webm/.m4v) e riproduce semplicemente il proprio
   * video (senza Ken Burns), per secondsPerClip secondi. */
  photos: z.array(z.string()).min(1).max(14),
  address: z.string(),
  comune: z.string(),
  price: z.string(),
  agencyName: z.string(),
  agentName: z.string(),
  /** Es. "Consulente immobiliare": mostrato sotto il nome nel finale. */
  agentRole: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  /** Testo da mostrare per Instagram, es. "lecasedallaaalloz.io" (senza @ o URL). */
  instagramHandle: z.string().optional(),
  /** Nome pagina Facebook da mostrare, es. "Immobiliare.Agropoli". */
  facebookPage: z.string().optional(),
  agentPhotoUrl: z.string().optional(),
  /** PNG trasparente del logo agenzia: se presente sostituisce la scritta
   * testuale "AgencyWordmark" in copertina/foto e nel finale. */
  agencyLogoUrl: z.string().optional(),
  /** Scheda dati a schermo intero (stile scuro/arancio), inserita subito
   * dopo la copertina quando "tipo" è presente: comune e price arrivano
   * dai campi già esistenti qui sopra. */
  tipo: z.string().optional(),
  stato: z.string().optional(),
  mq: z.string().optional(),
  locali: z.string().optional(),
  bagni: z.string().optional(),
  classeEnergetica: z.string().optional(),
  /** Musica di sottofondo (loop): se omessa usa music-ambient.mp3. */
  musicUrl: z.string().optional(),
  /** Angolo del watermark agenzia su copertina e foto (default: in alto a sinistra). */
  logoPosition: z
    .enum(["top-left", "top-right", "bottom-left", "bottom-right"])
    .optional(),
  /** Altezza in px del logo/watermark (default 64). */
  logoSize: z.number().optional(),
  /** Durata di ogni foto intermedia, in secondi (default 2.2s). */
  secondsPerPhoto: z.number().optional(),
  /** Testo/grafica da mostrare su una foto o clip intermedia specifica — non
   * tutte devono averne una, e vanno scelte diverse per ciascuna così da non
   * ripetere le stesse informazioni. "index" è 0-based sugli elementi dopo
   * la copertina (photos.slice(1)): 0 = il primo elemento dopo la copertina.
   * kind "location" disegna un'icona a spillo animata + il testo (pensata
   * per "comune"); kind "label" (default) è solo testo. */
  clipCallouts: z
    .array(
      z.object({
        index: z.number(),
        text: z.string(),
        kind: z.enum(["label", "location"]).optional(),
      }),
    )
    .optional(),
  /** Durata di ogni clip video intermedia, in secondi (default 3.5s). */
  secondsPerClip: z.number().optional(),
});

type Props = z.infer<typeof RealEstateReelMultiSchema>;

const FPS = 30;
export const COVER_DURATION = 3 * FPS;
export const SCHEDA_DURATION = 5 * FPS;
export const PHOTO_DURATION = 2.2 * FPS;
export const CLIP_DURATION = 3.5 * FPS;
export const OUTRO_DURATION = 4.8 * FPS;
/** Le slide si sovrappongono di questi frame: la nuova dissolve in entrata
 * SOPRA la precedente (ancora piena), invece di sparire entrambe verso il
 * nero nello stesso istante. Un vero crossfade, non due dissolvenze separate. */
const OVERLAP = Math.round(0.3 * FPS);
/** Dissolvenza finale a nero, sugli ultimi istanti dell'intero video. */
const END_FADE = Math.round(0.4 * FPS);

/** Una clip video si riconosce dall'estensione del file nell'URL, o dal
 * mime type quando è un data URI (usato nei render da CLI, dove un path
 * tipo "/clip.mp4" passato via --props risulta 404: si incorpora il file
 * come base64, che non ha estensione nell'URL). */
export const isVideoUrl = (url: string) =>
  /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(url) || /^data:video\//i.test(url);

const middleItemDuration = (
  url: string,
  photoDuration: number,
  clipDuration: number,
) => (isVideoUrl(url) ? clipDuration : photoDuration);

export const durationForPhotos = (
  photos: string[],
  hasScheda = false,
  photoDuration = PHOTO_DURATION,
  clipDuration = CLIP_DURATION,
) => {
  const middle = photos.slice(1);
  const schedaCount = hasScheda ? 1 : 0;
  const transitions = middle.length + schedaCount + 1; // ogni slide dopo la copertina si sovrappone di OVERLAP
  const middleTotal = middle.reduce(
    (sum, url) => sum + middleItemDuration(url, photoDuration, clipDuration),
    0,
  );
  return (
    COVER_DURATION +
    schedaCount * SCHEDA_DURATION +
    middleTotal +
    OUTRO_DURATION -
    transitions * OVERLAP
  );
};

export const calculateRealEstateReelMultiMetadata = ({
  props,
}: {
  props: Props;
}) => {
  const photoDuration = props.secondsPerPhoto
    ? Math.round(props.secondsPerPhoto * FPS)
    : PHOTO_DURATION;
  const clipDuration = props.secondsPerClip
    ? Math.round(props.secondsPerClip * FPS)
    : CLIP_DURATION;
  return {
    durationInFrames: durationForPhotos(
      props.photos,
      Boolean(props.tipo),
      photoDuration,
      clipDuration,
    ),
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

type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const logoPositionStyle = (position: LogoPosition = "top-left") => {
  const edge = 80;
  const style: React.CSSProperties = { position: "absolute" };
  if (position === "top-left") {
    style.top = edge;
    style.left = edge;
  } else if (position === "top-right") {
    style.top = edge;
    style.right = edge;
  } else if (position === "bottom-left") {
    style.bottom = edge;
    style.left = edge;
  } else {
    style.bottom = edge;
    style.right = edge;
  }
  return style;
};

const AgencyWordmark: React.FC<{
  agencyName: string;
  agencyLogoUrl?: string;
  logoPosition?: LogoPosition;
  logoSize?: number;
}> = ({ agencyName, agencyLogoUrl, logoPosition = "top-left", logoSize = 64 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 0.4 * FPS], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (agencyLogoUrl) {
    return (
      <div
        style={{
          ...logoPositionStyle(logoPosition),
          opacity,
          filter: "drop-shadow(0 2px 10px rgba(0,0,0,.45))",
        }}
      >
        <CanvasImage
          src={agencyLogoUrl}
          style={{ height: logoSize, width: "auto", objectFit: "contain" }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        ...logoPositionStyle(logoPosition),
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

/** Spillo di localizzazione (stile "map pin"), usato dal callout kind="location". */
const PinIcon: React.FC = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill={GOLD} stroke="none">
    <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
  </svg>
);

export type Callout = { text: string; kind?: "label" | "location" };

/** Testo/icona mostrati sopra una foto o clip intermedia, in alto (zona già
 * scurita dal gradiente), per dare informazioni reali diverse da una slide
 * all'altra senza ripetere sempre la stessa cosa. "location" aggiunge uno
 * spillo animato (cade dall'alto con un rimbalzo) e un anello che pulsa
 * piano sotto di esso — pensato per mostrare il comune dove si trova
 * l'immobile. "label" è solo testo, con un ingresso più sobrio. */
const CalloutBadge: React.FC<{ callout: Callout }> = ({ callout }) => {
  const { text, kind = "label" } = callout;
  const frame = useCurrentFrame();

  if (kind === "location") {
    const bounceIn = interpolate(frame, [0, 0.7 * FPS], [-60, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    });
    const opacity = interpolate(frame, [0, 0.3 * FPS], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    // Anello che pulsa con un ciclo continuo (loop via modulo sul frame),
    // sotto lo spillo — un piccolo "ping" di localizzazione.
    const cycle = 1.6 * FPS;
    const t = frame % cycle;
    const ringScale = interpolate(t, [0, cycle], [0.5, 1.6], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const ringOpacity =
      interpolate(t, [0, cycle], [0.5, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
      opacity;

    return (
      <div
        style={{
          position: "absolute",
          top: 190,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
          opacity,
          translate: `0px ${bounceIn}px`,
        }}
      >
        <div style={{ position: "relative", width: 30, height: 30 }}>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 30,
              height: 30,
              marginLeft: -15,
              marginTop: -15,
              borderRadius: "50%",
              border: `2px solid ${GOLD}`,
              opacity: ringOpacity,
              scale: ringScale,
            }}
          />
          <PinIcon />
        </div>
        <div
          style={{
            fontFamily: serif,
            fontWeight: 800,
            fontSize: 42,
            color: "#fff",
            textShadow: "0 2px 12px rgba(0,0,0,.5)",
          }}
        >
          {text}
        </div>
      </div>
    );
  }

  const slideY = interpolate(frame, [0, 0.4 * FPS], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const opacity = interpolate(frame, [0, 0.35 * FPS], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 190,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity,
        translate: `0px ${slideY}px`,
      }}
    >
      <div
        style={{
          fontFamily: sans,
          fontWeight: 700,
          fontSize: 38,
          color: "#fff",
          textShadow: "0 2px 12px rgba(0,0,0,.5)",
          textAlign: "center",
          padding: "0 90px",
        }}
      >
        {text}
      </div>
    </div>
  );
};

const CoverSlide: React.FC<{
  photoUrl: string;
  address: string;
  comune: string;
  price: string;
  agencyName: string;
  agencyLogoUrl?: string;
  logoPosition?: LogoPosition;
  logoSize?: number;
}> = ({
  photoUrl,
  address,
  comune,
  price,
  agencyName,
  agencyLogoUrl,
  logoPosition,
  logoSize,
}) => {
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
      <AgencyWordmark
        agencyName={agencyName}
        agencyLogoUrl={agencyLogoUrl}
        logoPosition={logoPosition}
        logoSize={logoSize}
      />
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
  agencyLogoUrl?: string;
  logoPosition?: LogoPosition;
  logoSize?: number;
  durationInFrames?: number;
  callout?: Callout;
}> = ({
  photoUrl,
  index,
  agencyName,
  agencyLogoUrl,
  logoPosition,
  logoSize,
  durationInFrames = PHOTO_DURATION,
  callout,
}) => {
  const opacity = useFadeIn();
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY, opacity }}>
      <KenBurnsPhoto
        src={photoUrl}
        durationInFrames={durationInFrames}
        index={index}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(15,23,42,.45) 0%, rgba(15,23,42,0) 22%, rgba(15,23,42,0) 78%, rgba(15,23,42,.55) 100%)",
        }}
      />
      {callout ? <CalloutBadge callout={callout} /> : null}
      <AgencyWordmark
        agencyName={agencyName}
        agencyLogoUrl={agencyLogoUrl}
        logoPosition={logoPosition}
        logoSize={logoSize}
      />
    </AbsoluteFill>
  );
};

/** Una clip video al posto di una foto: riproduce semplicemente il proprio
 * video (muto, niente Ken Burns) per tutta la durata dello slot — essendo
 * dentro un Sequence di quella durata, se il file è più lungo viene troncato
 * lì, se è più corto resta fermo sull'ultimo fotogramma fino al cambio slide. */
const ClipSlide: React.FC<{
  clipUrl: string;
  agencyName: string;
  agencyLogoUrl?: string;
  logoPosition?: LogoPosition;
  logoSize?: number;
  index: number;
  durationInFrames: number;
  callout?: Callout;
}> = ({
  clipUrl,
  agencyName,
  agencyLogoUrl,
  logoPosition,
  logoSize,
  index,
  durationInFrames,
  callout,
}) => {
  const frame = useCurrentFrame();
  const opacity = useFadeIn();

  // Stessa idea del Ken Burns sulle foto, applicata al video: uno zoom lento
  // e continuo (mai una clip perfettamente ferma), direzione alternata per
  // indice così due clip di fila non si muovono allo stesso modo.
  const zoomIn = index % 2 === 0;
  const scale = interpolate(
    frame,
    [0, durationInFrames],
    zoomIn ? [1, 1.08] : [1.08, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.linear },
  );

  // Linea d'accento che entra da sinistra sopra il video, un piccolo tocco di
  // motion graphic oltre al solo watermark — non un testo, così non ripete
  // informazioni tra una clip e l'altra.
  const accentWidth = interpolate(frame, [0, 0.6 * FPS], [0, 140], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY, opacity }}>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <OffthreadVideo
          src={clipUrl}
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            scale,
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(15,23,42,.45) 0%, rgba(15,23,42,0) 22%, rgba(15,23,42,0) 78%, rgba(15,23,42,.55) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 80,
          bottom: 70,
          width: accentWidth,
          height: 6,
          borderRadius: 3,
          background: `linear-gradient(90deg, ${GOLD}, ${GOLD2})`,
        }}
      />
      {callout ? <CalloutBadge callout={callout} /> : null}
      <AgencyWordmark
        agencyName={agencyName}
        agencyLogoUrl={agencyLogoUrl}
        logoPosition={logoPosition}
        logoSize={logoSize}
      />
    </AbsoluteFill>
  );
};

/** Avvolge SchedaImmobile con lo stesso fade-in a sovrapposizione delle
 * altre slide, così si inserisce nel Reel senza stacchi. */
const SchedaSlide: React.FC<{
  comune: string;
  tipo: string;
  stato: string;
  price: string;
  mq?: string;
  locali?: string;
  bagni?: string;
  classeEnergetica?: string;
}> = (props) => {
  const opacity = useFadeIn();
  return (
    <AbsoluteFill style={{ opacity }}>
      <SchedaImmobile
        {...props}
        durationInFramesOverride={SCHEDA_DURATION}
        fadeOutAtEnd={false}
      />
    </AbsoluteFill>
  );
};

/** Icone minime (stroke oro) per i contatti nel finale — stesso tratto dello
 * SVG telefono già in uso, solo altri path. */
const ContactIcon: React.FC<{ kind: "phone" | "mail" | "instagram" | "facebook" }> = ({
  kind,
}) => {
  const common = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: GOLD,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "phone") {
    return (
      <svg {...common}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
      </svg>
    );
  }
  if (kind === "mail") {
    return (
      <svg {...common}>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Z M2 6l10 7 10-7" />
      </svg>
    );
  }
  if (kind === "instagram") {
    return (
      <svg {...common}>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z" />
        <path d="M17.5 6.5h.01" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3Z" />
    </svg>
  );
};

/** Riga di contatti: telefono, email, Instagram, Facebook — solo quelli dati
 * (mai inventati), impilati e con entrata leggermente scaglionata. */
const ContactStack: React.FC<{
  phone?: string;
  email?: string;
  instagramHandle?: string;
  facebookPage?: string;
  baseOpacity: number;
  frame: number;
}> = ({ phone, email, instagramHandle, facebookPage, baseOpacity, frame }) => {
  const rows: { kind: "phone" | "mail" | "instagram" | "facebook"; text: string }[] = [
    phone ? { kind: "phone", text: phone } : null,
    email ? { kind: "mail", text: email } : null,
    instagramHandle ? { kind: "instagram", text: instagramHandle } : null,
    facebookPage ? { kind: "facebook", text: facebookPage } : null,
  ].filter((r): r is { kind: "phone" | "mail" | "instagram" | "facebook"; text: string } => r !== null);

  if (!rows.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 36 }}>
      {rows.map((r, i) => {
        const rowOpacity =
          baseOpacity *
          interpolate(frame, [1.7 * FPS + i * 0.2 * FPS, 2.1 * FPS + i * 0.2 * FPS], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
        return (
          <div
            key={r.kind}
            style={{ display: "flex", alignItems: "center", gap: 14, opacity: rowOpacity }}
          >
            <div style={{ flexShrink: 0 }}>
              <ContactIcon kind={r.kind} />
            </div>
            <div
              style={{
                fontFamily: sans,
                fontWeight: 600,
                fontSize: 28,
                color: "#fff",
                letterSpacing: 0.2,
                overflowWrap: "anywhere",
                minWidth: 0,
              }}
            >
              {r.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const OutroSlide: React.FC<{
  agencyName: string;
  agentName: string;
  agentRole?: string;
  phone?: string;
  email?: string;
  instagramHandle?: string;
  facebookPage?: string;
  agentPhotoUrl?: string;
  agencyLogoUrl?: string;
  logoSize?: number;
}> = ({
  agencyName,
  agentName,
  agentRole,
  phone,
  email,
  instagramHandle,
  facebookPage,
  agentPhotoUrl,
  agencyLogoUrl,
  logoSize = 52,
}) => {
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
  const initials = agentName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const heroY = interpolate(frame, [0, 0.8 * FPS], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const heroOpacity = interpolate(frame, [0, 0.6 * FPS], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Una foto vera dell'agente è quasi sempre un ritaglio a figura intera (sfondo
  // tolto): schiacciarla nel cerchietto pensato per un primo piano la rendeva
  // minuscola e irriconoscibile. Con la foto, il layout diventa "a due zone":
  // testo e contatti a sinistra, agente a figura intera e grande a destra.
  if (agentPhotoUrl) {
    return (
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${NAVY2} 0%, ${NAVY} 55%)`,
          opacity,
        }}
      >
        <AbsoluteFill
          style={{
            alignItems: "flex-end",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              position: "relative",
              width: 560,
              height: 1550,
              flexShrink: 0,
              opacity: heroOpacity,
              translate: `0px ${heroY}px`,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 260,
                width: 620,
                height: 620,
                marginLeft: -310,
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(217,119,6,.28) 0%, rgba(217,119,6,0) 70%)`,
              }}
            />
            <CanvasImage
              src={agentPhotoUrl}
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "bottom",
              }}
            />
          </div>
        </AbsoluteFill>

        <AbsoluteFill style={{ padding: "150px 0 110px 80px", justifyContent: "flex-start" }}>
          <div style={{ maxWidth: 470 }}>
            <Interactive.Div
              name="Title"
              style={{
                fontFamily: serif,
                fontWeight: 800,
                fontSize: 68,
                lineHeight: 1.1,
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
                fontSize: 30,
                color: "rgba(255,255,255,.75)",
                marginTop: 18,
              }}
            >
              Scrivici in DM o prenota una visita
            </Interactive.Div>
            <ContactStack
              phone={phone}
              email={email}
              instagramHandle={instagramHandle}
              facebookPage={facebookPage}
              baseOpacity={1}
              frame={frame}
            />
          </div>

          <div style={{ flex: 1 }} />

          {agencyLogoUrl ? (
            <CanvasImage
              src={agencyLogoUrl}
              style={{
                height: logoSize,
                width: "auto",
                objectFit: "contain",
                opacity: badgeOpacity,
                marginBottom: 10,
              }}
            />
          ) : (
            <div
              style={{
                fontFamily: sans,
                fontWeight: 700,
                fontSize: 26,
                letterSpacing: 1,
                color: "#fff",
                textTransform: "uppercase",
                opacity: badgeOpacity,
              }}
            >
              {agencyName}
            </div>
          )}
          <div
            style={{
              fontFamily: sans,
              fontWeight: 400,
              fontSize: 22,
              color: "rgba(255,255,255,.55)",
              opacity: badgeOpacity,
              marginTop: 6,
            }}
          >
            {agentName}
            {agentRole ? ` · ${agentRole}` : ""}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

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

        <ContactStack
          phone={phone}
          email={email}
          instagramHandle={instagramHandle}
          facebookPage={facebookPage}
          baseOpacity={1}
          frame={frame}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 110,
        }}
      >
        {agencyLogoUrl ? (
          <CanvasImage
            src={agencyLogoUrl}
            style={{
              height: logoSize + 4,
              width: "auto",
              objectFit: "contain",
              opacity: badgeOpacity,
              marginBottom: 10,
            }}
          />
        ) : (
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
        )}
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
          {agentRole ? ` · ${agentRole}` : ""}
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
  agentRole,
  phone,
  email,
  instagramHandle,
  facebookPage,
  agentPhotoUrl,
  agencyLogoUrl,
  tipo,
  stato,
  mq,
  locali,
  bagni,
  classeEnergetica,
  musicUrl,
  logoPosition,
  logoSize,
  secondsPerPhoto,
  secondsPerClip,
  clipCallouts,
}) => {
  const { durationInFrames } = useVideoConfig();
  const hasScheda = Boolean(tipo);
  const photoDuration = secondsPerPhoto
    ? Math.round(secondsPerPhoto * FPS)
    : PHOTO_DURATION;
  const clipDuration = secondsPerClip
    ? Math.round(secondsPerClip * FPS)
    : CLIP_DURATION;

  // Ogni slide dopo la prima inizia OVERLAP frame prima che la precedente
  // finisca "nominalmente": essendo dopo nel JSX, si disegna sopra e la
  // copre dissolvendo in entrata, un vero crossfade senza mai scendere al nero.
  const coverFrom = 0;
  let cursor = COVER_DURATION;

  const schedaFrom = hasScheda ? cursor - OVERLAP : null;
  if (hasScheda) cursor = (schedaFrom as number) + SCHEDA_DURATION;

  const calloutByIndex = new Map<number, Callout>(
    (clipCallouts ?? []).map((c) => [c.index, { text: c.text, kind: c.kind }]),
  );

  const middlePhotos = photos.slice(1);
  const middleSequences = middlePhotos.map((url, i) => {
    const video = isVideoUrl(url);
    const itemDuration = video ? clipDuration : photoDuration;
    const from = cursor - OVERLAP;
    cursor = from + itemDuration;
    return { url, from, index: i + 1, video, itemDuration, callout: calloutByIndex.get(i) };
  });

  const outroFrom = cursor - OVERLAP;

  return (
    <AbsoluteFill name="RealEstateReelMulti" style={{ backgroundColor: NAVY }}>
      <Audio
        src={musicUrl ?? staticFile("music-ambient.mp3")}
        loop
        volume={0.35}
      />

      <Sequence from={coverFrom} durationInFrames={COVER_DURATION} layout="none">
        <CoverSlide
          photoUrl={photos[0]}
          address={address}
          comune={comune}
          price={price}
          agencyName={agencyName}
          agencyLogoUrl={agencyLogoUrl}
          logoPosition={logoPosition}
          logoSize={logoSize}
        />
      </Sequence>

      {hasScheda ? (
        <Sequence
          from={schedaFrom as number}
          durationInFrames={SCHEDA_DURATION}
          layout="none"
        >
          <SchedaSlide
            comune={comune}
            tipo={tipo as string}
            stato={stato || "In vendita"}
            price={price}
            mq={mq}
            locali={locali}
            bagni={bagni}
            classeEnergetica={classeEnergetica}
          />
        </Sequence>
      ) : null}

      {middleSequences.map(({ url, from, index, video, itemDuration, callout }) => (
        <Sequence
          key={index}
          from={from}
          durationInFrames={itemDuration}
          layout="none"
        >
          {video ? (
            <ClipSlide
              clipUrl={url}
              agencyName={agencyName}
              agencyLogoUrl={agencyLogoUrl}
              logoPosition={logoPosition}
              logoSize={logoSize}
              index={index}
              durationInFrames={itemDuration}
              callout={callout}
            />
          ) : (
            <PhotoSlide
              photoUrl={url}
              index={index}
              agencyName={agencyName}
              agencyLogoUrl={agencyLogoUrl}
              logoPosition={logoPosition}
              logoSize={logoSize}
              durationInFrames={itemDuration}
              callout={callout}
            />
          )}
        </Sequence>
      ))}

      <Sequence from={outroFrom} durationInFrames={OUTRO_DURATION} layout="none">
        <OutroSlide
          agencyName={agencyName}
          agentName={agentName}
          agentRole={agentRole}
          phone={phone}
          email={email}
          instagramHandle={instagramHandle}
          facebookPage={facebookPage}
          agentPhotoUrl={agentPhotoUrl}
          agencyLogoUrl={agencyLogoUrl}
          logoSize={logoSize}
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
