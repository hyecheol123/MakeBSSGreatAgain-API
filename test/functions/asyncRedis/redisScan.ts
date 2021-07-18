/**
 * Scan keys with matching pattern from Redis
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as redis from 'redis';

/**
 * Helper method to iterate entire redis DB to find keys with matching pattern
 *
 * @param pattern pattern to match
 * @param redisClient redis client
 */
export default async function redisScan(
  pattern: string,
  redisClient: redis.RedisClient
): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    let cursor = '0';
    let keys: string[] = [];

    function scan(): void {
      redisClient.scan(cursor, 'MATCH', pattern, (err, reply) => {
        /* istanbul ignore next */
        if (err) {
          reject(err);
        }
        cursor = reply[0];
        const keysScan = reply[1];

        if (keysScan.length) {
          keys = keys.concat(keysScan);
        }

        if (cursor === '0') {
          return resolve(keys);
        } else {
          return scan();
        }
      });
    }
    scan();
  });
}
