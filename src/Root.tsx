import { Composition, staticFile } from "remotion";
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
          photoUrl: staticFile("property-real.jpg"),
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
