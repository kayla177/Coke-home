// State -> animation metadata. Day 2 uses an emoji + CSS keyframes per state;
// later this maps to sprite-sheet frames. The contract a real Sprite component
// needs is: pick a `face` (visual), pick an `anim` (CSS animation name), pick a
// `duration`. Same shape works for both placeholder and real art.

export type PetState =
  | 'idle'
  | 'walk'
  | 'sleep'
  | 'cheer'
  | 'working'
  | 'distracted'
  | 'celebrating'

export interface SpriteFrame {
  face: string // emoji placeholder; will be a sprite-sheet URL in v2
  anim: string // CSS animation keyframe name
  duration: string // CSS duration
}

export const SPRITES: Record<PetState, SpriteFrame> = {
  idle: { face: '🐾', anim: 'pet-breathe', duration: '2.4s' },
  walk: { face: '🐾', anim: 'pet-walk', duration: '0.9s' },
  sleep: { face: '😴', anim: 'pet-breathe', duration: '4s' },
  cheer: { face: '🎉', anim: 'pet-cheer', duration: '0.7s' },
  working: { face: '✏️', anim: 'pet-breathe', duration: '2s' },
  distracted: { face: '👀', anim: 'pet-shake', duration: '0.6s' },
  celebrating: { face: '✨', anim: 'pet-cheer', duration: '0.5s' }
}

export const ALL_STATES: PetState[] = [
  'idle',
  'walk',
  'sleep',
  'cheer',
  'working',
  'distracted',
  'celebrating'
]
