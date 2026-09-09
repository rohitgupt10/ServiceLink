process.env.USE_LOCAL_DB = "true";

const { start } = require("../server");

start().catch((error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error(
      `Local startup failed: port ${error.port || process.env.PORT || 3000} is already in use. ` +
        "ServiceLink may already be running in another terminal."
    );
  } else {
    console.error("Local startup failed:", error);
  }
  process.exitCode = 1;
});
