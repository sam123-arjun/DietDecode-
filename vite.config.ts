import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

interface ActiveReminder {
  id: string;
  mealName: string;
  time: string;
  status: 'upcoming' | 'active' | 'completed' | 'missed';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

let activeReminder: ActiveReminder | null = {
  id: 'rem_initial_sync',
  mealName: 'Lunch',
  time: '01:00 PM',
  status: 'upcoming',
};

const esp32ApiPlugin = (): Plugin => ({
  name: 'esp32-hardware-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url || '';

      // Only handle /api routes
      if (!url.startsWith('/api')) {
        return next();
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      const parseJson = (): Promise<any> =>
        new Promise((resolve) => {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              resolve(body ? JSON.parse(body) : {});
            } catch {
              resolve({});
            }
          });
        });

      // GET /api/reminder - Poll endpoint for physical ESP32 and Web App
      if (url.startsWith('/api/reminder') && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            hasActiveReminder: activeReminder?.status === 'active',
            reminder: activeReminder,
            serverTimestamp: new Date().toISOString(),
          })
        );
        return;
      }

      // POST /api/trigger - Trigger an alert (from Web App or test curl)
      if (url.startsWith('/api/trigger') && req.method === 'POST') {
        const body = await parseJson();
        activeReminder = {
          id: body.id || 'rem_' + Date.now(),
          mealName: body.mealName || 'Macro Balanced Lunch',
          time:
            body.time ||
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'active',
        };
        console.log('[ESP32 API] Reminder triggered:', activeReminder.mealName);
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, reminder: activeReminder }));
        return;
      }

      // POST /api/acknowledge - Physical button on GPIO 18 pressed by user!
      if (url.startsWith('/api/acknowledge') && req.method === 'POST') {
        const body = await parseJson();
        if (activeReminder) {
          activeReminder.status = 'completed';
          activeReminder.acknowledgedBy = body.acknowledgedBy || 'ESP32_PUSH_BUTTON_GPIO18';
          activeReminder.acknowledgedAt = new Date().toISOString();
        }
        console.log(
          '[ESP32 API] Reminder acknowledged by hardware button:',
          body.acknowledgedBy || 'GPIO18'
        );
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, reminder: activeReminder }));
        return;
      }

      // POST /api/reset - Reset state back to upcoming
      if (url.startsWith('/api/reset') && req.method === 'POST') {
        activeReminder = {
          id: 'rem_' + Date.now(),
          mealName: 'Next Meal',
          time: 'Scheduled',
          status: 'upcoming',
        };
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, reminder: activeReminder }));
        return;
      }

      // GET /api/status - Live hardware heartbeat endpoint
      if (url.startsWith('/api/status') && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            status: 'online',
            service: 'DietDecode IoT Bridge',
            activeReminder,
          })
        );
        return;
      }

      next();
    });
  },
});

export default defineConfig({
  plugins: [react(), esp32ApiPlugin()],
  server: {
    host: '0.0.0.0', // Allow connections from physical ESP32 on the local Wi-Fi
    port: 5173,
  },
  // Pre-bundle heavy dependencies so Vite doesn't waterfall-request them in dev
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/database',
      'lucide-react',
    ],
  },
  build: {
    // Split vendor chunks so browsers can cache them independently of app code
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/firebase')) {
            return 'vendor-firebase';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
        },
      },
    },
    // Increase warning threshold slightly to reduce noise (pages are now split)
    chunkSizeWarningLimit: 600,
  },
});
