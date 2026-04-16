/**
 * Manual integration test for pi-fallback-provider.
 *
 * This is NOT part of the automated test suite (vitest).
 * Run manually with: npx tsx scripts/test-real-minimax.ts
 *
 * Requires pi CLI installed and API keys configured for minimax.
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function runPiCommand(model: string, timeoutMs: number) {
  console.log(`\n======================================================`);
  console.log(`[TEST] Running pi with model: ${model}`);
  console.log(`[TEST] Timeout set to ${timeoutMs / 1000} seconds`);
  console.log(`======================================================\n`);
  
  const startTime = Date.now();
  
  try {
    // Run the pi command. We use SIGKILL to forcefully terminate it if it hangs.
    const { stdout, stderr } = await execAsync(
      `pi --model ${model} "Reply with just the word 'OK' if you receive this."`,
      { 
        timeout: timeoutMs,
        killSignal: 'SIGKILL'
      }
    );
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n[SUCCESS] Command completed in ${duration}s`);
    console.log(`\nSTDOUT:\n${stdout.trim()}`);
    if (stderr) console.log(`\nSTDERR:\n${stderr.trim()}`);
    
  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000;
    
    if (error.killed) {
      console.error(`\n[TIMEOUT] Command killed after ${duration}s (exceeded ${timeoutMs / 1000}s limit).`);
    } else {
      console.error(`\n[FAILED] Command exited with code ${error.code} after ${duration}s`);
      console.error(`Error Message: ${error.message}`);
    }
    
    if (error.stdout) console.log(`\nPartial STDOUT:\n${error.stdout.trim()}`);
    if (error.stderr) console.log(`\nPartial STDERR:\n${error.stderr.trim()}`);
  }
}

async function main() {
  console.log("Starting real pi tests against Minimax models...");
  
  // 1. Test the native Minimax model directly to see if it hangs natively.
  // We limit it to 15 seconds, so we don't have to wait forever.
  await runPiCommand("minimax/MiniMax-M2.7", 15000);
  
  // 2. Test the fallback worker chain, which is configured to use minimax.
  // We limit this to 25 seconds. If the fallback router's internal 10s timeout works,
  // it should catch the hang, throw an error, and retry, printing [Fallback DEBUG] logs.
  await runPiCommand("fallback/worker", 25000);
  
  console.log("\nTests finished.");
}

main().catch(console.error);