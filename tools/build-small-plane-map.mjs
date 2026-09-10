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
const groundMat = new THREE.MeshStandardMaterial({ color: 0xa9a69f, roughness: 0.95, name: 'concrete' });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.name = 'ground';
scene.add(ground);

// Invisible physics collider (box) matching the ground footprint
// The scene loader uses scale as Cannon box half-extents.
const collider = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial());
collider.name = 'ground_physics';
collider.position.set(0, -0.5, 0);
collider.scale.set(groundSize / 2, 0.5, groundSize / 2);
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
spawn.position.set(0, 0.57, 0);
spawn.userData = { data: 'spawn', type: 'player' };
scenario.add(spawn);

// Vehicle spawn points, spread across the ground plane clear of the player
// and each other. VehicleSpawnPoint adds clearance above ground level;
// the loading phase settles the chassis and suspension before showing Play.
const vehicleSpawns = [
	{ name: 'car_spawn', type: 'car', position: [15, 0, 15] },
	{ name: 'heli_spawn', type: 'heli', position: [-20, 0, -15] },
	{ name: 'airplane_spawn', type: 'airplane', position: [0, 0, -30] },
];

for (const { name, type, position } of vehicleSpawns) {
	const vehicleSpawn = new THREE.Object3D();
	vehicleSpawn.name = name;
	vehicleSpawn.position.set(...position);
	vehicleSpawn.userData = { data: 'spawn', type };
	scenario.add(vehicleSpawn);
}

const outPath = new URL('../public/assets/small_plane.glb', import.meta.url);

new GLTFExporter().parse(
	scene,
	async (result) => {
		const buffer = Buffer.from(result);
		await writeFile(outPath, buffer);
		console.log('wrote public/assets/small_plane.glb', buffer.length, 'bytes');
	},
	(error) => {
		console.error(error);
		process.exitCode = 1;
	},
	{ binary: true },
);
