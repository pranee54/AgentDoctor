const Queue = require("bull");
const emailQueue = new Queue("email", process.env.REDIS_URL);
emailQueue.process(async (job) => job.data);
