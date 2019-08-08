import { EventEmitter } from "events";
import * as express from "express";
import { ZBClient } from "zeebe-node";
import { newRedis } from "./redis-factory";

const em = new EventEmitter();
const zb = new ZBClient("node1");

const app = express();
const port = 3000;

const pub = newRedis();
const sub = newRedis();
const who = `random-numbers-${process.env.HOST}`;

async function main() {

  sub.subscribe(who, (error, count) => {
    console.log(`Getting numbers => ${who}, ${error}`);
  });

  await zb.deployWorkflow("./bpmn/random-number.bpmn");
  
  zb.createWorker("worker1", "generate-random-number", (job, complete) => {
    complete({
      number: Math.random()
    });
  });

  zb.createWorker("worker2", "output-task", (job, complete) => {
    const { workflowInstanceKey } = job;
    const number = job.variables.number;
    const app = job.variables.app;
    console.log(`Workflow finished ${workflowInstanceKey} => ${JSON.stringify(job.variables)}`);
    pub.publish(`random-numbers-${app}`, JSON.stringify({ number }));
    complete();
  });

  app.get("/", async (req, res) => {
    console.log(`Received request`);
    const { workflowInstanceKey } = await zb.createWorkflowInstance(
      "random-number",
      { app: process.env.HOST }
    );

    em.once('random-number', (message) => {
      console.log(`Received number from event emitter: ${message}`);
      res.end(message);
    });

    console.log(`Created workflow: ${workflowInstanceKey}`);
  });

  sub.on('message', (channel, message) => {
    console.log(`Received number from redis: ${message}`);
    if (channel === who) {
      em.emit('random-number', message);
    }
  });

  app.listen(port, () =>
    console.log(`Zeebe REST handler listening on port ${port}!`)
  );
}

main();
