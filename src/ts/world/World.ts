import * as THREE from 'three';
import * as CANNON from 'cannon';

import { CameraOperator } from '../core/CameraOperator';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader  } from 'three/examples/jsm/shaders/FXAAShader.js';

import { Detector } from '../../lib/utils/Detector';
import { CannonDebugRenderer } from '../../lib/cannon/CannonDebugRenderer';
import * as _ from 'lodash';

import { InputManager } from '../core/InputManager';
import * as Utils from '../core/FunctionLibrary';
import { LoadingManager } from '../core/LoadingManager';
import { InfoStack } from '../core/InfoStack';
import { UIManager } from '../core/UIManager';
import { IWorldEntity } from '../interfaces/IWorldEntity';
import { IUpdatable } from '../interfaces/IUpdatable';
import { Character } from '../characters/Character';
import { Path } from './Path';
import { CollisionGroups } from '../enums/CollisionGroups';
import { BoxCollider } from '../physics/colliders/BoxCollider';
import { TrimeshCollider } from '../physics/colliders/TrimeshCollider';
import { Vehicle } from '../vehicles/Vehicle';
import { Scenario } from './Scenario';
import { Sky } from './Sky';
import { Ocean } from './Ocean';
import type { WorldRuntimeDependencies } from '../../game/runtime/types';
import { gameUiStore, type ControlRow } from '../../game/ui/gameUiStore';

export type WorldOptions = {
	worldScenePath?: string;
	runtime?: WorldRuntimeDependencies;
};

export type WorldSettings = {
	Pointer_Lock: boolean;
	Mouse_Sensitivity: number;
	Time_Scale: number;
	Shadows: boolean;
	FXAA: boolean;
	Debug_Physics: boolean;
	Debug_FPS: boolean;
	Sun_Elevation: number;
	Sun_Rotation: number;
};

export type WorldSettingsSnapshot = Readonly<WorldSettings & { scenarioId: string | null }>;

export class World
{
	public renderer: THREE.WebGLRenderer;
	public camera: THREE.PerspectiveCamera;
	public canvas: HTMLCanvasElement;
	public readonly externallyManaged: boolean;
	public isDisposed: boolean = false;
	public composer: any;
	public graphicsWorld: THREE.Scene;
	public sky: Sky;
	public physicsWorld: CANNON.World;
	public parallelPairs: any[];
	public physicsFrameRate: number;
	public physicsFrameTime: number;
	public physicsMaxPrediction: number;
	public clock: THREE.Clock;
	public renderDelta: number;
	public logicDelta: number;
	public requestDelta: number;
	public sinceLastFrame: number;
	public justRendered: boolean;
	public params: WorldSettings;
	public inputManager: InputManager;
	public cameraOperator: CameraOperator;
	public timeScaleTarget: number = 1;
	public console: InfoStack;
	public cannonDebugRenderer: typeof CannonDebugRenderer.prototype;
	public scenarios: Scenario[] = [];
	public characters: Character[] = [];
	public vehicles: Vehicle[] = [];
	public paths: Path[] = [];
	public updatables: IUpdatable[] = [];

	private lastScenarioID: string;
	private animationFrameId?: number;
	private onWindowResize?: () => void;
	private ownedDomNodes: Element[] = [];
	private ownedSceneResources = new Set<{ dispose(): void }>();
	private settingsSnapshot: WorldSettingsSnapshot;
	private settingsListeners = new Set<() => void>();
	private fpsElapsed = 0;
	private fpsFrames = 0;

