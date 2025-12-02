/**
 * Seed Default Super Admin
 * Run: node server/scripts/seedSuperAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const DEFAULT_ADMIN = {
  username: 'superadmin',
  email: 'admin@cryptotribes.io',
  password: 'CryptoTribes2024!', // Change this in production!
  role: 'super_admin'
};

async function seedSuperAdmin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptotribes';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if super admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [
        { email: DEFAULT_ADMIN.email },
        { username: DEFAULT_ADMIN.username }
      ]
    });

    if (existingAdmin) {
      console.log('Super Admin already exists:');
      console.log(`  Username: ${existingAdmin.username}`);
      console.log(`  Email: ${existingAdmin.email}`);
      console.log(`  Role: ${existingAdmin.role}`);
      await mongoose.disconnect();
      return;
    }

    // Create super admin
    const admin = new Admin({
      username: DEFAULT_ADMIN.username,
      email: DEFAULT_ADMIN.email,
      passwordHash: DEFAULT_ADMIN.password, // Will be hashed by pre-save hook
      role: DEFAULT_ADMIN.role,
      isActive: true
    });

    await admin.save();

    console.log('\\n========================================');
    console.log('  DEFAULT SUPER ADMIN CREATED');
    console.log('========================================');
    console.log(`  Username: ${DEFAULT_ADMIN.username}`);
    console.log(`  Email: ${DEFAULT_ADMIN.email}`);
    console.log(`  Password: ${DEFAULT_ADMIN.password}`);
    console.log('========================================');
    console.log('  CHANGE PASSWORD IMMEDIATELY!');
    console.log('========================================\\n');

    await mongoose.disconnect();
    console.log('Done.');
  } catch (error) {
    console.error('Error seeding super admin:', error);
    process.exit(1);
  }
}

seedSuperAdmin();
