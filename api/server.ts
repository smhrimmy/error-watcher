import app from './app.js';
import { monitorService } from './services/monitor.js';
import { KeepAliveService } from './services/keepAlive.js';

const PORT = process.env.PORT || 3001;

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Start the background monitoring service
  // In a production environment, this might be handled by actual AWS Lambdas
  // For this implementation, we run it alongside the API server
  monitorService.start().catch(err => {
    console.error('Failed to start monitoring service:', err);
  });

  // Start KeepAlive service for Supabase
  KeepAliveService.start();
});