import { Composition, staticFile } from "remotion";
import { MyComposition } from "./Composition";
import { RealEstateReel, RealEstateReelSchema } from "./RealEstateReel";
import { Bumper, BumperSchema } from "./Bumper";

const BUMPER_COMMON = {
  agencyName: "Frimm Capital Casa Paestum",
  agentName: "Enzo Carnicelli",
};

const BUMPERS: {
  id: string;
  variant: "just-listed" | "sold" | "open-house" | "price-drop" | "intro" | "outro";
  title: string;
  subtitle: string;
}[] = [
  {
    id: "BumperNuovoIncarico",
    variant: "just-listed",
    title: "Nuovo immobile\nsul mercato",
    subtitle: "Scopri tutti i dettagli",
  },
  {
    id: "BumperVenduto",
    variant: "sold",
    title: "Venduto",
    subtitle: "Un'altra famiglia a casa",
  },
  {
    id: "BumperOpenHouse",
    variant: "open-house",
    title: "Open House\nquesto weekend",
    subtitle: "Vieni a visitarlo senza impegno",
  },
  {
    id: "BumperPrezzoRibassato",
    variant: "price-drop",
    title: "Prezzo\nribassato",
    subtitle: "Occasione da non perdere",
  },
  {
    id: "BumperIntro",
    variant: "intro",
    title: "Frimm Capital\nCasa Paestum",
    subtitle: "Agropoli e il Cilento",
  },
  {
    id: "BumperOutro",
    variant: "outro",
    title: "Ti interessa?",
    subtitle: "Scrivici in DM o prenota una visita",
  },
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <Composition
        id="RealEstateReel"
        component={RealEstateReel}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        schema={RealEstateReelSchema}
        defaultProps={{
          photoUrl: staticFile("property-real.jpg"),
          price: "€ 185.000",
          address: "Via Roma 12",
          comune: "Agropoli",
          agencyName: "Frimm Capital Casa Paestum",
          agentName: "Enzo Carnicelli",
        }}
      />
      {BUMPERS.map((b) => (
        <Composition
          key={b.id}
          id={b.id}
          component={Bumper}
          durationInFrames={90}
          fps={30}
          width={1080}
          height={1920}
          schema={BumperSchema}
          defaultProps={{
            variant: b.variant,
            title: b.title,
            subtitle: b.subtitle,
            ...BUMPER_COMMON,
          }}
        />
      ))}
    </>
  );
};
