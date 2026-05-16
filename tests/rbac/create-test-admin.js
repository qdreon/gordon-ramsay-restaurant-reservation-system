#!/usr/bin/env node

/**
 * Create Test Admin Account
 * 
 * This script creates the test-admin@example.com account in Supabase using
 * the admin API and sets the role to 'admin' in the public.users table.
 * 
 * Prerequisites:
 *   - Node.js installed
 *   - Environment variables set:
 *     * NEXT_PUBLIC_SUPABASE_URL
 *     * SUPABASE_SERVICE_ROLE_KEY (admin key, NOT anon key)
 * 
 * Usage:
 *   npm install @supabase/supabase-js
 *   node create-test-admin.js
 */

const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { resolve } = require('path');

// Load environment variables from .env.local
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    console.error('❌ .env.local not found. Please create it with Supabase credentials.');
    process.exit(1);
  }

  const envContent = readFileSync(envPath, 'utf8');
  const env = {};

  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const [key, ...rest] = trimmed.split('=');
    let value = rest.join('=').trim();

    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

async function createTestAdmin() {
  const env = loadEnv();

  const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY (admin key)');
    process.exit(1);
  }

  try {
    // Create admin client (using service role key)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    console.log('🔄 Creating test admin account...');
    console.log('   Email: test-admin@example.com');
    console.log('   Password: TestPassword123!');

    // Step 1: Create user in auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: 'test-admin@example.com',
      password: 'TestPassword123!',
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: 'Test Admin',
      },
    });

    if (userError) {
      if (userError.message.includes('already exists')) {
        console.log('⚠️  User already exists, proceeding to set role...');
      } else {
        throw userError;
      }
    } else {
      console.log('✅ User created in auth.users');
      console.log(`   User ID: ${userData.user.id}`);
    }

    // Step 2: Set role to 'admin' in public.users
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('email', 'test-admin@example.com')
      .select();

    if (updateError) {
      throw updateError;
    }

    if (updateData && updateData.length > 0) {
      console.log('✅ Role set to "admin" in public.users');
      console.log(`   Updated ${updateData.length} record(s)`);
    } else {
      console.log('⚠️  No records updated. User may not exist in public.users yet.');
      console.log('   The auth trigger may not have created the public.users record.');
      console.log('   Try signing in once to trigger the creation.');
    }

    // Step 3: Verify
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('email, role')
      .eq('email', 'test-admin@example.com')
      .single();

    if (verifyError) {
      console.log('⚠️  Verification query failed (user may not exist yet)');
    } else if (verifyData) {
      console.log('✅ Verification successful:');
      console.log(`   Email: ${verifyData.email}`);
      console.log(`   Role: ${verifyData.role}`);
    }

    console.log('\n🎉 Test admin account is ready!');
    console.log('   Use these credentials to test:');
    console.log('   - Email: test-admin@example.com');
    console.log('   - Password: TestPassword123!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestAdmin();
