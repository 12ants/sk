import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { World } from '../../ts/world/World';
import { gameUiStore } from './gameUiStore';
import { GameSettings } from './GameSettings';
import { TouchControls } from './TouchControls';
import { CharacterCustomizer } from './CharacterCustomizer';
import { VehicleLoader } from './VehicleLoader';
import './game-ui.css';

type Panel = 'Controls' | 'Settings' | 'Messages' | 'Customizer' | 'Vehicles';

const ARROW_KEY_LABELS: Record<string, string> = { W: '↑', A: '←', S: '↓', D: '→' };

const subscribeToNothing = () => () => {};
const noSettings = () => null;

export function GameOverlay({ world = null }: { world?: World | null }) {
  const state = useSyncExternalStore(gameUiStore.subscribe, gameUiStore.getSnapshot);
  const settings = useSyncExternalStore(world?.subscribeSettings ?? subscribeToNothing, world?.getSettingsSnapshot ?? noSettings);
  const [panel, setPanel] = useState<Panel | null>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const blocked = state.loading || !!state.error || !!state.welcome || panel !== null;

  useEffect(() => {
    world?.inputManager.setUiBlocked(blocked);
    return () => world?.inputManager.setUiBlocked(false);
  }, [world, blocked]);

  useEffect(() => {
    if (state.welcome) playButton.current?.focus();
  }, [state.welcome]);

  useEffect(() => {
    if (state.loading) setPanel(null);
  }, [state.loading]);

  const closePanel = () => { setPanel(null); world?.canvas.focus(); };
  const play = () => {
    world?.setTimeScale(1);
    gameUiStore.setWelcome(null);
    gameUiStore.setInterfaceVisible(true);
    world?.canvas.focus();
  };

  return (
    <div className="game-ui" data-game-ui onKeyDown={(event) => {
      if (event.key === 'Escape' && panel) { event.stopPropagation(); closePanel(); }
      if (state.welcome && event.key === 'Tab') { event.preventDefault(); playButton.current?.focus(); }
    }}>
      {state.loading || state.error ? (
        <section className="game-loading" aria-label="gta11 loading screen">
          <p className="game-eyebrow">Open world playground</p>
          <h1>gta11</h1>
          {state.error ? <p role="alert">{state.error}</p> : <><span className="game-loader" aria-hidden="true" /><p role="status">Loading world…</p></>}
        </section>
      ) : state.welcome ? (
        <div className="game-modal-backdrop">
          <section className="game-welcome game-surface" role="dialog" aria-modal="true" aria-labelledby="game-welcome-title" aria-describedby="game-welcome-content">
            <p className="game-eyebrow">gta11</p>
            <h1 id="game-welcome-title">{state.welcome.title}</h1>
            <p id="game-welcome-content">{state.welcome.content}</p>
            <button className="game-play" ref={playButton} onClick={play}>Play</button>
          </section>
        </div>
      ) : state.interfaceVisible ? (
        <>
        {world && settings?.Mobile_Mode && !blocked ? <TouchControls world={world} /> : null}
        <aside className="game-hud" aria-label="Game interface">
          <div className="game-toolbar game-surface">
            <strong className="game-brand">gta11</strong>
            {(['Controls', 'Settings', 'Customizer', 'Vehicles', ...(state.messages.length ? ['Messages'] : [])] as Panel[]).map((name) => (
              <button key={name} aria-expanded={panel === name} aria-controls="game-panel" onClick={() => panel === name ? closePanel() : setPanel(name)}>
                {name}{name === 'Messages' ? ` (${state.messages.length})` : ''}
              </button>
            ))}
            {state.statsVisible ? <span className="game-fps" role="status" aria-label="Frame rate">{state.fps === null ? 'Measuring FPS…' : `${state.fps} FPS`}</span> : null}
          </div>
          {panel ? (
            <section id="game-panel" className="game-panel game-surface" aria-label={panel}>
              <div className="game-panel-heading"><h2>{panel}</h2><button aria-label={`Close ${panel.toLowerCase()}`} onClick={closePanel}>×</button></div>
              {panel === 'Settings' ? <GameSettings world={world} /> : panel === 'Customizer' ? <CharacterCustomizer world={world} /> : panel === 'Vehicles' ? <VehicleLoader world={world} /> : panel === 'Controls' ? (
                <ul className="game-controls" aria-label="Game controls">
                  <li>
                    <span className="game-keys"><kbd>P</kbd></span>
                    <span>Toggle performance overlay</span>
                  </li>
                  {state.controls.map((row, index) => <li key={index}>
                    <span className="game-keys">{row.keys.map((key, keyIndex) => {
                      const label = settings?.Control_Scheme === 'arrows' ? (ARROW_KEY_LABELS[key] ?? key) : key;
                      return ['+', 'and', 'or', '&'].includes(key) ? <span key={keyIndex}>{key}</span> : <kbd key={keyIndex}>{label}</kbd>;
                    })}</span>
                    <span>{row.desc}</span>
                  </li>)}
                </ul>
              ) : (
                <div className="game-messages" role="log" aria-label="Console messages">{state.messages.map((message, index) => <p key={index}>{message}</p>)}</div>
              )}
              <p className="game-panel-hint">Close this panel to resume controls. Esc to close.</p>
            </section>
          ) : null}
        </aside>
        </>
      ) : null}
    </div>
  );
}
