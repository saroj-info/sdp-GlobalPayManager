/**
 * Set Super Admin Password
 * 
 * This script hashes the SUPER_ADMIN_PASSWORD from Secrets
 * and updates the super admin user's password_hash
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

async function setAdminPassword() {
  const databaseUrl = process.env.DATABASE_URL;
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  if (!adminPassword) {
    console.error('❌ SUPER_ADMIN_PASSWORD environment variable is not set');
    process.exit(1);
  }

  console.log('🔐 Setting super admin password...\n');

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    // Hash the password
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    // Update the super admin user
    const result = await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, 'test-user-sdpultimateadmin'))
      .returning({ id: users.id, email: users.email });
    
    if (result.length === 0) {
      console.error('❌ Super admin user not found (ID: test-user-sdpultimateadmin)');
      console.log('   Please ensure the seed script has been run first.');
      process.exit(1);
    }
    
    console.log('✅ Password updated successfully!');
    console.log(`   User: ${result[0].email}`);
    console.log(`   ID: ${result[0].id}`);
    console.log('\n🔑 Login Credentials:');
    console.log('   Username: sdpultimateadmin');
    console.log('   Email: admin@sdpglobalpay.com');
    console.log('   Password: [Set from SUPER_ADMIN_PASSWORD secret]');

  } catch (error) {
    console.error('❌ Error setting admin password:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
setAdminPassword()
  .then(() => {
    console.log('\n✨ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to set password:', error);
    process.exit(1);
  });
