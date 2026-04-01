import { spawnSync } from "node:child_process";

const SCHEMA_PATH = "prisma/schema.prisma";
const LEGACY_FAILED_MIGRATION = "20260301153525_init_foundational_tables";
const CURRENT_INIT_MIGRATION = "0001_init";

function run(command, args, options = {}) {
  const { allowFailure = false, label } = options;

  if (label) {
    console.log(`\n[vercel-build] ${label}`);
  }

  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: process.env,
    stdio: "pipe",
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0 && !allowFailure) {
    const error = new Error(`${command} ${args.join(" ")} failed`);
    error.result = result;
    throw error;
  }

  return result;
}

function runPrisma(args, options = {}) {
  return run("npx", ["prisma", ...args], options);
}

function runNextBuild() {
  return run("npx", ["next", "build"], { label: "Build Next.js application" });
}

function shouldBootstrapFromSchema(output) {
  return /P3009|failed migrations in the target database|already exists|duplicate (table|type|index|key)|relation .* already exists/i.test(
    output,
  );
}

function main() {
  runPrisma(
    [
      "migrate",
      "resolve",
      "--rolled-back",
      LEGACY_FAILED_MIGRATION,
      "--schema",
      SCHEMA_PATH,
    ],
    {
      allowFailure: true,
      label: "Resolve legacy failed migration if it exists",
    },
  );

  const deployResult = runPrisma(
    ["migrate", "deploy", "--schema", SCHEMA_PATH],
    {
      allowFailure: true,
      label: "Apply Prisma migrations",
    },
  );

  if (deployResult.status !== 0) {
    const combinedOutput = `${deployResult.stdout ?? ""}\n${deployResult.stderr ?? ""}`;

    if (!shouldBootstrapFromSchema(combinedOutput)) {
      throw new Error(
        `Prisma migrate deploy failed without a recognized recovery path.\n${combinedOutput}`,
      );
    }

    console.warn(
      "\n[vercel-build] Falling back to schema sync for an existing database with stale migration history.",
    );

    runPrisma(["db", "push", "--skip-generate", "--schema", SCHEMA_PATH], {
      label: "Sync Prisma schema to the existing database",
    });

    runPrisma(
      [
        "migrate",
        "resolve",
        "--applied",
        CURRENT_INIT_MIGRATION,
        "--schema",
        SCHEMA_PATH,
      ],
      {
        allowFailure: true,
        label: "Mark the current initial migration as applied",
      },
    );
  }

  runNextBuild();
}

main();
