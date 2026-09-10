import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { LoadingTrackerEntry } from './LoadingTrackerEntry';
import { UIManager } from './UIManager';
import { Scenario } from '../world/Scenario';
import { World } from '../world/World';
import { gameUiStore } from '../../game/ui/gameUiStore';

export class LoadingManager
{
	public firstLoad: boolean = true;
	public onFinishedCallback: () => void;
	
	private world: World;
	private gltfLoader: GLTFLoader;
	private loadingTracker: LoadingTrackerEntry[] = [];

	constructor(world: World)
	{
		this.world = world;
		this.gltfLoader = new GLTFLoader();

		this.world.setTimeScale(0);
		UIManager.setUserInterfaceVisible(false);
		UIManager.setLoadingScreenVisible(true);
	}

	public loadGLTF(path: string, onLoadingFinished: (gltf: any) => void): void
	{
		if (this.world.isDisposed) return;
		let trackerEntry = this.addLoadingEntry(path);

		this.gltfLoader.load(path,
		(gltf)  =>
		{
			if (this.world.isDisposed) return;
			onLoadingFinished(gltf);
			this.doneLoading(trackerEntry);
		},
		(xhr) =>
		{
			if (this.world.isDisposed) return;
			if ( xhr.lengthComputable )
			{
				trackerEntry.progress = xhr.loaded / xhr.total;
			}
		},
		(error)  =>
		{
			if (this.world.isDisposed) return;
			console.error(error);
			gameUiStore.setError(`${path} could not be loaded`);
		});
	}

	public addLoadingEntry(path: string): LoadingTrackerEntry
	{
		let entry = new LoadingTrackerEntry(path);
		this.loadingTracker.push(entry);

		return entry;
	}

	public doneLoading(trackerEntry: LoadingTrackerEntry): void
	{
		if (this.world.isDisposed) return;
		trackerEntry.finished = true;
		trackerEntry.progress = 1;

		if (this.isLoadingDone())
		{
			if (this.onFinishedCallback !== undefined) 
			{
				this.onFinishedCallback();
			}
			else
			{
				UIManager.setUserInterfaceVisible(true);
			}

			UIManager.setLoadingScreenVisible(false);
		}
	}

	public createWelcomeScreenCallback(scenario: Scenario): void
	{
		if (this.onFinishedCallback === undefined)
		{
			this.onFinishedCallback = () =>
			{
				this.world.settleScene();
	
				this.world.setTimeScale(0);
				UIManager.setUserInterfaceVisible(true);
				// Scene metadata historically contains HTML. Convert it to inert text for React.
				const plainText = (html: string): string => {
					const document = new DOMParser().parseFromString(html.replace(/<\/(p|div|li)>|<br\s*\/?\s*>/gi, '\n'), 'text/html');
					document.querySelectorAll('script, style').forEach((node) => node.remove());
					return document.body.textContent.replace(/Sketchbook/gi, 'gta11').trim();
				};
				gameUiStore.setWelcome({
					title: plainText(scenario.descriptionTitle || scenario.name || 'gta11'),
					content: plainText(scenario.descriptionContent || 'Explore the world and interact with available vehicles.'),
				});
			};
		}
	}

	private getLoadingPercentage(): number
	{
		let done = true;
		let total = 0;
		let finished = 0;

		for (const item of this.loadingTracker)
		{
			total++;
			finished += item.progress;
			if (!item.finished) done = false;
		}

		return (finished / total) * 100;
	}

	private isLoadingDone(): boolean
	{
		for (const entry of this.loadingTracker) {
			if (!entry.finished) return false;
		}
		return true;
	}
}
