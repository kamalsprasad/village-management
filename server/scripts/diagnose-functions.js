#!/usr/bin/env node
/**
 * Read-only diagnostic: prints the live configuration of the Appwrite Functions
 * (especially their `execute` permissions) so we can see whether the
 * `seedAllData` function actually has the team:village_administrators execute
 * permission applied on the server.
 *
 * This script does NOT execute any function. It only calls Functions.list().
 */
import { Client, Functions, Teams } from 'node-appwrite';
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
const teams = new Teams(client);

console.log('=== Teams ===');
try {
  const teamList = await teams.list();
  for (const t of teamList.teams) {
    console.log(`Team: ${t.$id}  name="${t.name}"  total=${teamList.total ?? '?'}`);
    try {
      const members = await teams.listMemberships({ teamId: t.$id });
      for (const m of members.memberships) {
        console.log(
          `   member: userId=${m.userId}  email=${m.email || '(no email)'}  roles=[${(m.roles || []).join(',')}]`,
        );
      }
    } catch (e) {
      console.log(`   (could not list memberships: ${e.message})`);
    }
  }
} catch (e) {
  console.log('Could not list teams:', e.message);
}

console.log('\n=== Functions ===');
try {
  const fnList = await functions.list();
  console.log(`Total functions: ${fnList.total}`);
  for (const f of fnList.functions) {
    console.log(`\nFunction: ${f.$id}  name="${f.name}"  enabled=${f.enabled}`);
    console.log(`   execute: ${JSON.stringify(f.execute)}`);
    console.log(`   runtime: ${f.runtime}  timeout: ${f.timeout}s  spec: ${f.specification}`);
  }
} catch (e) {
  console.error('Could not list functions:', e.message);
}
