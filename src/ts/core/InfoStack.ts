import { IWorldEntity } from '../interfaces/IWorldEntity';
import { EntityType } from '../enums/EntityType';
import { World } from '../world/World';
import { gameUiStore } from '../../game/ui/gameUiStore';

export class InfoStack implements IWorldEntity
{
	public updateOrder: number = 3;
	public entityType: EntityType = EntityType.System;

	public addMessage(text: string): void
	{
		gameUiStore.pushMessage(text);
	}

	public update(timeStep: number): void
	{
	}

	public addToWorld(world: World): void
	{
	}

	public removeFromWorld(world: World): void
	{
	}
}
