/**
 * Delete key-value pair from Redis
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as redis from 'redis';

/**
 * Helper method to delete entry in the redis DB with given key
 *
 * @param key target key
 * @param redisClient redis client
 */
export default async function redisDel(
  key: string,
  redisClient: redis.RedisClient
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    redisClient.del(key, err => {
      /* istanbul ignore next */
      if (err) {
        reject(err);
      }
      return resolve();
    });
  });
}
