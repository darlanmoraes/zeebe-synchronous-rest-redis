## Zeebe Cluster with synchronous processing
Application that uses a Zeebe cluster to process a simple task: generate a random number. I'm synchronizing the responses from Zeebe using Redis pub/sub mechanism.

### Software

- `docker`: 18.06.1-ce
- `docker-compose`: 1.22.0
- `typescript`: 3.5.3
- `npm`: 5.6.0
- `node`: v8.9.4

### Running the Project

```
cd ~/zeebe-synchronous-rest-redis
cp -r ./redis/original/node-0* ./redis
chmod a+w ./redis/node-0*/*
docker-compose up --build
```

### Using the Project
Three endpoint will be disponible to use:

- [http://localhost:4001/workflow](http://localhost:4001/workflow)
- [http://localhost:4002/workflow](http://localhost:4002/workflow)
- [http://localhost:4003/workflow](http://localhost:4003/workflow)

If you call on of the three, it will be possible to see that any of the instances are picking the Zeebe responses, but through Redis the routes are adjusted and the client receives the data accordingly.