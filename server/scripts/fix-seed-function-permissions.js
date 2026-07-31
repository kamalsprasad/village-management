#!/usr/bin/env node
/**
 * One-shot fix: the live `seedAllData` Appwrite Function was created with
 * `execute: []` (no execute permissions) and a 15s timeout. Calling it from
 * the client therefore returns 401 "No permissions provided for action
 * 'execute'", and even if it didn't, seeding (which takes minutes) would
 * time out.
 *
 * This script updates the live function so that:
 *   execute = ["team:village_administrators"]   (matches appwrite.config.json)
 *   timeout = 900                               (matches appwrite.config.json)
 *
 * It does NOT execute the function. It only calls functions.update().
 *
 * Usage: node server/scripts/fix-seed-function-permissions.js
 */
import { Client, Functions } from 'node-appwrite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const stripQuotes = (s) => (s ? s.replace(/^["']|["']$/g, '') : s);

const client = new Client()
  .setEndpoint(stripQuotes(process.env.APPWRITE_ENDPOINT) || 'https://cloud.appwrite.io/v1')
  .setProject(stripQuotes(process.env.APPWRITE_PROJECT_ID))
  .setKey(stripQuotes(process.env.APPWRITE_API_KEY));

const functions = new Functions(client);

const FUNCTION_ID = process.env.VITE_APPWRITE_FUNCTION_SEED_DATA || 'seedAllData';
const DESIRED_EXECUTE = ['team:village_administrators'];
const DESIRED_TIMEOUT = 900;

async function main() {
  console.log(`Patching function "${FUNCTION_ID}"...`);

  // Fetch current state so we only change what's needed and can report a diff.
  let before;
  try {
    before = await functions.get(FUNCTION_ID);
  } catch (e) {
    console.error(`Could not fetch function "${FUNCTION_ID}": ${e.message}`);
    process.exit(1);
  }

  console.log('  BEFORE:', {
    execute: before.execute,
    timeout: before.timeout,
    runtime: before.runtime,
    specification: before.specification,
  });

  const needsExecute =
    JSON.stringify(before.execute || []) !== JSON.stringify(DESIRED_EXECUTE);
  const needsTimeout = before.timeout !== DESIRED_TIMEOUT;

  if (!needsExecute && !needsTimeout) {
    console.log('  Already correct — no changes needed.');
    return;
  }

  // functions.update requires name + runtime (unchanged) plus the fields we fix.
  await functions.update({
    functionId: FUNCTION_ID,
    name: before.name,
    runtime: before.runtime,
    execute: DESIRED_EXECUTE,
    events: before.events || [],
    schedule: before.schedule || '',
    timeout: DESIRED_TIMEOUT,
  });

  const after = await functions.get(FUNCTION_ID);
  console.log('  AFTER :', {
    execute: after.execute,
    timeout: after.timeout,
    runtime: after.runtime,
    specification: after.specification,
  });

  console.log('\nDone. You can now test "Load Sample Data" in the Setup Wizard.');
}

main().catch((e) => {
  console.error('Fix failed:', e.message);
  process.exit(1);
});
