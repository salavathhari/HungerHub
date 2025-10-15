import express  from "express"
import cors from 'cors'
import { createServer } from 'http'
import { Server as IOServer } from 'socket.io'
import jwt from 'jsonwebtoken'
import vendorModel from './models/vendorModel.js'
import userModel from './models/userModel.js'
import { connectDB } from "./config/db.js"
import userRouter from "./routes/userRoute.js"
import foodRouter from "./routes/foodRoute.js"
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import cartRouter from "./routes/cartRoute.js"
import orderRouter from "./routes/orderRoute.js"
import vendorRouter from "./routes/vendorRoute.js"
import deliveryRouter from "./routes/deliveryRoute.js"
import reviewRouter from "./routes/reviewRoute.js"

// load .env from the backend folder explicitly so env vars are available even
// if node is started from the repository root or another working dir
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

// app config
const app = express()
const port = process.env.PORT || 4000;


// middlewares
app.use(express.json())
app.use(cors())

// db connection
connectDB()

// api endpoints
app.use("/api/user", userRouter)
app.use("/api/food", foodRouter)
// Serve uploaded images from the uploads directory (use absolute path)
app.use("/images", express.static(path.join(__dirname, 'uploads')))
app.use("/api/cart", cartRouter)
app.use("/api/order",orderRouter)
app.use("/api/vendor", vendorRouter)
app.use("/api/delivery", deliveryRouter)
app.use("/api/review", reviewRouter)

app.get("/", (req, res) => {
    res.send("API Working")
  });

// Debug: print all registered routes (helpful to diagnose 404 issues)
function printRoutes() {
  try {
    console.log('Registered routes:');
    const routes = [];
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        // routes registered directly on the app
        const methods = Object.keys(middleware.route.methods).join(',').toUpperCase();
        routes.push(`${methods} ${middleware.route.path}`);
      } else if (middleware.name === 'router' && middleware.handle && middleware.handle.stack) {
        // router middleware
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            const methods = Object.keys(handler.route.methods).join(',').toUpperCase();
            routes.push(`${methods} ${handler.route.path}`);
          }
        });
      }
    });
    routes.forEach(r => console.log('  ', r));
  } catch (e) {
    console.error('Failed to enumerate routes:', e);
  }
}

// Try to listen on the requested port; if in use, try the next few ports
function tryListen(startPort, attempts = 10) {
  const p = Number(startPort);
  const httpServer = createServer(app);

  // attach socket.io to the http server
  const io = new IOServer(httpServer, { cors: { origin: '*' } });
  // store io instance on app so controllers can emit events
  app.set('io', io);

  io.on('connection', async (socket) => {
    console.log('Socket connected:', socket.id);
    try {
      // token may be provided in handshake auth
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (token) {
        try {
          const payload = jwt.verify(token, process.env.JWT_SECRET);
          const userId = payload.id;
          socket.userId = userId;
          // always join a user-specific room
          socket.join(`user:${userId}`);
          // if this user owns a vendor, join vendor rooms for their vendor
          try {
            const ownerVendor = await vendorModel.findOne({ ownerId: userId });
            if (ownerVendor && ownerVendor._id) {
              socket.join(`vendor:${ownerVendor._id}`);
              socket.join(`vendor-owner:${userId}`);
            }
          } catch (e) { /* ignore vendor room join errors */ }
          // if this user is a delivery user, join rooms for vendors assigned to them
          try {
            const assignedVendors = await vendorModel.find({ deliveryBoys: { $in: [String(userId), userId] } });
            if (assignedVendors && assignedVendors.length) {
              assignedVendors.forEach(v => {
                if (v && v._id) socket.join(`vendor:${v._id}`);
              })
            }
          } catch (e) { /* ignore */ }
        } catch (e) {
          console.warn('Socket auth failed:', e.message || e);
        }
      }
    } catch (e) {
      console.error('Error during socket connection handling', e);
    }
    socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
    // allow clients to join an order-specific room to receive location updates
    socket.on('join:order', (data) => {
      try {
        const oid = data && (data.orderId || data.order);
        if (oid) socket.join(`order:${String(oid)}`);
      } catch (e) { console.warn('join:order failed', e) }
    });
    socket.on('leave:order', (data) => {
      try {
        const oid = data && (data.orderId || data.order);
        if (oid) socket.leave(`order:${String(oid)}`);
      } catch (e) { console.warn('leave:order failed', e) }
    });
  });

  httpServer.listen(p, () => {
    console.log(`Server started on http://localhost:${p}`);
    // print routes once server is up
    setTimeout(printRoutes, 200);
  });

  httpServer.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`Port ${p} in use, trying next port...`);
      httpServer.close();
      if (attempts > 0) {
        tryListen(p + 1, attempts - 1);
      } else {
        console.error('All port attempts failed. Please free the port or set a different PORT in .env');
        process.exit(1);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

tryListen(port, 10);