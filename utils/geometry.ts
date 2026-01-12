import { Rect, Vector2, Platform, Entity } from '../types';

export const checkAABB = (r1: Rect, r2: Rect): boolean => {
  return (
    r1.x < r2.x + r2.w &&
    r1.x + r1.w > r2.x &&
    r1.y < r2.y + r2.h &&
    r1.y + r1.h > r2.y
  );
};

export const resolveCollision = (entity: Entity, platform: Platform): void => {
  // Calculate centers and half-widths
  const entityHalfW = entity.w / 2;
  const entityHalfH = entity.h / 2;
  const platHalfW = platform.w / 2;
  const platHalfH = platform.h / 2;

  const entityCenterX = entity.x + entityHalfW;
  const entityCenterY = entity.y + entityHalfH;
  const platCenterX = platform.x + platHalfW;
  const platCenterY = platform.y + platHalfH;

  const dx = entityCenterX - platCenterX;
  const dy = entityCenterY - platCenterY;

  const minDistX = entityHalfW + platHalfW;
  const minDistY = entityHalfH + platHalfH;

  if (Math.abs(dx) < minDistX && Math.abs(dy) < minDistY) {
    const overlapX = minDistX - Math.abs(dx);
    const overlapY = minDistY - Math.abs(dy);

    // Prioritize vertical resolution (landing) if overlapY is small and we are falling
    // This helps prevent getting stuck on seams between floor tiles
    if (overlapY < overlapX || (entity.vy > 0 && overlapY < 20)) {
      if (dy > 0) {
        // Hitting head on bottom of platform
        entity.y += overlapY;
        entity.vy = 0;
      } else {
        // Landing on top
        entity.y -= overlapY;
        entity.vy = 0;
        entity.isGrounded = true;
      }
    } else {
      // Horizontal collision
      if (dx > 0) {
        entity.x += overlapX;
        entity.vx = 0;
      } else {
        entity.x -= overlapX;
        entity.vx = 0;
      }
    }
  }
};

export const distance = (v1: Vector2, v2: Vector2) => {
  return Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));
};

export interface Point { x: number; y: number; angle?: number; }
export interface Segment { a: Point; b: Point; }

export const getIntersection = (ray: Segment, segment: Segment): Point | null => {
  const r_px = ray.a.x;
  const r_py = ray.a.y;
  const r_dx = ray.b.x - ray.a.x;
  const r_dy = ray.b.y - ray.a.y;

  const s_px = segment.a.x;
  const s_py = segment.a.y;
  const s_dx = segment.b.x - segment.a.x;
  const s_dy = segment.b.y - segment.a.y;

  const r_mag = Math.sqrt(r_dx * r_dx + r_dy * r_dy);
  const s_mag = Math.sqrt(s_dx * s_dx + s_dy * s_dy);
  if (r_dx / r_mag === s_dx / s_mag && r_dy / r_mag === s_dy / s_mag) {
    return null; // Parallel
  }

  const T2 = (r_dx * (s_py - r_py) + r_dy * (r_px - s_px)) / (s_dx * r_dy - s_dy * r_dx);
  const T1 = (s_px + s_dx * T2 - r_px) / r_dx;

  if (T1 < 0) return null;
  if (T2 < 0 || T2 > 1) return null;

  return {
    x: r_px + r_dx * T1,
    y: r_py + r_dy * T1
  };
};