export type ControlRow = { keys: string[]; desc: string };
export type WelcomeMessage = { title: string; content: string };

export type GameUiState = {
  loading: boolean;
  interfaceVisible: boolean;
  error: string | null;
  controls: ControlRow[];
  messages: string[];
  statsVisible: boolean;
  fps: number | null;
  welcome: WelcomeMessage | null;
  perfVisible: boolean;
};

type Listener = () => void;

const freezeSnapshot = (state: GameUiState): GameUiState =>
  Object.freeze({
    ...state,
    welcome: state.welcome ? Object.freeze({ ...state.welcome }) : null,
    controls: Object.freeze(
      state.controls.map((row) => Object.freeze({ ...row, keys: Object.freeze([...row.keys]) })),
    ) as unknown as ControlRow[],
    messages: Object.freeze([...state.messages]) as unknown as string[],
  });

class GameUiStore {
  private listeners = new Set<Listener>();
  private snapshot: GameUiState = freezeSnapshot({
    loading: true,
    interfaceVisible: false,
    error: null,
    controls: [],
    messages: [],
    statsVisible: false,
    fps: null,
    welcome: null,
    perfVisible: false,
  });

  public getSnapshot = (): GameUiState => this.snapshot;

  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public setLoading = (loading: boolean): void => this.update(loading ? { loading, error: null, welcome: null } : { loading });

  public setInterfaceVisible = (interfaceVisible: boolean): void => this.update({ interfaceVisible });

  public setError = (error: string | null): void => this.update({ error });

  public setWelcome = (welcome: WelcomeMessage | null): void => this.update({ welcome });

  public setFps = (fps: number | null): void => this.update({ fps });

  public setControls = (controls: ControlRow[]): void => this.update({ controls });

  public pushMessage = (text: string): void => this.update({ messages: [...this.snapshot.messages, text] });

  public setStatsVisible = (statsVisible: boolean): void => this.update({ statsVisible });

  public setPerfVisible = (perfVisible: boolean): void => this.update({ perfVisible });

  private update(update: Partial<GameUiState>): void {
    this.snapshot = freezeSnapshot({ ...this.snapshot, ...update });
    this.listeners.forEach((listener) => listener());
  }
}

export const gameUiStore = new GameUiStore();
