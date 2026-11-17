const app = require('./app');
const { PORT, DATABASE_URL, JWT_SECRET } = require('./config/env');
const { initDatabase, closeDatabase, dbType } = require('./config/database');

async function startServer() {
  try {
    console.log('[Server] Connecting to database...');
    await initDatabase();

    const server = app.listen(PORT, () => {
      console.log('========================================================');
      console.log(`🚀 Expense Tracker API running on port ${PORT}`);
      console.log(`📁 Database: ${dbType.toUpperCase()}`);
      console.log(`🔐 JWT Authentication: Enabled`);
      console.log(`📖 API Documentation: http://localhost:${PORT}/`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
      console.log('========================================================');
    });

    // Graceful shutdown
    const handleShutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await closeDatabase();
        console.log('[Server] Database connections closed. Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  } catch (err) {
    console.error('[Server] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
