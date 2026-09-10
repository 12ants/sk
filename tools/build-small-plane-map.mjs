import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFile } from 'node:fs/promises';

// three's GLTFExporter binary path reads the output Blob via FileReader, which
// only exists in browsers. Polyfill just enough of it for Node.
globalThis.FileReader = class {
	readAsArrayBuffer(blob) {
		blob.arrayBuffer().then((buffer) => {
			this.result = buffer;
			this.onloadend?.();
		});
	}
};

const scene = new THREE.Scene();

// Visible ground plane
const groundSize = 100;
const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
groundGeo.rotateX(-Math.PI / 2);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a7c3f, name: 'ground' });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.name = 'ground';
scene.add(ground);

// Invisible physics collider (box) matching the ground footprint
const collider = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
collider.name = 'ground_physics';
collider.position.set(0, -0.5, 0);
collider.scale.set(groundSize, 1, groundSize);
collider.userData = { data: 'physics', type: 'box' };
scene.add(collider);

// Scenario root
const scenario = new THREE.Group();
scenario.name = 'small_plane';
scenario.userData = {
	data: 'scenario',
	name: 'Small Plane',
	default: 'true',
	desc_title: 'Small Plane',
	desc_content: 'A minimal flat starting map.',
	camera_angle: 0,
};
scene.add(scenario);

// Player spawn point at the scenario origin
const spawn = new THREE.Object3D();
spawn.name = 'player_spawn';
spawn.position.set(0, 1, 0);
spawn.userData = { data: 'spawn', type: 'player' };
scenario.add(spawn);

const exporter = new GLTFExporter();
exporter.parse(
	scene,
	(result) => {
		const buffer = Buffer.from(result);
		writeFile(new URL('../public/assets/small_plane.glb', import.meta.url), buffer).then(() => {
			console.log('wrote public/assets/small_plane.glb', buffer.length, 'bytes');
		});
	},
	(error) => {
		console.error(error);
		process.exitCode = 1;
	},
	{ binary: true },
);
