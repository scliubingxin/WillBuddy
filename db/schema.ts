import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', {
 owner: text('owner').notNull(), id: text('id').notNull(), kind: text('kind').notNull(),
 data: text('data').notNull(), updated: integer('updated').notNull(),
}, t=>[primaryKey({columns:[t.owner,t.id]}),index('records_owner_kind').on(t.owner,t.kind)]);
export const documents = sqliteTable('documents', {
 owner:text('owner').notNull(),id:text('id').notNull(),space:text('space').notNull(),name:text('name').notNull(),
 objectKey:text('object_key').notNull(),size:integer('size').notNull(),created:integer('created').notNull(),
},t=>[primaryKey({columns:[t.owner,t.id]}),index('documents_owner_space').on(t.owner,t.space)]);
export const chunks = sqliteTable('chunks', {
 id:text('id').primaryKey(),owner:text('owner').notNull(),documentId:text('document_id').notNull(),
 space:text('space').notNull(),name:text('name').notNull(),content:text('content').notNull(),position:integer('position').notNull(),
},t=>[index('chunks_owner_space').on(t.owner,t.space),index('chunks_owner_document').on(t.owner,t.documentId)]);
export const usage = sqliteTable('usage', {
 id:text('id').primaryKey(),owner:text('owner').notNull(),model:text('model').notNull(),
 input:integer('input'),output:integer('output'),elapsed:integer('elapsed').notNull(),created:integer('created').notNull(),
},t=>[index('usage_owner_created').on(t.owner,t.created)]);
export const chatRequests = sqliteTable('chat_requests', {
 owner:text('owner').notNull(),id:text('id').notNull(),chat:text('chat').notNull(),digest:text('digest').notNull(),
 status:text('status').notNull(),response:text('response'),updated:integer('updated').notNull(),
},t=>[primaryKey({columns:[t.owner,t.id]}),index('chat_requests_owner_chat').on(t.owner,t.chat)]);
export const vault = sqliteTable('vault', {owner:text('owner').notNull(),id:text('id').notNull(),sealed:text('sealed').notNull(),updated:integer('updated').notNull()},t=>[primaryKey({columns:[t.owner,t.id]})]);
export const jobs = sqliteTable('jobs', {owner:text('owner').notNull(),id:text('id').notNull(),state:text('state').notNull(),revision:integer('revision').notNull().default(0),lease:integer('lease').notNull().default(0),updated:integer('updated').notNull()},t=>[primaryKey({columns:[t.owner,t.id]}),index('jobs_owner_updated').on(t.owner,t.updated)]);
export const versions = sqliteTable('versions',{owner:text('owner').notNull(),resource:text('resource').notNull(),version:integer('version').notNull(),data:text('data').notNull(),created:integer('created').notNull()},t=>[primaryKey({columns:[t.owner,t.resource,t.version]})]);
export const appValues=sqliteTable('app_values',{owner:text('owner').notNull(),app:text('app').notNull(),key:text('key').notNull(),value:text('value').notNull(),updated:integer('updated').notNull()},t=>[primaryKey({columns:[t.owner,t.app,t.key]})]);
