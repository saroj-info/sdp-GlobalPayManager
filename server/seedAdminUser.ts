import { storage } from "./storage";
import bcrypt from "bcrypt";

// Create an SDP Super Admin user for testing
async function seedAdminUser() {
  console.log("🔑 Seeding SDP Super Admin user for testing...");

  try {
    const adminEmail = "admin@sdpglobalpay.com";
    const adminPassword = "admin123";

    // Check if admin user already exists
    const existingUser = await storage.getUserByEmail(adminEmail);
    
    if (existingUser) {
      console.log(`👤 Admin user '${adminEmail}' already exists, updating role...`);
      
      // Update to ensure SDP Super Admin role
      await storage.updateSdpUser(existingUser.id, {
        sdpRole: "sdp_super_admin",
        userType: "sdp_internal",
        emailVerified: true,
      });
      
      console.log("✅ Updated existing admin user to SDP Super Admin");
    } else {
      console.log(`👤 Creating new admin user '${adminEmail}'...`);
      
      // Hash the password
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      
      // Create the admin user
      const adminUser = await storage.createUser({
        firstName: "SDP",
        lastName: "Administrator",
        email: adminEmail,
        passwordHash,
        sdpRole: "sdp_super_admin",
        userType: "sdp_internal",
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      });
      
      console.log("✅ Created SDP Super Admin user successfully!");
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔐 Password: ${adminPassword}`);
      console.log(`🆔 User ID: ${adminUser.id}`);
    }

    console.log("\n🎯 Admin Login Instructions:");
    console.log("================================");
    console.log(`1. Navigate to: http://localhost:5000/login`);
    console.log(`2. Use credentials:`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`3. After login, navigate to: http://localhost:5000/admin`);
    console.log(`4. Click on "Email Templates" tab to access email template management`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding admin user:", error);
    process.exit(1);
  }
}

// Run the seeding if this file is executed directly
import { fileURLToPath } from 'url';

if (import.meta.url === `file://${process.argv[1]}`) {
  seedAdminUser();
}

export { seedAdminUser };