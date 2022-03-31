/**
 * Merge multiple objects together.
 * Objects at the end will overwrite values from the beginning.
 */
 export function deepMerge<A, B>(a: A, b: B): A & B;
 export function deepMerge<A, B, C>(a: A, b: B, c: C): A & B & C;
 export function deepMerge<A, B, C, D>(a: A, b: B, c: C, d: D): A & B & C & D;
 export function deepMerge(
   ...sources: Record<string, any>[]
 ): Record<string, any> {
   const target: Record<string, any> = {};
   for (const source of sources) {
     for (const key of Object.keys(source)) {
       if (source[key] instanceof Object && key in target) {
         Object.assign(source[key], deepMerge(target[key], source[key]));
       }
     }
     Object.assign(target ?? {}, source);
   }
 
   return target;
 }