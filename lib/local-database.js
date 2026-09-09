const fs = require("fs/promises");
const path = require("path");
const { MongoClient } = require("mongodb");

const dataPath = path.join(__dirname, "..", ".local-data", "mongodb");
const localPort = 27018;
const localUri = `mongodb://127.0.0.1:${localPort}/servicelink`;
let mongoServer = null;

async function isLocalDatabaseRunning() {
  const client = new MongoClient(localUri, {
    connectTimeoutMS: 1000,
    serverSelectionTimeoutMS: 1000,
  });

  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    return true;
  } catch (_error) {
    return false;
  } finally {
    await client.close().catch(() => {});
  }
}

function reusedDatabase() {
  return {
    dataPath,
    uri: localUri,
    reused: true,
    async stop() {},
  };
}

async function startLocalDatabase() {
  await fs.mkdir(dataPath, { recursive: true });

  // Nodemon can start a replacement process before the previous embedded
  // MongoDB process has fully exited. Reuse it instead of competing for the
  // same dbPath lock.
  if (await isLocalDatabaseRunning()) {
    return reusedDatabase();
  }

  const { MongoMemoryServer } = require("mongodb-memory-server");

  try {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: "servicelink",
        dbPath: dataPath,
        port: localPort,
        storageEngine: "wiredTiger",
      },
    });
  } catch (error) {
    // Cover the race where another process starts MongoDB after the probe.
    if (await isLocalDatabaseRunning()) {
      return reusedDatabase();
    }
    throw error;
  }

  return {
    dataPath,
    uri: localUri,
    reused: false,
    async stop() {
      if (!mongoServer) return;
      await mongoServer.stop({ doCleanup: false, force: false });
      mongoServer = null;
    },
  };
}

module.exports = { localPort, localUri, startLocalDatabase };
