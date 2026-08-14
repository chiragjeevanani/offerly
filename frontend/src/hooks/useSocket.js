import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { STORAGE_KEYS, API_BASE_URL } from '../config/constants';

// Singleton socket instance
let socket;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!socket) {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userData = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_DATA) || '{}');
      
      const socketUrl = API_BASE_URL.replace('/api', ''); // Assuming API_BASE_URL ends with /api
      
      socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        setIsConnected(true);
        console.log('Socket Connected');
        
        // Join appropriate room
        if (userData?.role === 'admin') {
          socket.emit('join', { userId: userData._id, role: 'admin' });
        } else if (userData?.role === 'merchant') {
          socket.emit('join', { userId: userData._id, role: 'merchant' });
        } else if (userData?.role === 'customer') {
          socket.emit('join', { userId: userData._id, role: 'customer' });
        }
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        console.log('Socket Disconnected');
      });

      socket.on('connect_error', (err) => {
        setError(err.message);
        console.error('Socket Connection Error:', err);
      });
    }

    return () => {
      // Optional: don't disconnect on every unmount if we want a persistent connection
      // but we might want to cleanup listeners
    };
  }, []);

  return { socket, isConnected, error };
};
