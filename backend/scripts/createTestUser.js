import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import userModel from '../models/userModel.js';
import vendorModel from '../models/vendorModel.js';
import bcrypt from 'bcrypt';

// load .env from backend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const EMAIL = process.env.EMAIL || process.argv[2];
  const PASSWORD = process.env.PASSWORD || process.argv[3];
  const ROLE = (process.env.ROLE || process.argv[4] || 'vendor');
  const CREATE_VENDOR = (process.env.CREATE_VENDOR || process.argv[5] || '1');

  if (!EMAIL || !PASSWORD) {
    console.error('Usage: set EMAIL and PASSWORD via env or pass as args: EMAIL PASSWORD [ROLE] [CREATE_VENDOR]');
    process.exit(1);
  }

  await connectDB();

  const existing = await userModel.findOne({ email: EMAIL });
  if (existing) {
    console.log('User already exists:', existing.email, 'role=', existing.role);
    process.exit(0);
  }

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(PASSWORD, salt);

  const user = new userModel({ name: EMAIL.split('@')[0], email: EMAIL, password: hashed, role: ROLE });
  await user.save();
  console.log('Created user', EMAIL, 'role=', ROLE);

  if ((ROLE === 'vendor' || CREATE_VENDOR === '1' || CREATE_VENDOR === 'true')) {
    const existingVendor = await vendorModel.findOne({ ownerId: user._id });
    if (!existingVendor) {
      const vendor = new vendorModel({ name: `${user.name}'s Restaurant`, ownerId: user._id, address: {}, phone: '' });
      await vendor.save();
      console.log('Created vendor for user:', vendor._id.toString());
    } else {
      console.log('Vendor already exists for this user');
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Error creating test user', err);
  process.exit(1);
});
