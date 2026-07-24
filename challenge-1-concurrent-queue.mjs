/**
 * Challenge 1: Concurrent Task Queue with Pause and Resume
 * 
 * In production-grade frontend applications, we frequently deal with high-frequency network requests,
 * resource-intensive operations, or file upload/download synchronization. Flooding the browser's network or
 * main thread can lead to degraded performance (UI jank), browser-imposed limits, or server rate-limiting.
 * 
 * A Concurrent Task Queue solves this by restricting the number of asynchronously executing tasks at any
 * given moment, queueing excess tasks, and managing their resolution/rejection seamlessly back to the caller.
 * Additionally, controls like pausing and resuming are critical for real-world scenarios (e.g., handling network drops).
 * 
 * Your mission is to implement the `TaskQueue` class below to pass the provided test suite.
 * 
 * RULES FOR IMPLEMENTATION:
 * 1. Do not use external libraries.
 * 2. Do not change the test runner.
 * 3. Keep the public API exactly as specified.
 */

export class TaskQueue {
  /**
   * @param {Object} options
   * @param {number} options.concurrency - Maximum number of tasks that can run in parallel.
   */
  constructor(options = {}) {
    // TODO: Initialize your state
  }

  /**
   * Enqueues a task.
   * 
   * @param {() => Promise<any>} task - An asynchronous function returning a Promise.
   * @returns {Promise<any>} A promise that resolves or rejects with the result of this specific task.
   */
  enqueue(task) {
    // TODO: Implement task queueing and execution logic
  }

  /**
   * Pauses the queue. Currently running tasks continue to completion,
   * but no new tasks are started.
   */
  pause() {
    // TODO: Implement pause logic
  }

  /**
   * Resumes the queue and starts processing any pending tasks up to the concurrency limit.
   */
  resume() {
    // TODO: Implement resume logic
  }

  /**
   * @returns {number} The number of tasks currently executing.
   */
  get activeCount() {
    // TODO: Implement active count getter
    return 0;
  }

  /**
   * @returns {number} The number of tasks waiting in the queue to be executed.
   */
  get pendingCount() {
    // TODO: Implement pending count getter
    return 0;
  }
}

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runTests() {
  console.log("=== Running TaskQueue Tests ===\n");
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (error) {
      console.error(`❌ FAIL: ${name}`);
      console.error(error);
      failed++;
    }
  }

  // Helper helper to generate a delayed task
  const createTask = (id, delayMs, shouldReject = false, val = null) => {
    return () => new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldReject) {
          reject(new Error(`Task ${id} Failed`));
        } else {
          resolve(val !== null ? val : `Task ${id} Success`);
        }
      }, delayMs);
    });
  };

  // Test 1: Basic execution and resolution
  await test("Basic Task Execution and Resolution", async () => {
    const queue = new TaskQueue({ concurrency: 2 });
    const result = await queue.enqueue(createTask(1, 50, false, "Hello"));
    if (result !== "Hello") {
      throw new Error(`Expected 'Hello', got '${result}'`);
    }
  });

  // Test 2: Error propagation
  await test("Task Rejection Propagation", async () => {
    const queue = new TaskQueue({ concurrency: 2 });
    try {
      await queue.enqueue(createTask(1, 50, true));
      throw new Error("Should have thrown an error but didn't");
    } catch (err) {
      if (err.message !== "Task 1 Failed") {
        throw new Error(`Expected error message 'Task 1 Failed', got '${err.message}'`);
      }
    }
  });

  // Test 3: Concurrency enforcement
  await test("Strict Concurrency Limits", async () => {
    const queue = new TaskQueue({ concurrency: 2 });
    const started = Date.now();
    
    // Enqueue 3 tasks of 100ms each.
    // If concurrency works, Task 3 should only start after Task 1 or 2 finishes.
    // Total time should be >= 200ms but < 300ms.
    const p1 = queue.enqueue(createTask(1, 100));
    const p2 = queue.enqueue(createTask(2, 100));
    
    if (queue.activeCount !== 2) {
      throw new Error(`Expected active count of 2, got ${queue.activeCount}`);
    }
    if (queue.pendingCount !== 0) {
      throw new Error(`Expected pending count of 0, got ${queue.pendingCount}`);
    }

    const p3 = queue.enqueue(createTask(3, 100));

    if (queue.activeCount !== 2) {
      throw new Error(`Expected active count to remain at 2, got ${queue.activeCount}`);
    }
    if (queue.pendingCount !== 1) {
      throw new Error(`Expected pending count of 1, got ${queue.pendingCount}`);
    }

    const results = await Promise.all([p1, p2, p3]);
    const duration = Date.now() - started;

    if (duration < 180) {
      throw new Error(`Execution completed too fast (${duration}ms). Concurrency limit not enforced.`);
    }
    if (duration > 320) {
      throw new Error(`Execution completed too slow (${duration}ms). Tasks did not run concurrently.`);
    }

    if (results[0] !== "Task 1 Success" || results[1] !== "Task 2 Success" || results[2] !== "Task 3 Success") {
      throw new Error(`Unexpected results: ${JSON.stringify(results)}`);
    }
  });

  // Test 4: Pause and Resume functionality
  await test("Pause and Resume Controls", async () => {
    const queue = new TaskQueue({ concurrency: 1 });
    
    const p1 = queue.enqueue(createTask(1, 50));
    
    // Pause the queue before enqueuing task 2
    queue.pause();
    
    let t2Started = false;
    const p2 = queue.enqueue(() => {
      t2Started = true;
      return Promise.resolve("Task 2 Done");
    });

    // Wait for Task 1 to finish
    await p1;

    // Even though Task 1 is done and concurrency is 1, Task 2 should not start because queue is paused.
    await new Promise(resolve => setTimeout(resolve, 30));
    if (t2Started) {
      throw new Error("Task 2 started while the queue was paused.");
    }
    if (queue.activeCount !== 0) {
      throw new Error(`Expected 0 active tasks, got ${queue.activeCount}`);
    }
    if (queue.pendingCount !== 1) {
      throw new Error(`Expected 1 pending task, got ${queue.pendingCount}`);
    }

    // Now resume
    queue.resume();
    
    const res2 = await p2;
    if (res2 !== "Task 2 Done") {
      throw new Error(`Expected 'Task 2 Done', got '${res2}'`);
    }
  });

  // Test 5: Complex Interleaved Workload
  await test("Complex Interleaved Workload (concurrency = 3)", async () => {
    const queue = new TaskQueue({ concurrency: 3 });
    const results = [];
    const tasks = [
      queue.enqueue(createTask(1, 40, false, "A")), // starts immediately
      queue.enqueue(createTask(2, 20, false, "B")), // starts immediately, finishes first
      queue.enqueue(createTask(3, 60, false, "C")), // starts immediately
      queue.enqueue(createTask(4, 10, false, "D")), // starts when 2 finishes
      queue.enqueue(createTask(5, 30, false, "E")), // starts when 4 finishes (or 1 depending on completion order)
    ];

    // Wait for all to resolve
    const finalResults = await Promise.all(tasks);
    const expected = ["A", "B", "C", "D", "E"];
    for (let i = 0; i < expected.length; i++) {
      if (finalResults[i] !== expected[i]) {
        throw new Error(`At index ${i}, expected ${expected[i]}, got ${finalResults[i]}`);
      }
    }
  });

  console.log(`\n=== Test Results: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

// Only run if executing directly in Node
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}
