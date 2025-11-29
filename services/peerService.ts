import { Peer, DataConnection } from 'peerjs';
import { NetworkPacket } from '../types';

export class PeerService {
  private peer: Peer | null = null;
  private connections: DataConnection[] = []; // Host maintains multiple connections
  private hostConn: DataConnection | null = null; // Client maintains one connection to Host
  private myId: string = '';
  private isHost: boolean = false;

  // Callbacks
  public onConnect: (id: number) => void = () => { };
  public onDisconnect: (id: number) => void = () => { };

  private dataListeners: Array<(data: NetworkPacket) => void> = [];

  constructor() { }

  /**
   * Subscribe to incoming network packets.
   * Returns an unsubscribe function that should be called on cleanup.
   */
  public addDataListener(listener: (data: NetworkPacket) => void): () => void {
    this.dataListeners.push(listener);
    return () => {
      this.dataListeners = this.dataListeners.filter((l) => l !== listener);
    };
  }

  private emitData(data: NetworkPacket) {
    for (const listener of this.dataListeners) {
      try {
        listener(data);
      } catch (e) {
        console.error('PeerService listener error', e);
      }
    }
  }

  // Generate a random 4-char code
  private generateCode(): string {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  // Host a room
  public async host(): Promise<string> {
    // Clean up any existing connection first
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections = [];
    this.hostConn = null;
    
    const code = this.generateCode();
    // Prefix to namespace our app
    const peerId = `neondash-${code}`;
    this.isHost = true;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(peerId);

        this.peer.on('open', (id) => {
          this.myId = id;
          resolve(code);
        });

        this.peer.on('connection', (conn) => {
          this.setupConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.error("Peer Error:", err);
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // Join a room
  public async join(code: string): Promise<void> {
    // Clean up any existing connection first
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections = [];
    this.hostConn = null;
    
    this.isHost = false;
    return new Promise((resolve, reject) => {
      try {
        // Client gets a random ID
        this.peer = new Peer();

        this.peer.on('open', () => {
          const destId = `neondash-${code.toUpperCase()}`;
          const conn = this.peer!.connect(destId);

          conn.on('open', () => {
            this.hostConn = conn;
            this.setupClientConnection(conn);
            resolve();
          });

          conn.on('error', (err) => {
            reject(err);
          });
        });

        this.peer.on('error', (err) => reject(err));
      } catch (e) {
        reject(e);
      }
    });
  }

  private setupConnection(conn: DataConnection) {
    this.connections.push(conn);

    // Assign an ID to this connection (Simple increment for now, handled by App logic usually, but here we just track connection)
    // We'll let the App layer handle ID assignment via handshake if needed,
    // but for now let's just notify a new connection.

    conn.on('open', () => {
      // Notify App a player connected. App should assign ID and sync.
      this.onConnect(this.connections.length + 1); // Host is 1, so first conn is 2

      // Broadcast new player count to all and notify host
      const count = this.connections.length + 1;
      const syncPacket: NetworkPacket = { type: 'SYNC_PLAYERS', data: { count } };
      this.emitData(syncPacket);
      this.broadcast(syncPacket);

      // Send WELCOME with ID to the new player
      conn.send({ type: 'WELCOME', data: { id: count } });
    });

    conn.on('data', (data: any) => {
      // Host received data. Broadcast to others.
      this.emitData(data as NetworkPacket);
      this.broadcast(data, conn.peer); // Don't send back to sender
    });

    conn.on('close', () => {
      // Find which player ID this was BEFORE removing from array
      const playerIndex = this.connections.indexOf(conn);
      const playerId = playerIndex + 2; // +2 because host is 1, first conn is 2

      // Remove the connection
      this.connections = this.connections.filter(c => c !== conn);
      this.onDisconnect(playerId);

      // Broadcast player leave and new player count to REMAINING connections
      const count = this.connections.length + 1; // +1 for host
      const leavePacket: NetworkPacket = { type: 'PLAYER_LEAVE', data: { id: playerId } };
      const syncPacket: NetworkPacket = { type: 'SYNC_PLAYERS', data: { count } };
      this.emitData(leavePacket);
      this.emitData(syncPacket);
      this.broadcast(leavePacket);
      this.broadcast(syncPacket);
    });
  }

  private setupClientConnection(conn: DataConnection) {
    conn.on('data', (data: any) => {
      this.emitData(data as NetworkPacket);
      
      // If we receive HOST_DISCONNECT, clean up our connection
      if (data.type === 'HOST_DISCONNECT') {
        this.cleanupClientConnection();
      }
    });

    conn.on('close', () => {
      // Emit HOST_DISCONNECT locally so App.tsx can handle it
      this.emitData({ type: 'HOST_DISCONNECT' });
      this.cleanupClientConnection();
      this.onDisconnect(1); // Host disconnected
    });
  }

  private cleanupClientConnection() {
    if (this.hostConn) {
      this.hostConn.close();
      this.hostConn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.isHost = false;
  }

  public send(data: NetworkPacket) {
    if (this.isHost) {
      // Host: emit locally and broadcast to all clients
      this.emitData(data);
      this.broadcast(data);
    } else {
      if (this.hostConn && this.hostConn.open) {
        this.hostConn.send(data);
      }
    }
  }

  public broadcast(data: NetworkPacket, excludePeerId?: string) {
    this.connections.forEach(conn => {
      if (conn.open && conn.peer !== excludePeerId) {
        conn.send(data);
      }
    });
  }

  public destroy() {
    // If we're a client, just close gracefully
    if (!this.isHost) {
      if (this.hostConn) this.hostConn.close();
      if (this.peer) this.peer.destroy();
      this.connections = [];
      this.hostConn = null;
      this.peer = null;
      return;
    }

    // If we're the host, notify all clients BEFORE closing
    if (this.connections.length > 0) {
      this.broadcast({ type: 'HOST_DISCONNECT' });

      // Give packets time to send before destroying
      setTimeout(() => {
        this.connections.forEach(c => c.close());
        if (this.peer) this.peer.destroy();
        this.connections = [];
        this.peer = null;
      }, 100);
    } else {
      // No clients, just destroy immediately
      if (this.peer) this.peer.destroy();
      this.connections = [];
      this.peer = null;
    }
  }
}