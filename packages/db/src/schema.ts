// Drizzle schema for Aggregate.
// Filled in for real in §12 step 2; this stub establishes the package shape.

import { pgTable, serial, text } from 'drizzle-orm/pg-core';

export const placeholder = pgTable('placeholder', {
  id: serial('id').primaryKey(),
  note: text('note'),
});
