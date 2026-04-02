import { db } from '../server/db';
import { businesses, contracts, users } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Migration script to create customer businesses and backfill customerBusinessId
 * for existing contracts with invoiceCustomer=true
 */

async function migrateCustomerBusiness() {
  console.log('Starting customer business migration...');

  try {
    // Find the SDP super admin user to use as owner for customer businesses
    const sdpAdmins = await db
      .select()
      .from(users)
      .where(and(
        eq(users.userType, 'sdp_internal'),
        eq(users.email, 'admin@sdpglobalpay.com')
      ))
      .limit(1);

    if (sdpAdmins.length === 0) {
      throw new Error('SDP admin user not found. Cannot proceed with migration.');
    }

    const sdpAdmin = sdpAdmins[0];
    console.log(`Using SDP admin (${sdpAdmin.email}) as owner for customer businesses`);

    // Get all contracts with invoiceCustomer=true and missing customerBusinessId
    const contractsToMigrate = await db
      .select()
      .from(contracts)
      .where(eq(contracts.invoiceCustomer, true));

    console.log(`Found ${contractsToMigrate.length} contracts with invoiceCustomer=true`);

    for (const contract of contractsToMigrate) {
      if (contract.customerBusinessId) {
        console.log(`Contract ${contract.id} already has customerBusinessId: ${contract.customerBusinessId}`);
        continue;
      }

      const customerName = contract.clientName;
      if (!customerName) {
        console.warn(`Contract ${contract.id} has no clientName, skipping`);
        continue;
      }

      console.log(`Processing contract ${contract.id} for customer: ${customerName}`);

      // Check if a business with this name already exists
      const existingBusiness = await db
        .select()
        .from(businesses)
        .where(eq(businesses.name, customerName))
        .limit(1);

      let customerBusinessId: string;

      if (existingBusiness.length > 0) {
        // Use existing business
        customerBusinessId = existingBusiness[0].id;
        console.log(`  Found existing business: ${customerBusinessId}`);
      } else {
        // Create new customer business owned by SDP admin
        const newBusiness = await db.insert(businesses).values({
          name: customerName,
          ownerId: sdpAdmin.id, // Customer businesses are owned by SDP admin
        }).returning();

        customerBusinessId = newBusiness[0].id;
        console.log(`  Created new customer business: ${customerBusinessId}`);
      }

      // Update the contract with customerBusinessId
      await db
        .update(contracts)
        .set({ customerBusinessId })
        .where(eq(contracts.id, contract.id));

      console.log(`  ✓ Updated contract ${contract.id} with customerBusinessId: ${customerBusinessId}`);
    }

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateCustomerBusiness()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
