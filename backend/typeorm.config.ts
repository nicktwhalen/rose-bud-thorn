import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Entry } from './src/entries/entities/entry.entity';
import { User } from './src/auth/entities/user.entity';

// Load environment variables from .env file
config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [Entry, User],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});