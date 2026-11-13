import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import seedDatabase from './config/seed.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();

    // Seeding on start keeps the demo data predictable: restarting the server
    // resets the database, which is what the task description describes.
    if (process.env.SEED_ON_START !== 'false') {
      await seedDatabase({ reset: true, quiet: false });
    }

    app.listen(PORT, () => {
      console.log(`Workflow API listening on http://localhost:${PORT}`);
      console.log('Backend setup complete - the frontend can now log in.');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