	constructor(options?: WorldOptions);
	/** @deprecated Supply WorldOptions with an R3F runtime in React applications. */
	constructor(worldScenePath?: string);
	constructor(options: WorldOptions | string = {})
	{
		const { worldScenePath, runtime } = typeof options === 'string' ? { worldScenePath: options } : options;
		this.externallyManaged = runtime !== undefined;

		// WebGL not supported
		if (!this.externallyManaged && !Detector.webgl)
		{
			gameUiStore.setError('This browser does not support the WebGL capabilities required by gta11.');
		}

		// Renderer
		this.renderer = runtime?.renderer ?? new THREE.WebGLRenderer();
		this.camera = runtime?.camera ?? new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1010);
		this.canvas = runtime?.canvas ?? this.renderer.domElement;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.0;
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		// Three.js scene
		this.graphicsWorld = new THREE.Scene();
		if (!this.externallyManaged)
		{
			this.renderer.setPixelRatio(window.devicePixelRatio);
			this.renderer.setSize(window.innerWidth, window.innerHeight);
			document.body.appendChild(this.canvas);
			this.ownedDomNodes.push(this.canvas);
			const renderPass = new RenderPass(this.graphicsWorld, this.camera);
			const fxaaPass = new ShaderPass(FXAAShader);
			const pixelRatio = this.renderer.getPixelRatio();
			fxaaPass.uniforms.resolution.value.set(1 / (window.innerWidth * pixelRatio), 1 / (window.innerHeight * pixelRatio));
			this.composer = new EffectComposer(this.renderer);
			this.composer.addPass(renderPass);
			this.composer.addPass(fxaaPass);
			this.onWindowResize = () => {
				this.camera.aspect = window.innerWidth / window.innerHeight;
				this.camera.updateProjectionMatrix();
				this.renderer.setSize(window.innerWidth, window.innerHeight);
				fxaaPass.uniforms.resolution.value.set(1 / (window.innerWidth * pixelRatio), 1 / (window.innerHeight * pixelRatio));
				this.composer.setSize(window.innerWidth, window.innerHeight);
			};
			window.addEventListener('resize', this.onWindowResize, false);
			this.clock = new THREE.Clock();
		}

		// Physics
		this.physicsWorld = new CANNON.World();
		this.physicsWorld.gravity.set(0, -9.81, 0);
		this.physicsWorld.broadphase = new CANNON.SAPBroadphase(this.physicsWorld);
		this.physicsWorld.solver.iterations = 10;
		this.physicsWorld.allowSleep = true;

		this.parallelPairs = [];
		this.physicsFrameRate = 60;
		this.physicsFrameTime = 1 / this.physicsFrameRate;
		this.physicsMaxPrediction = this.physicsFrameRate;

		// RenderLoop
		this.renderDelta = 0;
		this.logicDelta = 0;
		this.sinceLastFrame = 0;
		this.justRendered = false;

		this.params = {
			Pointer_Lock: true,
			Mouse_Sensitivity: 0.3,
			Time_Scale: 1,
			Shadows: true,
			FXAA: true,
			Debug_Physics: false,
			Debug_FPS: false,
			Sun_Elevation: 50,
			Sun_Rotation: 145,
		};
		this.publishSettings();
		gameUiStore.setStatsVisible(false);
		gameUiStore.setFps(null);

