import { gameUiStore } from '../../game/ui/gameUiStore';

export class UIManager
{
	public static setUserInterfaceVisible(value: boolean): void
	{
		gameUiStore.setInterfaceVisible(value);
	}

	public static setLoadingScreenVisible(value: boolean): void
	{
		gameUiStore.setLoading(value);
	}

	public static setFPSVisible(value: boolean): void
	{
		gameUiStore.setStatsVisible(value);
	}
}
