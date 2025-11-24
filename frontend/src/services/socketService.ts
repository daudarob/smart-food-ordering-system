import { io, Socket } from 'socket.io-client';
import { store } from '../redux/store';
import { fetchAdminMenuItems } from '../redux/adminSlice';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(userId?: string) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server via WebSocket');
      this.reconnectAttempts = 0;

      // Join user-specific room if userId provided
      if (userId) {
        this.socket?.emit('join', userId);
        console.log(`Joined user room: ${userId}`);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.handleReconnect();
    });

    // Listen for menu updates
    this.socket.on('menuUpdated', (data) => {
      console.log('Menu updated via WebSocket:', data);
      // Refresh menu items in Redux store
      store.dispatch(fetchAdminMenuItems());
    });

    // Listen for order updates
    this.socket.on('orderUpdated', (data) => {
      console.log('Order updated via WebSocket:', data);
      // Could dispatch order refresh if needed
    });

    // Listen for discount updates
    this.socket.on('discountUpdated', (data) => {
      console.log('Discount updated via WebSocket:', data);
      // Could dispatch discount refresh if needed
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        this.connect();
      }, 2000 * this.reconnectAttempts); // Exponential backoff
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket disconnected');
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Method to manually emit events if needed
  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  }
}

export const socketService = new SocketService();