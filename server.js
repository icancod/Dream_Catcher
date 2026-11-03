
import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';

import { initDatabase } from './config/database-init.js';
import dreamsRouter from './routes/dreams.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
}

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

app.use('/api/dreams', dreamsRouter);

try {
  await initDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.error('Failed to initialize PostgreSQL database:', error);
  process.exit(1);
}
