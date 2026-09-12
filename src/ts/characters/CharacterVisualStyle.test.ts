import * as THREE from 'three';
import { Character } from './Character';

function createRiggedCharacter(): { character: Character; mesh: THREE.Mesh; bone: THREE.Bone } {
	const scene = new THREE.Group();
	const root = new THREE.Bone();
	root.name = 'root';
	const bone = new THREE.Bone();
	bone.name = 'spine';
	bone.position.y = 1;
	root.add(bone);
	const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
	scene.add(root, mesh);
	const character = new Character({ scene, animations: [new THREE.AnimationClip('idle', 1, [])] });
	return { character, mesh, bone };
}

test('uses the existing animated bone hierarchy for the skeleton player', () => {
	const { character, mesh, bone } = createRiggedCharacter();
	const mixer = character.mixer;

	character.setVisualStyle('skeleton');
	const helper = character.modelContainer.getObjectByName('Skeleton player') as THREE.SkeletonHelper;

	expect(mesh.visible).toBe(false);
	expect(helper.visible).toBe(true);
	expect(helper.bones).toContain(bone);
	expect(character.mixer).toBe(mixer);

	character.setSkeletonColor('#ff0000');
	expect((helper.material as THREE.LineBasicMaterial).color.getHexString()).toBe('ff0000');
	character.setVisualStyle('boxman');
	expect(mesh.visible).toBe(true);
	expect(helper.visible).toBe(false);
});
