import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL?.split(',').map((item) => item.trim()) || true,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join specific rooms based on user role/ID
    socket.on('join', (data) => {
      const { userId, role } = data;
      if (role === 'admin') {
        socket.join('admin_room');
        console.log(`Admin joined room: admin_room`);
      } else if (role === 'merchant' && userId) {
        socket.join(`merchant_${userId}`);
        console.log(`Merchant joined room: merchant_${userId}`);
      } else if (role === 'customer' && userId) {
        socket.join(`customer_${userId}`);
        console.log(`Customer joined room: customer_${userId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Helper methods to emit notifications
export const emitAdminNotification = (notification) => {
  if (io) {
    io.to('admin_room').emit('admin_notification', notification);
  }
};

export const emitMerchantNotification = (merchantId, notification) => {
  if (io) {
    io.to(`merchant_${merchantId}`).emit('merchant_notification', notification);
  }
};

export const emitUserNotification = (userId, notification) => {
  if (io) {
    io.to(`customer_${userId}`).emit('user_notification', notification);
  }
};