		// Initialization
		try
		{
			this.inputManager = new InputManager(this, this.canvas);
			this.cameraOperator = new CameraOperator(this, this.camera, this.params.Mouse_Sensitivity);
			this.sky = new Sky(this);

			// Load scene if path is supplied
			if (worldScenePath !== undefined)
			{
				let loadingManager = new LoadingManager(this);
				loadingManager.onFinishedCallback = () =>
				{
					if (this.isDisposed) return;
					this.update(1, 1);
					this.setTimeScale(0);
					UIManager.setUserInterfaceVisible(true);
					gameUiStore.setWelcome({
						title: 'Welcome to gta11',
						content: 'Explore the world and interact with available vehicles. Open Settings to launch a scenario, or Controls for the current key bindings.',
					});
				};
				loadingManager.loadGLTF(worldScenePath, (gltf) =>
					{
						this.loadScene(loadingManager, gltf);
					}
				);
			}
			else
			{
				UIManager.setUserInterfaceVisible(true);
				UIManager.setLoadingScreenVisible(false);
			}

			if (!this.externallyManaged) this.render(this);
		}
		catch (error)
		{
			this.dispose();
			throw error;
		}
	}

	public tick(unscaledTimeStep: number): void
	{
		if (this.isDisposed) return;
		const timeStep = Math.min(unscaledTimeStep * this.params.Time_Scale, 1 / 30);
		this.update(timeStep, unscaledTimeStep);
		this.recordFrame(unscaledTimeStep);
	}

	public dispose(): void
	{
		if (this.isDisposed) return;
		this.isDisposed = true;
		this.inputManager?.dispose();
		if (this.animationFrameId !== undefined) cancelAnimationFrame(this.animationFrameId);
		if (this.onWindowResize) window.removeEventListener('resize', this.onWindowResize, false);
		this.cannonDebugRenderer?.dispose();
		this.cannonDebugRenderer = undefined;

		// World owns its scene resources; the renderer and canvas remain with R3F.
		this.trackSceneResources(this.graphicsWorld);
		this.clearEntities();
		this.sky?.csm.remove();
		this.sky?.csm.dispose();
		this.ownedSceneResources.forEach((resource) => resource.dispose());
		this.ownedSceneResources.clear();
		this.graphicsWorld.clear();
		this.graphicsWorld.removeFromParent();
		for (const body of [...this.physicsWorld.bodies]) this.physicsWorld.remove(body);
		this.updatables.length = 0;
		this.paths.length = 0;
		this.scenarios.length = 0;
		this.settingsListeners.clear();
		this.ownedDomNodes.forEach((element) => element.remove());
		this.ownedDomNodes.length = 0;
		if (!this.externallyManaged)
		{
			this.composer?.passes.forEach((pass) => pass.dispose?.());
			this.composer?.dispose();
			this.renderer.dispose();
		}
	}

	// Update
	// Handles all logic updates.
	public update(timeStep: number, unscaledTimeStep: number): void
	{
		if (this.isDisposed) return;
		this.updatePhysics(timeStep);

		// Update registred objects
		this.updatables.forEach((entity) => {
			entity.update(timeStep, unscaledTimeStep);
		});

		// Lerp time scale
		this.params.Time_Scale = THREE.MathUtils.lerp(this.params.Time_Scale, this.timeScaleTarget, 0.2);

		// Physics debug
		if (this.params.Debug_Physics) this.cannonDebugRenderer.update();
	}

	public updatePhysics(timeStep: number): void
	{
		// Step the physics world
		this.physicsWorld.step(this.physicsFrameTime, timeStep);

		this.characters.forEach((char) => {
			if (this.isOutOfBounds(char.characterCapsule.body.position))
			{
				this.outOfBoundsRespawn(char.characterCapsule.body);
			}
		});

		this.vehicles.forEach((vehicle) => {
			if (this.isOutOfBounds(vehicle.rayCastVehicle.chassisBody.position))
			{
				let worldPos = new THREE.Vector3();
				vehicle.spawnPoint.getWorldPosition(worldPos);
				worldPos.y += 1;
				this.outOfBoundsRespawn(vehicle.rayCastVehicle.chassisBody, Utils.cannonVector(worldPos));
			}
		});
	}

	public isOutOfBounds(position: CANNON.Vec3): boolean
	{
		let inside = position.x > -211.882 && position.x < 211.882 &&
					position.z > -169.098 && position.z < 153.232 &&
					position.y > 0.107;
		let belowSeaLevel = position.y < 14.989;

		return !inside && belowSeaLevel;
	}

	public outOfBoundsRespawn(body: CANNON.Body, position?: CANNON.Vec3): void
	{
		let newPos = position || new CANNON.Vec3(0, 16, 0);
		let newQuat = new CANNON.Quaternion(0, 0, 0, 1);

		body.position.copy(newPos);
		body.interpolatedPosition.copy(newPos);
		body.quaternion.copy(newQuat);
		body.interpolatedQuaternion.copy(newQuat);
		body.velocity.setZero();
		body.angularVelocity.setZero();
	}

	/**
	 * Rendering loop.
	 * Implements fps limiter and frame-skipping
	 * Calls world's "update" function before rendering.
	 * @param {World} world 
	 */
	public render(world: World): void
	{
		if (this.externallyManaged || this.isDisposed) return;
		this.requestDelta = this.clock.getDelta();

		this.animationFrameId = requestAnimationFrame(() =>
		{
			world.render(world);
		});

		// Getting timeStep
		let unscaledTimeStep = (this.requestDelta + this.renderDelta + this.logicDelta) ;
		let timeStep = unscaledTimeStep * this.params.Time_Scale;
		timeStep = Math.min(timeStep, 1 / 30);    // min 30 fps

		// Logic
		world.update(timeStep, unscaledTimeStep);

		// Measuring logic time
		this.logicDelta = this.clock.getDelta();

		// Frame limiting
		let interval = 1 / 60;
		this.sinceLastFrame += this.requestDelta + this.renderDelta + this.logicDelta;
		this.sinceLastFrame %= interval;

		this.recordFrame(unscaledTimeStep);

		// Actual rendering with a FXAA ON/OFF switch
		if (this.params.FXAA) this.composer.render();
		else this.renderer.render(this.graphicsWorld, this.camera);

		// Measuring render time
		this.renderDelta = this.clock.getDelta();
	}

	public setTimeScale(value: number): void
	{
		this.params.Time_Scale = value;
		this.timeScaleTarget = value;
		this.publishSettings();
	}

	public getSettingsSnapshot = (): WorldSettingsSnapshot => this.settingsSnapshot;

	public subscribeSettings = (listener: () => void): (() => void) => {
		this.settingsListeners.add(listener);
		return () => this.settingsListeners.delete(listener);
	};

	private publishSettings(): void
	{
		const next: WorldSettingsSnapshot = Object.freeze({ ...this.params, Time_Scale: this.timeScaleTarget, scenarioId: this.lastScenarioID ?? null });
		if (this.settingsSnapshot && Object.keys(next).every((key) => next[key] === this.settingsSnapshot[key])) return;
		this.settingsSnapshot = next;
		this.settingsListeners.forEach((listener) => listener());
	}

	public getScenarioOptions(): Array<{ id: string; name: string }>
	{
		return this.scenarios.filter((scenario) => !scenario.invisible).map(({ id, name }) => ({ id, name: name || id }));
	}

	public setFxaa(enabled: boolean): void
	{
		this.params.FXAA = enabled;
		this.publishSettings();
	}

	public setShadows(enabled: boolean): void
	{
		this.params.Shadows = enabled;
		this.sky.csm.lights.forEach((light) => { light.castShadow = enabled; });
		this.publishSettings();
	}

	public setPointerLock(enabled: boolean): void
	{
		this.params.Pointer_Lock = enabled;
		this.inputManager.setPointerLock(enabled);
		this.publishSettings();
	}

	public setMouseSensitivity(value: number): void
	{
		this.params.Mouse_Sensitivity = value;
		this.cameraOperator.setSensitivity(value, value * 0.8);
		this.publishSettings();
	}

	public setDebugPhysics(enabled: boolean): void
	{
		this.params.Debug_Physics = enabled;
		if (enabled && !this.cannonDebugRenderer) this.cannonDebugRenderer = new CannonDebugRenderer(this.graphicsWorld, this.physicsWorld);
		if (!enabled)
		{
			this.cannonDebugRenderer?.dispose();
			this.cannonDebugRenderer = undefined;
		}
		this.characters.forEach((character) => { character.raycastBox.visible = enabled; });
		this.publishSettings();
	}

	public setDebugFps(enabled: boolean): void
	{
		this.params.Debug_FPS = enabled;
		this.fpsElapsed = 0;
		this.fpsFrames = 0;
		gameUiStore.setFps(null);
		UIManager.setFPSVisible(enabled);
		this.publishSettings();
	}

	public setSunElevation(value: number): void
	{
		this.params.Sun_Elevation = value;
		this.sky.phi = value;
		this.publishSettings();
	}

	public setSunRotation(value: number): void
	{
		this.params.Sun_Rotation = value;
		this.sky.theta = value;
		this.publishSettings();
	}

	private recordFrame(delta: number): void
	{
		if (!this.params.Debug_FPS || delta <= 0) return;
		this.fpsElapsed += delta;
		this.fpsFrames++;
		if (this.fpsElapsed >= 0.5)
		{
			gameUiStore.setFps(Math.round(this.fpsFrames / this.fpsElapsed));
			this.fpsElapsed = 0;
			this.fpsFrames = 0;
		}
	}

	public add(worldEntity: IWorldEntity): void
	{
		if (this.isDisposed) return;
		worldEntity.addToWorld(this);
		this.registerUpdatable(worldEntity);
	}

	public registerUpdatable(registree: IUpdatable): void
	{
		this.updatables.push(registree);
		this.updatables.sort((a, b) => (a.updateOrder > b.updateOrder) ? 1 : -1);
	}

	public remove(worldEntity: IWorldEntity): void
	{
		const previousChildren = [...this.graphicsWorld.children];
		worldEntity.removeFromWorld(this);
		// Entities can own separate roots, such as vehicle wheels and character raycast helpers.
		for (const child of previousChildren)
		{
			if (child.parent !== this.graphicsWorld) this.trackSceneResources(child);
		}
		this.unregisterUpdatable(worldEntity);
	}

	private trackSceneResources(root: THREE.Object3D): void
	{
		// Retain ownership across scenario changes; shared resources stay usable until world disposal.
		root.traverse((object: any) => {
			if (object.geometry) this.ownedSceneResources.add(object.geometry);
			if (object.skeleton) this.ownedSceneResources.add(object.skeleton);
			if (object.shadow) this.ownedSceneResources.add(object.shadow);
			const materials = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
			for (const material of materials) {
				this.ownedSceneResources.add(material);
				for (const value of Object.values(material) as any[]) if (value?.isTexture) this.ownedSceneResources.add(value);
				for (const uniform of Object.values(material.uniforms ?? {}) as any[]) if (uniform.value?.isTexture) this.ownedSceneResources.add(uniform.value);
			}
		});
	}

	public unregisterUpdatable(registree: IUpdatable): void
	{
		_.pull(this.updatables, registree);
	}

	public loadScene(loadingManager: LoadingManager, gltf: any): void
	{
		if (this.isDisposed) return;
		gltf.scene.traverse((child) => {
			if (child.hasOwnProperty('userData'))
			{
				if (child.type === 'Mesh')
				{
					Utils.setupMeshProperties(child);
					this.sky.csm.setupMaterial(child.material);

					if (child.material.name === 'ocean')
					{
						this.registerUpdatable(new Ocean(child, this));
					}
				}

				if (child.userData.hasOwnProperty('data'))
				{
					if (child.userData.data === 'physics')
					{
						if (child.userData.hasOwnProperty('type')) 
						{
							// Convex doesn't work! Stick to boxes!
							if (child.userData.type === 'box')
							{
								let phys = new BoxCollider({size: new THREE.Vector3(child.scale.x, child.scale.y, child.scale.z)});
								phys.body.position.copy(Utils.cannonVector(child.position));
								phys.body.quaternion.copy(Utils.cannonQuat(child.quaternion));
								phys.body.computeAABB();

								phys.body.shapes.forEach((shape) => {
									shape.collisionFilterMask = ~CollisionGroups.TrimeshColliders;
								});

								this.physicsWorld.addBody(phys.body);
							}
							else if (child.userData.type === 'trimesh')
							{
								let phys = new TrimeshCollider(child, {});
								this.physicsWorld.addBody(phys.body);
							}

							child.visible = false;
						}
					}

					if (child.userData.data === 'path')
					{
						this.paths.push(new Path(child));
					}

					if (child.userData.data === 'scenario')
					{
						this.scenarios.push(new Scenario(child, this));
					}
				}
			}
		});

		this.graphicsWorld.add(gltf.scene);

		// Launch default scenario
		let defaultScenarioID: string;
		for (const scenario of this.scenarios) {
			if (scenario.default) {
				defaultScenarioID = scenario.id;
				break;
			}
		}
		if (defaultScenarioID !== undefined) this.launchScenario(defaultScenarioID, loadingManager);
	}
	
	public launchScenario(scenarioID: string, loadingManager?: LoadingManager): void
	{
		if (this.isDisposed) return;
		this.lastScenarioID = scenarioID;
		this.publishSettings();

		this.clearEntities();

		// Launch default scenario
		if (!loadingManager) loadingManager = new LoadingManager(this);
		for (const scenario of this.scenarios) {
			if (scenario.id === scenarioID || scenario.spawnAlways) {
				scenario.launch(loadingManager, this);
			}
		}
	}

	public restartScenario(): void
	{
		if (this.lastScenarioID !== undefined)
		{
			document.exitPointerLock();
			this.launchScenario(this.lastScenarioID);
		}
		else
		{
			console.warn('Can\'t restart scenario. Last scenarioID is undefined.');
		}
	}

	public clearEntities(): void
	{
		for (let i = 0; i < this.characters.length; i++) {
			this.remove(this.characters[i]);
			i--;
		}

		for (let i = 0; i < this.vehicles.length; i++) {
			this.remove(this.vehicles[i]);
			i--;
		}
	}

	public scrollTheTimeScale(scrollAmount: number): void
	{
		// Changing time scale with scroll wheel
		const timeScaleBottomLimit = 0.003;
		const timeScaleChangeSpeed = 1.3;
	
		if (scrollAmount > 0)
		{
			this.timeScaleTarget /= timeScaleChangeSpeed;
			if (this.timeScaleTarget < timeScaleBottomLimit) this.timeScaleTarget = 0;
		}
		else
		{
			this.timeScaleTarget *= timeScaleChangeSpeed;
			if (this.timeScaleTarget < timeScaleBottomLimit) this.timeScaleTarget = timeScaleBottomLimit;
			this.timeScaleTarget = Math.min(this.timeScaleTarget, 1);
		}
		this.publishSettings();
	}

	public updateControls(controls: ControlRow[]): void
	{
		gameUiStore.setControls(controls);
	}
}
