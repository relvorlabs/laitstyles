#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/prisma/client.ts";

process.loadEnvFile(".env.local");

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    password: { type: "string" },
  },
  allowPositionals: false,
});

if (!values.email || !values.password) {
  fail("Usage: pnpm auth:bootstrap-admin -- --email <email> --password <password>");
}

const email = normalizeEmail(values.email);
const password = String(values.password);
if (password.length < 12) fail("Admin passwords must be at least 12 characters long.");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const databaseUrl = process.env.DATABASE_URL;
if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
  fail("Set the Supabase URL, service-role key, and DATABASE_URL before bootstrapping the admin.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

try {
  const user = await ensureAuthUser(email, password);
  const existingAdmin = await prisma.profiles.findFirst({ where: { role: "admin" }, select: { id: true } });
  if (existingAdmin && existingAdmin.id !== user.id) {
    fail("An admin/store owner already exists. This single-store application allows only one admin.");
  }

  await prisma.profiles.upsert({
    where: { id: user.id },
    update: { email, role: "admin" },
    create: { id: user.id, email, role: "admin" },
  });
  console.log("Admin bootstrap complete. user_id=" + user.id);
} finally {
  await prisma.$disconnect();
}

async function ensureAuthUser(emailAddress, userPassword) {
  const existing = await findUserByEmail(emailAddress);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: userPassword,
      email_confirm: true,
    });
    if (error || !data.user) fail("Could not update the admin auth user: " + (error?.message ?? "unknown error"));
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: emailAddress,
    password: userPassword,
    email_confirm: true,
  });
  if (error || !data.user) fail("Could not create the admin auth user: " + (error?.message ?? "unknown error"));
  return data.user;
}

async function findUserByEmail(emailAddress) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) fail("Could not list auth users: " + error.message);
    const user = data.users.find((candidate) => normalizeEmail(candidate.email) === emailAddress);
    if (user) return user;
    if (data.users.length < 100) return null;
  }
  fail("Admin lookup exceeded 1,000 users.");
}

function normalizeEmail(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) fail("Provide a valid --email address.");
  return normalized;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
