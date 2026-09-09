export type ControlRow = { keys: string[]; desc: string };

export type GameUiState = {
  loading: boolean;
  interfaceVisible: boolean;
  error: string | null;
  controls: ControlRow[];
  messages: string[];
  statsVisible: boolean;
};

type Listener = () => void;

const freezeSnapshot = (state: GameUiState): GameUiState =>
  Object.freeze({
    ...state,
    controls: Object.freeze(
      state.controls.map((row) => Object.freeze({ ...row, keys: Object.freeze([...row.keys]) })),
    ) as unknown as ControlRow[],
    messages: Object.freeze([...state.messages]) as unknown as string[],
  });

class GameUiStore {
  private listeners = new Set<Listener>();
  private snapshot: GameUiState = freezeSnapshot({
    loading: false,
    interfaceVisible: false,
    error: null,
    controls: [],
    messages: [],
    statsVisible: false,
  });

  public getSnapshot = (): GameUiState => this.snapshot;

  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public setLoading = (loading: boolean): void => this.update({ loading });

  public setInterfaceVisible = (interfaceVisible: boolean): void => this.update({ interfaceVisible });

  public setError = (error: string): void => this.update({ error });

  public setControls = (controls: ControlRow[]): void => this.update({ controls });

  public pushMessage = (text: string): void => this.update({ messages: [...this.snapshot.messages, text] });

  public setStatsVisible = (statsVisible: boolean): void => this.update({ statsVisible });

  private update(update: Partial<GameUiState>): void {
    this.snapshot = freezeSnapshot({ ...this.snapshot, ...update });
    this.listeners.forEach((listener) => listener());
  }
}

export const gameUiStore = new GameUiStore();

export const setLoading = gameUiStore.setLoading;
export const setInterfaceVisible = gameUiStore.setInterfaceVisible;
export const setError = gameUiStore.setError;
export const setControls = gameUiStore.setControls;
export const pushMessage = gameUiStore.pushMessage;
