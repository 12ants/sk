import * as THREE from 'three';

export function createConcreteMaterial(): THREE.MeshStandardMaterial {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  let seed = 42;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const grain = (seed / 0xffffffff - 0.5) * 24;
      const mottling = 5 * Math.sin(x * 0.11) * Math.cos(y * 0.08);
      const joint = x < 1 || y < 1;
      const shade = joint ? 125 : 181 + grain + mottling;
      const offset = (y * size + x) * 4;
      data.set([shade, shade - 2, shade - 5, 255], offset);
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(20, 20);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    name: 'concrete', map: texture, bumpMap: texture, bumpScale: 0.018,
    roughness: 0.95, metalness: 0,
  });
}
