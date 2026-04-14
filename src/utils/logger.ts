import fs from "fs";
import path from "path";

/**
 * Robust server-side logger that appends agent execution traces to local files.
 * Logs are stored in /logs/project_[projectId].log
 */
export function logAgentExecution(projectId: string, data: any) {
  try {
    const logsDir = path.join(process.cwd(), "logs");
    
    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const logFile = path.join(logsDir, `project_${projectId}.log`);
    const timestamp = new Date().toISOString();
    
    // Format the log entry
    let logEntry = `[${timestamp}] `;
    
    if (typeof data === "string") {
      logEntry += data;
    } else {
      logEntry += JSON.stringify(data, null, 2);
    }
    
    logEntry += "\n" + "=".repeat(80) + "\n";

    // Append to file
    fs.appendFileSync(logFile, logEntry, "utf8");
  } catch (error) {
    console.error("Critical Failure in logger.ts:", error);
  }
}
