import { Redis } from "ioredis";
import Block from "../models/block.model.js";

const CACHE_TTL = 24 * 60 * 60; // 24-hour expiration for caching sets

let redis: Redis | null = null;

try {
  redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: 1,
    retryStrategy(times: number) {
      if (times > 3) {
        console.warn("Redis connection timed out. Falling back to Mongoose for block checks.");
        return null;
      }
      return Math.min(times * 100, 2000);
    },
  });
  
  redis.on("error", (err: Error) => {
    // Graceful error logging to prevent crashes
    console.warn("Redis client warning:", err.message);
  });
} catch (error: any) {
  console.warn("Failed to initialize Redis client:", error.message);
}

/**
 * Checks if Redis connection is currently healthy.
 */
function isRedisHealthy(): boolean {
  return redis !== null && redis.status === "ready";
}

/**
 * Rebuilds the block sets in Redis for a specific user.
 */
export async function rebuildUserBlockCache(userId: string): Promise<{ blocking: string[]; blockedBy: string[] }> {
  try {
    const [blockingDocs, blockedByDocs] = await Promise.all([
      Block.find({ blockerId: userId }).select("blockedId").lean(),
      Block.find({ blockedId: userId }).select("blockerId").lean()
    ]);

    const blockingIds = blockingDocs.map((doc) => doc.blockedId.toString());
    const blockedByIds = blockedByDocs.map((doc) => doc.blockerId.toString());

    if (isRedisHealthy() && redis) {
      const blockingKey = `user:${userId}:blocking`;
      const blockedByKey = `user:${userId}:blocked_by`;

      const pipeline = redis.pipeline();
      pipeline.del(blockingKey);
      pipeline.del(blockedByKey);

      if (blockingIds.length > 0) {
        pipeline.sadd(blockingKey, ...blockingIds);
      } else {
        pipeline.sadd(blockingKey, "EMPTY_PLACEHOLDER");
      }
      pipeline.expire(blockingKey, CACHE_TTL);

      if (blockedByIds.length > 0) {
        pipeline.sadd(blockedByKey, ...blockedByIds);
      } else {
        pipeline.sadd(blockedByKey, "EMPTY_PLACEHOLDER");
      }
      pipeline.expire(blockedByKey, CACHE_TTL);

      await pipeline.exec();
    }

    return { blocking: blockingIds, blockedBy: blockedByIds };
  } catch (error) {
    console.error(`Error rebuilding block cache for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Retrieves the full bidirectional blacklist for a user (Cache-Aside Pattern).
 */
export async function getBidirectionalBlacklist(userId: string): Promise<Set<string>> {
  const blockingKey = `user:${userId}:blocking`;
  const blockedByKey = `user:${userId}:blocked_by`;

  try {
    if (isRedisHealthy() && redis) {
      const [blockingExists, blockedByExists] = await Promise.all([
        redis.exists(blockingKey),
        redis.exists(blockedByKey)
      ]);

      if (blockingExists === 1 && blockedByExists === 1) {
        const [blockingSet, blockedBySet] = await Promise.all([
          redis.smembers(blockingKey),
          redis.smembers(blockedByKey)
        ]);

        const blockingList = blockingSet.filter((id: string) => id !== "EMPTY_PLACEHOLDER");
        const blockedByList = blockedBySet.filter((id: string) => id !== "EMPTY_PLACEHOLDER");

        return new Set([...blockingList, ...blockedByList]);
      }
    }
  } catch (error: any) {
    console.warn("Redis fetch failed. Falling back to MongoDB:", error.message);
  }

  // Fallback (Cache Miss or Redis unavailable) -> Fetch from DB and try to populate Redis
  const cached = await rebuildUserBlockCache(userId);
  return new Set([...cached.blocking, ...cached.blockedBy]);
}

/**
 * Invalidates user sets from Redis when a block relationship changes.
 */
export async function invalidateUserBlockCache(userId: string, targetId: string): Promise<void> {
  if (!isRedisHealthy() || !redis) return;

  try {
    const pipeline = redis.pipeline();
    pipeline.del(`user:${userId}:blocking`);
    pipeline.del(`user:${userId}:blocked_by`);
    pipeline.del(`user:${targetId}:blocking`);
    pipeline.del(`user:${targetId}:blocked_by`);
    await pipeline.exec();
  } catch (error: any) {
    console.warn("Redis invalidation failed:", error.message);
  }
}

/**
 * Checks if targetUserId has blocked currentUserId (i.e. targetUserId is in currentUserId's blocked_by set)
 */
export async function hasBlockedMe(currentUserId: string, targetUserId: string): Promise<boolean> {
  const blockedByKey = `user:${currentUserId}:blocked_by`;
  try {
    if (isRedisHealthy() && redis) {
      const exists = await redis.exists(blockedByKey);
      if (exists === 1) {
        const isMember = await redis.sismember(blockedByKey, targetUserId);
        return isMember === 1;
      }
    }
  } catch (error: any) {
    console.warn("Redis hasBlockedMe check failed. Falling back to MongoDB:", error.message);
  }

  const cached = await rebuildUserBlockCache(currentUserId);
  return cached.blockedBy.includes(targetUserId);
}

/**
 * Dynamically queries the Block collection to fetch all blocked user IDs for a blocker
 * and injects them into both the user.blockedUsers array and user.settings.privacy.blockedUserIds.
 */
export async function populateUserBlocks(user: any): Promise<any> {
  if (!user) return user;
  
  // Convert Mongoose document to a plain object with virtuals enabled
  let userObj = user.toObject ? user.toObject({ virtuals: true }) : { ...user };
  const userId = userObj._id?.toString() || userObj.id?.toString();
  if (!userId) return userObj;

  try {
    const blocks = await Block.find({ blockerId: userId }).select("blockedId").lean();
    const blockedIds = blocks.map((b) => b.blockedId.toString());

    // Inject dynamically
    userObj.blockedUsers = blockedIds;
    if (!userObj.settings) {
      userObj.settings = {};
    }
    if (!userObj.settings.privacy) {
      userObj.settings.privacy = {};
    }
    userObj.settings.privacy.blockedUserIds = blockedIds;
  } catch (error) {
    console.error("populateUserBlocks error:", error);
  }

  return userObj;
}
