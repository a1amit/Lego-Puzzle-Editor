import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { SCENE_3D } from '../../config/sceneConfig';

export function CinematicEffects() {
  const { postprocessing } = SCENE_3D;

  return (
    <>
      <EffectComposer multisampling={4} enableNormalPass={false}>
        <Bloom
          intensity={postprocessing.bloom.intensity}
          luminanceThreshold={postprocessing.bloom.luminanceThreshold}
          luminanceSmoothing={postprocessing.bloom.luminanceSmoothing}
          mipmapBlur
        />
        <Vignette eskil={false} offset={postprocessing.vignette.offset} darkness={postprocessing.vignette.darkness} />
      </EffectComposer>
    </>
  );
}
