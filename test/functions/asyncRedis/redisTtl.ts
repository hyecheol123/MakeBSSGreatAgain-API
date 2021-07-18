/**
 * Check expiration time of key-value pair in Redis
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as redis from 'redis';

/**
 * Helper method to check remaining time before expiration of key-value pair
 * in the redis
 *
 * @param key target key
 * @param redisClient redis client
 * @return {Promise<number>} time to expire in second
 */
export default async function redisTtl(
  key: string,
  redisClient: redis.RedisClient
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    redisClient.ttl(key, (err, value) => {
      /* istanbul ignore next */
      if (err) {
        reject(err);
      }
      return resolve(value);
    });
  });
}
