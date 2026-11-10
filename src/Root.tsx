import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { RealEstateReel, RealEstateReelSchema } from "./RealEstateReel";

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
          photoUrl:
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1600",
          price: "€ 185.000",
          address: "Via Roma 12",
          comune: "Agropoli",
          agencyName: "Frimm Capital Casa Paestum",
          agentName: "Enzo Carnicelli",
        }}
      />
    </>
  );
};
