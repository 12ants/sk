import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as THREE from 'three';
import { createTestWorld } from '../../test/createTestWorld';
import { Character } from '../../ts/characters/Character';
import { CharacterCustomizer } from './CharacterCustomizer';

afterEach(() => cleanup());

test('chooses the skeleton player while retaining the active character', () => {
  const world = createTestWorld();
  const scene = new THREE.Group();
  const root = new THREE.Bone();
  root.add(new THREE.Bone());
  scene.add(root, new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
  const character = new Character({ scene, animations: [new THREE.AnimationClip('idle', 1, [])] });
  world.add(character);
  render(<CharacterCustomizer world={world} />);

  fireEvent.change(screen.getByLabelText('Player model'), { target: { value: 'skeleton' } });

  expect(character.visualStyle).toBe('skeleton');
  expect(character.modelContainer.getObjectByName('Skeleton player')?.visible).toBe(true);
  expect(screen.getByLabelText('Skeleton color')).toBeInTheDocument();
  expect(screen.queryByLabelText('Body color')).not.toBeInTheDocument();
  world.dispose();
});
