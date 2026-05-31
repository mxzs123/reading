type QueueRunner<TTask extends { id: string }> = (
  task: TTask,
  signal: AbortSignal
) => Promise<void>;

interface QueuedTask<TTask extends { id: string }> {
  task: TTask;
  controller: AbortController;
  settle: () => void;
  version: number;
}

export function createGenerationQueue<TTask extends { id: string }>(
  getConcurrency: () => number,
  runTask: QueueRunner<TTask>
) {
  const queue: Array<QueuedTask<TTask>> = [];
  const pendingIds = new Set<string>();
  const activeControllers = new Map<string, AbortController>();
  let activeCount = 0;
  let version = 0;

  const pump = () => {
    const limit = getConcurrency();

    while (activeCount < limit && queue.length > 0) {
      const queued = queue.shift()!;

      activeCount += 1;
      activeControllers.set(queued.task.id, queued.controller);

      runTask(queued.task, queued.controller.signal)
        .catch(() => {})
        .finally(() => {
          if (queued.version !== version) {
            queued.settle();
            return;
          }

          activeCount -= 1;
          activeControllers.delete(queued.task.id);
          pendingIds.delete(queued.task.id);
          queued.settle();
          pump();
        });
    }
  };

  const enqueue = (task: TTask): Promise<void> => {
    if (pendingIds.has(task.id)) {
      return Promise.resolve();
    }

    pendingIds.add(task.id);
    return new Promise<void>((resolve) => {
      queue.push({
        task,
        controller: new AbortController(),
        settle: resolve,
        version,
      });
      pump();
    });
  };

  const abortAll = () => {
    version += 1;
    activeCount = 0;
    pendingIds.clear();

    const queuedTasks = queue.splice(0);
    queuedTasks.forEach((queued) => {
      queued.controller.abort();
      queued.settle();
    });

    activeControllers.forEach((controller) => controller.abort());
    activeControllers.clear();
  };

  return {
    abortAll,
    enqueue,
    has: (id: string) => pendingIds.has(id),
    pump,
  };
}
