/**
 * Add key-value pair to Redis with TTL
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as redis from 'redis';

/**
 * Helper method to add key-value pair in the redis DB with given key
 *
 * @param key target key
 * @param value value associated with the key
 * @param duration expire after given seconds
 * @param redisClient redis client
 */
export default async function redisSetEX(
  key: string,
  value: string,
  duration: number,
  redisClient: redis.RedisClient
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    redisClient.set(key, value, 'EX', duration, err => {
      /* istanbul ignore next */
      if (err) {
        reject(err);
      }
      return resolve();
    });
  });
}
