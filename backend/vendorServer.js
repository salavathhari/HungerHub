import express from 'express'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import { connectDB } from './config/db.js'
import userRouter from './routes/userRoute.js'
import vendorRouter from './routes/vendorRoute.js'

// load .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.VENDOR_PORT || 4100;

app.use(express.json());
app.use(cors());

// connect DB
connectDB();

// vendor-focused routes
app.use('/api/user', userRouter);
app.use('/api/vendor', vendorRouter);

app.get('/', (req, res) => res.send('Vendor API Running'));

app.listen(port, () => console.log(`Vendor server started at http://localhost:${port}`));
