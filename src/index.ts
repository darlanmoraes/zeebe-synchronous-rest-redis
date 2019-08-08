import { EventEmitter } from "events";
import * as express from "express";
import * as Redis from "ioredis";
import { ZBClient } from "zeebe-node";

// start redis cluster configuration
const createRedis = (): Redis.Redis => {
  return new Redis({
    name: "redis-cluster",
    sentinels: [
      { host: "sentinel-01", port: 6379 },
      { host: "sentinel-02", port: 6379 },
      { host: "sentinel-03", port: 6379 },
    ],
  });
};

// event emitter used to route the messages
// inside the application instance
const control = new EventEmitter();

const zeebe = new ZBClient("zeebe-01");

const producer = createRedis();
const consumer = createRedis();

const app = express();
const port = 3000;

// the application id that will be used to route messages on Redis
const application = `random-numbers-${process.env.INSTANCE}`;

// nothing special here
async function main() {

  // just subscribes this instance on Redis
  consumer.subscribe(application, (error, count) =>
    process.stdout.write(`(${application}) Subscribed on Redis =>, ${error}, ${count}\n`));

  // receives the tasks responses from Redis cluster and send them to the event
  // emitter that is waiting to send the response to the http client
  consumer.on("message", (channel, message) => {
    const { workflowInstanceKey, data } = JSON.parse(message);
    process.stdout.write(`[${workflowInstanceKey}] Received data from Redis: ${message}\n`);
    control.emit(workflowInstanceKey, JSON.stringify(data));
  });

  // deploy a sample workflow to zeebe
  await zeebe.deployWorkflow("./zeebe/random-number.bpmn");

  // create an worker for the initial event that creates the random number
  // after this task execution, the output task will be called
  zeebe.createWorker("worker1", "generate-random-number", (job, complete) => {
    complete({ number: Math.random() });
  });

  // create an worker for the output task, sending the data received to Redis where
  // one of the three instances will be waiting for the response
  zeebe.createWorker("worker2", "output-task", (job, complete) => {
    const { variables, workflowInstanceKey } = job;
    process.stdout.write(`[${workflowInstanceKey}] Workflow finished => ${JSON.stringify(variables)}\n`);
    const response = { data: {
      number: variables.number,
    }, workflowInstanceKey };
    producer.publish(variables.application, JSON.stringify(response));
    complete();
  });

  // peceives the Request and create a new Workflow instance while waiting for the
  // response to send data to the http callback
  app.get("/workflow", async (req, res) => {
    const { workflowInstanceKey } = await zeebe.createWorkflowInstance("random-number", { application });
    control.once(`${workflowInstanceKey}`, (data) => {
      process.stdout.write(`[${workflowInstanceKey}] Received data from EventEmitter: ${data}\n`);
      res.end(data);
    });
    process.stdout.write(`[${workflowInstanceKey}] Workflow created.\n`);
  });

  // starting application on a pre-defined port
  app.listen(port, () => process.stdout.write(`REST application listening on port ${port}\n!`));
}

// start the application
main();
