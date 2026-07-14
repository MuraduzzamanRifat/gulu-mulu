/**
 * Shared between the Server Action's Zod schema and the editor's live character count.
 *
 * It lives here and not in `_actions.ts` because a `'use server'` module may only export async
 * functions — exporting a plain constant from one is a build error, and importing the whole action
 * module into a client component just to read a number would drag the server code with it.
 */
export const CONTENT_MAX = 20_000
