import dns from 'dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Ensure Node.js can resolve MongoDB Atlas SRV records even if local ISP DNS fails
try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
    // Keep system default if setting servers fails
}

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri || !uri.startsWith('mongodb')) {
            console.error('MongoDB URI is missing or invalid in environment variables.');
            process.exit(1);
        }

        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
        console.log(`Database Name: ${conn.connection.name}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB.connectionState = () => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    return states[mongoose.connection.readyState] || 'unknown';
};

export default connectDB;
