import * as CANNON from 'cannon';
import * as THREE from 'three';
import * as Utils from '../../core/FunctionLibrary';
import {ICollider} from '../../interfaces/ICollider';
import {Object3D} from 'three';

export class TrimeshCollider implements ICollider
{
	public mesh: any;
	public options: any;
	public body: CANNON.Body;
	public debugModel: any;

	constructor(mesh: Object3D, options: any)
	{
		this.mesh = mesh.clone();

		let defaults = {
			mass: 0,
			position: mesh.position,
			rotation: mesh.quaternion,
			friction: 0.3
		};
		options = Utils.setDefaults(options, defaults);
		this.options = options;

		let mat = new CANNON.Material('triMat');
		mat.friction = options.friction;
		// mat.restitution = 0.7;

		const geometry = this.mesh.geometry as THREE.BufferGeometry;
		const positions = geometry.getAttribute('position');
		const scale = this.mesh.getWorldScale(new THREE.Vector3());
		const vertices: number[] = [];
		for (let i = 0; i < positions.count; i++)
		{
			vertices.push(positions.getX(i) * scale.x, positions.getY(i) * scale.y, positions.getZ(i) * scale.z);
		}
		const indices = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: positions.count }, (_, i) => i);
		const shape = new CANNON.Trimesh(vertices, indices);
		// shape['material'] = mat;

		// Add phys sphere
		let physBox = new CANNON.Body({
			mass: options.mass,
			position: options.position,
			quaternion: options.rotation,
			shape: shape
		});

		physBox.material = mat;

		this.body = physBox;
	}
}
