import { DataSource } from 'typeorm';
import { Entry } from '../entries/entities/entry.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [Entry],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
