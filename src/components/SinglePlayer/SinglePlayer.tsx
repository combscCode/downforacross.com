import _ from 'lodash';
import * as uuid from 'uuid';
import React, {useState} from 'react';
import {useUpdateEffect} from 'react-use';
import {Helmet} from 'react-helmet';
import Flex from 'react-flexview';
import {makeStyles} from '@material-ui/core';
import {useSocket} from '../../sockets/useSocket';
import {emitAsync} from '../../sockets/emitAsync';
import Player from '../Player';
import {transformGameToPlayerPropsSingle} from '../Fencing/transformGameToPlayerProps';
import {usePlayerActions} from '../Fencing/usePlayerActions';
import {useToolbarActions} from '../Fencing/useToolbarActions';
import {GameEvent} from '../../shared/fencingGameEvents/types/GameEvent';
import {getUser} from '../../store/user';
import {TEAM_IDS} from '../../shared/fencingGameEvents/constants';
import {FencingToolbar} from '../Fencing/FencingToolbar';
import nameGenerator from '../../lib/nameGenerator';
import {useGameEvents, GameEventsHook} from '../common/useGameEvents';
import {getStartingCursorPosition} from '../../shared/fencingGameEvents/eventDefs/create';
import Nav from '../common/Nav';
import Chat from '../Chat';
import {FencingCountdown} from '../Fencing/FencingCountdown';

// TODO
// Implement a pared down version of the normal game. No chat needed
// Make calls to localStorage when determining the truth of the status
// of the game.
// Add cute single player icons ala fencing mode.

// Connects to the server and listens for various events.
function subscribeToGameEvents(
  socket: SocketIOClient.Socket | undefined,
  gid: string,
  eventsHook: GameEventsHook
) {
  let connected = false;
  async function joinAndSync() {
    if (!socket) return;
    await emitAsync(socket, 'join_game', gid);
    socket.on('game_event', (event: any) => {
      if (!connected) return;
      eventsHook.addEvent(event);
    });
    const allEvents: GameEvent[] = (await emitAsync(socket, 'sync_all_game_events', gid)) as any;
    eventsHook.setEvents(allEvents);

    connected = true;
  }
  function unsubscribe() {
    if (!socket) return;
    console.log('unsubscribing from game events...');
    emitAsync(socket, 'leave_game', gid);
  }
  const syncPromise = joinAndSync();

  return {syncPromise, unsubscribe};
}
const useStyles = makeStyles({
  container: {
    flex: 1,
    display: 'flex',
    // height: '100%',
    padding: 24,
    flexDirection: 'column',
  },
  scoreboardContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: 12,
    '& *': {
      borderCollapse: 'collapse',
    },
  },
});

// The component that handles singleplayer mode
export const SinglePlayer: React.FC<{gid: string}> = (props) => {
  const {gid} = props;
  const socket = useSocket();

  const eventsHook = useGameEvents();
  async function sendEvent(event: GameEvent) {
    (event as any).timestamp = {
      '.sv': 'timestamp',
    };
    (event as any).id = uuid.v4();
    console.log('sending event', socket, event);
    eventsHook.addOptimisticEvent(event);
    if (socket) {
      emitAsync(socket, 'game_event', {gid, event});
    } else {
      console.warn('Cannot send event; not connected to server');
    }
  }

  const [isInitialized, setIsInitialized] = useState(false);
  useUpdateEffect(() => {
    eventsHook.setEvents([]);
    const {syncPromise, unsubscribe} = subscribeToGameEvents(socket, gid, eventsHook);
    syncPromise.then(() => {
      setIsInitialized(true);
    });
    return unsubscribe;
  }, [gid, socket]);
  const gameState = eventsHook.gameState;

  const id = getUser().id;

  useUpdateEffect(() => {
    if (isInitialized) {
      console.log('initializing for the first time', id);
      if (!gameState) {
        throw new Error("gameState is falsey in useUpdateEffect, this shouldn't happen");
        return; // shouldn't happen
      }
      if (!gameState.users[id]?.displayName) {
        sendEvent({
          type: 'updateDisplayName',
          params: {
            id,
            displayName: nameGenerator(),
          },
        });
      }
    }
  }, [isInitialized]);

  const classes = useStyles();
  console.log('Game State:', gameState);

  const toolbarActions = useToolbarActions(sendEvent, gameState, id);
  const playerActions = usePlayerActions(sendEvent, id);

  const changeName = (newName: string): void => {
    if (newName.trim().length === 0) {
      newName = nameGenerator();
    }
    sendEvent({
      type: 'updateDisplayName',
      params: {
        id,
        displayName: newName,
      },
    });
  };
  return (
    <Flex>
      <div>Hello World</div>
    </Flex>
  );
  return (
    <Flex column style={{flex: 1}}>
      <Nav hidden={false} v2 canLogin={false} divRef={null} linkStyle={null} mobile={null} />
      <Flex style={{flex: 1, overflow: 'auto'}}>
        <div className={classes.container}>
          <Helmet title={`Single Player ${gid}`} />
          <div style={{flex: 1}}>
            <FencingCountdown playerActions={playerActions} gameState={gameState} gameEventsHook={eventsHook}>
              {gameState.loaded && gameState.started && (
                <>
                  {' '}
                  <FencingToolbar toolbarActions={toolbarActions} />
                  <Player
                    // eslint-disable-next-line react/jsx-props-no-spreading
                    {...transformGameToPlayerPropsSingle(
                      gameState.game!,
                      _.values(gameState.users),
                      playerActions,
                      id
                    )}
                  />
                </>
              )}
            </FencingCountdown>
          </div>
        </div>
      </Flex>
    </Flex>
  );
};
