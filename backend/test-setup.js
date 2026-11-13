import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'workflow_test_secret';

/**
 * Each run gets its own database so tests never collide with the dev data,
 * and the database is dropped when the run finishes.
 */
const base = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/WorkflowDB';
const root = base.replace(/\/[^/]*$/, '');
const dbName = `WorkflowDB_Test_${Math.floor(Math.random() * 9000000) + 1000000}`;
const testUri = `${root}/${dbName}`;

before(async function () {
  this.timeout(60000);
  mongoose.set('strictQuery', true);
  await mongoose.connect(testUri);
  console.log(`Connected to MongoDB with Mongoose (Database: ${dbName})`);
});

after(async function () {
  this.timeout(60000);
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});
