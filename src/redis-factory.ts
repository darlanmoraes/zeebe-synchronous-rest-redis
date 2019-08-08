import * as Redis from 'ioredis';

export const newRedis = () : Redis => {
  return new Redis({
    sentinels: [
      { host: "sentinel-01", port: 6379 },
      { host: "sentinel-02", port: 6379 },
      { host: "sentinel-03", port: 6379 }
    ],
    name: "redis-cluster"
  });
}
