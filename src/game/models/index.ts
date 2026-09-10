export { MODEL_PATH as SMALL_PLANE_MODEL_PATH } from './SmallPlane';
export { MODEL_PATH as CAR_MODEL_PATH } from './Car';
export { MODEL_PATH as HELI_MODEL_PATH } from './Heli';
export { MODEL_PATH as AIRPLANE_MODEL_PATH } from './Airplane';
export { MODEL_PATH as BOXMAN_MODEL_PATH } from './Boxman';
export { MODEL_PATH as BUS_COMPRESSED_MODEL_PATH } from './BusCompressed';
export { MODEL_PATH as LOWPOLY_BUS_OPTIMIZED_MODEL_PATH } from './LowpolyBusOptimized';
export { MODEL_PATH as SAAB901_OPTIMIZED_MODEL_PATH } from './Saab901Optimized';
export { MODEL_PATH as SIMPLE_LOW_POLY_CHARACTER_MODEL_PATH } from './SimpleLowPolyCharacter';
export { MODEL_PATH as LOW_POLY_SOVIET_NBC_SUIT_MODEL_PATH } from './LowPolySovietNbcSuit';

import { MODEL_PATH as CAR_MODEL_PATH } from './Car';
import { MODEL_PATH as HELI_MODEL_PATH } from './Heli';
import { MODEL_PATH as AIRPLANE_MODEL_PATH } from './Airplane';
import { MODEL_PATH as BOXMAN_MODEL_PATH } from './Boxman';

export const VEHICLE_MODEL_PATHS: Record<'car' | 'heli' | 'airplane', string> = {
  car: CAR_MODEL_PATH,
  heli: HELI_MODEL_PATH,
  airplane: AIRPLANE_MODEL_PATH,
};

export const CHARACTER_MODEL_PATH = BOXMAN_MODEL_PATH;
