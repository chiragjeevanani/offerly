import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../modules/customer/context/AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isLoggedIn } = useAuth();

  useEffect(() => {
    // Only connect if user is logged in
    if (!isLoggedIn || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketInstance = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');

    socketInstance.on('connect', () => {
      setIsConnected(true);
      // Join room based on role
      socketInstance.emit('join', { 
        userId: user._id || user.id, 
        role: user.role || 'customer' 
      });
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [isLoggedIn, user?._id, user?.id, user?.role]); 

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext) || { socket: null, isConnected: false };
};
