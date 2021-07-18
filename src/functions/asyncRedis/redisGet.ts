/**
 * Get key-value pair from Redis
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as redis from 'redis';

/**
 * Helper method to get entry in the redis DB with given key
 *
 * @param key target key
 * @param redisClient redis client
 * @param Promise<string> value associated with the key
 */
export default async function redisGet(
  key: string,
  redisClient: redis.RedisClient
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    redisClient.get(key, (err, value) => {
      /* istanbul ignore next */
      if (err) {
        reject(err);
      }
      if (value === null) {
        reject(new Error('Not Found'));
      } else {
        return resolve(value);
      }
    });
  });
}
