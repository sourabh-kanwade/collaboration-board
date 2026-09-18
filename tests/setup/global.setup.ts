import { execSync } from "child_process";

async function globalSetup() {
  console.log("Running global setup: Syncing test database...");

  // Use the test database URL for Prisma
  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/collaboration_test";

  try {
    // Run Prisma db push to sync the schema with the test database
    execSync("npx prisma db push", {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      stdio: "inherit",
    });
    console.log("Test database synced successfully.");
  } catch (error) {
    console.error(
      "Failed to sync test database. Make sure PostgreSQL is running and the credentials are correct.",
    );
    throw error;
  }
}

export default globalSetup;
